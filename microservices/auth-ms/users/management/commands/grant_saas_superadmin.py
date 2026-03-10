from django.contrib.auth.models import Group
from django.core.management.base import BaseCommand, CommandError

from users.models import CrearCuenta


class Command(BaseCommand):
    help = "Asigna el grupo 'SuperAdmin SaaS' a un usuario por documento."

    def add_arguments(self, parser):
        parser.add_argument("--documento", required=True, help="Documento del usuario")

    def handle(self, *args, **options):
        documento = (options.get("documento") or "").strip()
        if not documento:
            raise CommandError("Debes enviar --documento")

        user = CrearCuenta.objects.filter(documento=documento).first()
        if not user:
            raise CommandError(f"No existe usuario con documento {documento}")

        group, _ = Group.objects.get_or_create(name="SuperAdmin SaaS")
        user.groups.add(group)
        user.is_staff = True
        user.save(update_fields=["is_staff"])

        self.stdout.write(self.style.SUCCESS(f"OK: {documento} ahora tiene rol SuperAdmin SaaS."))
