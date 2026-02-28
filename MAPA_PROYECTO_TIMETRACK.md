# Mapeo y Estado del Proyecto TimeTrack
**Actualizado:** 22 de Enero, 2026

**Última revisión automática:** 28 de Febrero, 2026

> Arquitectura de Microservicios con Django (Backend), React + Vite (Frontend), Nginx (Gateway), PostgreSQL (DB Centralizada) y Redis

---

## 📊 Resumen de Infraestructura

| Microservicio | Puerto | Estado | Descripción |
|:---|:---:|:---:|:---|
| **API Gateway** (Nginx) | 8080 | ✅ Operativo | Proxy inverso enrutando `/api/v1/` |
| **Database** (PostgreSQL 15) | 5432 | ✅ Operativo | Base de datos centralizada 7→1 |
| **Cache** (Redis) | 6379 | ✅ Operativo | Cache y sesiones |
| **auth-ms** | 8000 | ✅ Completo | Autenticación JWT, usuarios, roles |
| **patients-ms** | 8001 | ✅ Completo | Gestión de pacientes e historias |
| **professionals-ms** | 8002 | ✅ Completo | Profesionales, especialidades, servicios |
| **schedule-ms** | 8003 | ✅ Completo | Disponibilidad y bloqueos de agenda |
| **appointments-ms** | 8004 | ✅ Completo | Reserva y gestión de citas |
| **notification-ms** | 8005 | 🔄 Parcial | Backend listo, integración email/SMS pendiente |
| **ia-ms** | 8006 | ✅ Completo | Chatbot IA, sesiones y configuración |
| **portal-ms** | 8007 | 🔄 Parcial | Modelos, serializers y endpoints banners/videos listos, PQRS/HV en progreso |
| **frontend** | 5173 | ✅ Avanzado | React + Vite + TailwindCSS, portal público y paneles funcionales |

---

## 🛠️ Infraestructura y DevOps

- **Docker Compose**: Orquestación de todos los microservicios, frontend y servicios de infraestructura (PostgreSQL, Redis, Nginx).
- **CI/CD**: Sugerido implementar pipelines automáticos para pruebas, build y despliegue (GitHub Actions, GitLab CI, etc.).
- **Monitoreo y Logs**: Falta integración de monitoreo centralizado (ej. Prometheus, Grafana, Sentry, ELK). Recomendado para producción.
- **Backups**: No documentado el flujo de backups automáticos de BD y archivos.
- **Seeds y Datos Demo**: Mejorar scripts de carga de datos demo para ambientes de desarrollo y testing.

---

## 🔧 Microservicios - Detalle Técnico

### 1. **auth-ms** (Puerto 8000) ✅ COMPLETO
**BD:** `auth_db` → User(Django), Auditoria, PermisoVista, MenuItem

**Modelos:**
- `User` (Django nativo + custom fields)
- `Auditoria` - Registra acciones de usuarios
- `PermisoVista` - Asignación de vistas por rol
- `MenuItem` - Menú dinámico

**Endpoints:**
- `POST /api/v1/auth/register/` - Registro de usuarios
- `POST /api/v1/auth/login/` - Login con JWT (cedula + password)
- `POST /api/v1/auth/login/refresh/` - Refresh token
- `GET /api/v1/auth/me/` - Datos del usuario autenticado
- `GET /api/v1/auth/menu/` - Menú dinámico por rol

**Estado:** ✅ Funcional - Login probado, JWT operativo, CORS configurado

---

### 2. **patients-ms** (Puerto 8001) ✅ COMPLETO
**BD:** `patients_db` → TipoPaciente, Paciente, SolicitudValidacion

**Modelos:**
```python
- TipoPaciente: Categorización (EPS, Particular, Prepagada)
- Paciente: Datos clínicos, contacto, tipo_documento, referencias a Auth-MS
- SolicitudValidacion: Auditoría de solicitudes de acceso
```

