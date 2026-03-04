import logging
from datetime import date, datetime, timedelta, time

import requests
from django.db import models, transaction
from django.db.models import Q
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import BloqueoAgenda, Disponibilidad
from .serializers import BloqueoAgendaSerializer, DisponibilidadSerializer
from .utils.audit_client import audit_log

logger = logging.getLogger(__name__)

# Ajusta la URL si tu docker-compose usa otro nombre
APPOINTMENTS_API_URL = "http://appointments-ms:8000/api/v1/citas/"


def _uid(request):
    return request.user.id if getattr(request, "user", None) and request.user.is_authenticated else None


def _audit_from_view(request, *, descripcion, accion, recurso, recurso_id=None, metadata=None):
    """
    Auditoría centralizada desde las vistas.
    """
    audit_log(
        descripcion=descripcion,
        modulo="SCHEDULE",
        accion=accion,
        usuario_id=_uid(request),
        recurso=recurso,
        recurso_id=str(recurso_id) if recurso_id is not None else None,
        metadata=metadata or {},
        ip=request.META.get("REMOTE_ADDR"),
        user_agent=request.META.get("HTTP_USER_AGENT"),
    )


class DisponibilidadViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
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

    # ✅ Guardar usuario_id en el MISMO save
    def perform_create(self, serializer):
        uid = _uid(self.request)
        obj = serializer.save(usuario_id=uid)

        _audit_from_view(
            self.request,
            descripcion=f"CREATE Disponibilidad #{obj.pk}",
            accion="CREATE",
            recurso="Disponibilidad",
            recurso_id=obj.pk,
            metadata={
                "id": obj.pk,
                "tipo": "RECURRENTE" if obj.fecha is None else "ESPECIFICA",
                "profesional_id": obj.profesional_id,
                "lugar_id": obj.lugar_id,
                "servicio_id": obj.servicio_id,
                "dia_semana": obj.dia_semana,
                "hora_inicio": str(obj.hora_inicio),
                "hora_fin": str(obj.hora_fin),
                "fecha": str(obj.fecha) if obj.fecha else None,
                "fecha_fin_vigencia": str(obj.fecha_fin_vigencia) if obj.fecha_fin_vigencia else None,
                "activo": obj.activo,
            },
        )
        return obj

    def perform_update(self, serializer):
        uid = _uid(self.request)

        # Snapshot previo para metadata changed (sin signals)
        old = None
        try:
            old = Disponibilidad.objects.get(pk=serializer.instance.pk)
        except Exception:
            old = None

        obj = serializer.save(usuario_id=uid)

        changed = {}
        if old:
            campos = [
                "profesional_id",
                "lugar_id",
                "servicio_id",
                "dia_semana",
                "hora_inicio",
                "hora_fin",
                "fecha",
                "fecha_fin_vigencia",
                "activo",
            ]
            for f in campos:
                ov = getattr(old, f, None)
                nv = getattr(obj, f, None)
                if ov != nv:
                    changed[f] = {
                        "from": str(ov) if ov is not None else None,
                        "to": str(nv) if nv is not None else None,
                    }

        _audit_from_view(
            self.request,
            descripcion=f"UPDATE Disponibilidad #{obj.pk}",
            accion="UPDATE",
            recurso="Disponibilidad",
            recurso_id=obj.pk,
            metadata={
                "id": obj.pk,
                "tipo": "RECURRENTE" if obj.fecha is None else "ESPECIFICA",
                "profesional_id": obj.profesional_id,
                "lugar_id": obj.lugar_id,
                "servicio_id": obj.servicio_id,
                "dia_semana": obj.dia_semana,
                "hora_inicio": str(obj.hora_inicio),
                "hora_fin": str(obj.hora_fin),
                "fecha": str(obj.fecha) if obj.fecha else None,
                "fecha_fin_vigencia": str(obj.fecha_fin_vigencia) if obj.fecha_fin_vigencia else None,
                "activo": obj.activo,
                "changed": changed,
            },
        )
        return obj

    def perform_destroy(self, instance):
        pk = instance.pk
        meta = {
            "id": pk,
            "tipo": "RECURRENTE" if instance.fecha is None else "ESPECIFICA",
            "profesional_id": instance.profesional_id,
            "lugar_id": instance.lugar_id,
            "servicio_id": instance.servicio_id,
            "dia_semana": instance.dia_semana,
            "hora_inicio": str(instance.hora_inicio),
            "hora_fin": str(instance.hora_fin),
            "fecha": str(instance.fecha) if instance.fecha else None,
            "fecha_fin_vigencia": str(instance.fecha_fin_vigencia) if instance.fecha_fin_vigencia else None,
            "activo": instance.activo,
        }
        instance.delete()
        _audit_from_view(
            self.request,
            descripcion=f"DELETE Disponibilidad #{pk}",
            accion="DELETE",
            recurso="Disponibilidad",
            recurso_id=pk,
            metadata=meta,
        )

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
        """
        Mantengo tu lógica de:
        - recurrente -> cortar vigencia (soft delete)
        - específica -> hard delete
        + auditoría desde aquí
        """
        try:
            instance = self.get_object()
            hoy = date.today()

            # --- CASO A: RECURRENTE (Semanal) ---
            if instance.fecha is None:
                citas_futuras = self._obtener_citas_activas(instance.profesional_id, hoy)
                conflictos = []

                for c in citas_futuras:
                    try:
                        c_date = datetime.strptime(c["fecha"], "%Y-%m-%d").date()
                        c_time = datetime.strptime(c["hora_inicio"], "%H:%M:%S").time()

                        if c_date.weekday() == instance.dia_semana:
                            if c_time >= instance.hora_inicio and c_time < instance.hora_fin:
                                if instance.fecha_fin_vigencia is None or c_date <= instance.fecha_fin_vigencia:
                                    conflictos.append(f"{c['fecha']} {c['hora_inicio']}")
                    except Exception:
                        continue

                if conflictos:
                    return Response(
                        {"error": "No se puede eliminar la serie: Hay pacientes citados.", "detalle": conflictos},
                        status=409,
                    )

                bloqueos_futuros = BloqueoAgenda.objects.filter(
                    profesional_id=instance.profesional_id,
                    fecha_inicio__date__gt=hoy,
                )

                count_bloqueos = 0
                for b in bloqueos_futuros:
                    if b.fecha_inicio.weekday() == instance.dia_semana:
                        b_hora = b.fecha_inicio.time()
                        if b_hora >= instance.hora_inicio and b_hora < instance.hora_fin:
                            b.delete()
                            count_bloqueos += 1

                # Soft delete = cortar vigencia
                ayer = hoy - timedelta(days=1)
                old_vig = instance.fecha_fin_vigencia
                instance.fecha_fin_vigencia = ayer

                # set actor
                instance.usuario_id = _uid(request)
                instance.save(update_fields=["fecha_fin_vigencia", "usuario_id"])

                _audit_from_view(
                    request,
                    descripcion=f"SERIES_END Disponibilidad #{instance.pk} (vigente hasta {instance.fecha_fin_vigencia})",
                    accion="SERIES_END",
                    recurso="Disponibilidad",
                    recurso_id=instance.pk,
                    metadata={
                        "profesional_id": instance.profesional_id,
                        "dia_semana": instance.dia_semana,
                        "hora_inicio": str(instance.hora_inicio),
                        "hora_fin": str(instance.hora_fin),
                        "vigente_hasta": str(instance.fecha_fin_vigencia),
                        "bloqueos_eliminados": count_bloqueos,
                        "changed": {
                            "fecha_fin_vigencia": {
                                "from": str(old_vig) if old_vig else None,
                                "to": str(instance.fecha_fin_vigencia),
                            }
                        },
                    },
                )

                return Response(
                    {"mensaje": f"Serie finalizada. Se limpiaron {count_bloqueos} bloqueos futuros huérfanos."},
                    status=200,
                )

            # --- CASO B: ESPECÍFICA (Override) ---
            else:
                if instance.fecha < hoy:
                    return Response({"error": "No se puede borrar historial pasado."}, status=400)

                citas = self._obtener_citas_activas(instance.profesional_id, instance.fecha, instance.fecha)
                ocupado = any(
                    instance.hora_inicio <= datetime.strptime(c["hora_inicio"], "%H:%M:%S").time() < instance.hora_fin
                    for c in citas
                )

                if ocupado:
                    return Response({"error": "Hay pacientes citados en este horario."}, status=409)

                ini_dt = datetime.combine(instance.fecha, instance.hora_inicio)
                fin_dt = datetime.combine(instance.fecha, instance.hora_fin)

                BloqueoAgenda.objects.filter(
                    profesional_id=instance.profesional_id,
                    fecha_inicio__gte=ini_dt,
                    fecha_inicio__lt=fin_dt,
                ).delete()

                # Hard delete normal (usa perform_destroy -> audita)
                return super().destroy(request, *args, **kwargs)

        except Exception as e:
            logger.error(f"Error crítico destroy agenda: {e}")
            return Response({"error": "Error interno del servidor."}, status=500)

    @action(detail=False, methods=["post"], url_path="duplicar_dia")
    def duplicar_dia(self, request):
        profesional_id = request.data.get("profesional_id")
        fecha_origen_str = request.data.get("fecha_origen")
        fecha_destino_str = request.data.get("fecha_destino")
        lugar_id = request.data.get("lugar_id")

        if not all([profesional_id, fecha_origen_str, fecha_destino_str]):
            return Response({"error": "Faltan datos requeridos."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            f_origen = datetime.strptime(fecha_origen_str, "%Y-%m-%d").date()
            f_destino = datetime.strptime(fecha_destino_str, "%Y-%m-%d").date()
            dia_semana_origen = f_origen.weekday()
            dia_semana_destino = f_destino.weekday()

            ocupado = Disponibilidad.objects.filter(
                profesional_id=profesional_id,
                fecha=f_destino,
                activo=True,
            ).exists()

            if ocupado:
                return Response(
                    {"error": "El día destino ya tiene horarios asignados manualmente. Borralos antes de pegar."},
                    status=status.HTTP_409_CONFLICT,
                )

            horarios_origen = Disponibilidad.objects.filter(
                profesional_id=profesional_id,
                activo=True,
            ).filter(
                Q(fecha=f_origen)
                | (
                    Q(fecha__isnull=True)
                    & Q(dia_semana=dia_semana_origen)
                    & (Q(fecha_fin_vigencia__isnull=True) | Q(fecha_fin_vigencia__gte=f_origen))
                )
            )

            if not horarios_origen.exists():
                return Response({"error": "No hay horarios para copiar en el día origen."}, status=404)

            count_creados = 0
            uid = _uid(request)

            with transaction.atomic():
                for h in horarios_origen:
                    Disponibilidad.objects.create(
                        usuario_id=uid,
                        profesional_id=profesional_id,
                        lugar_id=h.lugar_id if not lugar_id else lugar_id,
                        servicio_id=h.servicio_id,
                        dia_semana=dia_semana_destino,
                        hora_inicio=h.hora_inicio,
                        hora_fin=h.hora_fin,
                        fecha=f_destino,
                        fecha_fin_vigencia=None,
                        activo=True,
                    )
                    count_creados += 1

            _audit_from_view(
                request,
                descripcion=f"DUPLICAR_DIA profesional={profesional_id} {fecha_origen_str}->{fecha_destino_str}",
                accion="DUPLICAR_DIA",
                recurso="Disponibilidad",
                recurso_id=None,
                metadata={
                    "profesional_id": profesional_id,
                    "lugar_id": lugar_id,
                    "fecha_origen": fecha_origen_str,
                    "fecha_destino": fecha_destino_str,
                    "creados": count_creados,
                },
            )

            return Response({"mensaje": f"Se copiaron {count_creados} bloques horarios."}, status=200)

        except Exception as e:
            logger.error(f"Error duplicando agenda: {e}")
            return Response({"error": str(e)}, status=500)


class BloqueoAgendaViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = BloqueoAgenda.objects.all()
    serializer_class = BloqueoAgendaSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["profesional_id"]

    def perform_create(self, serializer):
        uid = _uid(self.request)
        obj = serializer.save(usuario_id=uid)

        _audit_from_view(
            self.request,
            descripcion=f"CREATE BloqueoAgenda #{obj.pk}",
            accion="CREATE",
            recurso="BloqueoAgenda",
            recurso_id=obj.pk,
            metadata={
                "id": obj.pk,
                "profesional_id": obj.profesional_id,
                "fecha_inicio": str(obj.fecha_inicio),
                "fecha_fin": str(obj.fecha_fin),
                "motivo": obj.motivo,
            },
        )
        return obj

    def perform_update(self, serializer):
        uid = _uid(self.request)

        old = None
        try:
            old = BloqueoAgenda.objects.get(pk=serializer.instance.pk)
        except Exception:
            old = None

        obj = serializer.save(usuario_id=uid)

        changed = {}
        if old:
            for f in ["profesional_id", "fecha_inicio", "fecha_fin", "motivo"]:
                ov = getattr(old, f, None)
                nv = getattr(obj, f, None)
                if ov != nv:
                    changed[f] = {
                        "from": str(ov) if ov is not None else None,
                        "to": str(nv) if nv is not None else None,
                    }

        _audit_from_view(
            self.request,
            descripcion=f"UPDATE BloqueoAgenda #{obj.pk}",
            accion="UPDATE",
            recurso="BloqueoAgenda",
            recurso_id=obj.pk,
            metadata={
                "id": obj.pk,
                "profesional_id": obj.profesional_id,
                "fecha_inicio": str(obj.fecha_inicio),
                "fecha_fin": str(obj.fecha_fin),
                "motivo": obj.motivo,
                "changed": changed,
            },
        )
        return obj

    def perform_destroy(self, instance):
        pk = instance.pk
        meta = {
            "id": pk,
            "profesional_id": instance.profesional_id,
            "fecha_inicio": str(instance.fecha_inicio),
            "fecha_fin": str(instance.fecha_fin),
            "motivo": instance.motivo,
        }
        instance.delete()
        _audit_from_view(
            self.request,
            descripcion=f"DELETE BloqueoAgenda #{pk}",
            accion="DELETE",
            recurso="BloqueoAgenda",
            recurso_id=pk,
            metadata=meta,
        )


class SlotGeneratorView(APIView):
    """
    Slots: normalmente es GET.
    No audito aquí para no generar ruido.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profesional_id = request.query_params.get("profesional_id")
        fecha_str = request.query_params.get("fecha")
        servicio_id = request.query_params.get("servicio_id")
        duracion = int(request.query_params.get("duracion_minutos", 20))

        if not profesional_id or not fecha_str:
            return Response({"error": "Faltan parámetros"}, status=400)

        fecha_obj = datetime.strptime(fecha_str, "%Y-%m-%d").date()
        dia_semana = fecha_obj.weekday()

        # ✅ FIX warnings naive datetime: comparar con rango aware del día
        start_dt = timezone.make_aware(datetime.combine(fecha_obj, time.min))
        end_dt = timezone.make_aware(datetime.combine(fecha_obj, time.max))

        if BloqueoAgenda.objects.filter(
            profesional_id=profesional_id,
            fecha_inicio__lte=end_dt,
            fecha_fin__gte=start_dt,
        ).exists():
            return Response([], status=200)

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

        url_citas = f"{APPOINTMENTS_API_URL}?profesional_id={profesional_id}&fecha={fecha_str}"
        citas_ocupadas = []
        try:
            resp = requests.get(url_citas, timeout=3)
            if resp.status_code == 200:
                for c in resp.json():
                    if c.get("estado") not in ["CANCELADA", "RECHAZADA"]:
                        citas_ocupadas.append((c["hora_inicio"], c["hora_fin"]))
        except Exception:
            pass

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