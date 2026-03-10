# Plan de Pruebas SaaS Multi-tenant (Checklist)

Fecha: 2026-03-09
Objetivo: iniciar pruebas con datos limpios, crear clinicas de prueba y validar aislamiento, planes y sincronizacion.

## 1) Clinicas sugeridas para pruebas
- Clinica Aurora Salud
  - `slug`: `aurora-salud`
  - `domain`: `aurora-salud.app.idefnova.com`
  - `schema`: `tenant_aurora_salud`
  - plan inicial: `FREE`
- Centro Medico San Rafael
  - `slug`: `san-rafael`
  - `domain`: `san-rafael.app.idefnova.com`
  - `schema`: `tenant_san_rafael`
  - plan inicial: `STARTER`
- IPS Norte Vital
  - `slug`: `norte-vital`
  - `domain`: `norte-vital.app.idefnova.com`
  - `schema`: `tenant_norte_vital`
  - plan inicial: `PROFESSIONAL`

## 2) Limpieza de datos (inicio limpio)
Nota: esto borra datos de pruebas.

Comando recomendado:
```powershell
.\scripts\reset_saas_test_data.ps1
```

Checklist:
- [ ] `flush` ejecutado en todos los microservicios
- [ ] `seed_saas_catalog` ejecutado en `tenant-billing-ms`
- [ ] planes `FREE/STARTER/PROFESSIONAL/ENTERPRISE` disponibles

## 3) Validar creacion automatica en self-signup
Por cada clinica creada en `/saas/signup` o endpoint `self-signup`, debe ocurrir:
- [ ] se crea `Tenant`
- [ ] se crea `TenantDomain` primario
- [ ] se crea `Subscription` segun plan
- [ ] se crea `schema_name`
- [ ] se crea usuario admin en `auth-ms`
- [ ] admin tiene `tenant_id`
- [ ] admin tiene membership `Administrador` en ese tenant
- [ ] admin queda `is_staff=true`
- [ ] onboarding queda en estado `PENDING` en metadata del tenant

Si hay usuarios legacy sin membership:
```powershell
docker compose exec auth-ms python manage.py backfill_tenant_memberships
```

## 4) Provision de schemas por tenant en todos los ms
Para cada tenant:
```powershell
.\scripts\tenant_prepare_all.ps1 -Schema tenant_aurora_salud
.\scripts\tenant_prepare_all.ps1 -Schema tenant_san_rafael
.\scripts\tenant_prepare_all.ps1 -Schema tenant_norte_vital
```

Checklist:
- [ ] schemas creados en patients/schedule/appointments/professionals/portal/notification/ia
- [ ] no errores de SQL en `prepare_tenant_schema`

## 5) Migracion de datos legacy (si aplica)
Solo si hay datos existentes en `public` que se deban copiar.

Dry-run:
```powershell
.\scripts\tenant_migrate_all.ps1 -Schema tenant_aurora_salud -DryRun
```

Ejecucion real:
```powershell
.\scripts\tenant_migrate_all.ps1 -Schema tenant_aurora_salud -TruncateTarget
```

Checklist:
- [ ] dry-run revisado y aprobado
- [ ] migracion ejecutada por tenant
- [ ] secuencias (`id`) ajustadas
- [ ] conteos por tabla conciliados

## 6) Frontend admin de tenants (sincronizacion comercial)
Pantalla disponible:
- URL: `/dashboard/admin/tenants`
- Funciones:
  - [ ] listar clinicas afiliadas
  - [ ] ver plan actual por tenant
  - [ ] cambiar plan comercial
  - [ ] activar/desactivar modulos via feature override

Checklist de sincronizacion:
- [ ] cambio de plan refleja nueva `subscription.plan`
- [ ] cambio de modulo refleja `feature_override`
- [ ] `tenant policy` responde features efectivas correctas

## 7) Validacion de aislamiento (anti-fuga)
Caso minimo:
- [ ] crear paciente en tenant A
- [ ] consultar en tenant B
- [ ] B no ve datos de A

Validaciones de seguridad:
- [ ] request sin `X-Tenant-Schema` (prod) => `403`
- [ ] schema invalido => `403`
- [ ] schema `public` en prod => `403`

## 8) Flujo portal publico por tenant
Landing global:
- [ ] `http://localhost:5173/` muestra landing comercial SaaS

Portal por tenant:
- [ ] `/t/aurora-salud`
- [ ] `/t/san-rafael`
- [ ] `/t/norte-vital`

PQRS/Trabaje con nosotros tenant-aware:
- [ ] `/t/<tenant>/pqrs`
- [ ] `/t/<tenant>/trabaje-con-nosotros`
- [ ] datos llegan al tenant correcto