**Endpoints:**
- `GET /api/v1/patients/listado/` - Listar pacientes
- `POST /api/v1/patients/listado/` - Crear paciente
- `GET /api/v1/patients/tipos/` - Tipos de paciente
- `GET /api/v1/patients/<id>/` - Detalle paciente

**Estado:** ✅ Funcional - Modelos completos, admin habilitado

---

### 3. **professionals-ms** (Puerto 8002) ✅ COMPLETO
**BD:** `professionals_db` → Especialidad, Lugar, Profesional, Servicio

**Modelos:**
```python
- Especialidad: Médico, Odontología, etc.
- Lugar: Sedes/consultorios con dirección y ciudad
- Profesional: Datos del médico (M:M con Especialidad y Lugar)
- Servicio: Servicios ofrecidos con duración, precio, acceso (TODOS/PARTICULAR/EPS)
```

**Endpoints:**
- `GET /api/v1/professionals/especialidades/` - Listado de especialidades
- `GET /api/v1/professionals/lugares/` - Sedes disponibles
- `GET /api/v1/professionals/profesionales/` - Médicos y detalles
- `GET /api/v1/professionals/servicios/` - Servicios disponibles
- CRUD completo para cada recurso

**Estado:** ✅ Funcional - Validaciones de borrado implementadas (protección de foreign keys)

---

### 4. **schedule-ms** (Puerto 8003) ✅ COMPLETO
**BD:** `schedule_db` → Disponibilidad, BloqueoAgenda

**Modelos:**
```python
- Disponibilidad: Horarios de atención (profesional_id, fecha, hora_inicio, hora_fin)
  - Validación: No solapamiento, rango de horas válido
- BloqueoAgenda: Vacaciones, permisos, mantenimiento
  - Campos: profesional_id, fecha_inicio, fecha_fin, motivo
```

**Endpoints:**
- `GET /api/v1/schedule/disponibilidad/` - Horarios disponibles
- `POST /api/v1/schedule/disponibilidad/` - Crear disponibilidad
- `GET /api/v1/schedule/bloqueos/` - Ver bloqueos
- `POST /api/v1/schedule/bloqueos/` - Crear bloqueo
- PUT, DELETE para cada recurso

**Estado:** ✅ Funcional - Validaciones de negocio implementadas

---

### 5. **appointments-ms** (Puerto 8004) ✅ COMPLETO
**BD:** `appointments_db` → Cita, NotaMedica, HistoricoCita, ConfiguracionGlobal

**Modelos:**
```python
- Cita: Estados PENDIENTE→ACEPTADA→REALIZADA (+ CANCELADA, NO_ASISTIO)
  - IDs de referencia: usuario_id, profesional_id, paciente_id, 
                       lugar_id, horario_id, servicio_id
- NotaMedica: Evolución clínica (1:1 con Cita)
- HistoricoCita: Auditoría completa con snapshots de nombres
- ConfiguracionGlobal: Reglas (ej: horas_antelacion_cancelar)
```

**Endpoints:**
- `GET /api/v1/appointments/citas/` - Listar citas
- `POST /api/v1/appointments/citas/` - Crear cita
- `GET /api/v1/appointments/notas/` - Notas médicas
- `GET /api/v1/appointments/historico/` - Auditoría de cambios
- `GET /api/v1/appointments/configuracion/` - Config global

**Estado:** ✅ Funcional - Estados y validaciones implementadas, soft-delete activo

---

### 6. **notification-ms** (Puerto 8005) 🔄 PARCIAL
**BD:** `notification_db` → Notificacion

**Modelos:**
```python
- Notificacion: usuario_id, asunto, mensaje, leida, tipo (EMAIL/PUSH/SISTEMA)
  - Índices optimizados: usuario_id + leida
```

**Endpoints (Diseñados):**
- `GET /api/v1/notifications/buzon/` - Buzón del usuario
- `POST /api/v1/notifications/buzon/` - Enviar notificación
- `PATCH /api/v1/notifications/<id>/` - Marcar como leída

