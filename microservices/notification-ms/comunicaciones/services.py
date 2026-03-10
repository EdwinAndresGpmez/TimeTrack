import logging
import base64
import ssl
from datetime import datetime

import requests
from django.conf import settings
from django.db import ProgrammingError
from django.core.mail import EmailMultiAlternatives, get_connection
from django.template import Template
from django.template.context import Context
from rest_framework.exceptions import PermissionDenied, ValidationError

from .models import ChannelProviderConfig, Notificacion, NotificationTemplate
from .utils.tenant_policy import get_feature_rule

logger = logging.getLogger(__name__)


CHANNEL_FEATURE_MAP = {
    "email": ["confirmacion_email"],
    "whatsapp_meta": ["whatsapp"],
    "whatsapp_qr": ["whatsapp"],
    "sms_labsmobile": ["sms"],
    "sms_twilio": ["sms"],
}

NON_SMS_EXTERNAL_CONNECTORS = {
    "email",
    "whatsapp_meta",
    "whatsapp_qr",
}


def active_tenant_id_from_request(request):
    tenant_id = request.headers.get("X-Tenant-ID") or getattr(request, "tenant_id", None)
    if not tenant_id and getattr(request, "auth", None):
        tenant_id = request.auth.get("tenant_id")
    try:
        return int(tenant_id) if tenant_id not in (None, "") else None
    except (TypeError, ValueError):
        return None


def _coerce_bool(value, default=True):
    if value is None:
        return default
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        normalized = value.strip().lower()
        if normalized in {"1", "true", "yes", "y", "on"}:
            return True
        if normalized in {"0", "false", "no", "n", "off"}:
            return False
        return default
    return bool(value)


def _render_template(raw, context):
    if raw in (None, ""):
        return ""
    return Template(raw).render(Context(context or {}))


def _resolve_template(tenant_id, channel, template_code):
    if not template_code:
        return None
    return (
        NotificationTemplate.objects.filter(
            tenant_id=tenant_id,
            channel=channel,
            code=template_code,
            is_active=True,
        )
        .order_by("-updated_at")
        .first()
    )


def _resolve_sender_config(tenant_id, channel, sender_mode):
    return (
        ChannelProviderConfig.objects.filter(
            tenant_id=tenant_id,
            channel=channel,
            sender_mode=sender_mode,
            is_active=True,
        )
        .order_by("-is_default", "-updated_at")
        .first()
    )


def _monthly_messages_used(tenant_id):
    now = datetime.utcnow()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    try:
        return (
            Notificacion.objects.filter(
                tenant_id=tenant_id,
                created_at__gte=month_start,
                estado=Notificacion.Estado.SENT,
                tipo__in=[Notificacion.Tipo.EMAIL, Notificacion.Tipo.WHATSAPP, Notificacion.Tipo.SMS],
            ).count()
        )
    except ProgrammingError:
        # Tenant schema desactualizado: evita caida dura mientras se ejecuta sincronizacion de columnas.
        return 0


