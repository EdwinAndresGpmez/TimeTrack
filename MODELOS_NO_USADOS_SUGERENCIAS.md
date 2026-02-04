
# Análisis de Modelos No Usados y Sugerencias de Uso (Basado en Código Real)

Este documento identifica los modelos de cada microservicio y su uso real en backend y frontend, proponiendo mejoras donde se detecta subutilización.

# FALTA EN RESUME:
- Auditoria para todos las acciones de la aplicación.
- Notificaciones, alertas por correo electronico y mensajes de texto.
- asignación de Profesional como usuario de la aplicación.
- Vista para el profesional para ver sus citas asignadas y los comentarios de los pacientes y la funcionarias de la clinica.
- Chatbot interno entre funcionarios de la empresa.
- Terminar desarrollo del portal.
- Crear vistas para el administrador relacionado con el portal y su administración.
- Crear vista para el administrador relacionado con el envio de correos y notificaciones.
- Crear chatbot con el modelo de inteligencia artifical para solicitud de citas, cancelacion, y demas componentes.
- Crear la integracion con whatsapp de meta para la interacion con la ia y la aplicación. 
- Crear pantalla de gestion de pacientes para activar el turno en sala de espera y ser mas precisos durante la atención.
- Crear API para integración con otras aplicaciones para que consuman los datos basicos relacionado con la citas.
- Mejorar los archivos .py para la creación automatica de las vistas y permisos por vista segun los grupos y roles y tambien cambiar los iconos para que tengan mejor diseño.
- validar las vulnerabilidades al final y corregirlas todas.
- Crear un flujo de ayuda con IA para los administradores de la aplicación. 
- Validar el uso de memoria y optimización de los recursos.
- Implementar modo oscuro para los usuarios.

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
  - **Sugerencia:** Mejorar el flujo de validación en el frontend, permitiendo a los administradores aprobar/rechazar solicitudes y notificar al usuario
  - **Avances:** Se realiza modulo de administración de pacientes pediente ajustar diseño de modal y diseño de tabla.

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

# Resumen

La mayoría de los modelos principales ya tienen uso real en backend y frontend. Los modelos subutilizados son principalmente Auditoria (auth-ms), NotaMedica (appointments-ms), Notificacion (notification-ms, solo backend), y la gestión administrativa de PQRS y ConvocatoriaHV (portal-ms). Implementar las sugerencias anteriores permitirá aprovechar mejor la arquitectura y robustecer la funcionalidad del sistema.

---

# 🔒 BRECHAS DE SEGURIDAD IDENTIFICADAS (SQL Injection, XSS, Autenticación, Validación)

Análisis exhaustivo realizado sobre todo el código backend (8 microservicios) y frontend (React + Vite).

## 1. 🔴 CRÍTICA: Permisos AllowAny en Endpoints Sensibles

### Ubicaciones Identificadas:
- **Portal-MS:**
  - `PQRSCreateView` (línea 12): `permission_classes = [AllowAny]` 
  - `HVCreateView` (línea 20): `permission_classes = [AllowAny]`
  - `BannerListView`, `VideoListView`: Correcto (son públicos)

- **Patients-MS:**
  - `SolicitudValidacionViewSet` (línea 33): `permission_classes = [permissions.AllowAny]` - **RIESGO: Cualquiera puede crear/modificar solicitudes**

- **Auth-MS:**
  - `RegistroView` (línea 16): `permission_classes = [AllowAny]` - **Correcto: Debe ser público para registrarse**

### Riesgos:
- Inyección de datos maliciosos en PQRS y solicitudes de validación
- Enumeración de usuarios (bruteforce en SolicitudValidacion)
- Spam masivo de PQRS

### Recomendaciones:
```python
# Cambiar a:
permission_classes = [permissions.IsAuthenticated]  # Para usuarios logueados
# O agregar rate limiting:
from rest_framework.throttling import UserRateThrottle
```

---

## 2. 🔴 CRÍTICA: SQL Injection vía FileField y TextFields

### Ubicaciones Identificadas:
- **Portal-MS (forms/models.py):**
  - `archivo_hv = models.FileField(upload_to='hojas_de_vida/')` - Sin validación de tipo
  - `adjunto = models.FileField(upload_to='pqrs_adjuntos/')` - Sin validación de tipo

- **Portal-MS (forms/serializers.py):**
  - `PQRSSerializer` y `ConvocatoriaHVSerializer` - Aceptan cualquier tipo de archivo
  
### Riesgos:
- Subida de archivos ejecutables (.php, .sh, .bat)
- Ejecución de código en el servidor
- Acceso a información sensible

