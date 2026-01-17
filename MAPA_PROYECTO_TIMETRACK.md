# Mapeo y Estado del Proyecto TimeTrack

## Microservicios y sus Componentes

### 1. **appointments-ms (gestion_citas)**
- **Modelos:**
  - Cita
  - NotaMedica
  - HistoricoCita
  - ConfiguracionGlobal (reglas de negocio parametrizables)
- **Serializers:**
  - class NotaMedicaSerializer(serializers.ModelSerializer)
  - class CitaSerializer(serializers.ModelSerializer)
  - class HistoricoCitaSerializer(serializers.ModelSerializer)
  - class ConfiguracionGlobalSerializer(serializers.ModelSerializer)
- **Views:**
  - class ConfiguracionViewSet(viewsets.ModelViewSet)
  - class CitaViewSet(viewsets.ModelViewSet)
  - class NotaMedicaViewSet(viewsets.ModelViewSet)
  - class HistoricoCitaViewSet(viewsets.ReadOnlyModelViewSet)
- **URLs:**
  - `/citas/` (CitaViewSet)
  - `/notas/` (NotaMedicaViewSet)
  - `/historico/` (HistoricoCitaViewSet)
  - `/citas/configuracion/` (ConfiguracionViewSet)
- **Core:**
  - asgi.py, settings.py, urls.py, wsgi.py, __init__.py

### 2. **schedule-ms (agenda)**
- **Modelos:**
  - Disponibilidad (con validación de solapamiento y horas)
  - BloqueoAgenda (vacaciones, permisos, etc.)
- **Serializers:**
  - class DisponibilidadSerializer(serializers.ModelSerializer)
  - class BloqueoAgendaSerializer(serializers.ModelSerializer)
- **Views:**
  - class DisponibilidadViewSet(viewsets.ModelViewSet)
  - class BloqueoAgendaViewSet(viewsets.ModelViewSet)
- **URLs:**
  - `/disponibilidad/` (DisponibilidadViewSet)
  - `/bloqueos/` (BloqueoAgendaViewSet)
- **Core:**
  - asgi.py, settings.py, urls.py, wsgi.py, __init__.py

### 3. **professionals-ms (staff)**
- **Modelos:**
  - Especialidad
  - Lugar
  - Profesional (relaciones con especialidad y lugar)
  - Servicio (relación con profesional)
- **Serializers:**
  - class EspecialidadSerializer(serializers.ModelSerializer)
  - class LugarSerializer(serializers.ModelSerializer)
  - class ProfesionalSerializer(serializers.ModelSerializer)
  - class ServicioSerializer(serializers.ModelSerializer)
- **Views:**
  - class EspecialidadViewSet(viewsets.ModelViewSet)
  - class LugarViewSet(viewsets.ModelViewSet)
  - class ProfesionalViewSet(viewsets.ModelViewSet)
  - class ServicioViewSet(viewsets.ModelViewSet)
- **URLs:**
  - `/especialidades/` (EspecialidadViewSet)
  - `/lugares/` (LugarViewSet)
  - `/profesionales/` (ProfesionalViewSet)
  - `/servicios/` (ServicioViewSet)
- **Core:**
  - asgi.py, settings.py, urls.py, wsgi.py, __init__.py

### 4. **patients-ms (patients)**
- **Modelos:**
  - TipoPaciente
  - Paciente
  - SolicitudValidacion
- **Serializers:**
  - class TipoPacienteSerializer(serializers.ModelSerializer)
  - class PacienteSerializer(serializers.ModelSerializer)
- **Views:**
  - class TipoPacienteViewSet(viewsets.ModelViewSet)
  - class PacienteViewSet(viewsets.ModelViewSet)
- **URLs:**
  - `/listado/` (PacienteViewSet)
  - `/tipos/` (TipoPacienteViewSet)
- **Core:**
  - asgi.py, settings.py, urls.py, wsgi.py, __init__.py

### 5. **auth-ms (users)**
- **Modelos:**
  - CrearCuenta (usuario)
  - Auditoria
  - PermisoVista
  - MenuItem
- **Serializers:**
  - class UserSerializer(serializers.ModelSerializer)
  - class CustomTokenObtainPairSerializer(TokenObtainPairSerializer)
  - class MenuItemSerializer(serializers.ModelSerializer)
