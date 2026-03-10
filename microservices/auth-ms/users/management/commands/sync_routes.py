import os
import re

from django.contrib.auth.models import Group
from django.core.management.base import BaseCommand
from django.db import transaction

from users.models import MenuItem, PermisoVista


class Command(BaseCommand):
    help = "Sincroniza rutas protegidas de React a la BD y garantiza la asignacion de roles"

    ROUTE_MENU_CONFIG = {
        "/dashboard": {"label": "Inicio", "category": "General", "icon": "FaHome", "order": 10},
        "/dashboard/perfil": {"label": "Mi Perfil", "category": "General", "icon": "FaUser", "order": 20},
        "/dashboard/citas": {"label": "Mis Citas", "category": "Paciente", "icon": "FaClipboardList", "order": 30},
        "/dashboard/doctor/atencion": {
            "label": "Atencion Consultorio",
            "category": "Operacion Clinica",
            "icon": "FaStethoscope",
            "order": 40,
        },
        "/dashboard/admin/recepcion": {
            "label": "Recepcion",
            "category": "Operacion Clinica",
            "icon": "FaHospital",
            "order": 50,
        },
        "/dashboard/admin/agenda": {
            "label": "Agenda",
            "category": "Operacion Clinica",
            "icon": "FaCalendarAlt",
            "order": 60,
        },
        "/dashboard/admin/citas": {
            "label": "Gestion de Citas",
            "category": "Operacion Clinica",
            "icon": "FaNotesMedical",
            "order": 70,
        },
        "/dashboard/admin/pacientes": {
            "label": "Pacientes",
            "category": "Administracion Clinica",
            "icon": "FaUserInjured",
            "order": 80,
        },
        "/dashboard/admin/profesionales": {
            "label": "Profesionales",
            "category": "Administracion Clinica",
            "icon": "FaUserMd",
            "order": 90,
        },
        "/dashboard/admin/usuarios": {
            "label": "Usuarios",
            "category": "Administracion Clinica",
            "icon": "FaUsers",
            "order": 100,
        },
        "/dashboard/admin/validar-usuarios": {
            "label": "Validar Usuarios",
            "category": "Administracion Clinica",
            "icon": "FaUserCheck",
            "order": 110,
        },
        "/dashboard/admin/parametricas": {
            "label": "Parametricas",
            "category": "Configuracion",
            "icon": "FaSlidersH",
            "order": 120,
        },
        "/dashboard/admin/configuracion": {
            "label": "Configuracion",
            "category": "Configuracion",
            "icon": "FaCogs",
            "order": 130,
        },
        "/dashboard/admin/auditoria": {
            "label": "Auditoria",
            "category": "Control y Calidad",
            "icon": "FaSearch",
            "order": 140,
        },
        "/dashboard/admin/pqrs-gestion": {
            "label": "Gestion PQRS",
            "category": "Control y Calidad",
            "icon": "FaComments",
            "order": 150,
        },
        "/dashboard/admin/convocatorias-gestion": {
            "label": "Convocatorias",
            "category": "Control y Calidad",
            "icon": "FaBriefcase",
            "order": 160,
        },
        "/dashboard/admin/tenants": {
            "label": "Tenants y Planes",
            "category": "Plataforma SaaS",
            "icon": "FaBuilding",
            "order": 170,
        },
        "/dashboard/admin/guia-ayuda": {
            "label": "Guia y Ayuda SaaS",
            "category": "Plataforma SaaS",
            "icon": "FaQuestionCircle",
            "order": 180,
        },
    }

    @staticmethod
    def _humanize_url(url: str) -> str:
        return url.split("/")[-1].replace("-", " ").title() or "Inicio"

    def _menu_config_for_url(self, url: str):
        if url in self.ROUTE_MENU_CONFIG:
            return self.ROUTE_MENU_CONFIG[url]

        # Fallback para rutas nuevas no mapeadas
        label = self._humanize_url(url)
        category = "General"
        icon = "FaCircle"
        order = 900
        if "admin" in url:
            category = "Administracion Clinica"
            icon = "FaTools"
        elif "doctor" in url or "recepcion" in url or "agenda" in url:
            category = "Operacion Clinica"
            icon = "FaStethoscope"
        elif "citas" in url:
            category = "Paciente"
            icon = "FaClipboardList"
        return {"label": label, "category": category, "icon": icon, "order": order}

    def handle(self, *args, **options):
        # Ruta en contenedor Docker y fallback local
        file_path = "/app/source_feed/App.jsx"
        if not os.path.exists(file_path):
            file_path = "src/App.jsx"
            if not os.path.exists(file_path):
                self.stdout.write(self.style.ERROR("No se encontro App.jsx para sincronizar rutas."))
                return

        try:
            with open(file_path, "r", encoding="utf-8") as file:
                content = file.read()

            # Formato antiguo: <Route ...><ProtectedRoute requiredPermission="...">
            regex_children = re.compile(
                r'<Route\s+path=["\']([^"\']+)["\'][^>]*>\s*<ProtectedRoute(?:\s+requiredPermission=["\']([^"\']+)["\'])?',
                re.DOTALL,
            )

            # Formato actual: <Route path="..." element={<ProtectedRoute requiredPermission="...">...</ProtectedRoute>} />
            regex_element = re.compile(
                r'<Route\s+path=["\']([^"\']+)["\']\s+element=\{\s*<ProtectedRoute(?:\s+requiredPermission=["\']([^"\']+)["\'])?[\s\S]*?</ProtectedRoute>\s*\}\s*/>',
                re.DOTALL,
            )

            rutas_protegidas = []
            rutas_protegidas.extend(regex_children.findall(content))
            rutas_protegidas.extend(regex_element.findall(content))

            # Quitar duplicados conservando orden
            dedup = []
            seen = set()
            for url, permission_name in rutas_protegidas:
                key = (url, permission_name or "")
                if key in seen:
                    continue
                seen.add(key)
                dedup.append((url, permission_name or ""))
            rutas_protegidas = dedup

            # Rutas ocultas en sidebar
            rutas_ocultas_en_menu = {
                "/dashboard/citas/nueva",
                "/dashboard/agendar-admin",
                "/sala-espera",
            }

            with transaction.atomic():
                # Grupos base
                grupo_admin, _ = Group.objects.get_or_create(name="Administrador")
                grupo_paciente, _ = Group.objects.get_or_create(name="Paciente")
                grupo_profesional, _ = Group.objects.get_or_create(name="Profesional")
                grupo_saas_superadmin, _ = Group.objects.get_or_create(name="SuperAdmin SaaS")

                for url, permission_name in rutas_protegidas:
                    if not url or url == "/":
                        continue

                    menu_cfg = self._menu_config_for_url(url)
                    label_text = menu_cfg["label"]

                    # A) Permisos de vista (solo si la ruta define requiredPermission)
                    if permission_name:
                        permiso, _ = PermisoVista.objects.get_or_create(
                            codename=permission_name,
                            defaults={"descripcion": f"Acceso a pantalla: {label_text}"},
                        )
                        if (
                            url in {"/dashboard/admin/tenants", "/dashboard/admin/guia-ayuda"}
                            or permission_name in {"saas_tenants_admin", "saas_guide_content_admin"}
                        ):
                            permiso.roles.clear()
                            permiso.roles.add(grupo_saas_superadmin)
                        else:
                            permiso.roles.add(grupo_admin)

                        if "/citas" in url and "admin" not in url and url != "/dashboard/admin/tenants":
                            permiso.roles.add(grupo_paciente)

                        if "doctor" in url and url != "/dashboard/admin/tenants":
                            permiso.roles.add(grupo_profesional)

                        if "sala" in url and url != "/dashboard/admin/tenants":
                            permiso.roles.add(grupo_profesional)

                    # B) Items de menu
                    if url not in rutas_ocultas_en_menu:
                        menu, _ = MenuItem.objects.get_or_create(
                            url=url,
                            defaults={
                                "label": menu_cfg["label"],
                                "icon": menu_cfg["icon"],
                                "order": menu_cfg["order"],
                                "category_name": menu_cfg["category"],
                            },
                        )

                        # Normalizamos siempre para que existentes tambien queden ordenados/agrupados.
                        menu.label = menu_cfg["label"]
                        menu.icon = menu_cfg["icon"]
                        menu.order = menu_cfg["order"]
                        menu.category_name = menu_cfg["category"]
                        menu.save(update_fields=["label", "icon", "order", "category_name"])

                        if url in {"/dashboard/admin/tenants", "/dashboard/admin/guia-ayuda"}:
                            menu.roles.clear()
                            menu.roles.add(grupo_saas_superadmin)
                        else:
                            menu.roles.add(grupo_admin)

                        if "doctor" in url:
                            menu.roles.add(grupo_profesional)

            self.stdout.write(self.style.SUCCESS("Rutas, menus, categorias, orden e iconos sincronizados correctamente."))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error en sincronizacion: {e}"))