**Estado:** 🔄 Backend estructurado pero **FALTA:**
- ❌ Integración con SendGrid/SMTP (para email)
- ❌ Integración con twilio/WhatsApp API
- ❌ Lógica de disparadores automáticos (signals)
- ❌ UI frontend para buzón

---

### 7. **ia-ms** (Puerto 8006) ✅ COMPLETO
**BD:** `ia_db` (SQLite) → AIConfiguration, ChatSession, ChatMessage

**Modelos:**
```python
- AIConfiguration: Singleton - API Key, prompt del sistema, temperatura, estado
- ChatSession: Usuario_id, fecha_inicio, resumen
- ChatMessage: Contenido, rol (user/assistant), tokens_count
```

**Endpoints:**
- `POST /api/v1/ia/chat/` - Enviar mensaje al chatbot
- `GET /api/v1/ia/history/<usuario_id>/` - Historial de usuario

**Estado:** ✅ Backend operativo
- ✅ Conexión a GitHub Models (gratuito)
- ✅ Admin panel para inyectar prompts
- 🔄 Frontend: **FALTA widget flotante** para integración

---


### 8. **portal-ms** (Puerto 8007) 🔄 PARCIAL
**BD:** `portal_db` → Banner, VideoGaleria, ConvocatoriaHV, PQRS

**Modelos (✅ Listos):**
```python
- Banner: imagen_desktop, imagen_movil, link_accion, orden, activo, created_at
- VideoGaleria: url_externa (YouTube/Vimeo) o archivo_video, portada, activo
- ConvocatoriaHV: CV para empleo (en progreso)
- PQRS: Peticiones, quejas, reclamos (en progreso)
```

**Serializers:**
- BannerSerializer, VideoGaleriaSerializer implementados

**Views:**
- BannerListView, VideoListView (ListAPIView, públicos, ordenados)

**Endpoints:**
- `GET /api/v1/portal/banners/` - Slider de inicio (funcional)
- `GET /api/v1/portal/videos/` - Galería de videos (funcional)
- `POST /api/v1/portal/pqrs/` - Formulario PQRS (pendiente)
- `POST /api/v1/portal/hv/` - Solicitud "Trabaje con nosotros" (pendiente)

**Estado:** 🔄 Modelos, serializers y endpoints banners/videos funcionales. PQRS y HV en desarrollo. Admin y endpoints faltantes en progreso.

---


## 🖥️ Frontend (React + Vite) ✅ AVANZADO

**Stack:** React 19.2, Vite 5.x, TailwindCSS 3.4.17, React Router 7.x

### Integraciones y mejoras pendientes
- **Internacionalización (i18n)**: Falta soporte multidioma (Español/Inglés) en toda la UI.
- **Accesibilidad (a11y)**: Mejorar contraste, navegación por teclado y etiquetas ARIA.
- **Onboarding y ayuda**: Sugerido agregar tutoriales interactivos y ayuda contextual para usuarios nuevos y administradores.
- **Panel de métricas**: No existe dashboard de métricas de uso, errores o logs para admins.
- **Testing**: Aumentar cobertura de pruebas unitarias y E2E (Vitest, Cypress).
- **Documentación de componentes**: Sugerido Storybook para documentar UI reutilizable.

