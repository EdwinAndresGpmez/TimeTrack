from django.core.management.base import BaseCommand
from django.db import transaction

from content.models import (
    Banner,
    PortalTheme,
    Page,
    PageSection,
)


DEFAULT_SECTIONS = [
    ("hero", "Hero", 10),
    ("features", "Franja de características", 20),
    ("services", "Servicios", 30),
    ("how_we_work", "Cómo trabajamos", 40),
    ("three_cols", "Tres columnas info", 50),
    ("values", "Valores", 60),
    ("team", "Equipo", 70),
    ("testimonials", "Testimonios", 80),
    ("videos", "Video galerías", 90),
    ("contact", "Contacto", 100),
    ("custom", "Sección personalizada", 110),
]


class Command(BaseCommand):
    help = "Seed inicial de Theme + Page(home) + PageSections para el Portal CMS."

    def add_arguments(self, parser):
        parser.add_argument(
            "--force",
            action="store_true",
            help="Sobrescribe data de secciones existentes (danger).",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        force = options.get("force", False)

        self.stdout.write(self.style.SUCCESS("🌱 Iniciando seed del portal..."))

        # ----------------------------
        # 1) Theme (singleton)
        # ----------------------------
        theme, created = PortalTheme.objects.get_or_create(
            id=1,
            defaults={
                "company_name": "Mi Empresa",
                "primary_color": "#2f7ecb",
                "secondary_color": "#0f172a",
                "accent_color": "#34d399",
                "background_color": "#ffffff",
                "surface_color": "#efefef",
                "text_color": "#0f172a",
                "border_radius": 12,
            },
        )
        if created:
            self.stdout.write(self.style.SUCCESS("✅ Theme creado (id=1)"))
        else:
            self.stdout.write(self.style.WARNING("ℹ️ Theme ya existía (id=1)"))

        # ----------------------------
        # 2) Page home
        # ----------------------------
        home, created = Page.objects.get_or_create(
            slug="home",
            defaults={"title": "Home"},
        )
        if created:
            self.stdout.write(self.style.SUCCESS("✅ Page 'home' creada"))
        else:
            self.stdout.write(self.style.WARNING("ℹ️ Page 'home' ya existía"))

        # ----------------------------
        # 3) HERO: slides desde banners existentes
        # ----------------------------
        banners = list(Banner.objects.all().order_by("orden", "-created_at"))

        slides = []
        for b in banners:
            slides.append(
                {
                    # ✅ CLAVE: PagePublicView expandirá banner_id -> banner {}
                    "banner_id": b.id,
                    # Estos campos son opcionales (puedes usarlos en frontend como fallback)
                    "title": b.titulo or "",
                    "description": b.descripcion or "",
                    "link": b.link_accion or "",
                }
            )

        hero_data = {
            "subtitle": "Centro médico de salud",
            "title": "De la máxima calidad",
            "description": "Texto editable desde el panel.",
            "button_text": "CONTÁCTENOS",
            "button_link": "#contacto",
            "slides": slides,  # si no hay banners, queda vacío
            "autoplay_ms": 6000,
        }

        # ----------------------------
        # 4) Data inicial de secciones
        # ----------------------------
        features_data = {
            "items": [
                {
                    "title": "ATENCIÓN MÉDICA",
                    "text": "Texto editable. Puedes describir tu servicio.",
                    "icon": "medical",
                },
                {
                    "title": "PROGRAMAS DE ATENCIÓN",
                    "text": "Texto editable. Puedes describir tus programas.",
                    "icon": "programs",
                },
            ]
        }

        services_data = {
            "title": "Servicios médicos",
            "subtitle": "Texto editable de introducción.",
            "items": [
                {
                    "title": "Hospitalistas",
                    "text": "Texto editable.",
                    "image_asset_id": None,
                    "link": "/servicios",
                },
                {
                    "title": "Pediatría",
                    "text": "Texto editable.",
                    "image_asset_id": None,
                    "link": "/servicios",
                },
                {
                    "title": "Cuidado crítico",
                    "text": "Texto editable.",
                    "image_asset_id": None,
                    "link": "/servicios",
                },
                {
                    "title": "Laboratorio",
                    "text": "Texto editable.",
                    "image_asset_id": None,
                    "link": "/servicios",
                },
            ],
        }

        how_data = {
            "title": "Cómo trabajamos",
            "image_asset_id": None,
            "left_text": "Texto editable del bloque izquierdo.",
            "right_text": "Texto editable del bloque derecho.",
            "button_text": "CONTÁCTENOS",
            "button_link": "#contacto",
        }

        values_data = {
            "title": "Nuestros valores",
            "subtitle": "Texto editable.",
            "items": [
                {"title": "Valor 1", "text": "Texto editable."},
                {"title": "Valor 2", "text": "Texto editable."},
                {"title": "Valor 3", "text": "Texto editable."},
                {"title": "Valor 4", "text": "Texto editable."},
            ],
        }

        three_cols_data = {
            "title": "Informacion destacada",
            "subtitle": "Texto editable para el bloque de tres columnas.",
            "columns": [
                {
                    "title": "UN",
                    "subtitle": "Titulo columna 1",
                    "text": "Contenido editable desde el CMS (columna 1).",
                    "image_asset_id": None,
                },
                {
                    "title": "B",
                    "subtitle": "Titulo columna 2",
                    "text": "Contenido editable desde el CMS (columna 2).",
                    "image_asset_id": None,
                },
                {
                    "title": "C",
                    "subtitle": "Titulo columna 3",
                    "text": "Contenido editable desde el CMS (columna 3).",
                    "image_asset_id": None,
                },
            ],
        }

        team_data = {
            "title": "Nuestro equipo",
            "subtitle": "Texto editable.",
            "members": [
                {"name": "Nombre Apellido", "role": "Especialidad", "image_asset_id": None},
                {"name": "Nombre Apellido", "role": "Especialidad", "image_asset_id": None},
                {"name": "Nombre Apellido", "role": "Especialidad", "image_asset_id": None},
                {"name": "Nombre Apellido", "role": "Especialidad", "image_asset_id": None},
            ],
        }

        testimonials_data = {
            "title": "Testimonios",
            "subtitle": "Texto editable.",
            "items": [
                {"name": "María P.", "role": "Paciente", "text": "Texto editable.", "image_asset_id": None},
                {"name": "Juan C.", "role": "Paciente", "text": "Texto editable.", "image_asset_id": None},
                {"name": "Laura G.", "role": "Paciente", "text": "Texto editable.", "image_asset_id": None},
            ],
        }

        videos_data = {
            "title": "Video galerías",
            "subtitle": "Contenido audiovisual editable desde el panel.",
            "show": True,
        }

        contact_data = {
            "title": "Contáctenos",
            "subtitle": "Texto editable.",
            "phone": "+57 300 000 0000",
            "email": "contacto@tuweb.com",
            "address": "Calle 00 #00-00, Bogotá",
            "cta_primary": {"text": "Agendar cita", "action": "AGENDAR_CITA"},
            "cta_secondary": {"text": "PQRS", "action": "PQRS"},
        }

        custom_data = {
            "title": "Sección personalizada",
            "subtitle": "Ejemplo de sección adicional.",
            "html": "<p>Contenido HTML opcional (si lo habilitas).</p>",
        }

        section_data_map = {
            "hero": hero_data,
            "features": features_data,
            "services": services_data,
            "how_we_work": how_data,
            "three_cols": three_cols_data,
            "values": values_data,
            "team": team_data,
            "testimonials": testimonials_data,
            "videos": videos_data,
            "contact": contact_data,
            "custom": custom_data,
        }

        # ----------------------------
        # 5) Crear/actualizar secciones
        # ----------------------------
        created_count = 0
        updated_count = 0

        for type_key, title, order in DEFAULT_SECTIONS:
            defaults = {
                "title": title,
                "order": order,
                "is_active": True,
                "data": section_data_map.get(type_key, {}),
            }

            # custom inactiva por defecto
            if type_key == "custom":
                defaults["is_active"] = False

            section, created = PageSection.objects.get_or_create(
                page=home,
                type=type_key,
                defaults=defaults,
            )

            if created:
                created_count += 1
            else:
                if force:
                    section.title = defaults["title"]
                    section.order = defaults["order"]
                    section.is_active = defaults["is_active"]
                    section.data = defaults["data"]
                    section.save()
                    updated_count += 1
                else:
                    changed = False
                    if section.title != defaults["title"]:
                        section.title = defaults["title"]
                        changed = True
                    if section.order != defaults["order"]:
                        section.order = defaults["order"]
                        changed = True
                    if changed:
                        section.save()
                        updated_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"✅ Seed completado. Secciones creadas: {created_count}, actualizadas: {updated_count}"
            )
        )

        # ----------------------------
        # 6) Info útil
        # ----------------------------
        if not banners:
            self.stdout.write(
                self.style.WARNING(
                    "ℹ️ No hay banners en BD. La sección hero quedó sin slides. "
                    "Crea banners desde admin y vuelve a ejecutar el seed (o usa --force)."
                )
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    f"🎞️ HERO slides generadas desde banners existentes: {len(banners)}"
                )
            )

        self.stdout.write(self.style.SUCCESS("🌱 Listo."))
