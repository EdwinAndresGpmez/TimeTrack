from django.core.management.base import BaseCommand, CommandError

from users.models import TenantMembership


class Command(BaseCommand):
    help = "Asigna/actualiza tenant_slug en membresias de un tenant_id."

    def add_arguments(self, parser):
        parser.add_argument("--tenant-id", type=int, required=True)
        parser.add_argument("--tenant-slug", type=str, required=True)

    def handle(self, *args, **options):
        tenant_id = options["tenant_id"]
        tenant_slug = (options["tenant_slug"] or "").strip()
        if not tenant_slug:
            raise CommandError("tenant_slug requerido")

        updated = TenantMembership.objects.filter(tenant_id=tenant_id).update(tenant_slug=tenant_slug)
        self.stdout.write(self.style.SUCCESS(f"OK: tenant_id={tenant_id} memberships_updated={updated} slug={tenant_slug}"))
