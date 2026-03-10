import os
from pathlib import Path

import environ

BASE_DIR = Path(__file__).resolve().parent.parent

env = environ.Env(DEBUG=(bool, False))
environ.Env.read_env(os.path.join(BASE_DIR, ".env"))

SECRET_KEY = env("SECRET_KEY")
DEBUG = env("DEBUG")
ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=["localhost", "127.0.0.1"])

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Terceros
    "rest_framework",
    "rest_framework_simplejwt",
    # Locales
    "comunicaciones",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "core.tenant_security.TenantSignatureMiddleware",
    "core.tenant_schema.TenantSchemaMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "core.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "core.wsgi.application"

# Usamos la misma DB del .env
DATABASES = {
    "default": env.db(),
}

# Configuración REST Framework
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "comunicaciones.authentication.StatelessJWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
}

JWT_SIGNING_KEY = env("JWT_SIGNING_KEY", default=SECRET_KEY)
SIMPLE_JWT = {
    "ALGORITHM": "HS256",
    "SIGNING_KEY": JWT_SIGNING_KEY,
}
TENANT_HEADER_SIGNING_KEY = env("TENANT_HEADER_SIGNING_KEY", default=SECRET_KEY)
TENANT_SIGNATURE_REQUIRED = env.bool("TENANT_SIGNATURE_REQUIRED", default=not DEBUG)
TENANT_SIGNATURE_MAX_SKEW_SEC = env.int("TENANT_SIGNATURE_MAX_SKEW_SEC", default=300)
TENANT_SCHEMA_ENFORCE_HEADER = env.bool("TENANT_SCHEMA_ENFORCE_HEADER", default=not DEBUG)
TENANT_SCHEMA_DEFAULT = env("TENANT_SCHEMA_DEFAULT", default="public")
TENANT_SCHEMA_REQUIRE_HEADER = env.bool("TENANT_SCHEMA_REQUIRE_HEADER", default=not DEBUG)
TENANT_SCHEMA_ALLOW_PUBLIC = env.bool("TENANT_SCHEMA_ALLOW_PUBLIC", default=DEBUG)
TENANT_POLICY_URL = env("TENANT_POLICY_URL", default="http://tenant-billing-ms:8008/api/v1/tenancy/policy/current")
TENANT_POLICY_TIMEOUT_SEC = env.int("TENANT_POLICY_TIMEOUT_SEC", default=5)

# Shared Sender Idefnova (email)
NOTIF_SHARED_EMAIL_ENABLED = env.bool("NOTIF_SHARED_EMAIL_ENABLED", default=False)
NOTIF_SHARED_EMAIL_HOST = env("NOTIF_SHARED_EMAIL_HOST", default="smtp.gmail.com")
NOTIF_SHARED_EMAIL_PORT = env.int("NOTIF_SHARED_EMAIL_PORT", default=587)
NOTIF_SHARED_EMAIL_USE_TLS = env.bool("NOTIF_SHARED_EMAIL_USE_TLS", default=True)
NOTIF_SHARED_EMAIL_TLS_VERIFY = env.bool("NOTIF_SHARED_EMAIL_TLS_VERIFY", default=True)
NOTIF_SHARED_EMAIL_HOST_USER = env("NOTIF_SHARED_EMAIL_HOST_USER", default="")
NOTIF_SHARED_EMAIL_HOST_PASSWORD = env("NOTIF_SHARED_EMAIL_HOST_PASSWORD", default="")
NOTIF_SHARED_EMAIL_FROM = env("NOTIF_SHARED_EMAIL_FROM", default="")
NOTIF_SHARED_EMAIL_FROM_NAME = env("NOTIF_SHARED_EMAIL_FROM_NAME", default="Idefnova")

# WhatsApp QR temporal
NOTIF_WHATSAPP_QR_ENDPOINT = env("NOTIF_WHATSAPP_QR_ENDPOINT", default="")
NOTIF_WHATSAPP_QR_TOKEN = env("NOTIF_WHATSAPP_QR_TOKEN", default="")

# SMS LabsMobile
LABSMOBILE_URL = env("LABSMOBILE_URL", default="https://api.labsmobile.com/json/send")
LABSMOBILE_USER = env("LABSMOBILE_USER", default="")
LABSMOBILE_API_KEY = env("LABSMOBILE_API_KEY", default="")
LABSMOBILE_TPOA = env("LABSMOBILE_TPOA", default="Idefnova")

# SMS Twilio (shared)
NOTIF_SHARED_TWILIO_ENABLED = env.bool("NOTIF_SHARED_TWILIO_ENABLED", default=False)
NOTIF_SHARED_TWILIO_ACCOUNT_SID = env("NOTIF_SHARED_TWILIO_ACCOUNT_SID", default="")
NOTIF_SHARED_TWILIO_AUTH_TOKEN = env("NOTIF_SHARED_TWILIO_AUTH_TOKEN", default="")
NOTIF_SHARED_TWILIO_FROM_NUMBER = env("NOTIF_SHARED_TWILIO_FROM_NUMBER", default="")

# Optional demo BYO sender (for controlled tests only)
DEMO_BYO_EMAIL_HOST = env("DEMO_BYO_EMAIL_HOST", default="")
DEMO_BYO_EMAIL_PORT = env.int("DEMO_BYO_EMAIL_PORT", default=0)
DEMO_BYO_EMAIL_USER = env("DEMO_BYO_EMAIL_USER", default="")
DEMO_BYO_EMAIL_PASSWORD = env("DEMO_BYO_EMAIL_PASSWORD", default="")
DEMO_BYO_EMAIL_FROM = env("DEMO_BYO_EMAIL_FROM", default="")


LANGUAGE_CODE = "es-co"
TIME_ZONE = "America/Bogota"
USE_I18N = True
USE_TZ = True
STATIC_URL = "static/"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