## 9) Configuracion recomendada para pruebas tipo produccion
- [ ] `DEBUG=False`
- [ ] `TENANT_SIGNATURE_REQUIRED=true`
- [ ] `TENANT_SCHEMA_ENFORCE_HEADER=true`
- [ ] `TENANT_SCHEMA_REQUIRE_HEADER=true`
- [ ] `TENANT_SCHEMA_ALLOW_PUBLIC=false`

## 10) Resultado esperado de la ronda
- [ ] 3 clinicas operativas y aisladas
- [ ] planes y modulos sincronizados desde admin tenants
- [ ] onboarding admin funcionando
- [ ] sin fuga de datos cross-tenant

Los 3 admins que creamos quedaron con la misma contraseña:

Admin123!

Documentos para login:

9001001 (aurora-salud)
9001002 (san-rafael)
9001003 (norte-vital)


## 11) Alineacion tecnica Feature Overrides vs Codigo (pendientes de desarrollo)
Objetivo: dejar cada `feature code` con enforcement real (UI + API + reglas de negocio), no solo catalogado en `tenant-billing-ms`.

Estado actual observado:
- Ya existe catalogo y reglas por plan en `tenant-billing-ms` (`tenancy_feature`, `tenancy_planfeature`, `tenancy_featureoverride`).
- `auth-ms` ya filtra algunas rutas/permisos por feature (`portal_web_completo`, `pqrs`, `api_publica`).
- Enforcement de capacidades activo en modulos clave (`cap_profesionales`, `cap_pacientes`, `cap_sedes`, `cap_mensajes_mes`), con brechas pendientes en IA (`cap_tokens_ia_mes`).
- Falta enforcement transversal para el resto de features y limites en microservicios de negocio.
- Se agrego feature `sms` al catalogo SaaS y reglas por plan:
  - `FREE=false`
  - `STARTER=true`
  - `PROFESSIONAL=true`
  - `ENTERPRISE=true`
- `notification-ms` ya no exige `integraciones` para SMS; ahora valida SMS contra feature `sms`.

Checklist de implementacion por feature:
- [X] `agenda_basica`: definido comportamiento minimo y enforcement en `schedule-ms` (sin `agenda_basica` se bloquean operaciones de disponibilidad/bloqueos/slots; `agenda_avanzada` sigue gobernando recurrencia y duplicar dia).
- [X] `agenda_avanzada`: proteger endpoints/acciones avanzadas de reglas de agenda en `schedule-ms`.
- [X] `registro_pacientes`: bloqueo backend real tenant-aware en `patients-ms` para create/update/partial_update/destroy cuando no este activo (403 con mensaje de plan).
- [X] `portal_citas_simple`: definido modo basico tenant-aware (portal publico activo con secciones minimas), ocultamiento de links/CTAs avanzados en frontend y bloqueo backend de PQRS/HV cuando no hay `portal_web_completo`.
- [X] `portal_web_completo`: enforcement en endpoints avanzados de `portal-ms` (`/portal/admin/*` CMS) con 403 cuando no esta activo; frontend portal oculta opciones avanzadas en modo simple.
- [X] `dashboard_basico`: endpoint tenant-aware en `appointments-ms` (`/citas/reportes/dashboard-resumen/`) + frontend `/dashboard` con metricas operativas base y bloqueo 403 cuando no esta activo.
- [X] `dashboard_avanzado`: KPIs/segmentos avanzados en mismo endpoint solo cuando feature esta activa; frontend muestra estado/upsell y evita render avanzado sin feature.
- [X] `pqrs`: enforcement backend en `portal-ms` (publico y admin) con validacion de feature `pqrs` + `portal_web_completo`.
- [X] `api_publica`: enforcement backend aplicado en endpoints de integracion `internal/*` (patients/professionals) para bloquear acceso externo cuando no esta activo; llamadas internas con `X-INTERNAL-TOKEN` se mantienen.
- [X] `confirmacion_email`: validacion implementada en `notification-ms` para envio por email segun plan.
- [X] `whatsapp`: validacion implementada en `notification-ms` para canal WhatsApp segun plan (Meta BYO + QR temporal; Meta shared pendiente institucional).
- [X] `sms`: validacion implementada en `notification-ms` para `sms_labsmobile` y `sms_twilio` segun plan.
- [ ] `ia_prediccion`: bloquear endpoints/modelos predictivos en `ia-ms` segun plan.
- [ ] `chatbot`: bloquear endpoint de chatbot en `ia-ms` cuando no este activo.
- [X] `integraciones`: bloqueo en `notification-ms` para conectores externos no-SMS (dispatch + test/qr-info), manteniendo SMS gobernado por `sms` y email `SHARED` para `confirmacion_email`.
- [X] `cap_profesionales`: validar limite en `professionals-ms` al crear/activar profesionales.
- [X] `cap_pacientes`: validar limite en `patients-ms` al crear pacientes.
- [X] `cap_sedes`: enforcement tenant-aware en `professionals-ms` para create + reactivacion en update y nuevo endpoint `lugares/import-masivo` con bloqueo por limite.
- [X] `cap_mensajes_mes`: contador/consumo mensual implementado en `notification-ms` con corte por tenant.
- [ ] `cap_tokens_ia_mes`: implementar contador/consumo mensual en `ia-ms` por tenant.