### Estructura de Carpetas
```
frontend/src/
├── pages/
│   ├── auth/
│   │   ├── Login.jsx ✅
│   │   └── Register.jsx ✅
│   ├── portal/
│   │   ├── Home.jsx ✅ (HeroSlider, ServicesGrid, AboutSection)
│   │   ├── PQRS.jsx ✅
│   │   └── TrabajeConNosotros.jsx ✅
│   ├── system/
│   │   ├── Dashboard.jsx ✅
│   │   ├── MisCitas.jsx ✅
│   │   ├── NuevaCita.jsx ✅ (Formulario con selección de profesional)
│   │   └── Perfil.jsx ✅
│   └── admin/
│       ├── AdminUsuarios.jsx ✅
│       ├── AdminProfesionales.jsx ✅
│       ├── AdminCitas.jsx ✅
│       ├── AdminParametricas.jsx ✅
│       ├── ConfiguracionSistema.jsx ✅
│       ├── ValidarUsuarios.jsx ✅
│       └── agenda/
│           ├── GestionAgenda.jsx ✅
│           ├── GrillaSemanal.jsx ✅
│           ├── ListaProfesionales.jsx ✅
│           └── HistorialAgendas.jsx ✅
├── components/
│   ├── auth/
│   │   ├── AuthLayout (fondo animado, modal de términos)
│   │   └── Alertas (SweetAlert2)
│   ├── portal/
│   │   ├── Navbar.jsx ✅ (Responsive)
│   │   ├── Footer.jsx ✅
│   │   ├── HeroSlider.jsx ✅ (Consumiendo banners del backend)
│   │   ├── ServicesGrid.jsx ✅
│   │   └── AboutSection.jsx ✅
│   └── system/
│       └── (Componentes específicos de usuario/admin)
├── services/
│   ├── authService.js ✅ - Login, Register, Refresh token
│   ├── citasService.js ✅ - CRUD citas
│   ├── staffService.js ✅ - Profesionales, especialidades
│   ├── patientService.js ✅ - Gestión de pacientes
│   ├── portalService.js ✅ - Banners, PQRS, videos
│   ├── agendaService.js ✅ - Disponibilidad
│   └── configService.js ✅ - Configuración global
├── context/
│   └── AuthContext.jsx ✅ (SessionContext con JWT decode, localStorage)
├── api/
│   └── axiosConfig.js ✅ (Interceptores, base URL)
└── assets/
```

### Funcionalidades Implementadas ✅
- ✅ **Autenticación:** Login/Register con términos y condiciones (modal React Portal)
- ✅ **Navbar responsive:** Menú colapsable, logo, enlaces dinámicos
- ✅ **Home público:** Slider de banners (consumiendo backend), grid de servicios, sección About, contadores animados
- ✅ **Portal de pacientes:** Dashboard, Mis Citas, Nueva Cita, Perfil
- ✅ **Panel admin:** Usuarios, Profesionales, Citas, Parametrización, Validación
- ✅ **Agenda admin:** Gestión visual, grilla semanal, historial
- ✅ **Formularios:** PQRS, Empleo (Trabaje con nosotros)
- ✅ **Estilos:** TailwindCSS completo, animaciones Framer Motion
- ✅ **Alertas:** SweetAlert2 reemplazando window.alert

### Funcionalidades PENDIENTES 🔄
- ❌ **Widget de IA:** Componente flotante para chatbot
- ❌ **Buzón de notificaciones:** Página de notificaciones
- ❌ **Integración Portal-MS:** Consumo de videos y PQRS/HV desde backend
- ❌ **Reportes/Exportación:** CSV/PDF para citas e historial
- ❌ **Confirmación de citas:** Envío de email/SMS de confirmación
- ❌ **Manejo offline:** Service Workers para caché

- ❌ **Panel de administración avanzado:** Falta panel para monitoreo, logs, métricas y gestión avanzada de usuarios y recursos.
- ❌ **Gestión de seeds/datos demo:** Scripts y UI para cargar datos de prueba fácilmente.
- ❌ **Internacionalización y accesibilidad:** Implementar soporte multidioma y mejoras de accesibilidad.
- ❌ **Documentación API pública:** Swagger/OpenAPI y ejemplos de consumo para integradores externos.

---

## 📝 Estado de Integración Frontend-Backend