- **Views:**
  - class RegistroView(generics.CreateAPIView)
  - class CustomTokenObtainPairView(TokenObtainPairView)
  - class UserDetailView(generics.RetrieveUpdateAPIView)
  - class DynamicMenuView(APIView)
- **URLs:**
  - `/register/` (RegistroView)
  - `/login/` (CustomTokenObtainPairView)
  - `/login/refresh/` (TokenRefreshView)
  - `/me/` (UserDetailView)
  - `/menu/` (DynamicMenuView)
- **Core:**
  - asgi.py, settings.py, urls.py, wsgi.py, __init__.py

### 6. **notification-ms (comunicaciones)**
- **Modelos:**
  - Notificacion
- **Serializers:**
  - class NotificacionSerializer(serializers.ModelSerializer)
- **Views:**
  - class NotificacionViewSet(viewsets.ModelViewSet)
- **URLs:**
  - `/buzon/` (NotificacionViewSet)
- **Core:**
  - asgi.py, settings.py, urls.py, wsgi.py, __init__.py

### 7. **ia-ms (agent)**
- **Modelos:**
  - AIConfiguration (prompt, temperatura, activo)
  - ChatSession
  - ChatMessage
- **Serializers:**
  - class AIConfigurationSerializer(serializers.ModelSerializer)
  - class ChatMessageSerializer(serializers.ModelSerializer)
  - class ChatSessionSerializer(serializers.ModelSerializer)
- **Views:**
  - class ChatView(APIView)
  - class HistoryView(APIView)
- **URLs:**
  - `/chat/` (ChatView)
  - `/history/<usuario_id>/` (HistoryView)
- **Core:**
  - asgi.py, settings.py, urls.py, wsgi.py, __init__.py

### 8. **portal-ms (content, forms)**
- **Modelos:**
  - Banner, VideoGaleria (content)
  - ConvocatoriaHV, PQRS (forms)
- **Serializers:**
  - class BannerSerializer(serializers.ModelSerializer)
  - class VideoGaleriaSerializer(serializers.ModelSerializer)
  - class PQRSSerializer(serializers.ModelSerializer)
  - class ConvocatoriaHVSerializer(serializers.ModelSerializer)
- **Views:**
  - class BannerListView(generics.ListAPIView)
  - class VideoListView(generics.ListAPIView)
  - class PQRSCreateView(generics.CreateAPIView)
  - class HVCreateView(generics.CreateAPIView)
- **URLs:**
  - `/banners/` (BannerListView)
  - `/videos/` (VideoListView)
  - `/pqrs/` (PQRSCreateView)
  - `/trabaje-con-nosotros/` (HVCreateView)
- **Core:**
  - asgi.py, settings.py, urls.py, wsgi.py, __init__.py

---

## Mapeo Frontend - Microservicios

- **appointments-ms:**
  - Servicios: citasService.js
  - Páginas: MisCitas.jsx, NuevaCita.jsx
  - Estado: Implementado para listar, crear, cancelar citas. Falta: gestión de notas médicas, histórico.

- **schedule-ms:**
  - No se detectan páginas directas, pero la lógica de agenda puede estar integrada en la gestión de citas.
  - Falta: UI para gestión de disponibilidad/bloqueos (solo admin/profesional).

- **professionals-ms:**
  - Servicios: staffService.js
  - Páginas: Selección de profesional/servicio en NuevaCita.jsx
  - Estado: Implementado para consulta de servicios, lugares, profesionales.

- **patients-ms:**
  - Servicios: patientService.js
  - Páginas: Perfil.jsx, ValidarUsuarios.jsx
  - Estado: Implementado para perfil y validación. Falta: gestión avanzada de pacientes (admin).

- **auth-ms:**
  - Servicios: authService.js
  - Páginas: Login.jsx, Register.jsx
  - Estado: Implementado registro, login, validación de token. Falta: gestión avanzada de usuarios, auditoría.

- **notification-ms:**
  - No se detecta integración directa en frontend.
  - Falta: UI para buzón de notificaciones.

- **ia-ms:**
  - No se detecta integración directa en frontend.
  - Falta: UI para chat IA y visualización de historial.

- **portal-ms:**
  - Servicios: portalService.js
  - Páginas: Home.jsx, PQRS.jsx, TrabajeConNosotros.jsx
  - Estado: Implementado banners, videos, PQRS, hoja de vida.

