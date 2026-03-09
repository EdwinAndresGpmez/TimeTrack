from datetime import date, datetime, timedelta
from unittest.mock import Mock, patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIRequestFactory, force_authenticate

from agenda.models import BloqueoAgenda, Disponibilidad
from agenda.serializers import DisponibilidadSerializer
from agenda.views import DisponibilidadViewSet, SlotGeneratorView


class DisponibilidadBusinessRulesTests(TestCase):
    def test_rejects_fecha_with_recurrent_vigencia(self):
        serializer = DisponibilidadSerializer(
            data={
                "profesional_id": 10,
                "lugar_id": 1,
                "dia_semana": 0,
                "hora_inicio": "09:00",
                "hora_fin": "10:00",
                "fecha": "2030-01-10",
                "fecha_inicio_vigencia": "2030-01-01",
            }
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn("fecha especifica", str(serializer.errors).lower())

    def test_detects_overlap_between_recurrent_ranges(self):
        Disponibilidad.objects.create(
            profesional_id=11,
            lugar_id=1,
            dia_semana=2,
            hora_inicio="09:00",
            hora_fin="11:00",
            fecha_inicio_vigencia=date(2030, 1, 1),
            fecha_fin_vigencia=date(2030, 1, 31),
            activo=True,
        )

        serializer = DisponibilidadSerializer(
            data={
                "profesional_id": 11,
                "lugar_id": 1,
                "dia_semana": 2,
                "hora_inicio": "10:00",
                "hora_fin": "12:00",
                "fecha_inicio_vigencia": "2030-01-15",
                "fecha_fin_vigencia": "2030-02-15",
            }
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn("conflicto", str(serializer.errors).lower())

    def test_rejects_block_shorter_than_15_minutes(self):
        serializer = DisponibilidadSerializer(
            data={
                "profesional_id": 12,
                "lugar_id": 1,
                "dia_semana": 1,
                "hora_inicio": "09:00",
                "hora_fin": "09:10",
                "fecha_inicio_vigencia": "2030-01-01",
                "fecha_fin_vigencia": "2030-01-31",
            }
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn("duracion minima", str(serializer.errors).lower())


class DisponibilidadViewValidationTests(TestCase):
    def test_professional_must_support_place_and_service(self):
        view = DisponibilidadViewSet()
        view._obtener_profesional_info = lambda _: {"lugares_atencion": [1], "servicios_habilitados": [10]}

        error_lugar = view._validar_profesional_lugar_servicio(
            {"profesional_id": 100, "lugar_id": 2, "servicio_id": 10}
        )
        self.assertIn("sede", error_lugar.lower())

        error_servicio = view._validar_profesional_lugar_servicio(
            {"profesional_id": 100, "lugar_id": 1, "servicio_id": 11}
        )
        self.assertIn("servicio", error_servicio.lower())

    def test_professional_validation_accepts_string_and_object_ids(self):
        view = DisponibilidadViewSet()
        view._obtener_profesional_info = lambda _: {
            "lugares_atencion": ["2", {"id": 3}],
            "servicios_habilitados": ["10", {"id": 11}],
        }

        no_error = view._validar_profesional_lugar_servicio(
            {"profesional_id": 100, "lugar_id": 2, "servicio_id": 10}
        )
        self.assertIsNone(no_error)

    def test_detects_conflict_with_existing_appointment(self):
        view = DisponibilidadViewSet()
        view._obtener_citas_activas = lambda *_: [
            {"fecha": "2030-01-15", "hora_inicio": "09:00:00", "hora_fin": "09:30:00"}
        ]
        error = view._validar_conflicto_con_citas(
            {
                "profesional_id": 101,
                "dia_semana": 1,
                "hora_inicio": datetime.strptime("09:00", "%H:%M").time(),
                "hora_fin": datetime.strptime("10:00", "%H:%M").time(),
                "fecha": date(2030, 1, 15),
                "fecha_inicio_vigencia": None,
                "fecha_fin_vigencia": None,
                "activo": True,
            }
        )
        self.assertIn("ya existe una cita", error.lower())


class SlotGeneratorRulesTests(TestCase):
    def setUp(self):
        user_model = get_user_model()
        self.user = user_model.objects.create_user(username="agenda-tester", password="x")
        self.factory = APIRequestFactory()

    @patch("agenda.views.requests.get")
    def test_partial_block_does_not_cancel_whole_day_slots(self, mock_get):
        target_day = date.today() + timedelta(days=7)
        weekday = target_day.weekday()

        Disponibilidad.objects.create(
            profesional_id=77,
            lugar_id=2,
            dia_semana=weekday,
            hora_inicio="08:00",
            hora_fin="10:00",
            fecha_inicio_vigencia=target_day,
            activo=True,
        )

        start_dt = timezone.make_aware(datetime.combine(target_day, datetime.strptime("08:00", "%H:%M").time()))
        end_dt = timezone.make_aware(datetime.combine(target_day, datetime.strptime("08:30", "%H:%M").time()))
        BloqueoAgenda.objects.create(
            profesional_id=77,
            fecha_inicio=start_dt,
            fecha_fin=end_dt,
            motivo="Bloqueo parcial",
        )

        mock_get.return_value = Mock(status_code=200, json=lambda: [])

        request = self.factory.get(
            "/agenda/slots/",
            {"profesional_id": "77", "fecha": target_day.isoformat(), "duracion_minutos": "30"},
        )
        force_authenticate(request, user=self.user)

        response = SlotGeneratorView.as_view()(request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, ["08:30", "09:00", "09:30"])