### Recomendaciones:
```python
# En serializers.py:
import os
from rest_framework import serializers

class ConvocatoriaHVSerializer(serializers.ModelSerializer):
    def validate_archivo_hv(self, value):
        # Validar extensión
        ext = os.path.splitext(value.name)[1].lower()
        allowed_extensions = ['.pdf', '.doc', '.docx']
        if ext not in allowed_extensions:
            raise serializers.ValidationError("Solo se permiten PDF, DOC, DOCX")
        
        # Validar tamaño (máx 5MB)
        if value.size > 5 * 1024 * 1024:
            raise serializers.ValidationError("Tamaño máximo: 5MB")
        
        return value

    class Meta:
        model = ConvocatoriaHV
        fields = '__all__'
```

---

## 3. 🔴 ALTA: Falta de Validación de Entrada en TextField (PQRS, ConvocatoriaHV)

### Ubicaciones Identificadas:
- **Portal-MS (forms/models.py):**
  ```python
  mensaje = models.TextField()  # Sin validación de longitud
  respuesta_interna = models.TextField(blank=True)  # Sin sanitización
  mensaje_adicional = models.TextField(blank=True, null=True)  # Sin validación
  ```

### Riesgos:
- Inyección de código HTML/JavaScript (XSS)
- Almacenamiento de payloads maliciosos
- Desbordamiento de base de datos

### Recomendaciones:
```python
# En models.py:
from django.db import models
from django.core.validators import MaxLengthValidator
from django.utils.html import escape

class PQRS(models.Model):
    # ...
    mensaje = models.TextField(validators=[MaxLengthValidator(5000)])
    
    def save(self, *args, **kwargs):
        # Escapar HTML en mensaje
        self.mensaje = escape(self.mensaje)
        super().save(*args, **kwargs)
```

---

## 4. 🔴 ALTA: Ausencia de Rate Limiting

### Ubicaciones Identificadas:
- Todos los endpoints públicos carecen de throttling:
  - `RegistroView` (auth-ms)
  - `PQRSCreateView` (portal-ms)
  - `HVCreateView` (portal-ms)
  - `SolicitudValidacionViewSet` (patients-ms)

### Riesgos:
- Bruteforce en registro (creación masiva de cuentas)
- Spam de PQRS/HV
- DoS (Denial of Service)

### Recomendaciones:
```python
# En settings.py de cada microservicio:
REST_FRAMEWORK = {
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle'
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/hour',  # Usuarios anónimos: 100 requests/hora
        'user': '1000/hour'  # Usuarios autenticados: 1000 requests/hora
    }
}

# O en las vistas específicas:
from rest_framework.throttling import UserRateThrottle

class RegistroRateThrottle(UserRateThrottle):
    scope = 'registro'
    rate = '10/hour'  # Máx 10 registros por hora desde una IP

class RegistroView(generics.CreateAPIView):
    throttle_classes = [RegistroRateThrottle]
    # ...
```

---

## 5. 🟡 MEDIA: SyncPacienteUserView sin Validación CSRF

### Ubicación:
- **Patients-MS (views.py, línea 49-65):**
  ```python
  class SyncPacienteUserView(APIView):
      def post(self, request):
          documento = request.data.get('documento')
          user_id = request.data.get('user_id')
  ```

### Riesgos:
- Cross-Site Request Forgery (CSRF) - Aunque REST Framework lo protege por defecto con tokens
- Modificación de asociación paciente-usuario sin validación

### Recomendaciones:
```python
class SyncPacienteUserView(APIView):
    permission_classes = [permissions.IsAuthenticated]  # Solo usuarios logueados
    
    def post(self, request):
        # Validar que el usuario solo puede sincronizar su propio documento
        usuario_actual = request.user
        documento = request.data.get('documento')
        
        if not documento:
            return Response({'error': 'Documento requerido'}, status=400)
        
        # Validar que el documento pertenece al usuario autenticado
        if usuario_actual.documento != documento:
            return Response({'error': 'No puedes sincronizar el documento de otro usuario'}, status=403)
        
        # ... resto de la lógica
```

---

## 6. 🟡 MEDIA: Falta de Validación en Frontend - XSS Potencial

### Ubicaciones Identificadas:
- **Frontend (React):** No se detectaron `dangerouslySetInnerHTML`, `innerHTML`, `eval()` directo
- **Buen punto:** Usando datos directamente en JSX (escapeado automáticamente)

### Sin embargo, hay riesgos con localStorage:
```javascript
// En axiosConfig.js y servicios
localStorage.setItem('token', token);  // ¿Validar si el token es seguro?
localStorage.setItem('user', JSON.stringify(user));
```

