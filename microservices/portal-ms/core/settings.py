import os
from pathlib import Path
from datetime import timedelta

import environ

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Env
env = environ.Env(DEBUG=(bool, True))
environ.Env.read_env(os.path.join(BASE_DIR, ".env"))

SECRET_KEY = env("SECRET_KEY", default="django-insecure-change-me")
DEBUG = env("DEBUG", default=True)

# Hosts
ALLOWED_HOSTS = env.list(
    "ALLOWED_HOSTS",
    default=["localhost", "127.0.0.1", "0.0.0.0"],
)

# (Opcional pero recomendado en dev con Vite)
CSRF_TRUSTED_ORIGINS = env.list(
    "CSRF_TRUSTED_ORIGINS",
    default=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8007",
        "http://127.0.0.1:8007",
    ],
)

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    # Terceros
    "corsheaders",
    "rest_framework",

    # Locales
    "content",
    "forms",
]

MIDDLEWARE = [
    # ✅ CORS middleware debe ir lo más arriba posible, y antes de CommonMiddleware
    "corsheaders.middleware.CorsMiddleware",

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

DATABASES = {"default": env.db()}

# Media (para banners, videos, etc.)
MEDIA_URL = "/media/"
MEDIA_ROOT = os.path.join(BASE_DIR, "media")

# Static
STATIC_URL = "/static/"
STATIC_ROOT = os.path.join(BASE_DIR, "staticfiles")

# ✅ CORS (Frontend Vite)
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

# ✅ Permitir header Authorization (para Bearer JWT)
CORS_ALLOW_HEADERS = [
    "accept",
    "accept-encoding",
    "authorization",
    "content-type",
    "dnt",
    "origin",
    "user-agent",
    "x-csrftoken",
    "x-requested-with",
]

# (Opcional) Si algún día usas cookies; para Bearer normalmente no hace falta, pero no rompe
CORS_ALLOW_CREDENTIALS = True

# DRF
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "content.authentication.StatelessJWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.AllowAny",
    ],
}

# ✅ SimpleJWT: asegurar que portal-ms valide tokens firmados por Auth MS
# IMPORTANTE: el valor de JWT_SIGNING_KEY debe ser el mismo en Auth MS y portal-ms.
SIMPLE_JWT = {
    "ALGORITHM": env("JWT_ALGORITHM", default="HS256"),
    "SIGNING_KEY": env("JWT_SIGNING_KEY", default=SECRET_KEY),
    "ACCESS_TOKEN_LIFETIME": timedelta(
        minutes=env.int("JWT_ACCESS_MINUTES", default=60)
    ),
}
TENANT_HEADER_SIGNING_KEY = env("TENANT_HEADER_SIGNING_KEY", default=SECRET_KEY)
TENANT_SIGNATURE_REQUIRED = env.bool("TENANT_SIGNATURE_REQUIRED", default=not DEBUG)
TENANT_SIGNATURE_MAX_SKEW_SEC = env.int("TENANT_SIGNATURE_MAX_SKEW_SEC", default=300)
TENANT_SCHEMA_ENFORCE_HEADER = env.bool("TENANT_SCHEMA_ENFORCE_HEADER", default=not DEBUG)
TENANT_SCHEMA_DEFAULT = env("TENANT_SCHEMA_DEFAULT", default="public")
TENANT_SCHEMA_REQUIRE_HEADER = env.bool("TENANT_SCHEMA_REQUIRE_HEADER", default=not DEBUG)
TENANT_SCHEMA_ALLOW_PUBLIC = env.bool("TENANT_SCHEMA_ALLOW_PUBLIC", default=DEBUG)
TENANT_POLICY_PUBLIC_URL = env(
    "TENANT_POLICY_PUBLIC_URL",
    default="http://tenant-billing-ms:8008/api/v1/tenancy/policy/public-current",
)
TENANT_POLICY_TIMEOUT_SEC = env.int("TENANT_POLICY_TIMEOUT_SEC", default=5)

# Internationalization
LANGUAGE_CODE = env("LANGUAGE_CODE", default="es-co")
TIME_ZONE = env("TIME_ZONE", default="America/Bogota")
USE_I18N = True
USE_TZ = True

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
