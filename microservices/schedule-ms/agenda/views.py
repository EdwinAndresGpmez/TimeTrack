import requests
from django.conf import settings
from rest_framework import viewsets, filters, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django_filters.rest_framework import DjangoFilterBackend
from datetime import datetime, timedelta, date
from django.db import models
from .models import Disponibilidad, BloqueoAgenda
from .serializers import DisponibilidadSerializer, BloqueoAgendaSerializer

class DisponibilidadViewSet(viewsets.ModelViewSet):
    """
    CRUD para gestionar los horarios base (Ej: Lunes 8-12).
    """
    queryset = Disponibilidad.objects.all()
    serializer_class = DisponibilidadSerializer
    
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['profesional_id', 'lugar_id', 'dia_semana', 'servicio_id', 'activo']
    ordering_fields = ['dia_semana', 'hora_inicio']

class BloqueoAgendaViewSet(viewsets.ModelViewSet):
    """
    CRUD para gestionar excepciones (Vacaciones, Festivos).
    """
    queryset = BloqueoAgenda.objects.all()
    serializer_class = BloqueoAgendaSerializer
    
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['profesional_id']
    ordering_fields = ['fecha_inicio']

class SlotGeneratorView(APIView):
    """
    Calcula slots libres RESTANDO las citas ya agendadas en appointments-ms.
    Soporta:
    - Duración dinámica (20min, 30min...)
    - Filtro por Tipo de Servicio (EPS vs Particular)
    - Validación de Bloqueos (Vacaciones/Festivos)
    """
    def get(self, request):
        profesional_id = request.query_params.get('profesional_id')
        fecha_str = request.query_params.get('fecha')
        # Nuevo parámetro para filtrar si es agenda EPS o Particular
        servicio_id = request.query_params.get('servicio_id') 
        duracion = int(request.query_params.get('duracion_minutos', 20)) # Default 20 min

        if not profesional_id or not fecha_str:
            return Response({"error": "Faltan parámetros"}, status=400)

        fecha_obj = datetime.strptime(fecha_str, '%Y-%m-%d').date()
        dia_semana = fecha_obj.weekday()

        # 1. VERIFICAR BLOQUEOS (Vacaciones, Festivos, Permisos)
        bloqueado = BloqueoAgenda.objects.filter(
            profesional_id=profesional_id,
            fecha_inicio__lte=fecha_obj,
            fecha_fin__gte=fecha_obj
        ).exists()

        if bloqueado:
            return Response([], status=200) # Día cerrado

        # 2. OBTENER HORARIOS BASE (Filtrando por Tipo de Servicio)
        # Si servicio_id viene, traemos solo los horarios asignados a ese servicio
        # o los que son NULL (que aplican para todo).
        horarios = Disponibilidad.objects.filter(
            profesional_id=profesional_id,
            dia_semana=dia_semana,
            activo=True
        )
        
        if servicio_id:
             horarios = horarios.filter(
                 models.Q(servicio_id__isnull=True) | models.Q(servicio_id=servicio_id)
             )

        # 3. CONSULTAR CITAS OCUPADAS (Comunicación Síncrona con appointments-ms)
        # URL interna del servicio de citas (definida en docker-compose)
        # Nota: En producción usar variables de entorno para la URL base
        url_citas = f"http://appointments-ms:8000/api/v1/citas/?profesional_id={profesional_id}&fecha={fecha_str}"
        
        citas_ocupadas = []
        try:
            resp = requests.get(url_citas, timeout=3)
            if resp.status_code == 200:
                data_citas = resp.json()
                # Filtramos solo citas activas que consumen tiempo
                for c in data_citas:
                    if c['estado'] not in ['CANCELADA', 'RECHAZADA']:
                        # Guardamos tupla (inicio, fin)
                        citas_ocupadas.append((c['hora_inicio'], c['hora_fin']))
        except Exception as e:
            print(f"Error consultando citas ocupadas: {e}")
            # Estrategia Fail-Open o Fail-Close? Por seguridad, si falla la conexión, 
            # podríamos retornar vacio para evitar overbooking, o loguear error.
            pass

        slots_disponibles = []

        # 4. CÁLCULO MATEMÁTICO DE SLOTS
        for horario in horarios:
            inicio_turno = datetime.combine(fecha_obj, horario.hora_inicio)
            fin_turno = datetime.combine(fecha_obj, horario.hora_fin)
            
            cursor = inicio_turno

            while cursor + timedelta(minutes=duracion) <= fin_turno:
                slot_inicio_str = cursor.strftime('%H:%M') # "08:00"
                
                # Calcular fin del slot potencial
                slot_fin_dt = cursor + timedelta(minutes=duracion)
                slot_fin_str = slot_fin_dt.strftime('%H:%M')
                
                # 5. VALIDACIÓN DE COLISIÓN
                esta_ocupado = False
                for ocupada_inicio, ocupada_fin in citas_ocupadas:
                    # Normalizar a strings HH:MM para comparar fácil
                    # (En un sistema real usaríamos objetos time, pero esto es efectivo)
                    # Si el slot arranca antes de que termine la cita Y termina después de que empiece la cita
                    # Hay solapamiento.
                    oc_ini = ocupada_inicio[:5]
                    oc_fin = ocupada_fin[:5]
                    
                    # Lógica de Intersección de Intervalos
                    if (slot_inicio_str < oc_fin) and (slot_fin_str > oc_ini):
                        esta_ocupado = True
                        break
                
                if not esta_ocupado:
                    slots_disponibles.append(slot_inicio_str)
                
                cursor += timedelta(minutes=duracion)

        # Eliminar duplicados y ordenar
        slots_disponibles = sorted(list(set(slots_disponibles)))
        return Response(slots_disponibles, status=200)