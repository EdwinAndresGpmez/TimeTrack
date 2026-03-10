# Notification MS Setup (BYO + Shared + WhatsApp)

Fecha: 2026-03-10

## 1) Que quedo implementado
- Configuracion de canales por tenant:
  - `email` con modo `BYO` o `SHARED`.
  - `whatsapp_meta` (BYO funcional, SHARED pendiente institucional).
  - `whatsapp_qr` (temporal, integrable por endpoint externo).
  - `sms_labsmobile` (BYO/SHARED por credenciales).
  - `sms_twilio` (BYO funcional, SHARED opcional por entorno).
- Plantillas por tenant y canal.
- Dispatch unificado con validacion por plan:
  - `confirmacion_email`
  - `whatsapp`
  - `cap_mensajes_mes`
- Bitacora de entrega en `comunicaciones_notificacion` con estado y error.

## 2) Endpoints nuevos (notification-ms)
Base: `/api/v1/notificaciones/`

- `GET/POST /channel-configs/`
- `PATCH /channel-configs/{id}/`
- `POST /channel-configs/{id}/test-connection/`
- `GET /channel-configs/{id}/qr-info/`
- `GET/POST /templates/`
- `PATCH /templates/{id}/`
- `POST /dispatch/`
- `GET /buzon/?usuario_id=<id>`
- `PATCH /buzon/{id}/mark-read/`

## 3) Variables de entorno clave
En `notification-ms`:

```env
TENANT_POLICY_URL=http://tenant-billing-ms:8008/api/v1/tenancy/policy/current
TENANT_POLICY_TIMEOUT_SEC=5

NOTIF_SHARED_EMAIL_ENABLED=true
NOTIF_SHARED_EMAIL_HOST=smtp.gmail.com
NOTIF_SHARED_EMAIL_PORT=587
NOTIF_SHARED_EMAIL_USE_TLS=true
NOTIF_SHARED_EMAIL_HOST_USER=<correo-institucional-idefnova>
NOTIF_SHARED_EMAIL_HOST_PASSWORD=<app-password>
NOTIF_SHARED_EMAIL_FROM=<correo-institucional-idefnova>
NOTIF_SHARED_EMAIL_FROM_NAME=Idefnova

NOTIF_WHATSAPP_QR_ENDPOINT=
NOTIF_WHATSAPP_QR_TOKEN=

LABSMOBILE_URL=https://api.labsmobile.com/json/send
LABSMOBILE_USER=
LABSMOBILE_API_KEY=
LABSMOBILE_TPOA=Idefnova

NOTIF_SHARED_TWILIO_ENABLED=false
NOTIF_SHARED_TWILIO_ACCOUNT_SID=
NOTIF_SHARED_TWILIO_AUTH_TOKEN=
NOTIF_SHARED_TWILIO_FROM_NUMBER=

DEMO_BYO_EMAIL_HOST=smtp.gmail.com
DEMO_BYO_EMAIL_PORT=587
DEMO_BYO_EMAIL_USER=<correo-demo-clinica>
DEMO_BYO_EMAIL_PASSWORD=<app-password-demo>
DEMO_BYO_EMAIL_FROM=<correo-demo-clinica>
```

## 4) Seed inicial por tenant
```powershell
docker compose exec notification-ms python manage.py migrate
docker compose exec notification-ms python manage.py seed_notification_setup --tenant-id 1
```

Si quieres crear tambien BYO demo desde variables `DEMO_BYO_*`:

```powershell
docker compose exec notification-ms python manage.py seed_notification_setup --tenant-id 1 --with-demo-byo-email
```

## 5) Ejemplo de envio (email)
```json
POST /api/v1/notificaciones/dispatch/
{
  "template_code": "appointment_created",
  "usuario_id": 123,
  "channel": "email",
  "sender_mode": "SHARED",
  "to_email": "paciente@correo.com",
  "context": {
    "paciente_nombre": "Juan Perez",
    "profesional_nombre": "Dra. Ana",
    "fecha_cita": "2026-03-20",
    "hora_cita": "10:30"
  }
}
```

## 6) Estado WhatsApp Meta
- `BYO`: funcional si configuras `access_token` + `phone_number_id`.
- `SHARED`: queda en `PENDING` con nota de pendiente institucional.

## 7) Nota comercial
- Si el catalogo de features incluye `shared_sender_idefnova`, el sistema ya lo respeta.
- Si no existe esa feature, Shared Sender funciona segun configuracion de entorno.
