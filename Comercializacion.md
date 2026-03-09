# Plan Comercial y Tecnico SaaS IDEFNOVA

Fecha: 2026-03-09
Estado: Plan maestro aprobado para ejecucion

## 1) Objetivo del documento
Definir como convertir IDEFNOVA en un SaaS multi-tenant vendible por planes y modulos, sin romper el core actual.

Objetivos clave:
- Una sola plataforma
- Multiples clinicas
- Datos aislados por clinica (base logica separada)
- Modelo Freemium con limites claros
- Monetizacion por licencia + modulos premium

## 2) Aclaraciones de producto
- `portal-ms` NO es la pagina comercial principal de IDEFNOVA.
- `portal-ms` es un producto/modulo adicional opcional para clientes que quieran portal institucional.
- La pagina comercial de IDEFNOVA debe ir separada (ejemplo: `idefnova.com`) y la app SaaS en `app.idefnova.com`.

## 3) Modelo comercial (Freemium + planes)
La regla del Freemium: entregar valor para prueba, pero sin regalar capacidades premium.

### Plan FREE
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

Objetivo:
- Prueba y adopcion inicial

### Plan STARTER
Precio recomendado: $1.000.000 - $2.000.000 COP / ano

Incluye:
- hasta 5 profesionales
- hasta 2000 pacientes
- agenda avanzada
- portal web de citas
- confirmacion por email
- dashboard basico
- soporte basico

### Plan PROFESSIONAL
Precio recomendado: $6.000.000 - $12.000.000 COP / ano

Incluye:
- profesionales ilimitados
- pacientes ilimitados
- multiples sedes
- agendas avanzadas
- reglas de agenda
- dashboards avanzados
- PQRS
- portal web completo
- API

### Plan ENTERPRISE
Precio recomendado: $15.000.000 - $40.000.000 COP / ano

Incluye:
- todo lo anterior
- IA predictiva
- chatbot
- integracion WhatsApp
- integraciones con sistemas externos
- soporte prioritario
- personalizacion

## 4) Modulos premium (upsell)
Adicional al plan base:
- WhatsApp citas: 2M COP / ano
- IA prediccion: 3M COP / ano
- Portal paciente: 1.5M COP / ano
- Integraciones API: 3M COP / ano

Nota:
- Definir tambien cobro por sobreuso (mensajes, tokens IA, volumen API).

## 5) Recomendacion multi-tenant
Recomendado para salud: `schema por tenant` en PostgreSQL.

Por que:
- Mejor aislamiento que columna `tenant_id`
- Menor complejidad/costo que `database por tenant` en etapa inicial
- Backups por clinica mas simples
- Escala bien para SaaS medico

Arquitectura objetivo:
- `public`: tenants, planes, suscripciones, pagos, features, auditoria global
- `tenant_x`: datos operativos de cada clinica

## 6) Nuevo microservicio obligatorio: tenant-billing-ms
Para no afectar el core y centralizar logica SaaS, crear un microservicio dedicado.

Nombre sugerido:
- `tenant-billing-ms` (o `control-plane-ms`)

Responsabilidades:
- Gestion de tenants (clinicas)
- Planes y suscripciones
- Feature flags por tenant
- Limites/cuotas por tenant
- Medicion de uso (usage metering)
- Billing y estado de pago
- Provisioning de tenant (crear schema + bootstrap)
- Resolucion de subdominio

Tablas minimas:
- `tenants`
- `domains`
- `plans`
- `plan_features`
- `subscriptions`
- `usage_counters`
- `invoices`
- `payments`
- `feature_overrides`

## 7) Como se conecta con los microservicios actuales
Flujo de request:
1. Llega request por `clinicamed.app.idefnova.com`
2. Gateway resuelve tenant por subdominio
3. Gateway agrega headers firmados (ej: `X-Tenant-ID`, `X-Plan-ID`, `X-Features-Version`)
4. Cada microservicio aplica tenant context
5. Cada microservicio valida feature/limites con cache local + consulta a `tenant-billing-ms`

Regla:
- Ningun microservicio de negocio debe decidir planes hardcodeados.
- La politica comercial vive en `tenant-billing-ms`.

## 8) Feature flags y limites (base freemium)
Ejemplos de features:
- `agenda_avanzada`
- `dashboard_avanzado`
- `chatbot`
- `ia_prediccion`
- `whatsapp`
- `api_publica`
- `portal_ms`