Checklist tecnico transversal (obligatorio para cerrar fase):
- [ ] Crear middleware/servicio comun de policy (`tenant policy client`) en cada microservicio para evitar logica duplicada.
- [ ] Estandarizar helper `require_feature(feature_code)` y `enforce_cap(feature_code, current_count)`.
- [ ] Agregar pruebas automatizadas por feature (caso permitido / caso bloqueado).
- [ ] Agregar pruebas de limites de capacidad (exactamente en limite, sobre limite, override activo).
- [ ] Registrar auditoria cuando se rechaza una operacion por plan/limite.
- [ ] Alinear frontend: ocultar botones y rutas segun policy efectiva, pero mantener bloqueo real en backend.

Referencia funcional (feature codes):
- `agenda_basica`: tiene agenda simple; no reglas complejas.
- `agenda_avanzada`: tiene reglas y configuraciones avanzadas; sin esto solo basico.
- `registro_pacientes`: permite CRUD pacientes; sin esto no hay gestion clinica base.
- `portal_citas_simple`: portal publico minimo de citas; no portal completo.
- `portal_web_completo`: landing/portal extendido; sin esto solo portal simple.
- `dashboard_basico`: metricas operativas basicas; no analitica profunda.
- `dashboard_avanzado`: KPIs avanzados y cruces; sin esto reportes limitados.
- `pqrs`: gestion PQRS; sin esto no flujo formal de casos.
- `api_publica`: acceso API/integraciones administrativas; sin esto bloqueado.
- `confirmacion_email`: notificacion de citas por email; sin esto no confirmacion automatica.
- `whatsapp`: canal WhatsApp activo; sin esto solo otros canales.
- `sms`: canal SMS activo; sin esto no se permite envio por `sms_labsmobile`/`sms_twilio`.
- `ia_prediccion`: prediccion IA (demanda/no-show, etc.); sin esto analitica clasica.
- `chatbot`: bot para citas/reagenda/cancelacion; sin esto atencion manual/web.
- `integraciones`: conectores con terceros; sin esto sistema mas cerrado.
- `cap_profesionales`: limite de profesionales por plan.
- `cap_pacientes`: limite de pacientes por plan.
- `cap_sedes`: limite de sedes por plan.
- `cap_mensajes_mes`: bolsa mensual de mensajes.
- `cap_tokens_ia_mes`: consumo mensual de IA.


en produccion validar esto ojooo: Soporte para desactivar validación TLS SMTP en desarrollo (self-signed cert):

Hecho en entorno local (infra): se agregaron `healthcheck` + `depends_on: condition: service_healthy` en `docker-compose` para reducir falsos errores de arranque.

hacer esto despues (pendiente): Agregar endpoint `/health` real en `auth-ms` y `tenant-billing-ms` (en vez de check por puerto) para que el healthcheck valide app+DB, no solo socket.

## 12) Ejecucion controlada de pendientes (propuesta)
Objetivo: cerrar brechas sin tocar demasiados modulos a la vez.

Fase 1 (actual): Notificaciones y estabilidad base
- [X] Separar feature `sms` de `integraciones` en enforcement de `notification-ms`.
- [X] Agregar retries frontend en cargas criticas (`tenancy` y sidebar auth) para microcortes transitorios.
- [X] Endurecer arranque con healthchecks compose.

Fase 2 (siguiente): Seguridad funcional en APIs publicas/portal
- [X] `api_publica`: cerrar endpoints de integracion externos por feature.
- [X] `pqrs`: bloqueo directo en endpoints admin de `portal-ms` y bloqueo publico por feature `pqrs`.

Fase 3: IA y capacidades
- [ ] `ia_prediccion` y `chatbot`: enforcement backend por policy efectiva.
- [ ] `cap_tokens_ia_mes`: contador/limite mensual por tenant.

Regla operativa:
- [ ] No iniciar una fase nueva sin pruebas basicas (permitido/bloqueado) de la fase actual.
- [ ] Siguiente en orden al retomar implementacion: `ia_prediccion` y `chatbot` (enforcement backend por policy efectiva en `ia-ms`).
- [X] Validacion controlada tenant por tenant completada (2026-03-10): matriz exacta de "debe verse / no debe verse" en sidebar + permisos.

