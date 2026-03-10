from django.core.management.base import BaseCommand
from django.db import transaction

from tenancy.models import Feature, Plan, PlanFeature


PLAN_DEFINITIONS = [
    {"code": "FREE", "name": "Idefnova Free", "price_cop_yearly": 0, "is_active": True},
    {"code": "STARTER", "name": "Idefnova Starter", "price_cop_yearly": 1500000, "is_active": True},
    {"code": "PROFESSIONAL", "name": "Idefnova Professional", "price_cop_yearly": 9000000, "is_active": True},
    {"code": "ENTERPRISE", "name": "Idefnova Enterprise", "price_cop_yearly": 25000000, "is_active": True},
]

FEATURE_DEFINITIONS = [
    ("agenda_basica", "Agenda basica"),
    ("agenda_avanzada", "Agenda avanzada"),
    ("registro_pacientes", "Registro de pacientes"),
    ("portal_citas_simple", "Portal de citas simple"),
    ("portal_web_completo", "Portal web completo"),
    ("dashboard_basico", "Dashboard basico"),
    ("dashboard_avanzado", "Dashboard avanzado"),
    ("pqrs", "PQRS"),
    ("api_publica", "API publica"),
    ("confirmacion_email", "Confirmacion por email"),
    ("whatsapp", "Integracion WhatsApp"),
    ("sms", "Mensajes SMS"),
    ("ia_prediccion", "IA prediccion"),
    ("chatbot", "Chatbot"),
    ("integraciones", "Integraciones externas"),
    ("cap_profesionales", "Capacidad profesionales"),
    ("cap_pacientes", "Capacidad pacientes"),
    ("cap_sedes", "Capacidad sedes"),
    ("cap_mensajes_mes", "Capacidad mensajes por mes"),
    ("cap_tokens_ia_mes", "Capacidad tokens IA por mes"),
]

PLAN_RULES = {
    "FREE": {
        "agenda_basica": (True, None),
        "agenda_avanzada": (False, None),
        "registro_pacientes": (True, None),
        "portal_citas_simple": (True, None),
        "portal_web_completo": (False, None),
        "dashboard_basico": (True, None),
        "dashboard_avanzado": (False, None),
        "pqrs": (False, None),
        "api_publica": (False, None),
        "confirmacion_email": (False, None),
        "whatsapp": (False, None),
        "sms": (False, None),
        "ia_prediccion": (False, None),
        "chatbot": (False, None),
        "integraciones": (False, None),
        "cap_profesionales": (True, 1),
        "cap_pacientes": (True, 200),
        "cap_sedes": (True, 1),
        "cap_mensajes_mes": (True, 300),
        "cap_tokens_ia_mes": (True, 0),
    },
    "STARTER": {
        "agenda_basica": (True, None),
        "agenda_avanzada": (True, None),
        "registro_pacientes": (True, None),
        "portal_citas_simple": (True, None),
        "portal_web_completo": (False, None),
        "dashboard_basico": (True, None),
        "dashboard_avanzado": (False, None),
        "pqrs": (False, None),
        "api_publica": (False, None),
        "confirmacion_email": (True, None),
        "whatsapp": (False, None),
        "sms": (True, None),
        "ia_prediccion": (False, None),
        "chatbot": (False, None),
        "integraciones": (False, None),
        "cap_profesionales": (True, 5),
        "cap_pacientes": (True, 2000),
        "cap_sedes": (True, 1),
        "cap_mensajes_mes": (True, 3000),
        "cap_tokens_ia_mes": (True, 0),
    },
    "PROFESSIONAL": {
        "agenda_basica": (True, None),
        "agenda_avanzada": (True, None),
        "registro_pacientes": (True, None),
        "portal_citas_simple": (True, None),
        "portal_web_completo": (True, None),
        "dashboard_basico": (True, None),
        "dashboard_avanzado": (True, None),
        "pqrs": (True, None),
        "api_publica": (True, None),
        "confirmacion_email": (True, None),
        "whatsapp": (False, None),
        "sms": (True, None),
        "ia_prediccion": (False, None),
        "chatbot": (False, None),
        "integraciones": (False, None),
        "cap_profesionales": (True, None),
        "cap_pacientes": (True, None),
        "cap_sedes": (True, None),
        "cap_mensajes_mes": (True, 15000),
        "cap_tokens_ia_mes": (True, 200000),
    },
    "ENTERPRISE": {
        "agenda_basica": (True, None),
        "agenda_avanzada": (True, None),
        "registro_pacientes": (True, None),
        "portal_citas_simple": (True, None),
        "portal_web_completo": (True, None),
        "dashboard_basico": (True, None),
        "dashboard_avanzado": (True, None),
        "pqrs": (True, None),
        "api_publica": (True, None),
        "confirmacion_email": (True, None),
        "whatsapp": (True, None),
        "sms": (True, None),
        "ia_prediccion": (True, None),
        "chatbot": (True, None),
        "integraciones": (True, None),
        "cap_profesionales": (True, None),
        "cap_pacientes": (True, None),
        "cap_sedes": (True, None),
        "cap_mensajes_mes": (True, None),
        "cap_tokens_ia_mes": (True, None),
    },
}


class Command(BaseCommand):
    help = "Seed plans, features and plan-feature rules for Idefnova SaaS catalog."

    @transaction.atomic
    def handle(self, *args, **options):
        plans = {}
        for p in PLAN_DEFINITIONS:
            plan, _ = Plan.objects.update_or_create(code=p["code"], defaults=p)
            plans[plan.code] = plan

        features = {}
        for code, name in FEATURE_DEFINITIONS:
            feature, _ = Feature.objects.update_or_create(
                code=code,
                defaults={"name": name, "description": name},
            )
            features[code] = feature

        for plan_code, rules in PLAN_RULES.items():
            plan = plans[plan_code]
            for feature_code, (enabled, limit_int) in rules.items():
                PlanFeature.objects.update_or_create(
                    plan=plan,
                    feature=features[feature_code],
                    defaults={"enabled": enabled, "limit_int": limit_int},
                )

        self.stdout.write(self.style.SUCCESS("SaaS catalog seeded successfully."))
