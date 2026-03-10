# Plan Comercial y Tecnico SaaS IDEFNOVA

Fecha: 2026-03-09  
Estado: vigente para ejecucion

## 1. Objetivo
Convertir IDEFNOVA en SaaS multi-tenant para salud, vendible por planes y modulos, con aislamiento fuerte de datos por clinica y sin romper el core actual.

Objetivos clave:
- Una sola plataforma
- Multiples clinicas (tenants)
- Aislamiento de datos por tenant
- Modelo Freemium controlado
- Monetizacion por plan + modulos premium + sobreuso

## 2. Aclaraciones de producto
- `portal-ms` es un producto adicional (add-on), no la pagina comercial principal.
- Sitio comercial: `idefnova.com`
- Aplicacion SaaS: `app.idefnova.com` o subdominios por clinica (`clinicax.app.idefnova.com`)
- En desarrollo local: portal tenant por ruta `localhost:5173/t/<tenant_slug>`

Regla de enrutamiento publico:
- `idefnova.com` (o `localhost`) = landing global comercial
- `clinicax.app.idefnova.com` o `/t/clinicax` = portal publico de una clinica especifica
- PQRS y Trabaje con nosotros deben vivir solo en contexto tenant

## 3. Modelo comercial de planes

### IDEFNOVA FREE
Precio: $0

Incluye:
- maximo 1 profesional
- maximo 200 pacientes
- 1 sede
- agenda basica
- registro de pacientes
- portal de citas simple
- dashboard basico

No incluye:
- IA
- WhatsApp
- multiples sedes
- analitica avanzada
- integraciones

Objetivo: adopcion y prueba.

### IDEFNOVA STARTER
Precio recomendado: $1.000.000 - $2.000.000 COP / ano

Incluye:
- hasta 5 profesionales
- hasta 2000 pacientes
- agenda avanzada
- portal web de citas
- confirmacion por email
- dashboard basico
- soporte basico

### IDEFNOVA PROFESSIONAL
Precio recomendado: $6.000.000 - $12.000.000 COP / ano

Incluye:
- profesionales ilimitados
- pacientes ilimitados
- multiples sedes
- reglas de agenda avanzadas
- dashboards avanzados
- PQRS
- portal web completo
- API

### IDEFNOVA ENTERPRISE
Precio recomendado: $15.000.000 - $40.000.000 COP / ano

Incluye:
- todo lo anterior
- IA predictiva
- chatbot
- integracion WhatsApp
- integraciones con terceros
- soporte prioritario
- personalizacion

## 4. Upsell por modulos premium
- WhatsApp citas: 2M COP / ano
- IA prediccion: 3M COP / ano
- Portal paciente: 1.5M COP / ano
- Integraciones API: 3M COP / ano

Adicional:
- Cobro por sobreuso (mensajes, tokens IA, llamadas API)

## 5. Recomendacion de arquitectura multi-tenant (salud)
Recomendacion principal: `schema per tenant` en PostgreSQL.

Justificacion:
- Mejor aislamiento que solo `tenant_id` por columna
- Menor complejidad operativa que `database per tenant`
- Backup/restore por clinica mas viable
- Escala bien para SaaS B2B medico

Estrategia mixta recomendada:
- Base: schema por tenant para planes FREE/STARTER/PROFESSIONAL
- Excepcion ENTERPRISE: opcion `database per tenant` si compliance lo exige

## 6. Modelo de identidad y permisos (clave para evitar mezclas)
No usar usuario "local" por clinica sin control.  
Usar identidad global + membresias por tenant.

Entidades:
- `users` (global, en auth-ms): identidad unica (correo/documento)
- `memberships`: relacion usuario-tenant con rol y estado
- `roles` y `permissions`: scope por tenant

Regla de oro:
- Un usuario puede pertenecer a multiples tenants con distintos roles.
- Ejemplo valido: en Clinica A = Admin, en Clinica B = Secretaria.
- El JWT debe incluir tenant activo y roles de ese tenant activo.

Flujo recomendado al crear clinica (self-signup):
- Se crea tenant y plan (FREE por defecto)
- Se crea usuario admin del tenant
- Al usuario admin se le asigna por defecto:
  - `is_staff=true`
  - rol/membership: `Administrador` en ese tenant
- En primer ingreso del admin NO debe aparecer onboarding de paciente (EPS/Particular)
- Debe aparecer onboarding guiado de configuracion de clinica

## 7. tenant-billing-ms como control-plane
`tenant-billing-ms` centraliza logica comercial y de tenancy para no contaminar el core clinico.

Responsabilidades:
- tenants y dominios
- planes, features, limites y overrides
- suscripciones y estados de cuenta
- usage metering
- provisioning (create_tenant + create_schema + bootstrap)
- resolucion de tenant para gateway

Tablas minimas:
- `tenants`
- `tenant_domains`
- `plans`
- `features`
- `plan_features`
- `subscriptions`
- `feature_overrides`
- `usage_counters`
- `invoices`
- `payments`

## 8. Flujo tecnico obligatorio por request
1. Request entra por gateway
2. Gateway resuelve tenant por host/subdominio
3. Gateway envia `X-Tenant-*` firmado (id, domain, timestamp, signature)
4. Microservicio valida firma y timestamp
5. Microservicio ejecuta en contexto tenant (schema o filtro duro)
6. Microservicio aplica policy (features/limites) segun plan activo

Nunca confiar en `tenant_id` enviado por frontend.

## 9. Estado actual del proyecto (diagnostico)
Hoy ya existe base importante:
- `tenant-billing-ms` con tenants, planes, subscriptions y self-signup
- middleware de firma tenant en varios microservicios
- auth-ms emite `tenant_id` en JWT

