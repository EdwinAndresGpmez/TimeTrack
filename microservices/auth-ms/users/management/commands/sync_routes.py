import os
import re

from django.contrib.auth.models import Group  # <--- IMPORTANTE
from django.core.management.base import BaseCommand
from django.db import transaction

from users.models import MenuItem, PermisoVista


class Command(BaseCommand):
    help = "Sincroniza rutas protegidas de React a la BD y asigna permisos iniciales"

    def handle(self, *args, **options):
        file_path = "/app/source_feed/App.jsx"

        if not os.path.exists(file_path):
            self.stdout.write(self.style.ERROR("No se encontró App.jsx"))
            return

        self.stdout.write(f"Leyendo rutas de: {file_path}...")

        try:
            with open(file_path, "r", encoding="utf-8") as file:
                content = file.read()

            regex_pattern = r'path=["\']([^"\']+)["\'].*?requiredPermission=["\']([^"\']+)["\']'
            rutas_protegidas = re.findall(regex_pattern, content, re.DOTALL)
            rutas_ignoradas = ["/", "/login", "/register", "*"]

            nuevos = 0

            with transaction.atomic():
                # 1. Asegurar que existan los Grupos Base
                grupo_admin, _ = Group.objects.get_or_create(name="Administrador")
                grupo_paciente, _ = Group.objects.get_or_create(name="Paciente")

                # Opcional: Grupo Staff/Profesional
                grupo_profesional, _ = Group.objects.get_or_create(name="Profesional")

                for url, permission_name in rutas_protegidas:
                    if url in rutas_ignoradas:
                        continue

                    label_text = url.split("/")[-1].replace("-", " ").title()
                    if not label_text:
                        label_text = "Item"

                    # --- A. CREAR/OBTENER PERMISO ---
                    permiso, created_p = PermisoVista.objects.get_or_create(
                        codename=permission_name,
                        defaults={"descripcion": f"Acceso a pantalla: {label_text}"}
                    )

                    # --- B. CREAR/OBTENER MENU ---
                    menu, created_m = MenuItem.objects.get_or_create(
                        url=url,
                        defaults={
                            "label": label_text,
                            "icon": "FaCircle",
                            "order": 99,
                        },
                    )

                    # --- C. LÓGICA DE AUTO-ASIGNACIÓN (HEURÍSTICA) ---
                    # Esto solo aplica si se acaba de crear, para no sobrescribir cambios manuales del admin
                    if created_p or created_m:
                        self.stdout.write(f" + Configurando: {label_text}")

                        # 1. El Administrador SIEMPRE recibe acceso a todo lo nuevo por defecto
                        permiso.roles.add(grupo_admin)
                        menu.roles.add(grupo_admin)

                        # 2. Lógica para PACIENTES
                        # Si la URL contiene 'citas', 'perfil' o 'dashboard' (pero no admin)
                        es_admin = '/admin' in url
                        es_paciente = '/citas' in url or '/perfil' in url

                        if es_paciente and not es_admin:
                            permiso.roles.add(grupo_paciente)
                            menu.roles.add(grupo_paciente)
                            self.stdout.write("   -> Asignado a Grupo Paciente")

                        # 3. Lógica para PROFESIONALES (Ejemplo)
                        es_agenda = '/agenda' in url or '/recepcion' in url
                        if es_agenda or es_admin:  # Asumimos que profesional ve admin o agenda
                            permiso.roles.add(grupo_profesional)
                            menu.roles.add(grupo_profesional)

                        nuevos += 1

            self.stdout.write(self.style.SUCCESS(f"Sincronización completa. {nuevos} rutas procesadas."))

        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error: {e}"))