| Feature | Auth-MS | Patients-MS | Professionals-MS | Appointments-MS | Schedule-MS | Portal-MS | Notification-MS | IA-MS |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Modelos | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| API Endpoints | ✅ | ✅ | ✅ | ✅ | ✅ | 🔄 (banners/videos) | 🔄 | ✅ |
| Frontend Service | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Frontend UI | ✅ | ✅ | ✅ | ✅ | ✅ | 🔄 (portal público) | ❌ | ❌ |
| Admin Panel | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |

---

## 🚀 Tareas Pendientes (To-Do List)


### CRÍTICAS (Bloqueantes)
- [ ] **Portal-MS API:** Completar endpoints PQRS y HV, admin customizado
  - [x] BannerSerializer, VideoGaleriaSerializer
  - [ ] PQRSSerializer, ConvocatoriaHVSerializer
  - [x] BannerListView, VideoListView
  - [ ] PQRSView, HVView
  - [ ] Conectar en urls.py todos los endpoints

- [ ] **Notification-MS Integración:** 
  - [ ] Signals automáticos en appointments-ms (crear notificación cuando cita cambia estado)
  - [ ] SendGrid/SMTP para emails
  - [ ] Twilio para WhatsApp
  - [ ] Frontend: Página de buzón

- [ ] **Panel de monitoreo y métricas:** Dashboard para admins con logs, errores, uso de recursos y auditoría.
- [ ] **Seeds y datos demo:** Scripts y UI para cargar datos de prueba y facilitar testing.
- [ ] **Backups automáticos:** Documentar y automatizar backups de BD y archivos.
- [ ] **CI/CD:** Implementar pipelines automáticos para pruebas y despliegue.


### ALTAS (Próximos)
- [ ] **IA Widget:** Componente flotante React
  - [ ] Enviar mensajes al endpoint `/chat/`
  - [ ] Mostrar respuesta
  - [ ] Historial en modal

- [ ] **Reportes:** 
  - [ ] CSV/PDF de citas por rango de fechas
  - [ ] Historial de auditoría

- [ ] **Internacionalización:** Soporte multidioma en frontend y backend.
- [ ] **Accesibilidad:** Mejoras de a11y en toda la UI.
- [ ] **Documentación API:** Swagger/OpenAPI y ejemplos de consumo.


### MEDIAS (Nice to Have)
- [ ] **Confirmación automática:** Email/SMS cuando se reserva cita
- [ ] **Recordatorios:** Notificación 24h antes de cita
- [ ] **Calendario visual:** Integrar react-calendar en admin
- [ ] **Multidioma:** i18n (Español/Inglés)

- [ ] **Onboarding y ayuda interactiva:** Tutoriales y ayuda contextual para usuarios nuevos y admins.

---

## 🔗 Rutas API Completas (a través del Gateway)

```
# Autenticación
POST   /api/v1/auth/register/
POST   /api/v1/auth/login/
POST   /api/v1/auth/login/refresh/
GET    /api/v1/auth/me/
GET    /api/v1/auth/menu/

# Pacientes
GET    /api/v1/patients/listado/
POST   /api/v1/patients/listado/
GET    /api/v1/patients/listado/{id}/
GET    /api/v1/patients/tipos/

# Profesionales
GET    /api/v1/professionals/especialidades/
GET    /api/v1/professionals/lugares/
GET    /api/v1/professionals/profesionales/
GET    /api/v1/professionals/servicios/

# Agenda
GET    /api/v1/schedule/disponibilidad/
POST   /api/v1/schedule/disponibilidad/
GET    /api/v1/schedule/bloqueos/
POST   /api/v1/schedule/bloqueos/

# Citas
GET    /api/v1/appointments/citas/
POST   /api/v1/appointments/citas/
GET    /api/v1/appointments/notas/
GET    /api/v1/appointments/historico/
GET    /api/v1/appointments/configuracion/

# IA (Funcional)
POST   /api/v1/ia/chat/
GET    /api/v1/ia/history/{usuario_id}/

# Portal (Pendientes)
GET    /api/v1/portal/banners/
GET    /api/v1/portal/videos/
POST   /api/v1/portal/pqrs/
POST   /api/v1/portal/hv/

# Notificaciones (Parcial)
GET    /api/v1/notifications/buzon/
POST   /api/v1/notifications/buzon/
```