---


## Reglas de Negocio Detectadas y Sugeridas

1. **Cancelación de citas:** Solo se permite cancelar si faltan más de X horas (parametrizable).
2. **Validación de solapamiento de disponibilidad:** Un profesional no puede tener dos horarios solapados el mismo día.
3. **Bloqueos de agenda:** No se pueden agendar citas en periodos bloqueados (vacaciones, permisos, etc.).
4. **Gestión de estados de cita:** No se borra, solo se cambia el estado (ej. CANCELADA).
5. **Consentimiento de datos:** El usuario debe aceptar tratamiento de datos para registrarse.
6. **Contraseña segura:** Mínimo 6 caracteres y validación de coincidencia.
7. **Gestión de PQRS:** Tipos y estados definidos, con seguimiento.
8. **Gestión de profesionales:** Un profesional debe tener especialidad, lugar y servicios habilitados.
9. **Singleton de configuración global:** Solo un registro para reglas globales.
10. **Validación de documentos únicos:** Documento y correo únicos para usuarios y profesionales.

# Reglas de Negocio del Sistema de Gestión de Citas

Este documento recopila y describe todas las reglas de negocio identificadas en el sistema, para servir de referencia y control durante la migración y evolución del proyecto.

---

## 1. Reglas de Agendamiento de Citas - Configurable parametrizable desde la aplicaion

- No se permiten citas simultáneas para un mismo profesional.
- Un paciente no puede agendar dos citas en el mismo horario.
- El tiempo mínimo entre citas para un profesional depende del tipo de servicio.
- Las citas deben ser agendadas dentro del horario laboral del profesional y la sede.
- No se pueden agendar citas en días festivos o fechas bloqueadas.
- El sistema debe validar la disponibilidad antes de confirmar una cita.
- Cancelación de citas solo permitida con al menos 24 horas de anticipación.
- Límite de citas activas por paciente (configurable).
- Pacientes con inasistencias reiteradas pueden ser bloqueados temporalmente.
- Solo se pueden reprogramar citas que no hayan ocurrido aún.
- ¿Se debe permitir re-agendar citas?

---

## 2. Reglas de Horarios y Disponibilidad - Configurable parametrizable desde la aplicaion

- Los profesionales deben tener horarios definidos para poder recibir citas.
- Los horarios pueden tener excepciones (días libres, vacaciones, feriados).
- No se pueden asignar horarios que se solapen para un mismo profesional.
- El sistema debe permitir bloquear horarios por mantenimiento, eventos o emergencias.
- El tiempo de descanso entre citas debe ser respetado según configuración. (Configurable parametrizable desde la aplicaion)
- Los horarios pueden ser modificados solo por administradores o el propio profesional.

---

## 3. Reglas de Usuarios y Seguridad

- Todos los usuarios deben registrarse con documento de identidad válido y único.
- El correo electrónico debe ser único y validado.
- Los usuarios deben aceptar la política de tratamiento de datos.
- Los usuarios pueden ser activados o desactivados por un administrador.
- Los roles y permisos determinan el acceso a funcionalidades y datos.
- El sistema debe registrar auditoría de accesos y cambios críticos.
- Las contraseñas deben cumplir requisitos mínimos de seguridad.
- El sistema debe bloquear cuentas tras varios intentos fallidos de acceso. debe permitir al administrador desbloquear desde el sistema

---

## 4. Reglas de Pacientes y Profesionales

- Un paciente solo puede estar asociado a un tipo de usuario a la vez.
- Los datos personales de pacientes y profesionales deben ser actualizables y auditados.
- Los profesionales pueden estar asociados a múltiples sedes y servicios.
- Los profesionales pueden definir su disponibilidad y servicios ofrecidos.
- Los pacientes pueden consultar y descargar su historial de citas.

---

## 5. Reglas de Servicios y Lugares

- Cada servicio debe tener un nombre único y una duración definida.
- Los servicios pueden ser ofrecidos solo en ciertas sedes.
- Los precios de los servicios pueden variar por sede o profesional.
- Los lugares (sedes) pueden ser activados o desactivados.
- No se pueden agendar servicios en sedes inactivas.

---

## 6. Reglas de Notificaciones