### Recomendaciones:
```javascript
// axiosConfig.js - Agregar validación básica del token
import axios from 'axios';
import jwtDecode from 'jwt-decode';

const api = axios.create({
    baseURL: 'http://localhost:8080/api/v1',
});

// Validar integridad del token antes de usarlo
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                // Decodificar y validar estructura
                const decoded = jwtDecode(token);
                // Validar que no esté expirado (extra check del frontend)
                if (decoded.exp * 1000 < Date.now()) {
                    localStorage.removeItem('token');
                    throw new Error('Token expirado');
                }
                config.headers.Authorization = `Bearer ${token}`;
            } catch (e) {
                console.warn('Token inválido');
                localStorage.removeItem('token');
            }
        }
        return config;
    },
    (error) => Promise.reject(error)
);
```

---

## 7. 🟡 MEDIA: Falta de HTTPS en Configuración

### Ubicación:
- **Frontend (axiosConfig.js, línea 3):**
  ```javascript
  baseURL: 'http://localhost:8080/api/v1',  // HTTP en producción = RIESGO
  ```

- **Nginx (nginx.conf, línea 19):**
  ```nginx
  listen 80;  # Sin HTTPS
  ```

### Riesgos:
- Man-in-the-middle (MITM)
- Interceptación de tokens JWT
- Robo de credenciales

### Recomendaciones:
```bash
# 1. Generar certificados SSL
certbot certonly --standalone -d timetrack.com

# 2. En nginx.conf:
server {
    listen 443 ssl http2;
    ssl_certificate /etc/letsencrypt/live/timetrack.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/timetrack.com/privkey.pem;
    
    # Forzar HTTPS
    if ($scheme != "https") {
        return 301 https://$server_name$request_uri;
    }
}

# 3. En frontend (.env):
VITE_API_URL=https://api.timetrack.com/api/v1
```

---

## 8. 🔴 CRÍTICA: Falta de Validación de Permisos Granulares (RBAC)

### Ubicación:
- **Todos los ViewSets:** No validan si el usuario tiene permiso para la acción

Ejemplo de vulnerabilidad:
```python
# patients-ms - PacienteViewSet
class PacienteViewSet(viewsets.ModelViewSet):
    # Cualquier usuario autenticado puede GET/POST/PUT/DELETE cualquier paciente
    queryset = Paciente.objects.all()
    # Falta: Filtrar por usuario actual
```

### Riesgos:
- Un usuario puede ver datos de otros pacientes
- Un usuario puede modificar citas de otro
- Escalación de privilegios

### Recomendaciones:
```python
# En patients-ms/views.py:
from rest_framework import permissions

class IsPacienteOwnerOrAdmin(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        # Admin puede ver todo
        if request.user.is_staff:
            return True
        # Paciente solo puede ver su propio registro
        return obj.user_id == request.user.id

class PacienteViewSet(viewsets.ModelViewSet):
    queryset = Paciente.objects.all()
    serializer_class = PacienteSerializer
    permission_classes = [permissions.IsAuthenticated, IsPacienteOwnerOrAdmin]
    
    def get_queryset(self):
        # Filtrar por usuario autenticado
        if self.request.user.is_staff:
            return Paciente.objects.all()
        return Paciente.objects.filter(user_id=self.request.user.id)
```

---

## 9. 🔴 CRÍTICA: Falta de Validación en Campos Numéricos (BigIntegerField IDs)

### Ubicaciones Identificadas:
- **Todos los microservicios:** Usan `BigIntegerField` para referencias sin validar:
  ```python
  # appointments-ms
  usuario_id = models.BigIntegerField(null=True, blank=True)
  profesional_id = models.BigIntegerField(db_index=True)
  
  # schedule-ms
  profesional_id = models.BigIntegerField(db_index=True)
  
  # notification-ms
  usuario_id = models.BigIntegerField(db_index=True)
  ```

### Riesgos:
- Inyección de IDs arbitrarios (IDOR - Insecure Direct Object References)
- Acceso a datos de otros usuarios modificando el ID

Ejemplo de ataque:
```bash
# Un usuario puede cambiar el ID para acceder a citas de otros
GET /api/v1/citas/?usuario_id=999&profesional_id=999
```

