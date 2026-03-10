import re

from django.core.management.base import BaseCommand, CommandError
from django.db import connection


SCHEMA_RE = re.compile(r"^[a-zA-Z_][a-zA-Z0-9_]{0,62}$")


class Command(BaseCommand):
    help = "Creates tenant schema and clones notification domain tables."

    def add_arguments(self, parser):
        parser.add_argument("--schema", required=True, help='Target schema (e.g. tenant_clinicamed)')
        parser.add_argument("--dry-run", action="store_true", help="Print SQL without executing")

    def handle(self, *args, **options):
        schema = options["schema"].strip()
        dry_run = bool(options["dry_run"])

        if not SCHEMA_RE.match(schema):
            raise CommandError("Invalid schema name")

        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'public'
                  AND table_type = 'BASE TABLE'
                  AND table_name LIKE 'comunicaciones_%'
                ORDER BY table_name
                """
            )
            tables = [row[0] for row in cursor.fetchall()]

        sql_statements = [f'CREATE SCHEMA IF NOT EXISTS "{schema}"']
        for table in tables:
            sql_statements.append(
                f'CREATE TABLE IF NOT EXISTS "{schema}"."{table}" (LIKE public."{table}" INCLUDING ALL)'
            )

        if dry_run:
            for stmt in sql_statements:
                self.stdout.write(stmt + ";")
            return

        with connection.cursor() as cursor:
            for stmt in sql_statements:
                cursor.execute(stmt)

        self.stdout.write(
            self.style.SUCCESS(
                f"Schema '{schema}' preparado con {len(tables)} tablas de notification."
            )
        )