def _enforce_feature_and_caps(policy, tenant_id, channel, sender_mode):
    required_features = CHANNEL_FEATURE_MAP.get(channel) or []
    if required_features:
        known_rules = [(code, get_feature_rule(policy, code)) for code in required_features]
        known_rules = [(code, rule) for code, rule in known_rules if rule]
        if known_rules and not any(bool(rule.get("enabled", False)) for _, rule in known_rules):
            feature_code = ",".join(code for code, _ in known_rules)
            raise ValidationError(
                {
                    "detail": f"Funcionalidad '{feature_code}' no disponible para el plan actual.",
                    "feature_code": feature_code,
                }
            )

    # Regla comercial: conectores externos no-SMS.
    # Mantener email SHARED disponible para planes con confirmacion_email sin requerir integraciones.
    requires_integraciones = (
        channel in NON_SMS_EXTERNAL_CONNECTORS
        and not (channel == "email" and sender_mode == ChannelProviderConfig.SenderMode.SHARED)
        and not (channel == "whatsapp_meta" and sender_mode == ChannelProviderConfig.SenderMode.SHARED)
    )
    if requires_integraciones:
        integraciones_rule = get_feature_rule(policy, "integraciones")
        if integraciones_rule and not bool(integraciones_rule.get("enabled", False)):
            raise PermissionDenied("Tu plan no incluye Integraciones externas para este conector.")

    cap_rule = get_feature_rule(policy, "cap_mensajes_mes")
    if bool(cap_rule.get("enabled", False)) and cap_rule.get("limit_int") is not None:
        limit = int(cap_rule["limit_int"])
        used = _monthly_messages_used(tenant_id)
        if used >= limit:
            raise ValidationError(
                {
                    "detail": "Limite mensual de mensajes alcanzado para este tenant.",
                    "feature_code": "cap_mensajes_mes",
                    "limit": limit,
                    "used": used,
                }
            )

    # Optional commercial gate: if catalog contains this feature, enforce it for shared sender.
    if sender_mode == ChannelProviderConfig.SenderMode.SHARED:
        shared_rule = get_feature_rule(policy, "shared_sender_idefnova")
        if shared_rule and not bool(shared_rule.get("enabled", False)):
            raise ValidationError(
                {
                    "detail": "Shared Sender Idefnova no habilitado para este plan.",
                    "feature_code": "shared_sender_idefnova",
                }
            )


def _send_email_with_config(sender_config, subject, message, to_email, sender_mode_requested=None):
    if not to_email:
        raise ValidationError({"to_email": "to_email es requerido para canal email"})

    sender_mode = sender_mode_requested or (sender_config.sender_mode if sender_config else ChannelProviderConfig.SenderMode.BYO)

    if sender_mode == ChannelProviderConfig.SenderMode.SHARED:
        if not bool(getattr(settings, "NOTIF_SHARED_EMAIL_ENABLED", False)):
            raise ValidationError({"detail": "Shared Sender Idefnova no habilitado en entorno"})

        host = settings.NOTIF_SHARED_EMAIL_HOST
        port = settings.NOTIF_SHARED_EMAIL_PORT
        username = settings.NOTIF_SHARED_EMAIL_HOST_USER
        password = settings.NOTIF_SHARED_EMAIL_HOST_PASSWORD
        use_tls = settings.NOTIF_SHARED_EMAIL_USE_TLS
        tls_verify = settings.NOTIF_SHARED_EMAIL_TLS_VERIFY
        from_email = settings.NOTIF_SHARED_EMAIL_FROM
        from_name = settings.NOTIF_SHARED_EMAIL_FROM_NAME
    else:
        cfg = sender_config.config if sender_config else {}
        host = cfg.get("host")
        port = cfg.get("port")
        username = cfg.get("username")
        password = cfg.get("password")
        use_tls = bool(cfg.get("use_tls", True))
        tls_verify = _coerce_bool(cfg.get("tls_verify"), default=True)
        from_email = sender_config.from_email if sender_config else None
        from_name = sender_config.from_name if sender_config else None
        if not all([host, port, username, password, from_email]):
            raise ValidationError(
                {
                    "detail": "Config SMTP BYO incompleta. Debe incluir host, port, username, password y from_email."
                }
            )

    connection = get_connection(
        backend="django.core.mail.backends.smtp.EmailBackend",
        host=host,
        port=int(port),
        username=username,
        password=password,
        use_tls=bool(use_tls),
        timeout=10,
    )
    if use_tls:
        tls_context = ssl.create_default_context()
        if not _coerce_bool(tls_verify, default=True):
            # Solo para entornos de desarrollo con certificado self-signed.
            tls_context.check_hostname = False
            tls_context.verify_mode = ssl.CERT_NONE
        connection.ssl_context = tls_context

    final_from = f"{from_name} <{from_email}>" if from_name else from_email
    email = EmailMultiAlternatives(
        subject=subject or "Notificacion",
        body=message or "",
        from_email=final_from,
        to=[to_email],
        connection=connection,
    )
    email.attach_alternative(message or "", "text/html")
    sent_count = email.send(fail_silently=False)
    if sent_count < 1:
        raise ValidationError({"detail": "El proveedor SMTP no reporto envios exitosos"})
    return {"provider_message_id": None}


