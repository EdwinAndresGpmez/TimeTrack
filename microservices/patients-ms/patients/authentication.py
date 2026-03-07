from dataclasses import dataclass
from typing import Optional, Tuple

from django.contrib.auth.models import AnonymousUser
from rest_framework.authentication import BaseAuthentication
from rest_framework.request import Request
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.settings import api_settings
from rest_framework_simplejwt.tokens import UntypedToken


@dataclass
class StatelessUser:
    id: int
    is_staff: bool = False
    is_superuser: bool = False
    username: Optional[str] = None
    email: Optional[str] = None
    roles: Optional[list] = None

    @property
    def is_authenticated(self) -> bool:
        return True


class StatelessJWTAuthentication(BaseAuthentication):
    """
    Autenticación JWT sin consultar la BD local (evita user_not_found).
    Valida firma/exp y construye request.user en memoria.
    """
    www_authenticate_realm = "api"

    def authenticate(self, request: Request) -> Optional[Tuple[StatelessUser, object]]:
        header = self._get_header(request)
        if header is None:
            return None

        raw_token = self._get_raw_token(header)
        if raw_token is None:
            return None

        validated_token = self._get_validated_token(raw_token)
        user = self._build_user(validated_token)

        if isinstance(user, AnonymousUser):
            return None

        return user, validated_token

    def authenticate_header(self, request: Request) -> str:
        return f'Bearer realm="{self.www_authenticate_realm}"'

    def _get_header(self, request: Request) -> Optional[bytes]:
        header = request.META.get(api_settings.AUTH_HEADER_NAME)  # HTTP_AUTHORIZATION
        if isinstance(header, str):
            header = header.encode("utf-8")
        return header

    def _get_raw_token(self, header: bytes) -> Optional[bytes]:
        parts = header.split()
        if len(parts) != 2:
            return None
        if parts[0].lower() != api_settings.AUTH_HEADER_TYPES[0].lower().encode():
            return None
        return parts[1]

    def _get_validated_token(self, raw_token: bytes):
        try:
            return UntypedToken(raw_token)  # valida firma/exp/nbf
        except (InvalidToken, TokenError) as e:
            raise InvalidToken(e.args[0])

    def _build_user(self, token) -> StatelessUser:
        uid = token.get(api_settings.USER_ID_CLAIM)  # default: "user_id"
        try:
            uid = int(uid)
        except Exception:
            return AnonymousUser()

        return StatelessUser(
            id=uid,
            is_staff=bool(token.get("is_staff", False)),
            is_superuser=bool(token.get("is_superuser", False)),
            username=token.get("username") or token.get("nombre_completo") or token.get("nombre"),
            email=token.get("email"),
            roles=token.get("roles") or [],
        )
