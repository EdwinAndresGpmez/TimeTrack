import React, { useEffect, useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import { FaBell, FaCheckCircle, FaFlask, FaPaperPlane, FaSave } from 'react-icons/fa';
import { notificationService } from '../../../services/notificationService';

const normalize = (data) => (Array.isArray(data) ? data : data?.results || []);

const channelLabels = {
  email: 'Email',
  whatsapp_meta: 'WhatsApp Meta',
  whatsapp_qr: 'WhatsApp QR',
  sms_labsmobile: 'SMS LabsMobile',
  sms_twilio: 'SMS Twilio',
};

const senderModeInfo = {
  SHARED: {
    title: 'SHARED (Idefnova)',
    description: 'Idefnova envia por ti. Ideal cuando la clinica no tiene su propia cuenta tecnica.',
  },
  BYO: {
    title: 'BYO (Bring Your Own Sender)',
    description: 'La clinica usa su propia cuenta/proveedor (SMTP, Meta, SMS).',
  },
};

const configTemplates = {
  email: {
    SHARED: {},
    BYO: {
      host: 'smtp.gmail.com',
      port: 587,
      username: 'clinica@correo.com',
      password: 'app_password',
      use_tls: true,
      tls_verify: true,
    },
  },
  whatsapp_meta: {
    SHARED: {},
    BYO: {
      access_token: 'meta_token',
      phone_number_id: '123456789',
      api_version: 'v21.0',
    },
  },
  whatsapp_qr: {
    SHARED: {},
    BYO: {
      endpoint: 'https://tu-gateway-qr/send',
      token: 'token_opcional',
      qr_image_url: '',
      qr_text: '',
    },
  },
  sms_labsmobile: {
    SHARED: {},
    BYO: {
      user: 'clinica@correo.com',
      api_key: 'api_key',
      tpoa: 'TimeTrack',
    },
  },
  sms_twilio: {
    SHARED: {},
    BYO: {
      account_sid: 'ACxxxx',
      auth_token: 'token',
      from_number: '+15550001111',
    },
  },
};

const defaultConfigForm = {
  channel: 'email',
  sender_mode: 'SHARED',
  provider: 'idefnova_shared',
  is_active: true,
  is_default: false,
  from_email: '',
  from_name: '',
  config_json: JSON.stringify(configTemplates.email.SHARED, null, 2),
  notes: '',
};

const defaultTemplateForm = {
  code: 'appointment_created',
  channel: 'email',
  is_active: true,
  subject_template: 'Nueva cita solicitada',
  body_template: '<p>Hola {{ paciente_nombre }}, tu cita fue registrada.</p>',
};

const defaultDispatchForm = {
  template_code: 'appointment_created',
  usuario_id: '',
  cita_id: '',
  channel: 'email',
  sender_mode: 'SHARED',
  to_email: '',
  to_phone: '',
  subject: '',
  message: '',
  context_json: '{"paciente_nombre":"Paciente Demo","fecha_cita":"2026-03-20","hora_cita":"10:30"}',
};

const parseJsonOrThrow = (label, raw) => {
  if (!raw || !String(raw).trim()) return {};
  try {
    return JSON.parse(raw);
  } catch (_e) {
    throw new Error(`JSON invalido en ${label}`);
  }
};

const renderTemplatePreview = (raw, contextObj) =>
  String(raw || '').replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, key) => {
    const val = contextObj?.[key];
    return val === undefined || val === null ? '' : String(val);
  });

const safeErrorMessage = (error, fallback) =>
  error?.response?.data?.detail ||
  (typeof error?.message === 'string' ? error.message : fallback);

const quickSteps = [
  '1) Selecciona la clinica (tenant).',
  '2) Elige canal y modo (SHARED o BYO).',
  '3) Guarda el canal y pulsa "Probar conexion".',
  '4) Crea una plantilla de mensaje.',
  '5) Envia una prueba con datos reales del paciente/usuario.',
];