Brecha actual:
- Los microservicios core aun no estan aislando datos por schema tenant
- En varios servicios la separacion sigue siendo logica compartida

Conclusion:
- El plan comercial si es viable, pero falta hardening tecnico antes de escalar venta Freemium.

## 10. Controles tecnicos para evitar mezcla de datos
- Enforce global: `TENANT_SIGNATURE_REQUIRED=true` en produccion
- Middleware comun de tenant en todos los servicios
- Restriccion de query por tenant en 100% de endpoints de negocio
- Tests de aislamiento cruzado (tenant A nunca ve tenant B)
- Auditoria con `tenant_id`, `user_id`, `accion`, `ip`, `timestamp`
- Unique constraints por tenant en datos clinicos sensibles
- Bloqueo por plan y por cuota en runtime

## 11. Plan tecnico por fases (ejecucion)

### Fase 1: Seguridad y tenancy base (1-2 semanas)
- Activar validacion obligatoria de firma en entornos no dev
- Endurecer gateway para siempre firmar `X-Tenant-*`
- Estandarizar middleware comun en todos los micros
- Agregar pruebas de headers validos/invalidos/replay

Entregable:
- Tráfico inter-servicios con tenant firmado y validado

### Fase 2: Identidad multi-tenant real (1-2 semanas)
- Crear tabla `memberships` en auth-ms
- Login con seleccion de tenant activo (si usuario pertenece a varios)
- JWT con claims tenant-scoped (tenant_id + roles del tenant)
- Endpoints para cambiar tenant activo de sesion

Entregable:
- Un usuario puede operar en varias clinicas sin mezclar permisos

Flujo UX primer ingreso por tipo de usuario:
- Admin/Staff del tenant: onboarding de clinica (parametricas -> profesionales -> agenda -> portal)
- Profesional de salud: acceso directo a modulo operativo segun permisos
- Paciente final: onboarding de paciente (particular o afiliado EPS)

### Fase 3: Aislamiento de datos core (3-5 semanas)
- Definir por microservicio estrategia schema tenant
- Aplicar contexto tenant por request (search_path o equivalente)
- Migrar datos existentes al esquema objetivo
- Pruebas de integridad y no fuga cross-tenant

Entregable:
- Aislamiento real de datos en servicios clinicos

### Fase 4: Politicas comerciales en runtime (2-3 semanas)
- Enforcement de features y limites en servicios clave
- Contadores de uso (mensajes, tokens IA, API calls)
- Respuestas de upgrade claras para frontend

Entregable:
- Freemium tecnicamente controlado

### Fase 5: Billing y autoservicio (2-4 semanas)
- Facturacion recurrente (Mercado Pago/PayU/Stripe)
- Cobro anual/mensual + grace period + suspension/rehabilitacion
- Onboarding guiado de clinica nueva

Entregable:
- Flujo SaaS completo: plan -> signup -> tenant -> uso

### Fase 6: Modulos premium (2-4 semanas)
- `notification-ms`: email, SMS/WhatsApp, plantillas, tracking de entregas
- `ia-ms`: prediccion operativa y chatbot transaccional
- UI de administracion por modulo y consumo

Entregable:
- Upsell funcional por modulo premium

## 12. KPI para salida comercial
- Numero de tenants activos
- Conversion FREE -> pago
- Churn mensual
- MRR/ARR
- Uso por modulo
- Costo variable por tenant (mensajeria e IA)
- Incidentes de seguridad/aislamiento (meta: 0)

## 13. Riesgos principales y mitigacion
Riesgo: fuga o mezcla de datos entre clinicas  
Mitigacion: aislamiento por tenant + pruebas automatizadas + auditoria

Riesgo: costos variables altos en IA/WhatsApp  
Mitigacion: cuotas, topes, sobreuso facturable, alertas tempranas

Riesgo: complejidad operativa  
Mitigacion: centralizar reglas en `tenant-billing-ms` y estandarizar contratos

## 14. Decision ejecutiva recomendada
1. Mantener `tenant-billing-ms` como control-plane oficial.
2. Implementar identidad multi-tenant con membresias antes de escalar ventas.
3. Completar aislamiento de datos en microservicios clinicos antes de campaña comercial fuerte.
4. Lanzar Freemium en grande solo con enforcement de limites + billing + auditoria listos.

## 15. Pendientes antes de tests finales
- Ejecutar corte real de migracion `public -> tenant_schema` por tenant real.
- Validar que no existan jobs/scripts/cron sin `tenant schema` explicito.
- Probar matriz minima de aislamiento:
  - tenant A crea datos
  - tenant B no puede verlos
  - requests sin tenant headers deben fallar en produccion
- Confirmar UX publica:
  - landing global en `/`
  - portal de clinica en `/t/:tenantSlug`
  - links de PQRS/Trabaje siempre tenant-aware

---

## Checklist Go-To-Market tecnico
- [ ] Tenant headers firmados y obligatorios en produccion
- [ ] Memberships multi-tenant en auth-ms
- [ ] JWT tenant-scoped por sesion
- [ ] Aislamiento de datos core validado
- [ ] Feature flags y limites activos por plan
- [ ] Metering de uso operativo
- [ ] Billing recurrente y suspension automatica
- [ ] Onboarding autoservicio completo
- [ ] Portal comercial separado de portal-ms

## Pendiente post-pruebas (hardening de seguridad)
- Cuando finalicen las pruebas actuales, ejecutar hardening tecnico para el stack `nginx + gateway + django`.
- Preparar configuracion lista para copiar/pegar con:
  - rate limiting por IP/usuario/tenant y por endpoint critico
  - reglas anti-DDoS y trafico sospechoso
  - circuit breaker, timeouts, retries y health checks
  - captcha dinamico en flujos sensibles (login/signup/reset)
  - alertas operativas y monitoreo de seguridad
