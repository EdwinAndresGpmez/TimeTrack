import logging
from datetime import datetime, timedelta

import requests
from django.db import transaction
from django.db.models import Count, Max
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Cita, ConfiguracionGlobal, HistoricoCita, NotaMedica
from .serializers import (
    CitaSerializer,
    ConfiguracionGlobalSerializer,
    HistoricoCitaSerializer,
    NotaMedicaSerializer,
)

# URLs de Microservicios
PATIENTS_MS_URL = "http://patients-ms:8001/api/v1/pacientes/internal/bulk-info/"
STAFF_MS_URL = "http://professionals-ms:8002/api/v1/staff/internal/bulk-info/"
SERVICES_MS_URL = "http://professionals-ms:8002/api/v1/staff/servicios/internal/bulk-info/"
LUGARES_MS_URL = "http://professionals-ms:8002/api/v1/staff/lugares/internal/bulk-info/"

logger = logging.getLogger(__name__)


class ConfiguracionViewSet(viewsets.ModelViewSet):
    queryset = ConfiguracionGlobal.objects.all()
    serializer_class = ConfiguracionGlobalSerializer

    def list(self, request, *args, **kwargs):
        obj, created = ConfiguracionGlobal.objects.get_or_create(pk=1)
        serializer = self.get_serializer(obj)
        return Response(serializer.data)


