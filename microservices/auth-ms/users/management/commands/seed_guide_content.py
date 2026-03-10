from django.core.management.base import BaseCommand

from users.models import GuideContent


DEFAULT_ONBOARDING_STEPS = {
    "steps": [
        {
            "id": "parametricas_base",
            "title": "Configurar Parametricas",
            "description": "Define sedes, especialidades y catalogos base para arrancar.",
            "route": "/dashboard/admin/parametricas",
        },
        {
            "id": "roles_permisos",
            "title": "Configurar Roles y Permisos",
            "description": "Crea roles por area y asigna modulos del menu por rol.",
            "route": "/dashboard/admin/configuracion?tab=menus",
        },
        {
            "id": "usuarios_roles",
            "title": "Crear Usuarios y Asignar Roles",
            "description": "Crea el equipo y asigna permisos segun funcion.",
            "route": "/dashboard/admin/usuarios",
        },
        {
            "id": "agenda",
            "title": "Configurar Agenda",
            "description": "Define disponibilidad y reglas de citas.",
            "route": "/dashboard/admin/agenda",
        },
    ]
}

DEFAULT_MODULE_HELP = {
    "routes": {
        "/dashboard/admin/pacientes": {
            "purpose": "Gestion central de pacientes y datos clinicos base.",
            "useCase": "Actualizar informacion y seguimiento administrativo.",
        },
        "/dashboard/admin/validar-usuarios": {
            "purpose": "Valida perfiles o solicitudes pendientes.",
            "useCase": "Aprobar o rechazar validaciones iniciales.",
        },
        "/dashboard/admin/citas": {
            "purpose": "Operacion diaria de citas.",
            "useCase": "Confirmar, reagendar y cancelar citas.",
        },
        "/dashboard/admin/recepcion": {
            "purpose": "Control de llegada y sala de espera.",
            "useCase": "Registrar llegada y coordinar flujo de atencion.",
        },
        "/dashboard/doctor/atencion": {
            "purpose": "Atencion clinica desde consultorio.",
            "useCase": "Registrar evolucion y cierre de atencion.",
        },
    }
}

DEFAULT_PROCESS_MAP = {
    "nodes": [
        {"key": "roles", "name": "Roles y Permisos", "route": "/dashboard/admin/configuracion?tab=menus"},
        {"key": "usuarios", "name": "Usuarios", "route": "/dashboard/admin/usuarios"},
        {"key": "pacientes", "name": "Pacientes", "route": "/dashboard/admin/pacientes"},
        {"key": "agenda", "name": "Agenda", "route": "/dashboard/admin/agenda"},
        {"key": "citas", "name": "Gestion de Citas", "route": "/dashboard/admin/citas"},
        {"key": "recepcion", "name": "Recepcion", "route": "/dashboard/admin/recepcion"},
        {"key": "atencion", "name": "Atencion Consultorio", "route": "/dashboard/doctor/atencion"},
    ]
}

SEED_RECORDS = [
    {
        "key": "onboarding_steps",
        "title": "Onboarding Steps",
        "content": DEFAULT_ONBOARDING_STEPS,
        "is_active": True,
    },
    {
        "key": "module_help",
        "title": "Module Help",
        "content": DEFAULT_MODULE_HELP,
        "is_active": True,
    },
    {
        "key": "process_map",
        "title": "Process Map",
        "content": DEFAULT_PROCESS_MAP,
        "is_active": True,
    },
]


class Command(BaseCommand):
    help = "Seed inicial para contenido de guia SaaS (onboarding/module_help/process_map)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--force",
            action="store_true",
            help="Sobrescribe contenido existente para las keys base.",
        )

    def handle(self, *args, **options):
        force = bool(options.get("force"))
        created = 0
        updated = 0

        for record in SEED_RECORDS:
            obj, was_created = GuideContent.objects.get_or_create(
                key=record["key"],
                defaults={
                    "title": record["title"],
                    "content": record["content"],
                    "is_active": record["is_active"],
                },
            )

            if was_created:
                created += 1
                self.stdout.write(self.style.SUCCESS(f"[CREATED] {obj.key}"))
                continue

            if force:
                obj.title = record["title"]
                obj.content = record["content"]
                obj.is_active = record["is_active"]
                obj.save(update_fields=["title", "content", "is_active", "updated_at"])
                updated += 1
                self.stdout.write(self.style.WARNING(f"[UPDATED] {obj.key}"))
            else:
                self.stdout.write(f"[SKIP] {obj.key} (ya existe)")

        self.stdout.write(self.style.SUCCESS(f"Seed finalizado. created={created}, updated={updated}"))
