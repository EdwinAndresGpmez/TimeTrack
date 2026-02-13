import os
import re
from django.contrib.auth.models import Group
from django.core.management.base import BaseCommand
from django.db import transaction
from users.models import MenuItem, PermisoVista

class Command(BaseCommand):
    help = "Sincroniza rutas protegidas de React a la BD y asigna permisos iniciales"

    def handle(self, *args, **options):
        file_path = "/app/source_feed/App.jsx"
        if not os.path.exists(file_path): return

        try:
            with open(file_path, "r", encoding="utf-8") as file:
                content = file.read()

            regex_pattern = r'path=["\']([^"\']+)["\'].*?requiredPermission=["\']([^"\']+)["\']'
            rutas_protegidas = re.findall(regex_pattern, content, re.DOTALL)
            
            # RUTAS QUE NO DEBEN APARECER EN EL SIDEBAR (Solo son permisos)
            rutas_ocultas_en_menu = ["/dashboard/citas/nueva", "/dashboard/agendar-admin"]

            with transaction.atomic():
                grupo_admin, _ = Group.objects.get_or_create(name="Administrador")
                grupo_paciente, _ = Group.objects.get_or_create(name="Paciente")

                for url, permission_name in rutas_protegidas:
                    label_text = url.split("/")[-1].replace("-", " ").title()
                    
                    # --- A. PERMISO VISTA (Siempre se crea) ---
                    permiso, created_p = PermisoVista.objects.get_or_create(
                        codename=permission_name, 
                        defaults={"descripcion": f"Acceso a pantalla: {label_text}"}
                    )

                    # --- B. MENU ITEM (Solo si no es ruta oculta) ---
                    if url not in rutas_ocultas_en_menu:
                        # Lógica de Iconos Automáticos
                        icon = "FaCircle"
                        if "config" in url: icon = "FaCogs"
                        elif "paciente" in url: icon = "FaUserInjured"
                        elif "profesional" in url: icon = "FaUserMd"
                        elif "agenda" in url: icon = "FaCalendarAlt"
                        elif "citas" in url: icon = "FaClipboardList"
                        elif "usuario" in url: icon = "FaUsers"
                        elif "recepcion" in url: icon = "FaWalking"

                        menu, created_m = MenuItem.objects.get_or_create(
                            url=url,
                            defaults={
                                "label": label_text,
                                "icon": icon,
                                "order": 99,
                            },
                        )
                        if created_m:
                            menu.roles.add(grupo_admin)
                    
                    if created_p:
                        permiso.roles.add(grupo_admin)
                        if "/citas" in url and "admin" not in url:
                            permiso.roles.add(grupo_paciente)

            self.stdout.write(self.style.SUCCESS("Sincronización exitosa."))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error: {e}"))