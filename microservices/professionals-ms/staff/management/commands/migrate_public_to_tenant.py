import re

from django.core.management.base import BaseCommand, CommandError
from django.db import connection, transaction


SCHEMA_RE = re.compile(r"^[a-zA-Z_][a-zA-Z0-9_]{0,62}$")


class Command(BaseCommand):
    help = "Copies domain data from public schema to target tenant schema."

    def add_arguments(self, parser):
        parser.add_argument("--schema", required=True, help="Target tenant schema")
        parser.add_argument("--dry-run", action="store_true", help="Print SQL only")
        parser.add_argument("--truncate-target", action="store_true")

    def _domain_tables(self):
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'public'
                  AND table_type = 'BASE TABLE'
                  AND table_name LIKE 'staff_%'
                ORDER BY table_name
                """
            )
            return [row[0] for row in cursor.fetchall()]

    def _table_columns(self, table):
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT column_name
                FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = %s
                ORDER BY ordinal_position
                """,
                [table],
            )
            return [row[0] for row in cursor.fetchall()]

    def _seq_stmt(self, schema, table):
        return (
            "SELECT setval(pg_get_serial_sequence('\"{schema}\".\"{table}\"', 'id'), "
            "COALESCE(MAX(id), 1), MAX(id) IS NOT NULL) FROM \"{schema}\".\"{table}\""
        ).format(schema=schema, table=table)

    def handle(self, *args, **options):
        schema = options["schema"].strip()
        dry_run = bool(options["dry_run"])
        truncate_target = bool(options["truncate_target"])
        if not SCHEMA_RE.match(schema) or schema == "public":
            raise CommandError("Invalid target schema")

        tables = self._domain_tables()
        statements = []
        for table in tables:
            cols = self._table_columns(table)
            if not cols:
                continue
            has_id = "id" in cols
            cols_sql = ", ".join(f'"{c}"' for c in cols)
            if truncate_target:
                statements.append(f'TRUNCATE TABLE "{schema}"."{table}" RESTART IDENTITY CASCADE')
            if has_id and not truncate_target:
                statements.append(
                    f'INSERT INTO "{schema}"."{table}" ({cols_sql}) '
                    f'SELECT {cols_sql} FROM public."{table}" src '
                    f'WHERE NOT EXISTS (SELECT 1 FROM "{schema}"."{table}" dst WHERE dst.id = src.id)'
                )
            else:
                statements.append(
                    f'INSERT INTO "{schema}"."{table}" ({cols_sql}) '
                    f'SELECT {cols_sql} FROM public."{table}"'
                )
            if has_id:
                statements.append(self._seq_stmt(schema, table))

        if dry_run:
            for stmt in statements:
                self.stdout.write(stmt + ";")
            return

        with transaction.atomic():
            with connection.cursor() as cursor:
                for stmt in statements:
                    cursor.execute(stmt)

        self.stdout.write(self.style.SUCCESS(f"Migracion completada public -> {schema} (professionals)."))
