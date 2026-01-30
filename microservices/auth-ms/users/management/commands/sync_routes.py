import re
import os
from django.core.management.base import BaseCommand
from users.models import MenuItem, PermisoVista
from django.db import transaction

class Command(BaseCommand):
    help = 'Sincroniza rutas protegidas de React (App.jsx) a la BD usando requiredPermission'

    def handle(self, *args, **options):
        # Esta ruta debe coincidir con el volumen en docker-compose
        file_path = '/app/source_feed/App.jsx'

        if not os.path.exists(file_path):
            self.stdout.write(self.style.ERROR(f'No se encontró App.jsx en {file_path}. Verifica el volumen en docker-compose.'))
            return

        self.stdout.write(f'Leyendo rutas protegidas de: {file_path}...')

        try:
            with open(file_path, 'r', encoding='utf-8') as file:
                content = file.read()

            # --- 1. REGEX AVANZADO ---
            # Buscamos bloques que contengan 'path="..."' Y LUEGO 'requiredPermission="..."'
            # re.DOTALL permite que el .*? salte líneas (multilínea)
            # Grupo 1: La URL (path)
            # Grupo 2: El Permiso (requiredPermission)
            regex_pattern = r'path=["\']([^"\']+)["\'].*?requiredPermission=["\']([^"\']+)["\']'
            
            # Encontramos todas las coincidencias (Tuplas: url, permiso)
            rutas_protegidas = re.findall(regex_pattern, content, re.DOTALL)
            
            # Rutas explícitas a ignorar (por si acaso alguna se cuela)
            rutas_ignoradas = ['/', '/login', '/register', '/olvido-password', '*']

            nuevos = 0
            existentes = 0
            
            with transaction.atomic():
                for url, permission_name in rutas_protegidas:
                    
                    # Filtro de seguridad: Si la ruta está en la lista negra, saltar
                    if url in rutas_ignoradas:
                        continue

                    # Generamos un Label bonito para el menú (ej: /dashboard/citas -> Citas)
                    # Tomamos la última parte de la URL y la capitalizamos
                    label_text = url.split('/')[-1].replace('-', ' ').title()
                    if not label_text: label_text = "Item"

                    # --- A. PERMISOS VISTA ---
                    # Usamos 'permission_name' (ej: 'acceso_mis_citas') como el ID único
                    permiso, created_p = PermisoVista.objects.get_or_create(
                        codename=permission_name, 
                        defaults={
                            'descripcion': f'Acceso a pantalla: {label_text}'
                            # roles: queda vacío por defecto
                        }
                    )

                    # --- B. MENU ITEMS ---
                    # Solo creamos menú si es una ruta protegida válida.
                    # get_or_create busca por 'url'. Si ya existe, NO lo toca.
                    menu, created_m = MenuItem.objects.get_or_create(
                        url=url,
                        defaults={
                            'label': label_text,
                            'icon': 'fa-circle', # Icono genérico (se cambia en admin)
                            'order': 99 # Orden genérico (se cambia en admin)
                        }
                    )

                    if created_p or created_m:
                        self.stdout.write(self.style.SUCCESS(f' + Sincronizado: {label_text} -> Permiso: {permission_name}'))
                        nuevos += 1
                    else:
                        existentes += 1

            if nuevos == 0:
                self.stdout.write(self.style.WARNING(f'No hay cambios. {existentes} rutas ya existían.'))
            else:
                self.stdout.write(self.style.SUCCESS(f'Proceso finalizado. {nuevos} nuevos elementos creados.'))

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error procesando archivo: {e}'))