### 12.1 Matriz exacta Sidebar + Permisos (por plan)
Fuente: reglas efectivas de `tenant-billing-ms` + filtros de `auth-ms` (`MENU_FEATURE_MAP` y `PERMISSION_FEATURE_MAP`).

Sidebar (items feature-gateados):

| Menu URL | Feature | FREE | STARTER | PROFESSIONAL | ENTERPRISE |
|---|---|---|---|---|---|
| `/dashboard` | `dashboard_basico` | SI | SI | SI | SI |
| `/dashboard/admin/pacientes` | `registro_pacientes` | SI | SI | SI | SI |
| `/dashboard/admin/agenda` | `agenda_basica` | SI | SI | SI | SI |
| `/dashboard/admin/citas` | `agenda_basica` | SI | SI | SI | SI |
| `/dashboard/admin/recepcion` | `agenda_basica` | SI | SI | SI | SI |
| `/dashboard/doctor/atencion` | `agenda_basica` | SI | SI | SI | SI |
| `/admin/portal/content` | `portal_web_completo` | NO | NO | SI | SI |
| `/dashboard/admin/convocatorias-gestion` | `portal_web_completo` | NO | NO | SI | SI |
| `/dashboard/admin/pqrs-gestion` | `pqrs` | NO | NO | SI | SI |
| `/dashboard/admin/tenants` | `api_publica` | NO | NO | SI | SI |
| `/dashboard/admin/guia-ayuda` | `api_publica` | NO | NO | SI | SI |

Permisos (codenames feature-gateados):

| Permiso | Feature | FREE | STARTER | PROFESSIONAL | ENTERPRISE |
|---|---|---|---|---|---|
| `gestion_pacientes` | `registro_pacientes` | SI | SI | SI | SI |
| `gestion_agenda` | `agenda_basica` | SI | SI | SI | SI |
| `admin_citas` | `agenda_basica` | SI | SI | SI | SI |
| `recepcion_sala` | `agenda_basica` | SI | SI | SI | SI |
| `atencion_consultorio` | `agenda_basica` | SI | SI | SI | SI |
| `portal_content_admin` | `portal_web_completo` | NO | NO | SI | SI |
| `admin_convocatorias_gestion` | `portal_web_completo` | NO | NO | SI | SI |
| `admin_pqrs_gestion` | `pqrs` | NO | NO | SI | SI |
| `saas_tenants_admin` | `api_publica` | NO | NO | SI | SI |
| `saas_guide_content_admin` | `api_publica` | NO | NO | SI | SI |

Nota de roles: `saas_tenants_admin` y `saas_guide_content_admin` estan ademas restringidos al grupo `SuperAdmin SaaS` en `auth-ms`.

### 12.2 Validacion real tenant por tenant (estado actual DB)
Evidencia ejecutada por API (`/auth/login`, `/tenancy/policy/current`, `/auth/menu`, `/auth/me/permisos`) y consulta directa de overrides.

| Tenant | Plan efectivo | Overrides relevantes | Sidebar esperado por plan/policy |
|---|---|---|---|
| `aurora-salud` | `FREE` | `confirmacion_email=true`, `pqrs=false` | NO `portal/content`, NO `convocatorias`, NO `pqrs-gestion`, NO `tenants`, NO `guia-ayuda` |
| `san-rafael` | `ENTERPRISE` | `pqrs=false`, `cap_sedes=false` | SI `portal/content` y `convocatorias`; NO `pqrs-gestion` por override; `tenants/guia` solo si usuario es `SuperAdmin SaaS` |
| `norte-vital` | `FREE` | sin overrides | NO `portal/content`, NO `convocatorias`, NO `pqrs-gestion`, NO `tenants`, NO `guia-ayuda` |

Resultado: la visibilidad actual de sidebar/permisos esta alineada con la policy efectiva (plan + overrides) y con las restricciones de rol.

Pruebas base recomendado (permitido/bloqueado) para portal:
- [ ] Tenant con `portal_citas_simple=true` y `portal_web_completo=false`:
  - `GET /api/v1/portal/theme/` => 200
  - `GET /api/v1/portal/pages/home/` => 200 (solo secciones basicas)
  - `POST /api/v1/portal/pqrs/` => 403
  - `POST /api/v1/portal/trabaje-con-nosotros/` => 403
  - `GET /api/v1/portal/admin/pages/` => 403
- [ ] Tenant con `portal_web_completo=true`:
  - `GET /api/v1/portal/theme/` => 200
  - `GET /api/v1/portal/pages/home/` => 200 (secciones completas)
  - `POST /api/v1/portal/pqrs/` => 201
  - `POST /api/v1/portal/trabaje-con-nosotros/` => 201
  - `GET /api/v1/portal/admin/pages/` => 200
