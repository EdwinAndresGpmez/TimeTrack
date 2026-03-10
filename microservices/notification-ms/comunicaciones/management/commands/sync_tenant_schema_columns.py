import re

from django.core.management.base import BaseCommand, CommandError
from django.db import connection


SCHEMA_RE = re.compile(r"^[a-zA-Z_][a-zA-Z0-9_]{0,62}$")


class Command(BaseCommand):
    help = "Add missing columns in tenant schema tables using public schema as source of truth."

    def add_arguments(self, parser):
        parser.add_argument("--schema", required=True, help="Target tenant schema (e.g. tenant_aurora_salud)")
        parser.add_argument("--dry-run", action="store_true", help="Print SQL only")

    def _domain_tables(self):
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
            return [row[0] for row in cursor.fetchall()]

    def _columns(self, schema, table):
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT column_name
                FROM information_schema.columns
                WHERE table_schema = %s
                  AND table_name = %s
                ORDER BY ordinal_position
                """,
                [schema, table],
            )
            return [row[0] for row in cursor.fetchall()]

    def _column_def_sql(self, table, column):
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT pg_catalog.format_type(a.atttypid, a.atttypmod) AS data_type,
                       a.attnotnull AS not_null,
                       pg_get_expr(ad.adbin, ad.adrelid) AS default_expr
                FROM pg_attribute a
                JOIN pg_class c ON c.oid = a.attrelid
                JOIN pg_namespace n ON n.oid = c.relnamespace
                LEFT JOIN pg_attrdef ad ON ad.adrelid = a.attrelid AND ad.adnum = a.attnum
                WHERE n.nspname = 'public'
                  AND c.relname = %s
                  AND a.attname = %s
                  AND a.attnum > 0
                  AND NOT a.attisdropped
                """,
                [table, column],
            )
            row = cursor.fetchone()

        if not row:
            return None
        data_type, not_null, default_expr = row
        parts = [f'"{column}" {data_type}']
        if default_expr:
            parts.append(f"DEFAULT {default_expr}")
        if not_null:
            parts.append("NOT NULL")
        return " ".join(parts)

    def handle(self, *args, **options):
        schema = options["schema"].strip()
        dry_run = bool(options["dry_run"])

        if not SCHEMA_RE.match(schema) or schema == "public":
            raise CommandError("Invalid target schema")

        tables = self._domain_tables()
        statements = []

        for table in tables:
            statements.append(
                f'CREATE TABLE IF NOT EXISTS "{schema}"."{table}" (LIKE public."{table}" INCLUDING ALL)'
            )
            public_cols = self._columns("public", table)
            tenant_cols = set(self._columns(schema, table))
            missing = [c for c in public_cols if c not in tenant_cols]
            for col in missing:
                col_def = self._column_def_sql(table, col)
                if not col_def:
                    continue
                statements.append(
                    f'ALTER TABLE "{schema}"."{table}" ADD COLUMN IF NOT EXISTS {col_def}'
                )

        if dry_run:
            for stmt in statements:
                self.stdout.write(stmt + ";")
            self.stdout.write(f"-- total statements: {len(statements)}")
            return

        with connection.cursor() as cursor:
            for stmt in statements:
                cursor.execute(stmt)

        self.stdout.write(
            self.style.SUCCESS(
                f"Schema '{schema}' sincronizado. Columnas agregadas: {len(statements)}"
            )
        )