class CitaViewSet(viewsets.ModelViewSet):
    queryset = Cita.objects.all().order_by("-fecha", "-hora_inicio")
    serializer_class = CitaSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["fecha", "paciente_id", "profesional_id", "estado", "lugar_id"]
    ordering_fields = ["fecha", "hora_inicio"]

    @action(detail=False, methods=["get"], url_path="reportes/inasistencias")
    def reporte_inasistencias(self, request):
        config, _ = ConfiguracionGlobal.objects.get_or_create(pk=1)
        limite = config.limite_inasistencias
        data = (
            Cita.objects.filter(estado="NO_ASISTIO")
            .values("paciente_id")
            .annotate(total=Count("id"), ultima_falta=Max("fecha"))
        )
        resultado = {}
        for item in data:
            pid = str(item["paciente_id"])
            cantidad = item["total"]
            bloqueado = (limite > 0) and (cantidad >= limite)
            resultado[pid] = {
                "inasistencias": cantidad,
                "ultima_falta": item["ultima_falta"],
                "bloqueado_por_inasistencias": bloqueado,
            }
        return Response(resultado)

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        es_modo_admin_front = data.pop("is_admin_mode", False)
        paciente_id = data.get("paciente_id")
        fecha_solicitada = data.get("fecha")
        servicio_id = data.get("servicio_id")
        hora_inicio_str = data.get("hora_inicio")
        config, _ = ConfiguracionGlobal.objects.get_or_create(pk=1)

        try:
            with transaction.atomic():
                # 1. BLOQUEO POR INASISTENCIAS
                if config.limite_inasistencias > 0:
                    fecha_corte = None
                    try:
                        url = f"http://patients-ms:8001/api/v1/pacientes/listado/{paciente_id}/"
                        resp = requests.get(url, timeout=2)
                        if resp.status_code == 200:
                            p_data = resp.json()
                            f_str = p_data.get("ultima_fecha_desbloqueo")
                            if f_str:
                                if f_str.endswith("Z"): f_str = f_str.replace("Z", "+00:00")
                                fecha_corte = datetime.fromisoformat(f_str)
                    except Exception: pass

                    query_inasistencias = Cita.objects.filter(paciente_id=paciente_id, estado="NO_ASISTIO")
                    if fecha_corte:
                        query_inasistencias = query_inasistencias.filter(fecha__gt=fecha_corte.date())
                    
                    if query_inasistencias.count() >= config.limite_inasistencias:
                        return Response({"detalle": config.mensaje_bloqueo_inasistencia}, status=status.HTTP_403_FORBIDDEN)

                # 1.5. ANTELACIÓN MÍNIMA
                try:
                    fmt = "%H:%M:%S" if len(hora_inicio_str) > 5 else "%H:%M"
                    h_ini = datetime.strptime(hora_inicio_str, fmt).time()
                    f_ini = datetime.strptime(fecha_solicitada, "%Y-%m-%d").date()
                    cita_dt = timezone.make_aware(datetime.combine(f_ini, h_ini))
                    
                    # Verificación de privilegios
                    grupos_excepcion = [g.strip() for g in config.grupos_excepcion_antelacion.split(',') if g.strip()]
                    
                    # Intentamos obtener grupos del usuario (Token JWT)
                    user_groups = request.user.groups.values_list('name', flat=True)
                    
                    tiene_privilegio = (
                        request.user.is_superuser or 
                        any(g in grupos_excepcion for g in user_groups) or
                        es_modo_admin_front is True 
                    )
                    if not tiene_privilegio:
                        if cita_dt < (timezone.now() + timedelta(hours=1)):
                            return Response(
                                {"detalle": "Como paciente, debes agendar con al menos 1 hora de antelación."}, 
                                status=status.HTTP_400_BAD_REQUEST
                            )
                except ValueError:
                    return Response({"detalle": "Fecha/hora inválida."}, status=400)
                
                # 2. OVERBOOKING Y DURACIÓN
                duracion = 20
                try:
                    if servicio_id:
                        r = requests.get(f"{SERVICES_MS_URL}?ids={servicio_id}", timeout=2)
                        if r.status_code == 200:
                            d = r.json()
                            if str(servicio_id) in d: duracion = d[str(servicio_id)].get("duracion", 20)
                except Exception: pass

                # Recalcular fin
                h_fin_dt = datetime.strptime(hora_inicio_str, fmt) + timedelta(minutes=duracion)
                data["hora_fin"] = h_fin_dt.strftime("%H:%M:%S")
                
                # Cruces
                cruce_medico = Cita.objects.select_for_update().filter(
                    profesional_id=data.get("profesional_id"),
                    fecha=fecha_solicitada,
                    estado__in=["PENDIENTE", "ACEPTADA", "EN_SALA"],
                    hora_inicio__lt=h_fin_dt.time(),
                    hora_fin__gt=h_ini,
                ).exists()
                if cruce_medico:
                    return Response({"detalle": "Horario no disponible (Cruce médico)."}, status=409)

                cruce_paciente = Cita.objects.filter(
                    paciente_id=paciente_id,
                    fecha=fecha_solicitada,
                    estado__in=["PENDIENTE", "ACEPTADA", "EN_SALA"],
                    hora_inicio__lt=h_fin_dt.time(),
                    hora_fin__gt=h_ini,
                ).exists()
                if cruce_paciente:
                    return Response({"detalle": "El paciente ya tiene cita en ese horario."}, status=400)

                # 3. LÍMITES DIARIOS
                citas_dia = Cita.objects.filter(paciente_id=paciente_id, fecha=fecha_solicitada).exclude(
                    estado__in=["CANCELADA", "NO_ASISTIO", "RECHAZADA"]
                )
                if citas_dia.count() >= config.max_citas_dia_paciente:
                    return Response({"detalle": "Límite diario alcanzado."}, status=400)
                
                if not config.permitir_mismo_servicio_dia and citas_dia.filter(servicio_id=servicio_id).exists():
                    return Response({"detalle": "Ya tiene cita de este servicio hoy."}, status=400)

                # GUARDADO
                serializer = self.get_serializer(data=data)
                serializer.is_valid(raise_exception=True)
                self.perform_create(serializer)
                return Response(serializer.data, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error(f"Error create: {e}")
            return Response({"error": str(e)}, status=500)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        nuevo_estado = request.data.get("estado")
        
        config, _ = ConfiguracionGlobal.objects.get_or_create(pk=1)
        workflow = config.workflow_citas
        estados_validos = [st['slug'] for st in workflow]
        
        if nuevo_estado and nuevo_estado not in estados_validos:
             return Response(
                {"detalle": f"El estado '{nuevo_estado}' no es válido."},
                status=status.HTTP_400_BAD_REQUEST
            )

        estados_finales = [st['slug'] for st in workflow if not st.get('acciones')]
        
        if instance.estado in estados_finales and nuevo_estado != instance.estado:
             es_admin = request.user.is_staff or request.user.is_superuser
             if not es_admin:
                return Response({"detalle": "Cita en estado final."}, status=400)

        ahora = timezone.now()
        try:
            fecha_cita = timezone.make_aware(datetime.combine(instance.fecha, instance.hora_inicio))
        except Exception:
            fecha_cita = ahora

        if nuevo_estado == "NO_ASISTIO" and fecha_cita > ahora:
            return Response({"detalle": "No puedes marcar asistencia futura."}, status=400)

        if nuevo_estado == "REALIZADA":
            margen = ahora + timedelta(minutes=15)
            es_admin = request.user.is_staff or request.user.is_superuser
            if fecha_cita > margen and not es_admin:
                return Response({"detalle": "La cita aún no ha comenzado."}, status=400)

        if nuevo_estado == "CANCELADA":
            es_admin = request.user.is_staff or request.user.is_superuser
            if ahora > fecha_cita and not es_admin:
                return Response({"detalle": "La cita ya pasó."}, status=400)
            
            diferencia = fecha_cita - ahora
            if (diferencia.total_seconds() / 3600) < config.horas_antelacion_cancelar and not es_admin:
                 return Response({"detalle": f"Mínimo {config.horas_antelacion_cancelar}h de antelación."}, status=400)

        nota_interna = request.data.get('nota_interna')
        if nota_interna:
            instance.nota_interna = f"{instance.nota_interna or ''} | {nota_interna}".strip(" |")
            instance.save(update_fields=['nota_interna'])

        return super().update(request, *args, **kwargs)

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        data = response.data.get("results") if isinstance(response.data, dict) and "results" in response.data else response.data
        
        data_enriquecida = self._enrich_data(data)
        
        if isinstance(response.data, dict) and "results" in response.data:
            response.data["results"] = data_enriquecida
        else:
            response.data = data_enriquecida
        return response

    def _enrich_data(self, citas):
        if not citas: return citas
        
        # 1. Recolectar IDs asegurando que sean strings únicos
        ids = {"paciente": set(), "profesional": set(), "servicio": set(), "lugar": set()}
        for c in citas:
            if c.get("paciente_id"): ids["paciente"].add(str(c["paciente_id"]))
            if c.get("profesional_id"): ids["profesional"].add(str(c["profesional_id"]))
            if c.get("servicio_id"): ids["servicio"].add(str(c["servicio_id"]))
            if c.get("lugar_id"): ids["lugar"].add(str(c["lugar_id"]))

        # Función de consulta interna
        def fetch_bulk(url, id_set):
            if not id_set: return {}
            try:
                # Limpiamos IDs vacíos o nulos antes de enviar
                clean_ids = [i for i in id_set if i and i != 'None']
                if not clean_ids: return {}
                
                r = requests.get(f"{url}?ids={','.join(clean_ids)}", timeout=2)
                if r.status_code == 200:
                    data = r.json()
                    # Log para ver qué llega realmente de Pacientes
                    if "pacientes" in url:
                        print(f"DEBUG - Respuesta MS Pacientes: {data}")
                    return data
                return {}
            except Exception as e:
                print(f"DEBUG - Error consultando microservicio {url}: {e}")
                return {}

        # 2. Consultar a los microservicios
        info_pacientes = fetch_bulk(PATIENTS_MS_URL, ids["paciente"])
        info_profesionales = fetch_bulk(STAFF_MS_URL, ids["profesional"])
        info_servicios = fetch_bulk(SERVICES_MS_URL, ids["servicio"])
        info_lugares = fetch_bulk(LUGARES_MS_URL, ids["lugar"])

        # 3. Mapeo de datos (Enriquecimiento)
        for c in citas:
            # Convertimos el ID a string para buscarlo en el diccionario de respuesta
            p_id = str(c.get("paciente_id"))
            p_info = info_pacientes.get(p_id) # Usamos get directo del ID
            
            if p_info:
                # Si el microservicio devuelve 'nombre_completo' lo usamos
                # Si no, usamos 'nombre' y 'apellido'
                nombre_comp = p_info.get("nombre_completo")
                if not nombre_comp:
                    nombre = p_info.get("nombre", "")
                    apellido = p_info.get("apellido", "")
                    nombre_comp = f"{nombre} {apellido}".strip()
                
                c["paciente_nombre"] = nombre_comp or "Paciente sin nombre"
                c["paciente_doc"] = p_info.get("numero_documento") or p_info.get("documento", "N/A")
                c["paciente_fecha_nacimiento"] = p_info.get("fecha_nacimiento")
            else:
                # Si p_info es None, es porque el ID no se encontró en el MS Pacientes
                c["paciente_nombre"] = "DESCONOCIDO (No encontrado)"
                c["paciente_doc"] = "N/A"
                c["paciente_fecha_nacimiento"] = None

            # Enriquecer profesional, servicio y lugar
            c["profesional_nombre"] = info_profesionales.get(str(c.get("profesional_id")), {}).get("nombre", "No asignado")
            c["servicio_nombre"] = info_servicios.get(str(c.get("servicio_id")), {}).get("nombre", "No especificado")
            c["lugar_nombre"] = info_lugares.get(str(c.get("lugar_id")), {}).get("nombre", "Sede Principal")
            
        return citas


class NotaMedicaViewSet(viewsets.ModelViewSet):
    queryset = NotaMedica.objects.all()
    serializer_class = NotaMedicaSerializer


class HistoricoCitaViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = HistoricoCita.objects.all().order_by("-fecha_registro")
    serializer_class = HistoricoCitaSerializer