### Recomendaciones:
```python
# En cada ViewSet - Agregar filtrado por usuario autenticado:
class CitaViewSet(viewsets.ModelViewSet):
    queryset = Cita.objects.all()
    
    def get_queryset(self):
        user = self.request.user
        # Filtrar por usuario actual (paciente o profesional)
        if hasattr(user, 'paciente_id') and user.paciente_id:
            return Cita.objects.filter(paciente_id=user.paciente_id)
        if hasattr(user, 'profesional_id') and user.profesional_id:
            return Cita.objects.filter(profesional_id=user.profesional_id)
        if user.is_staff:
            return Cita.objects.all()
        return Cita.objects.none()
```

---

## 10. 🟡 MEDIA: Exposición de Información Sensible en JWT

### Ubicación:
- **Auth-MS (serializers.py, línea 30-40):**
  ```python
  class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
      @classmethod
      def get_token(cls, user):
          token = super().get_token(user)
          token['documento'] = user.documento  # Expuesto
          token['paciente_id'] = user.paciente_id  # Expuesto
          token['profesional_id'] = user.profesional_id  # Expuesto
  ```

### Riesgos:
- Información personal en JWT (aunque codificado, no encriptado)
- Reversión de JWT base64 para acceder a datos sensibles

### Recomendaciones:
```python
# Minimizar la información en el token, guardar en sesión si es necesario
class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # Solo incluir IDs absolutamente necesarios
        token['user_id'] = user.id
        token['is_staff'] = user.is_staff
        token['roles'] = list(user.groups.values_list('name', flat=True))
        
        # NO incluir: documento, emails, IDs de referencias
        return token
```

---

## 11. 🟡 MEDIA: Falta de CORS Restrictivo

### Ubicación:
- **Auth-MS (core/settings.py, línea 87):**
  ```python
  CORS_ALLOW_ALL_ORIGINS = True  # O similar permisivo
  ```

- **Nginx (nginx.conf, línea 23):**
  ```nginx
  set $cors_origin '*';  # Permite CORS desde cualquier origen
  ```

### Riesgos:
- CSRF desde otros dominios
- Acceso desde aplicaciones maliciosas

### Recomendaciones:
```python
# En settings.py:
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",  # Vite dev
    "https://app.timetrack.com",  # Producción
]
CORS_ALLOW_CREDENTIALS = True
```

```nginx
# En nginx.conf:
set $cors_origin '';
if ($http_origin = 'https://app.timetrack.com') {
    set $cors_origin 'https://app.timetrack.com';
}
if ($http_origin = 'http://localhost:5173') {
    set $cors_origin 'http://localhost:5173';
}
```

---

## Resumen de Brechas por Severidad

| # | Brecha | Severidad | Ubicación | Impacto |
|---|--------|-----------|-----------|---------|
| 1 | AllowAny en PQRS/HV/Solicitudes | 🔴 CRÍTICA | portal-ms, patients-ms | Inyección de datos, spam |
| 2 | Sin validación de archivos | 🔴 CRÍTICA | portal-ms | Ejecución de código |
| 3 | Sin Rate Limiting | 🔴 CRÍTICA | Todos los endpoints públicos | DoS, bruteforce |
| 4 | Sin RBAC/permisos granulares | 🔴 CRÍTICA | Todos los ViewSets | IDOR, escalación de privilegios |
| 5 | IDOR en BigIntegerField IDs | 🔴 CRÍTICA | appointments-ms, schedule-ms | Acceso a datos de otros usuarios |
| 6 | Sin HTTPS | 🔴 CRÍTICA | nginx.conf, frontend | MITM, robo de tokens |
| 7 | Sin sanitización HTML | 🟡 MEDIA | portal-ms (PQRS) | XSS almacenado |
| 8 | Información sensible en JWT | 🟡 MEDIA | auth-ms | Exposición de datos |
| 9 | CORS muy permisivo | 🟡 MEDIA | nginx.conf, settings.py | CSRF |
| 10 | Sin validación CSRF en sync | 🟡 MEDIA | patients-ms | CSRF |
| 11 | Sin validación de entrada | 🟡 MEDIA | portal-ms | XSS, inyección |

---

## Plan de Acción Inmediato (Prioridad Crítica)

1. **Agregar Rate Limiting** (30 min)
   - Implementar throttling en todos los endpoints públicos

2. **Validar Archivos Subidos** (1 hora)
   - Verificar extensión, tamaño, tipo MIME en portal-ms

3. **Implementar RBAC** (2 horas)
   - Crear permisos customizados en todas las vistas
   - Filtrar querysets por usuario autenticado

4. **Sanitizar TextFields** (1 hora)
   - Escapar HTML en PQRS y mensajes

5. **Configurar HTTPS** (30 min)
   - Generar certificados SSL, actualizar nginx

6. **Restrictive CORS** (15 min)
   - Whitelist de orígenes permitidos