- El sistema debe enviar confirmaciones y recordatorios de citas por correo y/o SMS. parametrizable desde el sistema
- Las notificaciones deben ser enviadas con suficiente anticipación (configurable).
- Los cambios o cancelaciones de citas deben ser notificados inmediatamente.
- Los usuarios pueden configurar sus preferencias de notificación.

---

## 7. Reglas de Reportes y Auditoría

- El sistema debe registrar todas las acciones críticas (creación, edición, cancelación de citas, cambios de usuario, etc.).
- Los reportes deben poder filtrarse por fechas, profesional, paciente, servicio y sede.
- Los administradores pueden exportar reportes en formatos estándar (CSV, PDF).
- El historial de auditoría debe ser inalterable y consultable por administradores.

## otras cosas a tener en cuenta.

Diagnóstico de Brechas (Gap Analysis)
Basado en la comparativa entre los endpoints disponibles y las páginas detectadas:

A. Integración de Notificaciones (Prioridad Alta)
Estado Actual: Existe el microservicio notification-ms con el modelo Notificacion y endpoint /buzon/, pero el frontend no tiene componentes para consumirlo.

Funcionalidad Faltante:

No hay comunicación entre appointments-ms y notification-ms. Cuando se crea una cita, no se dispara la notificación.

Falta un componente visual (ej. "Campana" en el Navbar) en React.

Propuesta de Mejora:

Backend: Implementar señales (Signals) o un sistema de mensajería (RabbitMQ/Redis) para que cuando CitaViewSet confirme una cita, envíe un evento a notification-ms.

Frontend: Crear un contexto NotificationContext en React que haga polling (o use WebSockets) al endpoint /buzon/.

B. Módulo de Chat IA (Prioridad Alta)
Estado Actual: ia-ms tiene modelos completos (AIConfiguration, ChatSession, ChatMessage) y vistas, pero es "invisible" en el frontend.

Funcionalidad Faltante:

Interfaz de Chat (Widget flotante).

Persistencia visual del historial (HistoryView existe en backend pero no se usa).

Propuesta de Mejora:

Implementar un Floating Action Button (FAB) en el layout principal que abra el chat.

Consumir HistoryView al abrir el chat para cargar la conversación previa del usuario logueado.

C. Gestión Avanzada de Usuarios y Pacientes
Estado Actual:

auth-ms y patients-ms están funcionales para lo básico (Login, Registro, Perfil).

Falta la gestión administrativa ("CRUD Admin") mencionada en el mapa.

Funcionalidad Faltante:

Panel de Administrador para: Bloquear usuarios, cambiar roles, ver auditoría (Auditoria modelo ya existe).

Gestión de BloqueoAgenda en schedule-ms.

Propuesta de Mejora:

Crear un Layout exclusivo para Admin (/admin/dashboard) en el frontend que consuma UserDetailView y PacienteViewSet con permisos elevados.

D. Administración de Agenda (Profesionales)
Estado Actual: schedule-ms tiene la lógica de disponibilidad, pero no hay interfaz para que el médico diga "Trabajo de 8:00 a 12:00".

Propuesta de Mejora:

Integrar una librería de calendario en React (ej. react-big-calendar o FullCalendar).

Conectar eventos de "clic en celda" con el endpoint DisponibilidadViewSet.

2. Nuevas Reglas de Negocio Sugeridas
Para robustecer el sistema, sugiero añadir estas reglas a las ya existentes en la sección de "Reglas de Negocio":

Regla de "No-Show" (Inasistencias):

Lógica: Si un paciente acumula 3 citas en estado "INCUMPLIDA" (nuevo estado sugerido) en un periodo de 6 meses, el sistema bloqueará automáticamente su capacidad de agendar nuevas citas por 30 días.

Regla de Integridad de IA:

Lógica: El ia-ms debe tener un límite de tokens por usuario/día (configurable en AIConfiguration) para evitar costos excesivos.

Privacidad: Los prompts enviados a la IA deben ser sanitizados (eliminar nombres reales o cédulas) antes de salir del microservicio.

Regla de Caducidad de Notificaciones:

Lógica: Las notificaciones no leídas mayores a 90 días se archivan o eliminan automáticamente para no saturar la base de datos.

Validación Cruzada de Agenda:

Lógica: Antes de crear un BloqueoAgenda (ej. vacaciones médico), el sistema debe verificar si ya existen citas agendadas en ese rango. Si existen, debe obligar a reprogramarlas o cancelarlas antes de permitir el bloqueo.

