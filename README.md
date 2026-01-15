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