---

## 📋 Checklist de Verificación

### ✅ Completado
- [x] Arquitectura de microservicios (8 servicios)
- [x] Base de datos centralizada (PostgreSQL)
- [x] Autenticación JWT
- [x] Gateway Nginx operativo
- [x] Modelos de negocio completos
- [x] API endpoints funcionales (auth, patients, professionals, schedule, appointments, ia)
- [x] Frontend React con Vite
- [x] UI responsiva con TailwindCSS
- [x] Contexto de autenticación persistente
- [x] Integración Axios con interceptores
- [x] Contexto de autenticación persistente
- [x] Integración Axios con interceptores


### 🔄 En Progreso
- [ ] Portal-MS: Endpoints PQRS/HV y admin customizado
- [ ] Notification-MS: Integración email/WhatsApp
- [ ] IA-MS: Widget frontend
  - Estado: Banners y videos funcionales, PQRS y hoja de vida en desarrollo.

- [ ] Panel de monitoreo y métricas para admins
- [ ] Seeds y datos demo para testing
- [ ] Backups automáticos y documentación de recuperación
- [ ] CI/CD y pipelines de despliegue

---


## Reglas de Negocio Detectadas y Sugeridas

## 🔒 Seguridad y Buenas Prácticas
- Revisar y reforzar RBAC/permisos granulares en todos los endpoints.
- Validar y sanitizar todos los campos de entrada (especialmente archivos y textos largos).
- Implementar rate limiting y throttling en endpoints públicos.
- Forzar HTTPS en producción y restringir CORS a orígenes confiables.
- Minimizar información sensible en JWT y tokens.
- Monitorear logs de acceso y errores críticos.

1. **Cancelación de citas:** Solo se permite cancelar si faltan más de X horas (parametrizable).
2. **Validación de solapamiento de disponibilidad:** Un profesional no puede tener dos horarios solapados el mismo día.
3. **Bloqueos de agenda:** No se pueden agendar citas en periodos bloqueados (vacaciones, permisos, etc.).
4. **Gestión de estados de cita:** No se borra, solo se cambia el estado (ej. ELIMINAR).
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

## 🌐 Integración Externa y API Pública
- Documentar y exponer la API pública con Swagger/OpenAPI.
- Proveer ejemplos de consumo (curl, Postman, JS, Python).
- Versionar la API y documentar cambios.
- Facilitar onboarding de integradores externos.

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

- **Testing y QA:**
  - Pytest y Django TestCase para backend.
  - Vitest/Jest y React Testing Library para frontend.
  - Cypress o Playwright para pruebas E2E.
  - Cobertura de pruebas y reportes automáticos sugeridos en CI.

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

---

# 🧭 Hallazgos y sugerencias adicionales tras revisión completa (28/02/2026)

- Falta panel de monitoreo y métricas para admins (logs, errores, uso de recursos, auditoría).
- Mejorar scripts y UI para seeds/datos demo y testing.
- Documentar y automatizar backups y recuperación de BD y archivos.
- Implementar CI/CD y pipelines automáticos.
- Reforzar internacionalización y accesibilidad en frontend.
- Documentar y exponer la API pública con Swagger/OpenAPI y ejemplos de consumo.
- Mejorar onboarding y ayuda interactiva para usuarios y admins.
- Aumentar cobertura de testing y reportes automáticos.
- Validar y reforzar seguridad en endpoints, JWT, CORS y almacenamiento de archivos.


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

Este documento identifica los modelos de cada microservicio y su uso real en backend y frontend, proponiendo mejoras donde se detecta subutilización.

---

