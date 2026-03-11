# Checklist Nuevo Microservicio (Tenant + Seguridad)

## 1. Objetivo
Este documento es la lista de control para crear nuevos microservicios en Idefnova sin romper el aislamiento multi-tenant ni la seguridad de la información.

Principio base: **ninguna llamada entre servicios debe perder el contexto tenant**.

---

## 2. Flujo de contexto tenant (resumen)
1. Frontend envía `X-Tenant-Slug-Override` (si aplica).
2. Gateway resuelve tenant y firma contexto.
3. Gateway propaga `X-Tenant-*` a microservicios.
4. Cada microservicio valida firma/headers y aplica schema (`search_path`).
5. Si un microservicio llama a otro, debe reenviar `X-Tenant-*` + token interno.

---

## 3. Archivos mínimos obligatorios en un microservicio nuevo

## 3.1 `core/settings.py`
- Incluir middleware de tenant:
  - `core.tenant_security.TenantSignatureMiddleware`
  - `core.tenant_schema.TenantSchemaMiddleware`
- Variables de configuración:
  - `TENANT_HEADER_SIGNING_KEY`
  - `TENANT_SIGNATURE_REQUIRED`
  - `TENANT_SIGNATURE_MAX_SKEW_SEC`
  - `TENANT_SCHEMA_ENFORCE_HEADER`
  - `TENANT_SCHEMA_REQUIRE_HEADER`
  - `TENANT_SCHEMA_ALLOW_PUBLIC`
  - `TENANT_SCHEMA_DEFAULT`
  - `TENANT_POLICY_URL`
  - `TENANT_POLICY_TIMEOUT_SEC`
- `INTERNAL_SERVICE_TOKEN` para llamadas internas.

## 3.2 `core/tenant_security.py`
- Validar:
  - `X-Tenant-ID`
  - `X-Tenant-Domain`
  - `X-Tenant-Signature`
  - `X-Tenant-Timestamp`
- En modo estricto, responder `403` si falta/expira/firma inválida.

## 3.3 `core/tenant_schema.py`
- Leer `X-Tenant-Schema`.
- Validar formato de schema.
- Ejecutar `SET search_path TO "<schema>", public`.
- Restaurar `search_path` al final del request.

---

## 4. Permisos y endpoints internos

## 4.1 Permisos internos
- Crear permiso tipo:
  - `InternalTokenOrAuthenticated`
  - o `InternalTokenOrAuthenticatedReadOnly`
- Siempre validar `X-INTERNAL-TOKEN` contra `INTERNAL_SERVICE_TOKEN`.

## 4.2 Endpoints de integración interna
- Deben aceptar llamadas con token interno.
- Si además aplican política de plan, distinguir interno vs externo.

---

## 5. Llamadas entre microservicios (`requests`)

Regla crítica: **nunca llamar otro microservicio sin helper de headers internos**.

Crear helper estilo:

```python
def _internal_headers(request=None):
    headers = {}
    token = os.getenv("INTERNAL_SERVICE_TOKEN", "").strip()
    if token:
        headers["X-INTERNAL-TOKEN"] = token
    if request is not None:
        for key in (
            "X-Tenant-ID",
            "X-Tenant-Domain",
            "X-Tenant-Signature",
            "X-Tenant-Timestamp",
            "X-Tenant-Schema",
            "X-Tenant-Slug-Override",
        ):
            value = request.headers.get(key)
            if value:
                headers[key] = value
    return headers
```

Usar ese helper en todos los `requests.get/post/patch/...`.

---

## 6. Política de plan tenant (feature flags)

- Implementar util `tenant_policy.py` que reenvíe `X-Tenant-*` al servicio de tenancy.
- Validar flags antes de operaciones sensibles (crear/editar/eliminar, módulos premium, etc.).
- Error claro cuando el plan no habilita la funcionalidad.

---

## 7. Auditoría cross-service

- El cliente de auditoría (`utils/audit_client.py`) debe:
  - enviar `X-INTERNAL-TOKEN`
  - reenviar `X-Tenant-*` cuando exista request
  - sanitizar metadata
  - no romper el flujo de negocio si falla auditoría (solo log warning)

---

## 8. Integración con Auth y menú (si aplica)

