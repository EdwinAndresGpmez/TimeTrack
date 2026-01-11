# 📋 Estado del Proyecto: TimeTrack (Migración a Microservicios)
**Fecha de actualización:** 08 Enero 2026
**Arquitectura:** Microservicios (Django + DRF + Docker + PostgreSQL + Redis)

---

## 🏗️ 1. Infraestructura y Puertos
Hemos configurado 6 microservicios independientes, cada uno con su propia base de datos PostgreSQL para evitar conflictos de migraciones (`auth_user`).

| Microservicio | Puerto | Base de Datos (Postgres) | Estado | Descripción |
| :--- | :--- | :--- | :--- | :--- |
| **auth-ms** | `8000` | `citas_bd` (legacy) | ✅ Listo | Usuarios, JWT, Roles, Seguridad. |
| **patients-ms** | `8001` | `patients_db` | ✅ Listo | Datos demográficos de pacientes. |
| **professionals-ms**| `8002` | `professionals_db` | ✅ Listo | Médicos, Sedes y **Catálogo de Servicios**. |
| **schedule-ms** | `8003` | `schedule_db` | ✅ Listo | Disponibilidad y Bloqueos de Agenda. |
| **appointments-ms** | `8004` | `appointments_db` | ✅ Listo | Citas, Historia Clínica, Auditoría. |
| **notification-ms** | `8005` | `notifications_db` | ✅ Listo | Buzón de mensajes (Email/Sistema). |
| **reports-ms** | N/A | N/A | ⏳ Pospuesto | Fase de Analítica (Futuro). |

---

## 🧩 2. Detalle por Microservicio

### 🔐 1. Auth-MS (Usuarios)
* **Modelos:** `CrearCuenta` (Custom User), `Auditoria`, `MenuItem`, `PermisoVista`.
* **Lógica Clave:**
    * Login por **Cédula**.
    * Token JWT personalizado incluye `paciente_id` y `profesional_id`.
    * Admin personalizado (`CustomUserAdmin`) para gestionar claves y relaciones.
* **API:** Registro, Login, Refresh Token, User Detail (`/me`), Menú Dinámico.

### 🏥 2. Patients-MS (Pacientes)
* **Modelos:** `Paciente`, `TipoPaciente`.
* **Lógica Clave:**
    * Gestión CRUD básica.
    * Búsqueda por cédula y nombre.
* **Nota:** Se separó la DB para evitar conflicto con la tabla `auth_user` de Auth-MS.

### 👨‍⚕️ 3. Professionals-MS (Staff)
* **Modelos:** `Profesional`, `Lugar`, `Especialidad`, `Servicio`.
* **Decisión de Diseño:** El modelo `Servicio` se incluyó aquí (y no en un MS aparte) por su fuerte vinculación con el profesional.
* **API:**
    * Serializadores anidados para lectura (ver nombres) y planos para escritura (IDs).
    * Filtros avanzados (`django-filter`) por especialidad y ciudad.

### 📅 4. Schedule-MS (Agenda)
* **Modelos:** `Disponibilidad` (Horario Recurrente), `BloqueoAgenda` (Novedades).
* **Lógica Clave:**
    * Validaciones de hora (`inicio < fin`).
    * API permite consultar disponibilidad por médico, día y lugar.
* **Dependencia:** Requiere `django-filter` instalado.

### 🩺 5. Appointments-MS (Citas)
* **Modelos:**
    * `Cita`: Núcleo del sistema. Une IDs de todos los otros MS.
    * `NotaMedica`: Historia clínica (evolución).
    * `HistoricoCita`: Tabla desnormalizada (texto plano) para auditoría y futuros reportes.
* **Lógica Clave:** Manejo de estados (Programada, Confirmada, Cancelada, Realizada).

### 🔔 6. Notification-MS (Comunicaciones)
* **Modelos:** `Notificacion` (Asunto, Mensaje, Leída).
* **Estado:** Estructura base lista. Falta implementar lógica de envío real de correos (SMTP/SendGrid).

---

## 🛠️ 3. Comandos Útiles (Docker)

**Levantar todo:**
```bash
docker-compose up -d