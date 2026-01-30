import logging
from datetime import date, datetime, timedelta

import requests
from django.db import models
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import BloqueoAgenda, Disponibilidad
from .serializers import BloqueoAgendaSerializer, DisponibilidadSerializer

logger = logging.getLogger(__name__)

# Ajusta la URL si tu docker-compose usa otro nombre
APPOINTMENTS_API_URL = "http://appointments-ms:8000/api/v1/citas/"


class DisponibilidadViewSet(viewsets.ModelViewSet):
    queryset = Disponibilidad.objects.all()
    serializer_class = DisponibilidadSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["profesional_id", "lugar_id", "servicio_id", "dia_semana"]
    ordering_fields = ["dia_semana", "hora_inicio"]

    def _obtener_citas_activas(self, profesional_id, fecha_inicio, fecha_fin=None):
        try:
            f_ini_str = (
                fecha_inicio.strftime("%Y-%m-%d") if isinstance(fecha_inicio, (date, datetime)) else fecha_inicio
            )
            params = {
                "profesional_id": profesional_id,
                "fecha_inicio": f_ini_str,
                "estado_ne": "CANCELADA",
            }
            if fecha_fin:
                f_fin_str = fecha_fin.strftime("%Y-%m-%d") if isinstance(fecha_fin, (date, datetime)) else fecha_fin
                params["fecha_fin"] = f_fin_str

            response = requests.get(APPOINTMENTS_API_URL, params=params, timeout=5)
            return response.json() if response.status_code == 200 else []
        except Exception as e:
            logger.error(f"Error contactando Appointments MS: {e}")
            return []

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        # Lógica para convertir recurrencia "HOY" en fecha fija
        f_ini = data.get("fecha_inicio_vigencia")
        f_fin = data.get("fecha_fin_vigencia")

        if f_ini and f_fin and f_ini == f_fin:
            data["fecha"] = f_ini
            data["fecha_fin_vigencia"] = None

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def destroy(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
            hoy = date.today()

            # --- CASO A: Es una regla RECURRENTE (Semanal) ---
            if instance.fecha is None:
                # 1. Validar Citas Futuras
                citas_futuras = self._obtener_citas_activas(instance.profesional_id, hoy)
                conflictos = []

                for c in citas_futuras:
                    try:
                        c_date = datetime.strptime(c["fecha"], "%Y-%m-%d").date()
                        c_time = datetime.strptime(c["hora_inicio"], "%H:%M:%S").time()

                        # Si coincide día semana y hora
                        if c_date.weekday() == instance.dia_semana:
                            if c_time >= instance.hora_inicio and c_time < instance.hora_fin:
                                # Y está dentro de la vigencia actual
                                if instance.fecha_fin_vigencia is None or c_date <= instance.fecha_fin_vigencia:
                                    conflictos.append(f"{c['fecha']} {c['hora_inicio']}")
                    except Exception:
                        continue

                if conflictos:
                    return Response(
                        {
                            "error": "No se puede eliminar la serie: Hay pacientes citados.",
                            "detalle": conflictos,
                        },
                        status=409,
                    )

                bloqueos_futuros = BloqueoAgenda.objects.filter(
                    profesional_id=instance.profesional_id,
                    fecha_inicio__date__gt=hoy,  # Solo bloqueos del futuro
                )

                count_bloqueos = 0
                for b in bloqueos_futuros:
                    # Coincide el día de la semana? (0=Lunes, etc)
                    if b.fecha_inicio.weekday() == instance.dia_semana:
                        # Coincide el rango horario? (Si el bloqueo está DENTRO del horario que borramos)
                        b_hora = b.fecha_inicio.time()
                        if b_hora >= instance.hora_inicio and b_hora < instance.hora_fin:
                            b.delete()
                            count_bloqueos += 1

                # 3. Soft Delete (Cortar Vigencia)
                ayer = hoy - timedelta(days=1)
                instance.fecha_fin_vigencia = ayer
                instance.save()

                return Response(
                    {"mensaje": f"Serie finalizada. Se limpiaron {count_bloqueos} bloqueos futuros huérfanos."},
                    status=200,
                )

            # --- CASO B: Es una fecha ESPECÍFICA (Override) ---
            else:
                if instance.fecha < hoy:
                    return Response({"error": "No se puede borrar historial pasado."}, status=400)

                # 1. Validar Citas
                citas = self._obtener_citas_activas(instance.profesional_id, instance.fecha, instance.fecha)
                ocupado = any(
                    instance.hora_inicio <= datetime.strptime(c["hora_inicio"], "%H:%M:%S").time() < instance.hora_fin
                    for c in citas
                )

                if ocupado:
                    return Response({"error": "Hay pacientes citados en este horario."}, status=409)

                # 2. LIMPIEZA DE BLOQUEOS (CRÍTICO)
                # Aquí borramos cualquier bloqueo que caiga DENTRO de este horario específico que estamos eliminando.
                # Usamos __gte y __lt para atrapar cualquier bloqueo en ese rango.

                ini_dt = datetime.combine(instance.fecha, instance.hora_inicio)
                fin_dt = datetime.combine(instance.fecha, instance.hora_fin)

                deleted_blocks, _ = BloqueoAgenda.objects.filter(
                    profesional_id=instance.profesional_id,
                    fecha_inicio__gte=ini_dt,  # Empieza después o igual al inicio del turno
                    fecha_inicio__lt=fin_dt,  # Y empieza antes de que acabe el turno
                ).delete()

                # 3. Borrar el horario
                return super().destroy(request, *args, **kwargs)

        except Exception as e:
            logger.error(f"Error crítico destroy agenda: {e}")
            return Response({"error": "Error interno del servidor."}, status=500)


# --- VIEWSETS DE SOPORTE ---
class BloqueoAgendaViewSet(viewsets.ModelViewSet):
    queryset = BloqueoAgenda.objects.all()
    serializer_class = BloqueoAgendaSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["profesional_id"]


class SlotGeneratorView(APIView):
    def get(self, request):
        profesional_id = request.query_params.get("profesional_id")
        fecha_str = request.query_params.get("fecha")
        servicio_id = request.query_params.get("servicio_id")
        duracion = int(request.query_params.get("duracion_minutos", 20))

        if not profesional_id or not fecha_str:
            return Response({"error": "Faltan parámetros"}, status=400)

        fecha_obj = datetime.strptime(fecha_str, "%Y-%m-%d").date()
        dia_semana = fecha_obj.weekday()

        # 1. BLOQUEOS
        if BloqueoAgenda.objects.filter(
            profesional_id=profesional_id,
            fecha_inicio__lte=fecha_obj,
            fecha_fin__gte=fecha_obj,
        ).exists():
            return Response([], status=200)

        # 2. HORARIOS (Vigencia + Recurrencia)
        horarios = Disponibilidad.objects.filter(
            profesional_id=profesional_id, dia_semana=dia_semana, activo=True
        ).filter(
            models.Q(fecha=fecha_obj)
            | (
                models.Q(fecha__isnull=True)
                & (models.Q(fecha_fin_vigencia__isnull=True) | models.Q(fecha_fin_vigencia__gte=fecha_obj))
            )
        )

        if servicio_id:
            horarios = horarios.filter(models.Q(servicio_id__isnull=True) | models.Q(servicio_id=servicio_id))

        # 3. CITAS
        url_citas = f"{APPOINTMENTS_API_URL}?profesional_id={profesional_id}&fecha={fecha_str}"
        citas_ocupadas = []
        try:
            resp = requests.get(url_citas, timeout=3)
            if resp.status_code == 200:
                for c in resp.json():
                    if c["estado"] not in ["CANCELADA", "RECHAZADA"]:
                        citas_ocupadas.append((c["hora_inicio"], c["hora_fin"]))
        except Exception:
            pass

        # 4. SLOTS
        slots_disponibles = []
        for horario in horarios:
            inicio_turno = datetime.combine(fecha_obj, horario.hora_inicio)
            fin_turno = datetime.combine(fecha_obj, horario.hora_fin)
            cursor = inicio_turno

            while cursor + timedelta(minutes=duracion) <= fin_turno:
                s_ini = cursor.strftime("%H:%M")
                s_fin = (cursor + timedelta(minutes=duracion)).strftime("%H:%M")

                ocupado = any((s_ini < oc_fin and s_fin > oc_ini) for oc_ini, oc_fin in citas_ocupadas)
                if not ocupado:
                    slots_disponibles.append(s_ini)
                cursor += timedelta(minutes=duracion)

        return Response(sorted(list(set(slots_disponibles))), status=200)
