import os
import re
from django.contrib.auth.models import Group
from django.core.management.base import BaseCommand
from django.db import transaction
from users.models import MenuItem, PermisoVista

class Command(BaseCommand):
    help = "Sincroniza rutas protegidas de React a la BD y garantiza la asignación de roles"

    def handle(self, *args, **options):
        # Ajuste de ruta para Docker o Local
        file_path = "/app/source_feed/App.jsx"
        if not os.path.exists(file_path): 
            file_path = "src/App.jsx" 
            if not os.path.exists(file_path): return

        try:
            with open(file_path, "r", encoding="utf-8") as file:
                content = file.read()

            # Regex para capturar URL y Permiso
            regex_pattern = r'<Route\s+path=["\']([^"\']+)["\'][^>]*>\s*<ProtectedRoute\s+requiredPermission=["\']([^"\']+)["\']'
            rutas_protegidas = re.findall(regex_pattern, content, re.DOTALL)
            
            # Rutas que no van en el Sidebar (Botones directos o TV)
            rutas_ocultas_en_menu = [
                "/dashboard/citas/nueva", 
                "/dashboard/agendar-admin",
                "/sala-espera"
            ]

            with transaction.atomic():
                # 1. Asegurar existencia de los Grupos Core
                grupo_admin, _ = Group.objects.get_or_create(name="Administrador")
                grupo_paciente, _ = Group.objects.get_or_create(name="Paciente")
                grupo_profesional, _ = Group.objects.get_or_create(name="Profesional")
                grupo_pantalla, _ = Group.objects.get_or_create(name="Pantalla Sala") # <--- NUEVO GRUPO

                for url, permission_name in rutas_protegidas:
                    if url == "/": continue

                    label_text = url.split("/")[-1].replace("-", " ").title()
                    
                    # --- A. SINCRONIZACIÓN DE PERMISOS DE VISTA ---
                    permiso, _ = PermisoVista.objects.get_or_create(
                        codename=permission_name, 
                        defaults={"descripcion": f"Acceso a pantalla: {label_text}"}
                    )

                    # Forzamos la actualización de roles del permiso (fuera del if created)
                    permiso.roles.add(grupo_admin)
                    
                    if "/citas" in url and "admin" not in url:
                        permiso.roles.add(grupo_paciente)
                    
                    if "doctor" in url:
                        permiso.roles.add(grupo_profesional)
                    
                    if "sala" in url:
                        # La sala es un permiso compartido para el médico y el televisor
                        permiso.roles.add(grupo_profesional)
                        permiso.roles.add(grupo_pantalla)

                    # --- B. SINCRONIZACIÓN DE ÍTEMS DE MENÚ ---
                    if url not in rutas_ocultas_en_menu:
                        # Lógica de Iconos
                        icon = "FaCircle"
                        if "config" in url: icon = "FaCogs"
                        elif "paciente" in url: icon = "FaUserInjured"
                        elif "profesional" in url: icon = "FaUserMd"
                        elif "agenda" in url: icon = "FaCalendarAlt"
                        elif "citas" in url: icon = "FaClipboardList"
                        elif "usuario" in url: icon = "FaUsers"
                        elif "recepcion" in url: icon = "FaWalking"
                        elif "doctor" in url: icon = "FaStethoscope"

                        menu, _ = MenuItem.objects.get_or_create(
                            url=url,
                            defaults={
                                "label": label_text,
                                "icon": icon,
                                "order": 99,
                            },
                        )
                        
                        # Forzamos la asignación de roles al menú
                        menu.roles.add(grupo_admin)
                        
                        # Si el URL contiene 'doctor', lo agregamos al menú del Profesional
                        if "doctor" in url:
                            menu.roles.add(grupo_profesional)

            self.stdout.write(self.style.SUCCESS("Rutas, Menús y Roles (Admin, Profesional, Sala) sincronizados correctamente."))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error en sincronización: {e}"))