Ejemplo de uso:
```python
if features.has("whatsapp"):
    send_whatsapp(...)
else:
    raise PlanLimitError("Feature no disponible en tu plan")
```

Limites base por plan:
- `max_profesionales`
- `max_pacientes`
- `max_sedes`
- `max_mensajes_mes`
- `max_tokens_ia_mes`

## 9) Self-service SaaS (adquisicion)
Flujo comercial y tecnico:
1. Usuario entra a `idefnova.com`
2. Revisa planes
3. Selecciona plan
4. Se registra
5. Backend ejecuta:
   - `create_tenant()`
   - `create_schema()`
   - `assign_plan()`
   - `create_admin_user()`
6. Redirige a:
   - `clinicamed.app.idefnova.com` o
   - `app.idefnova.com` con tenant context

## 10) Onboarding automatico
Wizard inicial por tenant:
1. Crear sede
2. Crear especialidades
3. Crear profesionales
4. Configurar agenda inicial

Objetivo:
- Reducir soporte
- Acelerar tiempo a valor

## 11) Facturacion automatica
Pasarelas sugeridas:
- Mercado Pago (prioridad Colombia)
- PayU
- Stripe (si se expande internacional)

Politicas:
- Cobro mensual o anual
- Periodo de gracia configurable
- Suspension por mora
- Reactivacion automatica al pago

## 12) Metricas internas SaaS
Minimo viable de metricas:
- Numero de clinicas activas
- MRR/ARR
- Conversion Free -> Pago
- Churn
- Citas por tenant
- Uso por modulo
- Consumo de mensajes y IA

## 13) Roadmap de implementacion

### Fase 0 (1 semana) - Definicion
- Cerrar matriz plan -> features -> limites
- Definir contratos API entre gateway, auth y tenant-billing-ms
- Definir politicas de cobro y suspension

### Fase 1 (2-3 semanas) - Control Plane
- Crear `tenant-billing-ms`
- Modelos: tenants, plans, subscriptions, features, usage
- Endpoints de provisioning y consulta de policy
- Admin interno global

### Fase 2 (2-4 semanas) - Multi-tenant tecnico
- Resolver tenant por subdominio en gateway
- Pasar contexto tenant a microservicios
- Adaptar auth para incluir tenant context
- Integrar `django-tenants` (o estrategia equivalente) por servicio donde aplique

### Fase 3 (2-3 semanas) - Freemium en runtime
- Enforcement de features/limites en cada microservicio
- Metering de uso (mensajes, IA, API)
- Bloqueo suave + mensajes de upgrade

### Fase 4 (2-4 semanas) - Modulos premium
- `notification-ms`: email + WhatsApp + plantillas + trazabilidad
- `ia-ms`: prediccion + chatbot transaccional (agendar/cancelar/reagendar)
- Frontend admin para consumo y configuracion de modulos

### Fase 5 (1-2 semanas) - Comercial
- Landing comercial separada
- Signup + checkout
- Alta automatica de tenant
- Documentacion comercial y SLA

## 14) Riesgos y mitigaciones
Riesgo: mezclar datos entre tenants
- Mitigacion: schema per tenant + pruebas automatizadas de aislamiento

Riesgo: costos variables altos (WhatsApp/IA)
- Mitigacion: cuotas + topes + sobrecargo por sobreuso

Riesgo: complejidad operativa
- Mitigacion: centralizar logica en `tenant-billing-ms` y no dispersarla

## 15) Decision final recomendada
1. Adoptar `schema per tenant` como estrategia principal.
2. Crear `tenant-billing-ms` antes de escalar frontend de `notification-ms` y `ia-ms`.
3. Mantener `portal-ms` como add-on opcional, no como web comercial principal.
4. Lanzar Freemium solo cuando existan:
   - feature flags
   - limites por plan
   - metering
   - flujo de upgrade

---

## Checklist de salida a mercado
- [ ] Multi-tenant operativo y auditado
- [ ] Planes/suscripciones activos
- [ ] Feature flags por tenant
- [ ] Limites y sobreuso definidos
- [ ] Billing y cobro recurrente
- [ ] Onboarding automatico
- [ ] Dashboard de metricas SaaS
- [ ] Contratos, terminos y politica de datos