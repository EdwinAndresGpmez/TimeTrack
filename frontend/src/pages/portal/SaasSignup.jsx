import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import Swal from 'sweetalert2';
import { tenancyService } from '../../services/tenancyService';

export default function SaasSignup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    legal_name: '',
    slug: '',
    primary_domain: '',
    admin_nombre: '',
    admin_apellidos: '',
    admin_correo: '',
    admin_documento: '',
    admin_password: '',
  });
  const [loading, setLoading] = useState(false);

  const onChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        legal_name: form.legal_name,
        slug: form.slug,
        primary_domain: form.primary_domain,
        plan_code: 'FREE',
        admin_user: {
          nombre: form.admin_nombre,
          apellidos: form.admin_apellidos,
          correo: form.admin_correo,
          documento: form.admin_documento,
          password: form.admin_password,
        },
      };
      const data = await tenancyService.selfSignup(payload);
      localStorage.setItem(
        'pending_tenant_onboarding',
        JSON.stringify({
          tenant_id: data?.tenant?.id || null,
          tenant_slug: data?.tenant?.slug || null,
          admin_documento: form.admin_documento,
        })
      );
      await Swal.fire(
        'Cuenta creada',
        `Tenant ${data?.tenant?.slug || ''} creado correctamente. Ahora inicia sesion como admin para configurar tu clinica.`,
        'success'
      );
      navigate('/login');
    } catch (error) {
      const status = error?.response?.status;
      const responseData = error?.response?.data;
      let detail = 'No fue posible completar el registro.';

      if (!error?.response) {
        detail = 'No hay conexion con el servidor (gateway/backend). Revisa Docker y Nginx.';
      } else if (typeof responseData?.detail === 'string') {
        detail = responseData.detail;
      } else if (status === 409) {
        detail = 'La clinica ya existe (slug o dominio duplicado). Usa valores nuevos.';
      }

      await Swal.fire('Error', detail, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="max-w-3xl mx-auto bg-white shadow rounded-xl p-6">
        <h1 className="text-2xl font-black text-slate-800">Crear clinica en IDEFNOVA FREE</h1>
        <p className="text-sm text-slate-600 mt-1">Registro autoservicio para iniciar prueba gratuita.</p>

        <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6">
          <input className="border rounded px-3 py-2" name="legal_name" placeholder="Nombre legal clinica" onChange={onChange} required />
          <input className="border rounded px-3 py-2" name="slug" placeholder="Slug (ej: clinicamed)" onChange={onChange} required />
          <input className="border rounded px-3 py-2 md:col-span-2" name="primary_domain" placeholder="Dominio (ej: clinicamed.app.idefnova.com)" onChange={onChange} required />
          <input className="border rounded px-3 py-2" name="admin_nombre" placeholder="Nombre admin" onChange={onChange} required />
          <input className="border rounded px-3 py-2" name="admin_apellidos" placeholder="Apellidos admin" onChange={onChange} required />
          <input className="border rounded px-3 py-2" type="email" name="admin_correo" placeholder="Correo admin" onChange={onChange} required />
          <input className="border rounded px-3 py-2" name="admin_documento" placeholder="Documento admin" onChange={onChange} required />
          <input className="border rounded px-3 py-2" type="password" name="admin_password" placeholder="Contrasena admin" onChange={onChange} required />
          <button disabled={loading} className="md:col-span-2 bg-blue-600 text-white font-bold rounded py-2 hover:bg-blue-700 disabled:opacity-60" type="submit">
            {loading ? 'Creando...' : 'Crear cuenta FREE'}
          </button>
        </form>
      </div>
    </div>
  );
}

