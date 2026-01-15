# 🏥 Estado del Proyecto: TimeTrack (Microservicios)

**Fecha de actualización:** 12 de Enero de 2026
**Arquitectura:** Microservicios con Django (Backend), React + Vite (Frontend), Nginx (Gateway) y PostgreSQL (Base de datos centralizada).

---

## 🏗️ 1. Arquitectura de Infraestructura (Docker)

Actualmente, el sistema corre sobre `docker-compose` con la siguiente distribución de puertos y servicios:

| Servicio | Contenedor | Puerto Interno | Puerto Host | Estado | Descripción |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Gateway** | `api_gateway` | 80 | **8080** | ✅ Configurado | Proxy Inverso Nginx. Enruta `/api/v1/` y `/media/`. |
| **Base de Datos** | `timetrack_db` | 5432 | **5432** | ✅ Optimizado | Instancia única PostgreSQL 15. Script `init_databases.sql` activo. |
| **Auth** | `auth_service` | 8000 | 8000 | ✅ Listo | Login JWT, Usuarios, Roles. |
| **Pacientes** | `patients_service` | 8001 | 8001 | ✅ Listo | Gestión de historias clínicas básicas. |
| **Profesionales** | `professionals_service` | 8002 | 8002 | ✅ Listo | Gestión de médicos y especialidades. |
| **Agenda** | `schedule_service` | 8003 | 8003 | ✅ Listo | Disponibilidad y horarios. |
| **Citas** | `appointments_service` | 8004 | 8004 | ✅ Listo | Lógica de reserva. |
| **Notificaciones** | `notification_service` | 8005 | 8005 | ⚠️ Pendiente | Envío de correos y WhatsApp. |
| **IA Chatbot** | `ia_service` | 8006 | **8006** | ✅ Listo (Back) | Cerebro del asistente virtual. |
| **Portal Web** | `portal_service` | 8007 | **8007** | 🔄 En proceso | CMS para Banners, PQRS y Hojas de Vida. |
| **Frontend** | `frontend_app` | 5173 | **5173** | 🔄 En proceso | Interfaz React (Admin + Portal). |

---

## ✅ 2. Avances Realizados (Lo que ya funciona)

### 🔐 Autenticación y Core
- [x] **JWT Configurado:** Login funcional retornando Access/Refresh tokens.
- [x] **Fix de Login:** Solucionado error 400. Frontend ahora envía `documento` correctamente y Backend lo valida.
- [ ] **Sidebar Dinámico:** Estructura en React lista para recibir menú según rol (aunque falta poblar datos).

### 🤖 Microservicio de IA (`ia-ms`)
- [x] **Modelos:** `AIConfiguration` (Parametrización), `ChatSession`, `ChatMessage`.
- [x] **Lógica:** Servicio `AIService` que conecta con GitHub Models / OpenAI.
- [x] **API:** Endpoints creados para `/chat/` y `/history/`.
- [x] **Admin:** Panel administrativo habilitado para inyectar API Keys y Prompts sin tocar código.

### 🌐 Infraestructura General
- [x] **DB Centralizada:** Se migró de 7 contenedores de DB a 1 solo para eficiencia.
- [x] **Nginx Routing:** Rutas agregadas para IA (`/api/v1/ia/`) y Portal (`/api/v1/portal/`).
- [x] **Media Files:** Configurado Nginx para servir imágenes desde el contenedor del Portal.

### 💰 Estrategia de Negocio
- [x] **Cotización 2026:** Documento redactado con costos de implementación (IA/Web) y recurrentes (AWS/WhatsApp).
- [x] **Análisis de Costos:** Validación de tarifas de WhatsApp API (Utilidad) y GitHub Models.

---

## 🚧 3. En Proceso / Pendiente Inmediato (To-Do List)

### A. Microservicio Portal (`portal-ms`)
Este servicio tiene la estructura de carpetas y Docker, pero **falta el código de la API**:
- [ ] **Serializers:** Crear `BannerSerializer`, `VideoSerializer`, `PQRSSerializer`.
- [ ] **Vistas (Views):** Crear endpoints para:
    - `GET /banners/` (Público)
    - `POST /pqrs/` (Público)
    - `POST /hv/` (Trabaje con nosotros)
- [ ] **URLs:** Conectar las vistas al `urls.py`.

### B. Frontend (React) - Fase de Migración
Debemos migrar el HTML de "Servicios Asociados Integrados" a componentes React:
- [ ] **Landing Page:** Crear componentes `Navbar`, `HeroSlider` (Consumiendo API Banners), `ServicesGrid`.
- [ ] **Integración Chatbot:** Crear componente flotante (Widget) que consuma el endpoint de `ia-ms`.
- [ ] **Formularios:** Crear formularios de React Hook Form para PQRS y Empleo.

