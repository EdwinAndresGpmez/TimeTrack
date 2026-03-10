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
    "django_filters",
    # Locales
    "gestion_citas",
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

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "gestion_citas.authentication.StatelessJWTAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
}

JWT_SIGNING_KEY = env("JWT_SIGNING_KEY", default=SECRET_KEY)

SIMPLE_JWT = {
    "ALGORITHM": "HS256",
    "SIGNING_KEY": JWT_SIGNING_KEY,
}



LANGUAGE_CODE = "es-co"
TIME_ZONE = "America/Bogota"
USE_I18N = True
USE_TZ = True
STATIC_URL = "static/"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

INTERNAL_SERVICE_TOKEN = env("INTERNAL_SERVICE_TOKEN", default="supersecrettoken")
TENANT_POLICY_URL = env("TENANT_POLICY_URL", default="http://tenant-billing-ms:8008/api/v1/tenancy/policy/current")
TENANT_POLICY_TIMEOUT_SEC = env.int("TENANT_POLICY_TIMEOUT_SEC", default=5)
TENANT_HEADER_SIGNING_KEY = env("TENANT_HEADER_SIGNING_KEY", default=SECRET_KEY)
TENANT_SIGNATURE_REQUIRED = env.bool("TENANT_SIGNATURE_REQUIRED", default=not DEBUG)
TENANT_SIGNATURE_MAX_SKEW_SEC = env.int("TENANT_SIGNATURE_MAX_SKEW_SEC", default=300)
TENANT_SCHEMA_ENFORCE_HEADER = env.bool("TENANT_SCHEMA_ENFORCE_HEADER", default=not DEBUG)
TENANT_SCHEMA_DEFAULT = env("TENANT_SCHEMA_DEFAULT", default="public")
TENANT_SCHEMA_REQUIRE_HEADER = env.bool("TENANT_SCHEMA_REQUIRE_HEADER", default=not DEBUG)
TENANT_SCHEMA_ALLOW_PUBLIC = env.bool("TENANT_SCHEMA_ALLOW_PUBLIC", default=DEBUG)