## 1. auth-ms (users/models.py)
**Modelos:**
- CrearCuenta: Usado en autenticación y registro.
- Auditoria: Usado en admin para registrar acciones, pero no expuesto en frontend ni reportes.
  - **Sugerencia:** Crear un panel de auditoría en frontend/admin para visualizar acciones críticas, cambios de roles, bloqueos y accesos. Permitir filtros por usuario, fecha y módulo.

---

## 2. patients-ms (patients/models.py)
**Modelos:**
- TipoPaciente: Usado en backend y frontend (listado, selección en formularios).
- Paciente: Usado en backend y frontend (gestión de pacientes).
- SolicitudValidacion: Usado en backend (admin, API, serializers, views) y en frontend (servicio patientService.js: crearSolicitudValidacion, getSolicitudesPendientes). 
  - **Sugerencia:** Mejorar el flujo de validación en el frontend, permitiendo a los administradores aprobar/rechazar solicitudes y notificar al usuario.

---

## 3. professionals-ms (staff/models.py)
**Modelos:**
- Especialidad: Usado en backend y frontend (staffService.js, selección en formularios, filtros, paneles admin).
- Lugar: Usado en backend y frontend (staffService.js, agenda, selección de sede, filtros, paneles admin).
- Profesional: Usado en backend y frontend (listados, selección, agenda, paneles admin).
  - **Sugerencia:** Implementar gestión avanzada (desactivación, advertencias de dependencias) y reportes de uso de especialidades y sedes.

---

## 4. schedule-ms (agenda/models.py)
**Modelos:**
- Disponibilidad: Usado en backend y frontend (agendaService.js, gestión de horarios, paneles admin y usuario).
- BloqueoAgenda: Usado en backend y frontend (agendaService.js, GestiónAgenda.jsx, GrillaSemanal.jsx, NuevaCita.jsx). Permite bloquear horarios y se visualiza en la UI.
  - **Sugerencia:** Mejorar la visualización de bloqueos y agregar reportes de bloqueos históricos.

---

## 5. appointments-ms (gestion_citas/models.py)
**Modelos:**
- Cita: Usado en backend y frontend (citasService.js, gestión de citas, paneles admin y usuario).
- NotaMedica: Usado en backend (admin, API, serializers, views, inline en admin) pero no expuesto en frontend.
  - **Sugerencia:** Permitir a los médicos diligenciar y consultar notas médicas desde el portal, y a los pacientes ver un resumen de su evolución clínica.

---

## 6. notification-ms (comunicaciones/models.py)
**Modelos:**
- Notificacion: Usado en backend (admin, API, serializers, views, endpoint /buzon/), pero no consumido ni mostrado en frontend.
  - **Sugerencia:** Implementar un buzón de notificaciones en el frontend, con filtros por leídas/no leídas y acciones de marcado.

---

## 7. ia-ms (agent/models.py)
**Modelos:**
- AIConfiguration: Usado en backend, no expuesto en frontend.
- ChatSession y ChatMessage: Usados en backend (servicios, views, serializers) pero no hay widget de chat ni historial visible en frontend.
  - **Sugerencia:** Crear un widget flotante de chat en frontend que consuma estos modelos, mostrando el historial y permitiendo interacción en tiempo real. Permitir a administradores ajustar parámetros de IA desde el panel admin.

---

## 8. portal-ms (content/models.py y forms/models.py)
**Modelos:**
- Banner y VideoGaleria: Usados en backend y frontend (portalService.js, Home.jsx, HeroSlider.jsx, etc.).
- ConvocatoriaHV y PQRS: Usados en backend (API, serializers, views, endpoints /pqrs/ y /hv/) y en frontend (portalService.js, PQRS.jsx, TrabajeConNosotros.jsx).
  - **Sugerencia:** Mejorar la gestión administrativa de PQRS y postulaciones (ConvocatoriaHV) en el frontend, permitiendo seguimiento, respuesta y cierre, así como notificaciones al usuario.

---