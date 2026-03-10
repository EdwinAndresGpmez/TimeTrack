import os
from pathlib import Path

import environ

BASE_DIR = Path(__file__).resolve().parent.parent

env = environ.Env(DEBUG=(bool, False))
environ.Env.read_env(os.path.join(BASE_DIR, ".env"))

SECRET_KEY = env("SECRET_KEY", default="tenant-billing-dev-secret")
DEBUG = env("DEBUG")
ALLOWED_HOSTS = env.list(
    "ALLOWED_HOSTS",
    default=["localhost", "127.0.0.1", "tenancy", "tenant-billing-ms"],
)

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "rest_framework_simplejwt",
    "django_filters",
    "tenancy",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "core.tenant_security.TenantSignatureMiddleware",
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
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "core.wsgi.application"

DATABASES = {"default": env.db()}

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "tenancy.authentication.StatelessJWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_FILTER_BACKENDS": (
        "django_filters.rest_framework.DjangoFilterBackend",
    ),
}

JWT_SIGNING_KEY = env("JWT_SIGNING_KEY", default=SECRET_KEY)
SIMPLE_JWT = {
    "ALGORITHM": "HS256",
    "SIGNING_KEY": JWT_SIGNING_KEY,
}

INTERNAL_SERVICE_TOKEN = env("INTERNAL_SERVICE_TOKEN", default="")
TENANT_HEADER_SIGNING_KEY = env("TENANT_HEADER_SIGNING_KEY", default=SECRET_KEY)
GATEWAY_RESOLVE_REQUIRE_TOKEN = env.bool("GATEWAY_RESOLVE_REQUIRE_TOKEN", default=False)
TENANT_SIGNATURE_REQUIRED = env.bool("TENANT_SIGNATURE_REQUIRED", default=not DEBUG)
TENANT_SIGNATURE_MAX_SKEW_SEC = env.int("TENANT_SIGNATURE_MAX_SKEW_SEC", default=300)
TENANT_ALLOW_UNRESOLVED_HOSTS = env.list(
    "TENANT_ALLOW_UNRESOLVED_HOSTS",
    default=["localhost", "127.0.0.1"],
)
AUTH_REGISTER_URL = env(
    "AUTH_REGISTER_URL",
    default="http://auth-ms:8000/api/v1/auth/register/",
)

LANGUAGE_CODE = "es-co"
TIME_ZONE = "America/Bogota"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