export default function NotificationCenterTab({
  tenants = [],
  selectedTenantId,
  onSelectTenant,
}) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [configs, setConfigs] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [qrInfoByConfig, setQrInfoByConfig] = useState({});

  const [configDraft, setConfigDraft] = useState({});
  const [templateDraft, setTemplateDraft] = useState({});

  const [configForm, setConfigForm] = useState(defaultConfigForm);
  const [templateForm, setTemplateForm] = useState(defaultTemplateForm);
  const [dispatchForm, setDispatchForm] = useState(defaultDispatchForm);
  const [previewContextJson, setPreviewContextJson] = useState(
    '{"paciente_nombre":"Paciente Demo","fecha_cita":"2026-03-20","hora_cita":"10:30"}'
  );

  const selectedTenant = useMemo(
    () => tenants.find((t) => t.id === selectedTenantId) || null,
    [tenants, selectedTenantId]
  );

  const previewContext = useMemo(() => {
    try {
      return parseJsonOrThrow('preview_context', previewContextJson);
    } catch (_e) {
      return {};
    }
  }, [previewContextJson]);

  const templatePreviewSubject = renderTemplatePreview(templateForm.subject_template || '', previewContext);
  const templatePreviewBody = renderTemplatePreview(templateForm.body_template || '', previewContext);
  const previewFromName = configForm.from_name || 'Clinica';
  const previewFromEmail = configForm.from_email || 'no-reply@clinica.com';
  const previewTimestamp = new Date().toLocaleString('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const loadData = async () => {
    if (!selectedTenantId) return;
    try {
      setLoading(true);
      const [cfg, tpl] = await Promise.all([
        notificationService.getChannelConfigs(selectedTenantId),
        notificationService.getTemplates(selectedTenantId),
      ]);
      setConfigs(normalize(cfg));
      setTemplates(normalize(tpl));
      setConfigDraft({});
      setTemplateDraft({});
    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'No se pudo cargar configuracion de notificaciones.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedTenantId]);

  const applyConfigExample = (channel, senderMode, isRow = false, rowId = null) => {
    const template = configTemplates[channel]?.[senderMode] || {};
    const text = JSON.stringify(template, null, 2);
    if (!isRow) {
      setConfigForm((prev) => ({ ...prev, config_json: text }));
      return;
    }
    setConfigDraft((prev) => {
      const row = prev[rowId] || {};
      return {
        ...prev,
        [rowId]: {
          ...row,
          config_json: text,
        },
      };
    });
  };

  const getConfigRow = (row) =>
    configDraft[row.id] || {
      provider: row.provider || '',
      channel: row.channel || 'email',
      sender_mode: row.sender_mode || 'SHARED',
      is_active: !!row.is_active,
      is_default: !!row.is_default,
      from_email: row.from_email || '',
      from_name: row.from_name || '',
      notes: row.notes || '',
      config_json: JSON.stringify(row.config || {}, null, 2),
    };

  const getTemplateRow = (row) =>
    templateDraft[row.id] || {
      code: row.code || '',
      channel: row.channel || 'email',
      is_active: !!row.is_active,
      subject_template: row.subject_template || '',
      body_template: row.body_template || '',
    };

  const handleCreateConfig = async () => {
    if (!selectedTenantId) return;
    try {
      const payload = {
        channel: configForm.channel,
        sender_mode: configForm.sender_mode,
        provider: configForm.provider,
        is_active: !!configForm.is_active,
        is_default: !!configForm.is_default,
        from_email: configForm.from_email || null,
        from_name: configForm.from_name || null,
        config: parseJsonOrThrow('config', configForm.config_json),
        notes: configForm.notes || null,
      };
      setSaving(true);
      await notificationService.createChannelConfig(payload, selectedTenantId);
      await loadData();
      Swal.fire('OK', 'Canal guardado.', 'success');
    } catch (error) {
      console.error(error);
      Swal.fire('Error', safeErrorMessage(error, 'No se pudo guardar canal.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveConfigRow = async (row) => {
    const draft = getConfigRow(row);
    try {
      const payload = {
        provider: draft.provider,
        is_active: !!draft.is_active,
        is_default: !!draft.is_default,
        from_email: draft.from_email || null,
        from_name: draft.from_name || null,
        notes: draft.notes || null,
        config: parseJsonOrThrow('config', draft.config_json),
      };
      setSaving(true);
      await notificationService.updateChannelConfig(row.id, payload, selectedTenantId);
      await loadData();
      Swal.fire({ icon: 'success', title: 'Canal actualizado', timer: 900, showConfirmButton: false });
    } catch (error) {
      console.error(error);
      Swal.fire('Error', safeErrorMessage(error, 'No se pudo actualizar canal.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConfigRow = async (row) => {
    try {
      setSaving(true);
      const resp = await notificationService.testChannelConfig(row.id, selectedTenantId);
      Swal.fire('Validacion', JSON.stringify(resp, null, 2), 'success');
    } catch (error) {
      console.error(error);
      Swal.fire('Error', safeErrorMessage(error, 'Conexion invalida para este canal.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleFetchQrInfo = async (row) => {
    try {
      setSaving(true);
      const resp = await notificationService.getQrInfo(row.id, selectedTenantId);
      setQrInfoByConfig((prev) => ({ ...prev, [row.id]: resp }));
      if (!resp?.qr_image_url && !resp?.qr_text) {
        Swal.fire('QR', resp?.detail || 'No hay QR disponible en este momento.', 'info');
      }
    } catch (error) {
      console.error(error);
      Swal.fire('Error', safeErrorMessage(error, 'No se pudo obtener QR.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateTemplate = async () => {
    if (!selectedTenantId) return;
    try {
      setSaving(true);
      await notificationService.createTemplate({ ...templateForm }, selectedTenantId);
      await loadData();
      Swal.fire('OK', 'Plantilla guardada.', 'success');
    } catch (error) {
      console.error(error);
      Swal.fire('Error', safeErrorMessage(error, 'No se pudo guardar plantilla.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTemplateRow = async (row) => {
    try {
      setSaving(true);
      await notificationService.updateTemplate(row.id, getTemplateRow(row), selectedTenantId);
      await loadData();
      Swal.fire({ icon: 'success', title: 'Plantilla actualizada', timer: 900, showConfirmButton: false });
    } catch (error) {
      console.error(error);
      Swal.fire('Error', safeErrorMessage(error, 'No se pudo actualizar plantilla.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDispatch = async () => {
    if (!selectedTenantId) return;
    try {
      const payload = {
        template_code: dispatchForm.template_code || '',
        usuario_id: Number(dispatchForm.usuario_id),
        cita_id: dispatchForm.cita_id ? Number(dispatchForm.cita_id) : null,
        channel: dispatchForm.channel,
        sender_mode: dispatchForm.sender_mode,
        to_email: dispatchForm.to_email || '',
        to_phone: dispatchForm.to_phone || '',
        subject: dispatchForm.subject || '',
        message: dispatchForm.message || '',
        context: parseJsonOrThrow('context', dispatchForm.context_json),
      };
      setSaving(true);
      const res = await notificationService.dispatchNotification(payload, selectedTenantId);
      Swal.fire('Enviado', `Estado: ${res.estado} | Canal: ${res.canal}`, 'success');
      await loadData();
    } catch (error) {
      console.error(error);
      Swal.fire('Error', safeErrorMessage(error, 'No se pudo enviar notificacion de prueba.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <section className="bg-white rounded-xl border p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-black text-slate-800 inline-flex items-center gap-2">
            <FaBell className="text-indigo-600" /> Centro de Notificaciones SaaS
          </h2>
          <div className="w-full md:w-80">
            <label className="text-xs font-bold text-slate-500">Clinica (tenant) a configurar</label>
            <select
              value={selectedTenantId || ''}
              onChange={(e) => onSelectTenant(Number(e.target.value))}
              className="w-full mt-1 border rounded-lg p-2 text-sm"
            >
              <option value="">Selecciona una clinica</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.legal_name} ({t.slug})
                </option>
              ))}
            </select>
          </div>
        </div>
        {selectedTenant && (
          <p className="text-xs text-slate-500 mt-2">
            Tenant activo: <b>{selectedTenant.legal_name}</b> | schema: {selectedTenant.schema_name}
          </p>
        )}
      </section>

      <section className="bg-white rounded-xl border p-4">
        <h3 className="font-black text-slate-800 mb-2">Guia rapida (sin tecnicismos)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <div className="rounded-lg border bg-blue-50 p-3">
            <p className="font-bold text-blue-900">{senderModeInfo.SHARED.title}</p>
            <p className="text-xs text-blue-700 mt-1">{senderModeInfo.SHARED.description}</p>
          </div>
          <div className="rounded-lg border bg-emerald-50 p-3">
            <p className="font-bold text-emerald-900">{senderModeInfo.BYO.title}</p>
            <p className="text-xs text-emerald-700 mt-1">{senderModeInfo.BYO.description}</p>
          </div>
        </div>
        <div className="space-y-1 text-sm text-slate-700">
          {quickSteps.map((step) => (
            <p key={step} className="inline-flex items-center gap-2">
              <FaCheckCircle className="text-emerald-600 text-xs" /> {step}
            </p>
          ))}
        </div>
      </section>

      <section className="bg-white rounded-xl border p-4">
        <h3 className="font-black text-slate-800 mb-1">Paso 1: Crear canal de envio</h3>
        <p className="text-xs text-slate-500 mb-3">Define por donde se enviaran mensajes.</p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
          <select
            value={configForm.channel}
            onChange={(e) => {
              const nextChannel = e.target.value;
              setConfigForm((p) => ({
                ...p,
                channel: nextChannel,
                config_json: JSON.stringify(configTemplates[nextChannel]?.[p.sender_mode] || {}, null, 2),
              }));
            }}
            className="border rounded-lg p-2"
          >
            <option value="email">Email</option>
            <option value="whatsapp_meta">WhatsApp Meta</option>
            <option value="whatsapp_qr">WhatsApp QR</option>
            <option value="sms_labsmobile">SMS LabsMobile</option>
            <option value="sms_twilio">SMS Twilio</option>
          </select>
          <select
            value={configForm.sender_mode}
            onChange={(e) => {
              const nextMode = e.target.value;
              setConfigForm((p) => ({
                ...p,
                sender_mode: nextMode,
                config_json: JSON.stringify(configTemplates[p.channel]?.[nextMode] || {}, null, 2),
              }));
            }}
            className="border rounded-lg p-2"
          >
            <option value="SHARED">SHARED (Idefnova)</option>
            <option value="BYO">BYO (Cuenta propia)</option>
          </select>
          <input
            value={configForm.provider}
            onChange={(e) => setConfigForm((p) => ({ ...p, provider: e.target.value }))}
            className="border rounded-lg p-2"
            placeholder="Proveedor (ej: smtp, twilio, labsmobile)"
          />
          <input
            value={configForm.from_email}
            onChange={(e) => setConfigForm((p) => ({ ...p, from_email: e.target.value }))}
            className="border rounded-lg p-2"
            placeholder="Correo remitente"
          />
          <input
            value={configForm.from_name}
            onChange={(e) => setConfigForm((p) => ({ ...p, from_name: e.target.value }))}
            className="border rounded-lg p-2 md:col-span-2"
            placeholder="Nombre visible remitente"
          />
          <input
            value={configForm.notes}
            onChange={(e) => setConfigForm((p) => ({ ...p, notes: e.target.value }))}
            className="border rounded-lg p-2 md:col-span-2"
            placeholder="Nota interna"
          />
          <textarea
            value={configForm.config_json}
            onChange={(e) => setConfigForm((p) => ({ ...p, config_json: e.target.value }))}
            className="border rounded-lg p-2 md:col-span-4 h-24 font-mono text-xs"
            placeholder='Config JSON del proveedor'
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 mt-3 text-xs">
          <label className="inline-flex items-center gap-2"><input type="checkbox" checked={configForm.is_active} onChange={(e) => setConfigForm((p) => ({ ...p, is_active: e.target.checked }))} /> Activo</label>
          <label className="inline-flex items-center gap-2"><input type="checkbox" checked={configForm.is_default} onChange={(e) => setConfigForm((p) => ({ ...p, is_default: e.target.checked }))} /> Canal por defecto</label>
          <button type="button" onClick={() => applyConfigExample(configForm.channel, configForm.sender_mode)} className="px-3 py-2 rounded-lg bg-slate-100 text-slate-800 font-bold">
            Cargar ejemplo
          </button>
          <button
            disabled={saving || !selectedTenantId}
            onClick={handleCreateConfig}
            className="px-3 py-2 rounded-lg bg-slate-900 text-white font-bold inline-flex items-center gap-2"
          >
            <FaSave /> Guardar canal
          </button>
        </div>
      </section>

      <section className="bg-white rounded-xl border p-4">
        <h3 className="font-black text-slate-800 mb-2">Canales guardados</h3>
        {loading ? (
          <p className="text-slate-500 text-sm">Cargando...</p>
        ) : (
          <div className="space-y-3">
            {configs.map((row) => {
              const draft = getConfigRow(row);
              const qrInfo = qrInfoByConfig[row.id];
              return (
                <div key={row.id} className="border rounded-lg p-3">
                  <div className="text-xs mb-2 text-slate-700">
                    <b>{channelLabels[row.channel] || row.channel}</b> | modo: <b>{draft.sender_mode}</b> | provider: <b>{draft.provider}</b>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-sm">
                    <input value={draft.provider} onChange={(e) => setConfigDraft((p) => ({ ...p, [row.id]: { ...draft, provider: e.target.value } }))} className="border rounded-lg p-2" />
                    <input value={draft.from_email || ''} onChange={(e) => setConfigDraft((p) => ({ ...p, [row.id]: { ...draft, from_email: e.target.value } }))} className="border rounded-lg p-2" />
                    <input value={draft.from_name || ''} onChange={(e) => setConfigDraft((p) => ({ ...p, [row.id]: { ...draft, from_name: e.target.value } }))} className="border rounded-lg p-2" />
                    <input value={draft.notes || ''} onChange={(e) => setConfigDraft((p) => ({ ...p, [row.id]: { ...draft, notes: e.target.value } }))} className="border rounded-lg p-2" />
                    <textarea value={draft.config_json} onChange={(e) => setConfigDraft((p) => ({ ...p, [row.id]: { ...draft, config_json: e.target.value } }))} className="border rounded-lg p-2 md:col-span-4 h-24 font-mono text-xs" />
                  </div>
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-xs">
                    <label className="inline-flex items-center gap-2"><input type="checkbox" checked={!!draft.is_active} onChange={(e) => setConfigDraft((p) => ({ ...p, [row.id]: { ...draft, is_active: e.target.checked } }))} /> Activo</label>
                    <label className="inline-flex items-center gap-2"><input type="checkbox" checked={!!draft.is_default} onChange={(e) => setConfigDraft((p) => ({ ...p, [row.id]: { ...draft, is_default: e.target.checked } }))} /> Por defecto</label>
                    <button type="button" onClick={() => applyConfigExample(row.channel, row.sender_mode, true, row.id)} className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 font-bold">Ejemplo</button>
                    <button disabled={saving} onClick={() => handleSaveConfigRow(row)} className="px-3 py-1.5 rounded-lg bg-slate-900 text-white font-bold inline-flex items-center gap-1"><FaSave /> Guardar</button>
                    <button disabled={saving} onClick={() => handleTestConfigRow(row)} className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-bold inline-flex items-center gap-1"><FaFlask /> Probar conexion</button>
                    {row.channel === 'whatsapp_qr' && (
                      <button disabled={saving} onClick={() => handleFetchQrInfo(row)} className="px-3 py-1.5 rounded-lg bg-amber-500 text-white font-bold">Ver QR</button>
                    )}
                  </div>
                  {row.channel === 'whatsapp_qr' && qrInfo && (
                    <div className="mt-3 p-3 rounded-lg border bg-amber-50">
                      {qrInfo?.qr_image_url ? (
                        <img src={qrInfo.qr_image_url} alt="QR WhatsApp" className="w-48 h-48 object-contain border rounded bg-white" />
                      ) : (
                        <p className="text-xs text-amber-800">No hay imagen QR disponible.</p>
                      )}
                      {qrInfo?.qr_text && (
                        <p className="text-xs text-slate-700 mt-2 font-mono break-all">{qrInfo.qr_text}</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="bg-white rounded-xl border p-4">
        <h3 className="font-black text-slate-800 mb-1">Paso 2: Plantillas de mensajes</h3>
        <p className="text-xs text-slate-500 mb-3">
          Evita escribir manual cada envio. Usa variables como {'{{ paciente_nombre }}'}.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-sm mb-3">
          <input value={templateForm.code} onChange={(e) => setTemplateForm((p) => ({ ...p, code: e.target.value }))} className="border rounded-lg p-2" placeholder="codigo (ej: appointment_created)" />
          <select value={templateForm.channel} onChange={(e) => setTemplateForm((p) => ({ ...p, channel: e.target.value }))} className="border rounded-lg p-2">
            <option value="email">Email</option>
            <option value="whatsapp_meta">WhatsApp Meta</option>
            <option value="whatsapp_qr">WhatsApp QR</option>
            <option value="sms_labsmobile">SMS LabsMobile</option>
            <option value="sms_twilio">SMS Twilio</option>
          </select>
          <input value={templateForm.subject_template} onChange={(e) => setTemplateForm((p) => ({ ...p, subject_template: e.target.value }))} className="border rounded-lg p-2 md:col-span-2" placeholder="Asunto (email)" />
          <textarea value={templateForm.body_template} onChange={(e) => setTemplateForm((p) => ({ ...p, body_template: e.target.value }))} className="border rounded-lg p-2 md:col-span-4 h-20" placeholder="Cuerpo del mensaje" />
          <label className="inline-flex items-center gap-2 text-xs"><input type="checkbox" checked={templateForm.is_active} onChange={(e) => setTemplateForm((p) => ({ ...p, is_active: e.target.checked }))} /> Activa</label>
          <button disabled={saving || !selectedTenantId} onClick={handleCreateTemplate} className="px-3 py-2 rounded-lg bg-slate-900 text-white font-bold text-xs inline-flex items-center gap-2"><FaSave /> Guardar plantilla</button>
        </div>

        <div className="mt-3 p-3 border rounded-lg bg-slate-50">
          <p className="text-xs font-black text-slate-700 mb-2">Vista previa del mensaje</p>
          <textarea
            value={previewContextJson}
            onChange={(e) => setPreviewContextJson(e.target.value)}
            className="w-full border rounded-lg p-2 h-20 font-mono text-xs"
            placeholder='{"paciente_nombre":"Juan"}'
          />
          <div className="mt-3 border rounded-xl bg-white shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b bg-slate-50">
              <p className="text-[11px] text-slate-500">De</p>
              <p className="text-sm text-slate-800">
                <b>{previewFromName}</b> {'<'}{previewFromEmail}{'>'}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">Para: paciente@correo.com</p>
              <p className="text-[11px] text-slate-500">Fecha: {previewTimestamp}</p>
              <p className="text-xs text-slate-700 mt-2">
                <b>Asunto:</b> {templatePreviewSubject || '(vacio)'}
              </p>
            </div>
            <div className="p-4">
              <div dangerouslySetInnerHTML={{ __html: templatePreviewBody || '<em>Sin contenido</em>' }} />
            </div>
          </div>
        </div>

        <div className="space-y-2 mt-3">
          {templates.map((row) => {
            const draft = getTemplateRow(row);
            return (
              <div key={row.id} className="border rounded-lg p-3 grid grid-cols-1 md:grid-cols-4 gap-2 text-sm">
                <input value={draft.code} onChange={(e) => setTemplateDraft((p) => ({ ...p, [row.id]: { ...draft, code: e.target.value } }))} className="border rounded-lg p-2" />
                <input value={draft.channel} onChange={(e) => setTemplateDraft((p) => ({ ...p, [row.id]: { ...draft, channel: e.target.value } }))} className="border rounded-lg p-2" />
                <input value={draft.subject_template || ''} onChange={(e) => setTemplateDraft((p) => ({ ...p, [row.id]: { ...draft, subject_template: e.target.value } }))} className="border rounded-lg p-2 md:col-span-2" />
                <textarea value={draft.body_template || ''} onChange={(e) => setTemplateDraft((p) => ({ ...p, [row.id]: { ...draft, body_template: e.target.value } }))} className="border rounded-lg p-2 md:col-span-4 h-20" />
                <label className="inline-flex items-center gap-2 text-xs"><input type="checkbox" checked={!!draft.is_active} onChange={(e) => setTemplateDraft((p) => ({ ...p, [row.id]: { ...draft, is_active: e.target.checked } }))} /> Activa</label>
                <button disabled={saving} onClick={() => handleSaveTemplateRow(row)} className="px-3 py-2 rounded-lg bg-slate-900 text-white font-bold text-xs inline-flex items-center gap-2"><FaSave /> Guardar</button>
              </div>
            );
          })}
        </div>
      </section>

      <section className="bg-white rounded-xl border p-4">
        <h3 className="font-black text-slate-800 mb-1">Paso 3: Prueba de envio</h3>
        <p className="text-xs text-slate-500 mb-2">
          Nota: WhatsApp Meta en SHARED quedara pendiente hasta activar la cuenta institucional Meta.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-sm">
          <input value={dispatchForm.template_code} onChange={(e) => setDispatchForm((p) => ({ ...p, template_code: e.target.value }))} className="border rounded-lg p-2" placeholder="template_code" />
          <input value={dispatchForm.usuario_id} onChange={(e) => setDispatchForm((p) => ({ ...p, usuario_id: e.target.value }))} className="border rounded-lg p-2" placeholder="usuario_id" />
          <input value={dispatchForm.cita_id} onChange={(e) => setDispatchForm((p) => ({ ...p, cita_id: e.target.value }))} className="border rounded-lg p-2" placeholder="cita_id (opcional)" />
          <select value={dispatchForm.channel} onChange={(e) => setDispatchForm((p) => ({ ...p, channel: e.target.value }))} className="border rounded-lg p-2">
            <option value="email">Email</option>
            <option value="whatsapp_meta">WhatsApp Meta</option>
            <option value="whatsapp_qr">WhatsApp QR</option>
            <option value="sms_labsmobile">SMS LabsMobile</option>
            <option value="sms_twilio">SMS Twilio</option>
            <option value="system">Solo sistema</option>
          </select>
          <select value={dispatchForm.sender_mode} onChange={(e) => setDispatchForm((p) => ({ ...p, sender_mode: e.target.value }))} className="border rounded-lg p-2">
            <option value="SHARED">SHARED</option>
            <option value="BYO">BYO</option>
          </select>
          <input value={dispatchForm.to_email} onChange={(e) => setDispatchForm((p) => ({ ...p, to_email: e.target.value }))} className="border rounded-lg p-2" placeholder="correo destino" />
          <input value={dispatchForm.to_phone} onChange={(e) => setDispatchForm((p) => ({ ...p, to_phone: e.target.value }))} className="border rounded-lg p-2" placeholder="telefono destino" />
          <input value={dispatchForm.subject} onChange={(e) => setDispatchForm((p) => ({ ...p, subject: e.target.value }))} className="border rounded-lg p-2" placeholder="asunto opcional" />
          <textarea value={dispatchForm.message} onChange={(e) => setDispatchForm((p) => ({ ...p, message: e.target.value }))} className="border rounded-lg p-2 md:col-span-4 h-16" placeholder="mensaje opcional" />
          <textarea value={dispatchForm.context_json} onChange={(e) => setDispatchForm((p) => ({ ...p, context_json: e.target.value }))} className="border rounded-lg p-2 md:col-span-4 h-24 font-mono text-xs" placeholder='{"paciente_nombre":"..."}' />
        </div>
        <div className="mt-3">
          <button disabled={saving || !selectedTenantId} onClick={handleDispatch} className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-bold text-xs inline-flex items-center gap-2">
            <FaPaperPlane /> Enviar prueba
          </button>
        </div>
      </section>
    </div>
  );
}

