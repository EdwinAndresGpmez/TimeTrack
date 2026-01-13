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

**Levantar todo el ecosistema (reconstruyendo cambios):**
```bash
docker-compose down -v  # ¡OJO! Borra datos de BD. Usar solo en dev inicial.
docker-compose up -d --build