### C. Integración WhatsApp
- [ ] Conectar `notification-ms` o `ia-ms` con la API de Meta (WhatsApp Cloud API) para que el bot responda por celular, no solo por web.

---

## 🛠️ 4. Comandos Útiles para Retomar

# 📅 Estado del Proyecto: TimeTrack (Microservicios Médicos)
**Fecha:** 14 de Enero, 2026
**Tecnologías:** React + Vite, Django REST, Docker, Nginx, PostgreSQL, TailwindCSS.

---

## ✅ 1. Lo Hecho (Completed)

### 🏗️ Infraestructura y Configuración
- [x] **Gateway (Nginx):** Configuración corregida para manejar `proxy_set_header Host $http_host;` (solución de carga de imágenes y puertos).
- [x] **CORS:** Middleware de Django configurado en el orden correcto en `settings.py`.
- [x] **Tailwind CSS:** Reinstalada versión estable (**v3.4.17**) para compatibilidad con Vite/PostCSS (se eliminó la v4 beta conflictiva).

### 🖥️ Frontend - Portal Público
- [x] **Componentes UI:** `Navbar` (Responsive), `Footer`.
- [x] **Home:** `HeroSlider` (conectado a Banners del backend), `ServicesGrid` (Tarjetas animadas), `AboutSection` (Contadores animados con `react-countup`).
- [x] **Estilos:** Diseño limpio en colores corporativos (Azul/Verde/Blanco) usando Tailwind.

### 🔐 Frontend - Autenticación (Auth)
- [x] **Layouts:** `AuthLayout` con fondo animado (burbujas flotantes) y tarjeta de cristal (`backdrop-blur`).
- [x] **Modal de Términos:** Implementado con **React Portals** para superponerse correctamente (`z-index: 100`, pantalla completa) y diseño a dos columnas.
- [x] **Alertas:** Reemplazo de `window.alert` por **SweetAlert2** (Toast y Modales animados).
- [x] **Contexto (`AuthContext`):** Implementado para manejar sesión global, persistencia en `localStorage` y decodificación de JWT (`jwt-decode`).

### ⚙️ Backend - Auth Microservice
- [x] **Serializer Personalizado:** `UserSerializer` incluye campo `acepta_tratamiento_datos`.
- [x] **Views:** `RegistroView` (Crear cuenta) y `CustomTokenObtainPairView` (Login con claims extra: rol, nombre, documento).
- [x] **URLs:** Rutas expuestas correctamente en `/api/v1/auth/`.

---

## 🚧 2. Lo que estamos haciendo (In Progress)

- [x] **Conexión Login:** Se corrigió el error `400 Bad Request`.
    - *Solución:* El backend espera el campo `documento`, pero el frontend enviaba `username`. Se ajustó `authService.js`.
- [x] **Validación de Sesión:** El token JWT ya se recibe y se guarda.
- [ ] **Redirección y UI de Usuario Logueado:**
    - Verificar que el Navbar cambie de "Agendar Cita" a "Hola, [Nombre]" tras el login.
    - Asegurar la redirección correcta a `/` o `/dashboard`.

---

## 📋 3. Lo que falta (Pending / Next Steps)

### 🔜 Inmediato (Próxima Sesión)
1.  **Rutas Protegidas:** Crear componente `PrivateRoute` para bloquear acceso a `/dashboard` si no hay login.
2.  **Dashboard Layout:** Crear la estructura interna (Sidebar lateral + Topbar) diferente al Portal público.
3.  **Roles:** Diferenciar la vista del Dashboard según si es `PACIENTE` o `PROFESIONAL` (leído desde el JWT).

### 📅 Funcionalidades Core
- [ ] **Módulo de Citas:**
    - Selección de especialidad -> Profesional -> Horario.
    - Calendario visual para disponibilidad.
- [ ] **Perfil de Usuario:** Editar datos personales y cambiar contraseña.
- [ ] **PQRS y Trabaje con Nosotros:** Verificar envío real de formularios con archivos adjuntos al backend.

---

## 🧠 Notas Técnicas para la IA (Memoria)

**1. Configuración Crítica de Auth (Frontend):**
El servicio `authService.js` **DEBE** enviar el payload de login así, ya que el modelo de usuario personalizado usa `documento` como identificador:
```javascript
// frontend/src/services/authService.js
login: async (credentials) => {
    const response = await api.post('/auth/login/', {
        documento: credentials.documento, // NO enviar 'username'
        password: credentials.password
    });
    // ...
}
