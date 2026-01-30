# Comandos claves para el proyecto

1. Estructura de Carpetas Inicial

mkdir TimeTrack
cd TimeTrack
mkdir microservices infrastructure
mkdir microservices/auth-ms

2. Configuración de Docker (Infraestructura Base)
version: '3.8'

services:
  db:
    image: postgres:15
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=timetrack_db
      - POSTGRES_USER=admin
      - POSTGRES_PASSWORD=tu_password_segura
    ports:
      - "5432:5432"

  redis:
    image: redis:alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:

3. Creación del Primer Microservicio: auth-ms

pip install django djangorestframework django-environ psycopg2-binary djangorestframework-simplejwt django-cors-headers
django-admin startproject core .

4. Inicialización del Proyecto Django

* Levantar la base de datos y Redis: docker-compose up -d db redis

* Crear el proyecto Django dentro del contenedor: docker-compose run --rm portal-ms django-admin startproject core .

* Crear la aplicación de usuarios: docker-compose run --rm portal-ms python manage.py startapp content

5. Ejecutar Migraciones iniciales

docker-compose run --rm ia-ms python manage.py makemigrations agent
docker-compose run --rm ia-ms python manage.py migrate

6. Crear un super usuario:

docker-compose run --rm ia-ms python manage.py createsuperuser

7. Prueba de json microservicios para user:

1. Prueba de Registro (Crear Usuario)
Vamos a crear un usuario que simule ser un paciente.

Método: POST

URL: http://localhost:8000/api/auth/register/

Body: Selecciona raw y luego JSON.

Copia y pega este JSON:

JSON

{
    "username": "juanperez",
    "email": "juan.perez@email.com",
    "nombre": "Juan Perez",
    "cedula": "123456789",
    "tipo_documento": "CC",
    "numero": "3001234567",
    "password": "passwordSegura123",
    "paciente_id": 101,
    "profesional_id": null
}
Nota: Estamos enviando un paciente_id: 101 ficticio. Más adelante, el script de migración llenará este campo con el ID real de la base de datos antigua.

Resultado Esperado: Status 201 Created y los datos del usuario creado (sin el password).

2. Prueba de Login (Obtener Token)
Aquí validamos dos cosas: que la autenticación funcione con Cédula (nuestra regla de negocio) y que el token traiga los datos personalizados.

Método: POST

URL: http://localhost:8000/api/auth/login/

Body: Raw / JSON.

JSON

{
    "cedula": "123456789",
    "password": "passwordSegura123"
}
Resultado Esperado: Status 200 OK. Recibirás dos tokens:

JSON

{
    "refresh": "eyJhbGciOiJIUzI1NiIsInR5...",
    "access": "eyJhbGciOiJIUzI1NiIsInR5..."
}

Paso 1: Crear la nueva base de datos (vacía)
Ejecuta esto en tu terminal. Esto le dice a Postgres: "Crea un nuevo espacio, pero deja el anterior quieto".

PowerShell

docker-compose exec db psql -U postgres -c "CREATE DATABASE patients_db;"

mkdir microservices/schedule-ms



LIBRERIAS FRONT 

# axios: Para conectar con tu API Gateway
# react-router-dom: Para navegar entre Inicio, PQRS, Login, etc.
# swiper: Para el carrusel de banners (la mejor librería para esto)
docker-compose exec frontend npm install axios react-router-dom swiper react-icons

docker-compose exec frontend npm install framer-motion react-countup react-intersection-observer

docker-compose exec frontend npm install sweetalert2 sweetalert2-react-content

docker-compose exec frontend npm install jwt-decode

docker-compose restart frontend


# Iniciar la base de datos , imagenes y servicios.
# Opcional: Solo si necesitas entrar al admin de Banners (localhost:8007/admin)
docker-compose exec schedule-ms python manage.py createsuperuser
docker-compose exec portal-ms python manage.py makemigrations
docker-compose exec portal-ms python manage.py migrate


docker-compose exec patients-ms python manage.py makemigrations
docker-compose exec patients-ms python manage.py migrate



docker-compose exec professionals-ms python manage.py makemigrations
docker-compose exec professionals-ms python manage.py migrate

docker-compose exec auth-ms python manage.py createsuperuser

docker-compose exec schedule-ms python manage.py makemigrations
docker-compose exec schedule-ms python manage.py migrate

docker-compose exec appointments-ms python manage.py makemigrations
docker-compose exec appointments-ms python manage.py migrate



docker-compose exec notification-ms python manage.py makemigrations
docker-compose exec notification-ms python manage.py migrate

docker-compose exec ia-ms python manage.py makemigrations
docker-compose exec ia-ms python manage.py migrate

docker-compose exec auth-ms python manage.py makemigrations
docker-compose exec auth-ms python manage.py migrate

## Cambios o ajustes a realizar:

1. En Gestion del profesional poder quitar uno o mas servicios sin necesidad de volver a marcar los otros que ya existen
2. En Gestion Usuario agregar para el perfil administrador el Tipo de usuario (ejemplo particular, fomag otros convenios)
3. En mis agendas solo debera salir los servicios que corresponde al Tipo paciente ejemplo a los pacientes tipo particular no deberia salirle otros servicios diferentes que no esten categorizados solo para particular. 
class TipoPaciente(models.Model):
    """Categorización (Ej: EPS, Particular, Prepagada)"""
    nombre = models.CharField(max_length=100, unique=True) # legacy: nombre_tipo
    activo = models.BooleanField(default=True) # legacy: estado_tipo

    def __str__(self):
        return self.nombre

class Servicio(models.Model):
    nombre = models.CharField(max_length=255)
    descripcion = models.TextField(blank=True)
    duracion_minutos = models.IntegerField() 
    precio_base = models.DecimalField(max_digits=10, decimal_places=2)
    
    profesionales = models.ManyToManyField(Profesional, related_name='servicios_habilitados', blank=True)
    
    activo = models.BooleanField(default=True)

    TIPO_ACCESO = [
        ('TODOS', 'Para todos los pacientes'),
        ('PARTICULAR', 'Solo Particulares'),
        ('EPS', 'Solo EPS/Convenios'),
    ]

    acceso_permitido = models.CharField(max_length=20, choices=TIPO_ACCESO, default='TODOS')

    class Meta:
        verbose_name = "Servicio"
        verbose_name_plural = "Servicios"

    def __str__(self):
        return self.nombre

    # --- PROTECCIÓN DE BORRADO ---
    def delete(self, *args, **kwargs):
        if self.profesionales.exists():
             raise ValidationError(
                {"detail": f"No se puede borrar el servicio '{self.nombre}' porque hay profesionales habilitados para realizarlo. Desactívelo."}
            )
        super().delete(*args, **kwargs)

4. Se debe saber como se esta relacionando el TIPO de acceso con el tipo usuario para garantizar que le estan saliendo a los tipo usuario las agedas que son.
5. En la gestion de la agenda hay que habilitar el campo para que el administrador pueda decir los minutos que tendra  General / Mixto esto ya lo teniamos antes y se perdio.
6. Cuando se gestiona el Bloqueo y se le da clic al boton 'Gestionar Bloqueo (Día)' solo sale un mensaje Gestión de Bloqueo para la fecha pero no pide el motivo ni lo bloquea ni cambia de color el cuadrito en la grilla ni nada. 
7. Al borrar de la parte inferior de la grilla un medico y volverlo a buscar queda con el mismo color del medico que quedo en el filtro ejemplo quedan dos profesionales con el mismo color en la grilla.
8. Revisar administrar citas para que funcione correctamente los cambios de estado.

Te paso todos los codigo relacionados con estas solicitudes para que avancemos uno a uno

OJO REVISAR ADMINSTRAR CITAS.

ahora continuemos con el codigo completo de GestionAgenda con el ajuste sobre esta version y esperas que lo copie para continuar con el otro 
ahora continuemos con el codigo completo de AdminCitas con el ajuste sobre esta version 


# 1. Auth MS
docker compose run --rm -v ${PWD}/pyproject.toml:/app/pyproject.toml auth-ms ruff check --fix .

# 2. Appointments MS
docker compose run --rm -v ${PWD}/pyproject.toml:/app/pyproject.toml appointments-ms ruff check --fix .

# 3. Patients MS
docker compose run --rm -v ${PWD}/pyproject.toml:/app/pyproject.toml patients-ms ruff check --fix .

# 4. Professionals MS
docker compose run --rm -v ${PWD}/pyproject.toml:/app/pyproject.toml professionals-ms ruff check --fix .

# 5. Schedule MS
docker compose run --rm -v ${PWD}/pyproject.toml:/app/pyproject.toml schedule-ms ruff check --fix .

# 6. Portal MS
docker compose run --rm -v ${PWD}/pyproject.toml:/app/pyproject.toml portal-ms ruff check --fix .

# 7. Notification MS
docker compose run --rm -v ${PWD}/pyproject.toml:/app/pyproject.toml notification-ms ruff check --fix .

# 8. IA MS
docker compose run --rm -v ${PWD}/pyproject.toml:/app/pyproject.toml ia-ms ruff check --fix .


# 1. Auth MS
docker compose run --rm -v ${PWD}/pyproject.toml:/app/pyproject.toml auth-ms ruff format .

# 2. Appointments MS
docker compose run --rm -v ${PWD}/pyproject.toml:/app/pyproject.toml appointments-ms ruff format .

# 3. Patients MS
docker compose run --rm -v ${PWD}/pyproject.toml:/app/pyproject.toml patients-ms ruff format .

# 4. Professionals MS
docker compose run --rm -v ${PWD}/pyproject.toml:/app/pyproject.toml professionals-ms ruff format .

# 5. Schedule MS
docker compose run --rm -v ${PWD}/pyproject.toml:/app/pyproject.toml schedule-ms ruff format .

# 6. Portal MS
docker compose run --rm -v ${PWD}/pyproject.toml:/app/pyproject.toml portal-ms ruff format .

# 7. Notification MS
docker compose run --rm -v ${PWD}/pyproject.toml:/app/pyproject.toml notification-ms ruff format .

# 8. IA MS
docker compose run --rm -v ${PWD}/pyproject.toml:/app/pyproject.toml ia-ms ruff format .