- Si el microservicio expone pantallas nuevas:
  - agregar ruta protegida en frontend
  - agregar permiso `requiredPermission`
  - sincronizar en `sync_routes.py`
- Revisar asignación de roles por tenant en menú/permisos.

---

## 9. Frontend obligatorio

- Consumir APIs solo por instancia central (`axiosConfig`).
- Confirmar que interceptor envía:
  - `Authorization`
  - `X-Tenant-Slug-Override` (cuando corresponda)
- Al cambiar tenant, refrescar contexto (`tenant_id`, `tenant_slug`) y cachés por tenant.

---

## 10. Pruebas mínimas antes de salir a producción

1. Usuario tenant A no puede leer/escribir datos de tenant B.
2. Llamada interna sin `X-Tenant-*` falla en modo estricto (esperado).
3. Llamada interna con headers correctos funciona.
4. CRUD principal funciona con tenant correcto.
5. Logs no muestran `missing tenant headers` en flujo normal.
6. Endpoints internos no quedan abiertos sin token.

---

## 11. Señales de alerta (bloqueantes)

- Uso directo de `requests.*` sin `_internal_headers(request)`.
- Auditoría enviándose sin `X-Tenant-*`.
- Endpoints internos con `AllowAny`.
- Uso de `tenant_id` de JWT sin validar headers/firma en servicios internos.
- Errores genéricos `400` ocultando un `403` real por tenant.

---

## 12. Referencias reales en este repo

- Frontend interceptor tenant:
  - [frontend/src/api/axiosConfig.js](C:/Users/Samuel/Documents/GitHub/TimeTrack/frontend/src/api/axiosConfig.js)
- Gateway propagación tenant:
  - [gateway/nginx.conf](C:/Users/Samuel/Documents/GitHub/TimeTrack/gateway/nginx.conf)
- Ejemplo robusto agenda:
  - [microservices/schedule-ms/agenda/views.py](C:/Users/Samuel/Documents/GitHub/TimeTrack/microservices/schedule-ms/agenda/views.py)
  - [microservices/schedule-ms/agenda/utils/audit_client.py](C:/Users/Samuel/Documents/GitHub/TimeTrack/microservices/schedule-ms/agenda/utils/audit_client.py)
- Ejemplo robusto citas:
  - [microservices/appointments-ms/gestion_citas/views.py](C:/Users/Samuel/Documents/GitHub/TimeTrack/microservices/appointments-ms/gestion_citas/views.py)
  - [microservices/appointments-ms/gestion_citas/utils/audit_client.py](C:/Users/Samuel/Documents/GitHub/TimeTrack/microservices/appointments-ms/gestion_citas/utils/audit_client.py)
- Ejemplo robusto pacientes:
  - [microservices/patients-ms/patients/views.py](C:/Users/Samuel/Documents/GitHub/TimeTrack/microservices/patients-ms/patients/views.py)
  - [microservices/patients-ms/patients/utils/audit_client.py](C:/Users/Samuel/Documents/GitHub/TimeTrack/microservices/patients-ms/patients/utils/audit_client.py)
- Ejemplo robusto profesionales:
  - [microservices/professionals-ms/staff/views.py](C:/Users/Samuel/Documents/GitHub/TimeTrack/microservices/professionals-ms/staff/views.py)
  - [microservices/professionals-ms/staff/utils/audit_client.py](C:/Users/Samuel/Documents/GitHub/TimeTrack/microservices/professionals-ms/staff/utils/audit_client.py)
- Señales auth con contexto tenant:
  - [microservices/auth-ms/users/signals.py](C:/Users/Samuel/Documents/GitHub/TimeTrack/microservices/auth-ms/users/signals.py)
- Sync de rutas/roles del sidebar:
  - [microservices/auth-ms/users/management/commands/sync_routes.py](C:/Users/Samuel/Documents/GitHub/TimeTrack/microservices/auth-ms/users/management/commands/sync_routes.py)

---

## 13. Definición de listo (DoD) para nuevo microservicio

Un microservicio está listo solo si:
1. Valida y aplica contexto tenant en cada request.
2. Reenvía contexto tenant en llamadas internas.
3. Tiene permisos internos seguros.
4. Tiene auditoría con contexto tenant.
5. Tiene pruebas de aislamiento tenant A/B.
6. No deja warnings de tenant en logs durante flujo normal.