3. Estrategia de Pruebas Automáticas
Dado que tienes múltiples microservicios, la estrategia de pruebas debe ser piramidal:

A. Backend (Django - Pytest)
Crear tests unitarios para las reglas de negocio críticas en cada microservicio:

appointments-ms: Testear que no se pueda cancelar una cita si hora_actual > hora_cita - X_horas.

schedule-ms: Testear masivamente la detección de solapamientos (overlap) en Disponibilidad.

auth-ms: Testear la generación y refresco de tokens JWT.

B. Frontend (React - Vitest/Jest + React Testing Library)
Probar que los formularios de Login y Registro validen correctamente los campos antes de enviar.

Probar que los Services (citasService.js, etc.) manejen correctamente los errores 401 (Token expirado) y 403 (Prohibido).

C. End-to-End (Cypress o Playwright)
Flujo Crítico 1: Usuario se registra -> Se loguea -> Busca profesional -> Agenda Cita -> Ve la cita en "Mis Citas".

4. Estrategia de Documentación
Swagger / OpenAPI (Backend):

Instalar drf-yasg o drf-spectacular en cada microservicio. Esto generará una UI automática (/swagger/) para que el equipo de frontend sepa exactamente qué JSON enviar sin tener que leer el código Python.

Storybook (Frontend):

Documentar componentes visuales reutilizables (Botones, Inputs, Cards de Citas). Esto acelera el desarrollo de las nuevas pantallas de administración.

Diagrama de Secuencia (Arquitectura):

Documentar el flujo de autenticación y cómo el Gateway (Nginx) enruta las peticiones a cada microservicio.

## Rutas Clave de Archivos

### Frontend
- Páginas principales:
  - Admin Configuración: C:\Users\Samuel\Documents\GitHub\TimeTrack\frontend\src\pages\admin\ConfiguracionSistema.jsx
  - Validar Usuarios: C:\Users\Samuel\Documents\GitHub\TimeTrack\frontend\src\pages\admin\ValidarUsuarios.jsx
  - Login: C:\Users\Samuel\Documents\GitHub\TimeTrack\frontend\src\pages\auth\Login.jsx
  - Registro: C:\Users\Samuel\Documents\GitHub\TimeTrack\frontend\src\pages\auth\Register.jsx
  - Home: C:\Users\Samuel\Documents\GitHub\TimeTrack\frontend\src\pages\portal\Home.jsx
  - PQRS: C:\Users\Samuel\Documents\GitHub\TimeTrack\frontend\src\pages\portal\PQRS.jsx
  - Trabaje Con Nosotros: C:\Users\Samuel\Documents\GitHub\TimeTrack\frontend\src\pages\portal\TrabajeConNosotros.jsx
  - Dashboard: C:\Users\Samuel\Documents\GitHub\TimeTrack\frontend\src\pages\system\Dashboard.jsx
  - Mis Citas: C:\Users\Samuel\Documents\GitHub\TimeTrack\frontend\src\pages\system\MisCitas.jsx
  - Nueva Cita: C:\Users\Samuel\Documents\GitHub\TimeTrack\frontend\src\pages\system\NuevaCita.jsx
  - Perfil: C:\Users\Samuel\Documents\GitHub\TimeTrack\frontend\src\pages\system\Perfil.jsx

- Servicios principales:
  - Citas: C:\Users\Samuel\Documents\GitHub\TimeTrack\frontend\src\services\citasService.js
  - Pacientes: C:\Users\Samuel\Documents\GitHub\TimeTrack\frontend\src\services\patientService.js
  - Staff: C:\Users\Samuel\Documents\GitHub\TimeTrack\frontend\src\services\staffService.js
  - Auth: C:\Users\Samuel\Documents\GitHub\TimeTrack\frontend\src\services\authService.js
  - Portal: C:\Users\Samuel\Documents\GitHub\TimeTrack\frontend\src\services\portalService.js
  - Configuración: C:\Users\Samuel\Documents\GitHub\TimeTrack\frontend\src\services\configService.js