def _send_whatsapp_meta(sender_config, message, to_phone):
    if not to_phone:
        raise ValidationError({"to_phone": "to_phone es requerido para canal whatsapp_meta"})
    if sender_config is None:
        raise ValidationError({"detail": "Config de WhatsApp Meta no existe para este tenant"})

    if sender_config.sender_mode == ChannelProviderConfig.SenderMode.SHARED:
        # Skeleton: pendiente hasta tener cuenta institucional de Meta.
        return {
            "status": Notificacion.Estado.PENDING,
            "provider_message_id": None,
            "error": "Configuracion Meta Shared pendiente de onboarding institucional.",
        }

    cfg = sender_config.config or {}
    access_token = cfg.get("access_token")
    phone_number_id = cfg.get("phone_number_id")
    api_version = cfg.get("api_version", "v21.0")
    if not (access_token and phone_number_id):
        raise ValidationError({"detail": "Config Meta BYO incompleta: access_token y phone_number_id son requeridos"})

    url = f"https://graph.facebook.com/{api_version}/{phone_number_id}/messages"
    payload = {
        "messaging_product": "whatsapp",
        "to": to_phone,
        "type": "text",
        "text": {"body": message or ""},
    }
    headers = {"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"}

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=10)
    except requests.RequestException as exc:
        raise ValidationError({"detail": f"Error enviando a Meta API: {exc}"}) from exc

    if response.status_code >= 400:
        raise ValidationError({"detail": f"Meta API {response.status_code}: {response.text}"})

    data = response.json() if response.content else {}
    msg_id = (((data.get("messages") or [{}])[0]).get("id")) if isinstance(data, dict) else None
    return {"status": Notificacion.Estado.SENT, "provider_message_id": msg_id}


def _send_whatsapp_qr(sender_config, message, to_phone):
    if not to_phone:
        raise ValidationError({"to_phone": "to_phone es requerido para canal whatsapp_qr"})
    if sender_config is None:
        raise ValidationError({"detail": "Config de WhatsApp QR no existe para este tenant"})

    cfg = sender_config.config or {}
    endpoint = cfg.get("endpoint") or getattr(settings, "NOTIF_WHATSAPP_QR_ENDPOINT", "")
    token = cfg.get("token") or getattr(settings, "NOTIF_WHATSAPP_QR_TOKEN", "")

    if not endpoint:
        return {
            "status": Notificacion.Estado.PENDING,
            "provider_message_id": None,
            "error": "Canal QR habilitado sin endpoint; envio en modo simulado.",
        }

    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    payload = {"to": to_phone, "message": message or ""}

    try:
        response = requests.post(endpoint, json=payload, headers=headers, timeout=10)
    except requests.RequestException as exc:
        raise ValidationError({"detail": f"Error enviando a gateway QR: {exc}"}) from exc

    if response.status_code >= 400:
        raise ValidationError({"detail": f"Gateway QR {response.status_code}: {response.text}"})

    data = response.json() if response.content else {}
    provider_message_id = data.get("message_id") if isinstance(data, dict) else None
    return {"status": Notificacion.Estado.SENT, "provider_message_id": provider_message_id}


def _resolve_labsmobile_credentials(sender_config):
    if sender_config and sender_config.sender_mode == ChannelProviderConfig.SenderMode.BYO:
        cfg = sender_config.config or {}
        user = cfg.get("user")
        api_key = cfg.get("api_key")
        sender = cfg.get("tpoa") or cfg.get("sender") or "Idefnova"
        if not (user and api_key):
            raise ValidationError({"detail": "Config LabsMobile BYO incompleta: user y api_key son requeridos"})
        return user, api_key, sender

    user = getattr(settings, "LABSMOBILE_USER", "")
    api_key = getattr(settings, "LABSMOBILE_API_KEY", "")
    sender = getattr(settings, "LABSMOBILE_TPOA", "Idefnova")
    if not (user and api_key):
        raise ValidationError({"detail": "LabsMobile SHARED no configurado en entorno"})
    return user, api_key, sender


