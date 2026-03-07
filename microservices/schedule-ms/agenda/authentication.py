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
    """
    User "ligero" (sin BD). Suficiente para IsAuthenticated y auditoría.
    """
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
    Valida JWT sin buscar usuario en BD (evita user_not_found).
    """

    www_authenticate_realm = "api"

    def authenticate(self, request: Request) -> Optional[Tuple[StatelessUser, dict]]:
        header = self.get_header(request)
        if header is None:
            return None

        raw_token = self.get_raw_token(header)
        if raw_token is None:
            return None

        validated_token = self.get_validated_token(raw_token)
        user = self.get_stateless_user(validated_token)

        return user, validated_token

    def authenticate_header(self, request: Request) -> str:
        return f'Bearer realm="{self.www_authenticate_realm}"'

    def get_header(self, request: Request) -> Optional[bytes]:
        header = request.META.get(api_settings.AUTH_HEADER_NAME)
        if isinstance(header, str):
            header = header.encode("utf-8")
        return header

    def get_raw_token(self, header: bytes) -> Optional[bytes]:
        parts = header.split()
        if len(parts) != 2:
            return None

        if parts[0].lower() != api_settings.AUTH_HEADER_TYPES[0].lower().encode():
            return None

        return parts[1]

    def get_validated_token(self, raw_token: bytes):
        try:
            # UntypedToken valida firma/exp/nbf/etc sin requerir modelo de usuario
            UntypedToken(raw_token)
        except (InvalidToken, TokenError) as e:
            raise InvalidToken(e.args[0])

        # Si necesitas usar claims luego, decodificamos a dict usando el token "untyped"
        # Nota: UntypedToken ya guarda el payload internamente
        return UntypedToken(raw_token)

    def get_stateless_user(self, validated_token) -> StatelessUser:
        # SimpleJWT usa api_settings.USER_ID_CLAIM por defecto: "user_id"
        uid = validated_token.get(api_settings.USER_ID_CLAIM)

        # si viene como string, lo convertimos
        try:
            uid_int = int(uid) if uid is not None else None
        except Exception:
            uid_int = None

        if uid_int is None:
            # si no hay user_id, no autenticamos
            return AnonymousUser()

        return StatelessUser(
            id=uid_int,
            is_staff=bool(validated_token.get("is_staff", False)),
            is_superuser=bool(validated_token.get("is_superuser", False)),
            username=validated_token.get("username") or validated_token.get("nombre_completo") or validated_token.get("nombre"),
            email=validated_token.get("email"),
            roles=validated_token.get("roles") or [],
        )
