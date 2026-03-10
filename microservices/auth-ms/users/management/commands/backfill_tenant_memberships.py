from django.contrib.auth.models import Group
from django.core.management.base import BaseCommand

from users.models import CrearCuenta, TenantMembership


class Command(BaseCommand):
    help = "Backfill tenant memberships from user.tenant_id for legacy users."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be updated without writing changes.",
        )

    def handle(self, *args, **options):
        dry_run = bool(options["dry_run"])
        admin_group, _ = Group.objects.get_or_create(name="Administrador")
        users = CrearCuenta.objects.filter(tenant_id__isnull=False).order_by("id")

        created_memberships = 0
        updated_staff = 0
        updated_default = 0

        for user in users:
            membership = TenantMembership.objects.filter(
                user=user,
                tenant_id=user.tenant_id,
                role_name="Administrador",
            ).first()

            if not membership:
                created_memberships += 1
                if not dry_run:
                    TenantMembership.objects.create(
                        user=user,
                        tenant_id=user.tenant_id,
                        role_name="Administrador",
                        is_active=True,
                        is_default=True,
                    )

            if not user.is_staff:
                updated_staff += 1
                if not dry_run:
                    user.is_staff = True
                    user.save(update_fields=["is_staff"])

            if not user.groups.filter(name="Administrador").exists():
                if not dry_run:
                    user.groups.add(admin_group)

            if (
                not dry_run
                and not TenantMembership.objects.filter(user=user, tenant_id=user.tenant_id, is_default=True).exists()
            ):
                updated_default += 1
                TenantMembership.objects.filter(
                    user=user,
                    tenant_id=user.tenant_id,
                    role_name="Administrador",
                ).update(is_default=True)

        mode = "DRY-RUN" if dry_run else "APPLIED"
        self.stdout.write(
            self.style.SUCCESS(
                f"[{mode}] users={users.count()} memberships_created={created_memberships} "
                f"staff_updated={updated_staff} defaults_updated={updated_default}"
            )
        )