def _send_sms_labsmobile(sender_config, message, to_phone):
    if not to_phone:
        raise ValidationError({"to_phone": "to_phone es requerido para sms_labsmobile"})

    user, api_key, sender = _resolve_labsmobile_credentials(sender_config)
    url = getattr(settings, "LABSMOBILE_URL", "https://api.labsmobile.com/json/send")

    credentials = base64.b64encode(f"{user}:{api_key}".encode("utf-8")).decode("utf-8")
    payload = {
        "message": message or "",
        "tpoa": sender,
        "recipient": [{"msisdn": to_phone}],
    }
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Basic {credentials}",
        "Cache-Control": "no-cache",
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=10)
    except requests.RequestException as exc:
        raise ValidationError({"detail": f"Error enviando SMS LabsMobile: {exc}"}) from exc

    if response.status_code >= 400:
        raise ValidationError({"detail": f"LabsMobile {response.status_code}: {response.text}"})

    data = response.json() if response.content else {}
    code = str(data.get("code", ""))
    if code != "0":
        raise ValidationError({"detail": f"LabsMobile rechazo envio: {data}"})

    msg_id = data.get("sms") or data.get("message_id") or None
    return {"status": Notificacion.Estado.SENT, "provider_message_id": str(msg_id) if msg_id else None}


def _resolve_twilio_credentials(sender_config):
    if sender_config and sender_config.sender_mode == ChannelProviderConfig.SenderMode.BYO:
        cfg = sender_config.config or {}
        sid = cfg.get("account_sid")
        token = cfg.get("auth_token")
        from_number = cfg.get("from_number")
        if not (sid and token and from_number):
            raise ValidationError({"detail": "Config Twilio BYO incompleta: account_sid, auth_token y from_number"})
        return sid, token, from_number

    if not bool(getattr(settings, "NOTIF_SHARED_TWILIO_ENABLED", False)):
        raise ValidationError({"detail": "Twilio SHARED no habilitado en entorno"})

    sid = getattr(settings, "NOTIF_SHARED_TWILIO_ACCOUNT_SID", "")
    token = getattr(settings, "NOTIF_SHARED_TWILIO_AUTH_TOKEN", "")
    from_number = getattr(settings, "NOTIF_SHARED_TWILIO_FROM_NUMBER", "")
    if not (sid and token and from_number):
        raise ValidationError({"detail": "Twilio SHARED incompleto en entorno"})
    return sid, token, from_number


def _send_sms_twilio(sender_config, message, to_phone):
    if not to_phone:
        raise ValidationError({"to_phone": "to_phone es requerido para sms_twilio"})

    sid, token, from_number = _resolve_twilio_credentials(sender_config)
    url = f"https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json"
    payload = {
        "To": to_phone,
        "From": from_number,
        "Body": message or "",
    }

    try:
        response = requests.post(url, data=payload, auth=(sid, token), timeout=10)
    except requests.RequestException as exc:
        raise ValidationError({"detail": f"Error enviando SMS Twilio: {exc}"}) from exc

    if response.status_code >= 400:
        raise ValidationError({"detail": f"Twilio {response.status_code}: {response.text}"})

    data = response.json() if response.content else {}
    msg_id = data.get("sid")
    return {"status": Notificacion.Estado.SENT, "provider_message_id": msg_id}


