from __future__ import annotations

from datetime import timedelta

from django.core.management.base import BaseCommand
from django.db import connection
from django.utils import timezone

from users.models import Auditoria


class Command(BaseCommand):
    help = "Elimina auditorías antiguas (default >90 días) en lotes y hace VACUUM ANALYZE."

    def add_arguments(self, parser):
        parser.add_argument("--days", type=int, default=90, help="Días a conservar (default 90).")
        parser.add_argument("--batch", type=int, default=5000, help="Tamaño del lote (default 5000).")
        parser.add_argument(
            "--no-vacuum",
            action="store_true",
            help="No ejecutar VACUUM ANALYZE al finalizar.",
        )

    def handle(self, *args, **options):
        days: int = options["days"]
        batch: int = options["batch"]
        no_vacuum: bool = options["no_vacuum"]

        cutoff = timezone.now() - timedelta(days=days)

        qs = Auditoria.objects.filter(fecha__lt=cutoff).order_by("id")
        total = qs.count()
        self.stdout.write(f"[purge_auditoria] cutoff={cutoff.isoformat()} | por borrar={total}")

        deleted = 0
        while True:
            ids = list(qs.values_list("id", flat=True)[:batch])
            if not ids:
                break
            Auditoria.objects.filter(id__in=ids).delete()
            deleted += len(ids)
            self.stdout.write(f"[purge_auditoria] borrados={deleted}/{total}")

        self.stdout.write(self.style.SUCCESS(f"[purge_auditoria] listo. total_borrado={deleted}"))

        # PostgreSQL: VACUUM ANALYZE ayuda al planner y deja el espacio reutilizable
        if not no_vacuum:
            table = Auditoria._meta.db_table  # normalmente "users_auditoria"
            self.stdout.write(f"[purge_auditoria] ejecutando VACUUM (ANALYZE) {table} ...")
            with connection.cursor() as cursor:
                cursor.execute(f'VACUUM (ANALYZE) "{table}";')
            self.stdout.write(self.style.SUCCESS("[purge_auditoria] VACUUM ANALYZE OK"))