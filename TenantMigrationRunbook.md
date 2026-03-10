# Runbook Fase 3: Migracion `public` -> `schema per tenant`

Fecha: 2026-03-09

## Objetivo
Completar el corte operativo para aislamiento por tenant y prevenir fuga de datos entre clinicas.

## Esta migracion es temporal o permanente?
- `prepare_tenant_schema`: se ejecuta cada vez que se provisiona un tenant nuevo (normalmente automatizado, no manual).
- `migrate_public_to_tenant`: es de corte/migracion de legado (normalmente one-time por tenant).
- En operation normal, luego del corte, ya no debes copiar desde `public`.

## Precondiciones
- Todos los microservicios levantados.
- `tenant-billing-ms` con tenants reales (`slug`, `schema_name`).
- Backup completo antes del corte.
- Ventana de mantenimiento definida.

## Variables de produccion (obligatorias)
- `DEBUG=False`
- `TENANT_SIGNATURE_REQUIRED=true`
- `TENANT_SCHEMA_ENFORCE_HEADER=true`
- `TENANT_SCHEMA_REQUIRE_HEADER=true`
- `TENANT_SCHEMA_ALLOW_PUBLIC=false`

## 1) Crear schemas por tenant en todos los microservicios
Ejemplo tenant: `clinicamed` -> schema `tenant_clinicamed`

```powershell
docker compose exec patients-ms python manage.py prepare_tenant_schema --schema tenant_clinicamed
docker compose exec schedule-ms python manage.py prepare_tenant_schema --schema tenant_clinicamed
docker compose exec appointments-ms python manage.py prepare_tenant_schema --schema tenant_clinicamed
docker compose exec professionals-ms python manage.py prepare_tenant_schema --schema tenant_clinicamed
docker compose exec portal-ms python manage.py prepare_tenant_schema --schema tenant_clinicamed
docker compose exec notification-ms python manage.py prepare_tenant_schema --schema tenant_clinicamed
docker compose exec ia-ms python manage.py prepare_tenant_schema --schema tenant_clinicamed
```

## 2) Migrar datos existentes desde `public`
Nota importante:
- Si historicamente no guardabas `tenant_id` en tablas del dominio, no existe forma automatica de separar clinicas viejas con 100% precision.
- En ese caso, ejecuta migracion por lotes controlados o crea nuevos tenants limpios para entrada en produccion.

Estrategia recomendada:
1. Congelar escrituras.
2. Para cada tenant, copiar solo datos que puedas atribuir con certeza.
3. Validar conteos por tabla.
4. Reabrir trafico por tenant.

Comandos por servicio (ejemplo):
```powershell
docker compose exec patients-ms python manage.py migrate_public_to_tenant --schema tenant_clinicamed --truncate-target
docker compose exec schedule-ms python manage.py migrate_public_to_tenant --schema tenant_clinicamed --truncate-target
docker compose exec appointments-ms python manage.py migrate_public_to_tenant --schema tenant_clinicamed --truncate-target
docker compose exec professionals-ms python manage.py migrate_public_to_tenant --schema tenant_clinicamed --truncate-target
docker compose exec portal-ms python manage.py migrate_public_to_tenant --schema tenant_clinicamed --truncate-target
docker compose exec notification-ms python manage.py migrate_public_to_tenant --schema tenant_clinicamed --truncate-target
docker compose exec ia-ms python manage.py migrate_public_to_tenant --schema tenant_clinicamed --truncate-target
```

Script unico:
```powershell
.\scripts\tenant_migrate_all.ps1 -Schema tenant_clinicamed -TruncateTarget
```

## 3) Validaciones anti-fuga (obligatorias)

### 3.1 Validacion de headers estrictos
Esperado en produccion:
- Request sin `X-Tenant-*` -> `403`
- Request con schema invalido -> `403`
- Request con `X-Tenant-Schema=public` -> `403`

### 3.2 Validacion de aislamiento funcional
Caso minimo:
1. Crear paciente en tenant A.
2. Consultar listado en tenant B.
3. Debe retornar vacio.

### 3.3 Validacion de search_path
Para requests de tenant, validar que la sesion use schema del tenant, no `public`.

## 4) Riesgo critico: codigo fuera de middleware
Este es el origen mas comun de fuga de datos.

Aplica a:
- Celery tasks
- Cron jobs
- Scripts manuales
- Signals que ejecuten consultas indirectas

Regla operativa:
- Ningun proceso de background debe consultar modelos sin setear schema explicitamente antes.
- Si el proceso no conoce tenant, debe fallar.

## 5) Checklist de salida
- [ ] Backups previos validados
- [ ] Schemas creados por tenant en todos los ms
- [ ] Migracion de datos ejecutada y conciliada
- [ ] Headers tenant estrictos activos en produccion
- [ ] Prueba cruzada A/B sin fuga de datos
- [ ] Tareas de background revisadas con contexto tenant explicito
- [ ] Monitoreo de errores 403/tenant habilitado