def get_whatsapp_qr_info(config_obj: ChannelProviderConfig):
    if config_obj.channel != ChannelProviderConfig.Channel.WHATSAPP_QR:
        raise ValidationError({"detail": "La configuracion no corresponde a whatsapp_qr"})

    cfg = config_obj.config or {}
    qr_image_url = cfg.get("qr_image_url")
    qr_text = cfg.get("qr_text")
    if qr_image_url or qr_text:
        return {
            "status": "available",
            "qr_image_url": qr_image_url,
            "qr_text": qr_text,
            "source": "config",
        }

    endpoint = cfg.get("endpoint") or getattr(settings, "NOTIF_WHATSAPP_QR_ENDPOINT", "")
    token = cfg.get("token") or getattr(settings, "NOTIF_WHATSAPP_QR_TOKEN", "")
    if not endpoint:
        return {
            "status": "pending",
            "detail": "No hay endpoint de QR configurado. Puedes cargar qr_image_url en config JSON.",
        }

    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    try:
        response = requests.get(f"{endpoint.rstrip('/')}/qr", headers=headers, timeout=10)
    except requests.RequestException as exc:
        raise ValidationError({"detail": f"No se pudo consultar QR: {exc}"}) from exc

    if response.status_code >= 400:
        raise ValidationError({"detail": f"QR endpoint {response.status_code}: {response.text}"})

    data = response.json() if response.content else {}
    return {
        "status": "available",
        "qr_image_url": data.get("qr_image_url"),
        "qr_text": data.get("qr_text"),
        "raw": data,
        "source": "endpoint",
    }


def validate_channel_config(config_obj: ChannelProviderConfig):
    if config_obj.channel == ChannelProviderConfig.Channel.EMAIL:
        if config_obj.sender_mode == ChannelProviderConfig.SenderMode.SHARED:
            if not bool(getattr(settings, "NOTIF_SHARED_EMAIL_ENABLED", False)):
                raise ValidationError({"detail": "Shared Sender Idefnova (email) no habilitado"})
            required = [
                getattr(settings, "NOTIF_SHARED_EMAIL_HOST_USER", ""),
                getattr(settings, "NOTIF_SHARED_EMAIL_HOST_PASSWORD", ""),
                getattr(settings, "NOTIF_SHARED_EMAIL_FROM", ""),
            ]
            if not all(required):
                raise ValidationError({"detail": "Shared Sender Idefnova incompleto en variables de entorno"})
            return {"ok": True, "channel": config_obj.channel, "mode": config_obj.sender_mode}

        cfg = config_obj.config or {}
        required = ["host", "port", "username", "password"]
        missing = [k for k in required if not cfg.get(k)]
        if missing or not config_obj.from_email:
            raise ValidationError({"detail": f"Config BYO incompleta. Faltan: {', '.join(missing)} y/o from_email"})
        return {"ok": True, "channel": config_obj.channel, "mode": config_obj.sender_mode}

    if config_obj.channel == ChannelProviderConfig.Channel.WHATSAPP_META:
        if config_obj.sender_mode == ChannelProviderConfig.SenderMode.SHARED:
            return {"ok": True, "channel": config_obj.channel, "mode": config_obj.sender_mode, "note": "pending_meta_shared"}
        cfg = config_obj.config or {}
        missing = [k for k in ["access_token", "phone_number_id"] if not cfg.get(k)]
        if missing:
            raise ValidationError({"detail": f"Config Meta BYO incompleta. Faltan: {', '.join(missing)}"})
        return {"ok": True, "channel": config_obj.channel, "mode": config_obj.sender_mode}

    if config_obj.channel == ChannelProviderConfig.Channel.WHATSAPP_QR:
        cfg = config_obj.config or {}
        endpoint = cfg.get("endpoint") or getattr(settings, "NOTIF_WHATSAPP_QR_ENDPOINT", "")
        if not endpoint:
            return {
                "ok": True,
                "channel": config_obj.channel,
                "mode": config_obj.sender_mode,
                "note": "qr_simulation_without_endpoint",
            }
        return {"ok": True, "channel": config_obj.channel, "mode": config_obj.sender_mode}

    if config_obj.channel == ChannelProviderConfig.Channel.SMS_LABSMOBILE:
        _resolve_labsmobile_credentials(config_obj)
        return {"ok": True, "channel": config_obj.channel, "mode": config_obj.sender_mode}

    if config_obj.channel == ChannelProviderConfig.Channel.SMS_TWILIO:
        _resolve_twilio_credentials(config_obj)
        return {"ok": True, "channel": config_obj.channel, "mode": config_obj.sender_mode}

    return {"ok": True, "channel": config_obj.channel, "mode": config_obj.sender_mode}