### Backend (Microservicios)
- appointments-ms: C:\Users\Samuel\Documents\GitHub\TimeTrack\microservices\appointments-ms\gestion_citas\
- schedule-ms: C:\Users\Samuel\Documents\GitHub\TimeTrack\microservices\schedule-ms\agenda\
- professionals-ms: C:\Users\Samuel\Documents\GitHub\TimeTrack\microservices\professionals-ms\staff\
- patients-ms: C:\Users\Samuel\Documents\GitHub\TimeTrack\microservices\patients-ms\patients\
- auth-ms: C:\Users\Samuel\Documents\GitHub\TimeTrack\microservices\auth-ms\users\
- notification-ms: C:\Users\Samuel\Documents\GitHub\TimeTrack\microservices\notification-ms\comunicaciones\
- ia-ms: C:\Users\Samuel\Documents\GitHub\TimeTrack\microservices\ia-ms\agent\
- portal-ms: C:\Users\Samuel\Documents\GitHub\TimeTrack\microservices\portal-ms\content\ y ...\forms\

---

## Tecnologías y Estrategia de Desarrollo

- **Backend:**
  - Arquitectura de microservicios usando Django y Django REST Framework.
  - Cada microservicio es un proyecto Django independiente, orquestado con Docker Compose.
  - Base de datos principal: PostgreSQL (ver docker/postgres/init-multiple-dbs.sql).
  - Comunicación entre servicios vía API REST y gateway Nginx.
  - Versiones principales:
    - Python: 3.11 (ver Dockerfile de microservicios)
    - Django: 4.x
    - Django REST Framework: 3.x

- **Frontend:**
  - React 18.x (ver frontend/package.json)
  - Vite como bundler y servidor de desarrollo.
  - TailwindCSS para estilos.
  - Axios para consumo de APIs.
  - Estructura modular por páginas y servicios.
  - Desplegado en contenedor Docker propio.

- **Orquestación y DevOps:**
  - Docker y Docker Compose para levantar todos los servicios y el frontend.
  - Nginx como gateway reverso y balanceador.
  - Estrategia: separación estricta de dominios de negocio, escalabilidad horizontal, despliegue independiente de cada microservicio y frontend.


---

## Avances del 16 de enero de 2026

- Se realizó un diagnóstico y solución integral a problemas de CORS y preflight en la comunicación entre el frontend (React) y el microservicio de usuarios (auth-ms), asegurando que los headers y métodos OPTIONS sean correctamente gestionados tanto en Django como en Nginx.
- Se verificó y documentó la existencia y correcta exposición de la ruta `/api/v1/users/admin/users/` en el backend, así como su integración en el router y urls.py.
- Se actualizó la configuración de Nginx (`gateway/nginx.conf`) para enrutar correctamente `/api/v1/users/` hacia el microservicio de autenticación y permitir CORS en todas las rutas relevantes.
- Se validó y documentó el uso correcto de interceptores en `axiosConfig.js` para el envío automático del token JWT en cada request.
- Se comprobó que el backend responde con los códigos HTTP esperados (401, 405, 404) y se resolvieron los problemas de autenticación y preflight.
- Se revisó y confirmó la correcta implementación de los métodos `get_authenticators` y `get_permissions` en el `UserAdminViewSet` para permitir solicitudes OPTIONS.
- Se dejó documentado el flujo de troubleshooting para futuras referencias y se reforzó la trazabilidad de rutas y servicios en el mapa del proyecto.

> Avances registrados automáticamente por GitHub Copilot.

> Documento generado automáticamente para diagnóstico y planificación.


Aquí tienes el resumen de tu Stack de Diseño (UI) actual:

Estilos y Maquetación: Tailwind CSS

Lo identificas por las clases utilitarias en el código: className="bg-blue-900 text-white p-4 rounded-xl shadow-lg".

No estamos usando componentes prefabricados (como Material UI o Bootstrap), sino construyendo los nuestros con HTML + clases de Tailwind.

Íconos: React Icons

Específicamente el paquete FontAwesome 5 (react-icons/fa).

Ejemplo: <FaUserMd />, <FaCalendarCheck />.

Alertas y Modales: SweetAlert2

Para todas las ventanas emergentes bonitas, confirmaciones y el formulario de registro rápido ("Modal Express").

Ejemplo: Swal.fire({...}).

Animaciones (Leves):

Estamos usando las transiciones nativas de Tailwind (transition duration-300 hover:scale-105) para los efectos de los botones y el sidebar.