def dispatch_notification(*, request, policy, payload, tenant_id=None):
    tenant_id = tenant_id if tenant_id is not None else active_tenant_id_from_request(request)
    if tenant_id is None:
        raise ValidationError({"detail": "tenant_id requerido"})

    channel = payload["channel"]
    sender_mode = payload.get("sender_mode") or ChannelProviderConfig.SenderMode.BYO
    to_email = payload.get("to_email")
    to_phone = payload.get("to_phone")
    raw_subject = payload.get("subject") or ""
    raw_message = payload.get("message") or ""
    template_code = payload.get("template_code")
    context = payload.get("context") or {}

    _enforce_feature_and_caps(policy, tenant_id, channel, sender_mode)
    sender_config = _resolve_sender_config(tenant_id, channel, sender_mode)
    template = _resolve_template(tenant_id, channel, template_code)

    if template:
        raw_subject = template.subject_template or raw_subject
        raw_message = template.body_template or raw_message

    subject = _render_template(raw_subject, context)
    message = _render_template(raw_message, context)

    notif = Notificacion.objects.create(
        tenant_id=tenant_id,
        usuario_id=payload["usuario_id"],
        cita_id=payload.get("cita_id"),
        asunto=subject or "Notificacion",
        mensaje=message or "",
        leida=False,
        tipo=Notificacion.Tipo.SISTEMA,
        estado=Notificacion.Estado.PENDING,
        canal=channel,
        sender_mode=sender_mode,
        destinatario_email=to_email or None,
        destinatario_telefono=to_phone or None,
        metadata={
            "template_code": template_code,
            "sender_provider": sender_config.provider if sender_config else None,
        },
    )

    try:
        if channel == "email":
            result = _send_email_with_config(sender_config, subject, message, to_email, sender_mode)
            notif.tipo = Notificacion.Tipo.EMAIL
            notif.estado = Notificacion.Estado.SENT
            notif.provider_message_id = result.get("provider_message_id")
        elif channel == "whatsapp_meta":
            result = _send_whatsapp_meta(sender_config, message, to_phone)
            notif.tipo = Notificacion.Tipo.WHATSAPP
            notif.estado = result.get("status", Notificacion.Estado.SENT)
            notif.provider_message_id = result.get("provider_message_id")
            if result.get("error"):
                notif.error_detalle = result["error"]
        elif channel == "whatsapp_qr":
            result = _send_whatsapp_qr(sender_config, message, to_phone)
            notif.tipo = Notificacion.Tipo.WHATSAPP
            notif.estado = result.get("status", Notificacion.Estado.SENT)
            notif.provider_message_id = result.get("provider_message_id")
            if result.get("error"):
                notif.error_detalle = result["error"]
        elif channel == "sms_labsmobile":
            result = _send_sms_labsmobile(sender_config, message, to_phone)
            notif.tipo = Notificacion.Tipo.SMS
            notif.estado = result.get("status", Notificacion.Estado.SENT)
            notif.provider_message_id = result.get("provider_message_id")
        elif channel == "sms_twilio":
            result = _send_sms_twilio(sender_config, message, to_phone)
            notif.tipo = Notificacion.Tipo.SMS
            notif.estado = result.get("status", Notificacion.Estado.SENT)
            notif.provider_message_id = result.get("provider_message_id")
        else:
            notif.tipo = Notificacion.Tipo.SISTEMA
            notif.estado = Notificacion.Estado.SENT
    except ValidationError as exc:
        notif.estado = Notificacion.Estado.FAILED
        notif.error_detalle = str(exc.detail)
        notif.save(update_fields=["tipo", "estado", "provider_message_id", "error_detalle", "updated_at"])
        raise
    except Exception as exc:
        logger.exception("Error de envio de notificacion")
        notif.estado = Notificacion.Estado.FAILED
        notif.error_detalle = str(exc)
        notif.save(update_fields=["tipo", "estado", "provider_message_id", "error_detalle", "updated_at"])
        raise ValidationError({"detail": f"Error interno al enviar notificacion: {exc}"}) from exc

    notif.save(update_fields=["tipo", "estado", "provider_message_id", "error_detalle", "updated_at"])
    return notif
