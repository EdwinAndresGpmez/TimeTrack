import React, { useState, useEffect, useContext, useCallback } from 'react';
import { citasService } from '../../services/citasService';
import { AuthContext } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import Swal from 'sweetalert2';
import {
  FaUserMd, FaBullhorn, FaCheckCircle,
  FaNotesMedical, FaWalking, FaUserInjured, FaClock, FaExclamationTriangle
} from 'react-icons/fa';

const DashboardProfesional = () => {
  const { user } = useContext(AuthContext);
  const { td } = useUI();
  const [citas, setCitas] = useState([]);
  const [loading, setLoading] = useState(true);

  const calcularEdad = (fechaNacimiento) => {
    if (!fechaNacimiento) return td('S/D', 'N/A');
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
    if (Number.isNaN(edad) || edad < 0) return td('S/D', 'N/A');
    return `${edad} ${td('anos', 'years')}`;
  };

  const cargarAgendaDia = useCallback(async () => {
    if (!user?.profesional_id) {
      setLoading(false);
      return;
    }

    try {
      const hoyLocal = new Date();
      const offset = hoyLocal.getTimezoneOffset();
      const fechaQuery = new Date(hoyLocal.getTime() - (offset * 60 * 1000))
        .toISOString()
        .split('T')[0];

      const data = await citasService.getAll({
        profesional_id: user.profesional_id,
        fecha: fechaQuery,
        ordering: 'hora_inicio'
      });

      const lista = Array.isArray(data) ? data : (data.results || []);
      setCitas(lista);
    } catch (_error) {
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    cargarAgendaDia();
    const interval = setInterval(cargarAgendaDia, 30000);
    return () => clearInterval(interval);
  }, [cargarAgendaDia]);

  const llamarPaciente = async (cita) => {
    const estado = (cita?.estado || '').trim().toUpperCase();
    if (!['EN_SALA', 'LLAMADO'].includes(estado)) {
      Swal.fire({
        icon: 'warning',
        title: td('Paciente no esta en sala', 'Patient is not in room'),
        text: td('Solo puedes llamar pacientes que esten EN_SALA o re-llamar si estan LLAMADO.', 'You can only call EN_SALA or LLAMADO patients.'),
        confirmButtonColor: '#4f46e5'
      });
      return;
    }

    try {
      await citasService.updateEstado(cita.id, { estado: 'LLAMADO' });
      Swal.fire({
        toast: true,
        position: 'top-end',
        title: (estado === 'LLAMADO' ? td('Re-llamar', 'Recall') : td('Llamar', 'Calling...')),
        icon: 'success',
        showConfirmButton: false,
        timer: 2000
      });
      cargarAgendaDia();
    } catch (error) {
      const msg = error?.response?.data?.detalle || td('No se pudo activar el llamado', 'Could not activate call');
      Swal.fire(td('Error', 'Error'), msg, 'error');
    }
  };

  const marcarNoAsistio = async (cita) => {
    const estado = (cita?.estado || '').trim().toUpperCase();
    if (estado !== 'LLAMADO') {
      Swal.fire({
        icon: 'warning',
        title: td('Accion no disponible', 'Action unavailable'),
        text: td('Esta accion solo aplica cuando el paciente ya fue llamado (estado LLAMADO).', 'This action only applies when patient was already called (LLAMADO).'),
        confirmButtonColor: '#4f46e5'
      });
      return;
    }

    const { value: motivo } = await Swal.fire({
      title: td('Paciente no llego', 'Patient did not arrive'),
      html: `<div class="text-left text-sm text-gray-500 mb-2">${td('Marcar como', 'Mark as')} <b>NO_ASISTIO</b> ${td('a', 'to')}: <b>${cita.paciente_nombre}</b></div>`,
      input: 'textarea',
      inputPlaceholder: td('Motivo (obligatorio)...', 'Reason (required)...'),
      showCancelButton: true,
      confirmButtonText: td('Marcar', 'Mark'),
      confirmButtonColor: '#f59e0b',
      inputValidator: (value) => !value && td('El motivo es obligatorio', 'Reason is required')
    });

    if (!motivo) return;

    try {
      await citasService.updateEstado(cita.id, { estado: 'NO_ASISTIO', motivo });
      Swal.fire({ title: td('Actualizado', 'Updated'), icon: 'success', timer: 1200, showConfirmButton: false });
      cargarAgendaDia();
    } catch (error) {
      const msg = error?.response?.data?.detalle || td('No se pudo marcar como NO_ASISTIO', 'Could not set as NO_ASISTIO');
      Swal.fire(td('Error', 'Error'), msg, 'error');
    }
  };

  const finalizarAtencion = async (cita) => {
    const estado = (cita?.estado || '').trim().toUpperCase();
    if (estado !== 'LLAMADO') {
      Swal.fire({
        icon: 'warning',
        title: td('Accion no disponible', 'Action unavailable'),
        text: td('Solo puedes finalizar cuando el paciente esta en estado LLAMADO.', 'You can only finish when patient is LLAMADO.'),
        confirmButtonColor: '#4f46e5'
      });
      return;
    }

    const { value: nota } = await Swal.fire({
      title: td('Finalizar Consulta', 'Finish consultation'),
      html: `<div class="text-left text-sm text-gray-500 mb-2">${td('Evolucion para', 'Evolution for')}: <b>${cita.paciente_nombre}</b></div>`,
      input: 'textarea',
      inputPlaceholder: td('Notas medicas...', 'Medical notes...'),
      showCancelButton: true,
      confirmButtonText: td('Guardar', 'Save'),
      confirmButtonColor: '#10b981',
      inputValidator: (value) => !value && td('La nota es obligatoria', 'Note is required')
    });

    if (!nota) return;

    try {
      await citasService.updateEstado(cita.id, { estado: 'REALIZADA', notas_medicas: nota });
      Swal.fire({ title: td('Finalizada', 'Completed'), icon: 'success', timer: 1500, showConfirmButton: false });
      cargarAgendaDia();
    } catch (error) {
      const msg = error?.response?.data?.detalle || td('No se pudo cerrar', 'Could not close');
      Swal.fire(td('Error', 'Error'), msg, 'error');
    }
  };

  const enEspera = citas.filter(c => ['EN_SALA', 'LLAMADO', 'ACEPTADA', 'REALIZADA', 'NO_ASISTIO'].includes(c.estado));

  return (
    <div className="max-w-7xl mx-auto p-6 min-h-screen bg-gray-50/50">
      <div className="flex flex-col md:flex-row justify-between items-center mb-10 bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100">
        <div className="flex items-center gap-6">
          <div className="p-5 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl shadow-xl">
            <FaUserMd size={40} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-gray-800 tracking-tight">{td('Panel de Atencion')}</h1>
            <p className="text-gray-500 font-bold uppercase text-xs tracking-widest mt-1">
              {td('ID Medico', 'Medical ID')}: {user?.profesional_id || '---'}
            </p>
          </div>
        </div>
        <div className="mt-4 md:mt-0 bg-blue-50 px-6 py-3 rounded-2xl border border-blue-100 flex items-center gap-3">
          <div className="flex flex-col items-end">
            <span className="text-blue-700 font-black text-2xl leading-none">{enEspera.length}</span>
            <span className="text-blue-400 font-bold text-[10px] uppercase tracking-tighter">{td('Pacientes hoy')}</span>
          </div>
          <FaWalking className="text-blue-300" size={24} />
        </div>
      </div>

      {!loading && citas.length === 0 && (
        <div className="mb-8 p-4 bg-orange-50 border border-orange-200 rounded-xl flex items-center gap-3 text-orange-700 text-sm">
          <FaExclamationTriangle />
          <span>{td('No se encontraron citas para hoy para este profesional.', 'No appointments were found today for this professional.')}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {loading ? (
          <div className="col-span-full text-center py-20 animate-pulse text-gray-400">{td('Sincronizando...')}</div>
        ) : enEspera.length === 0 ? (
          <div className="col-span-full bg-white p-20 rounded-[3rem] text-center border-4 border-dashed border-gray-100 flex flex-col items-center">
            <FaUserInjured size={64} className="text-gray-200 mb-4" />
            <h3 className="text-xl font-bold text-gray-400 uppercase">{td('Sin pacientes en turno')}</h3>
          </div>
        ) : (
          enEspera.map(cita => {
            const estado = (cita.estado || '').trim().toUpperCase();
            const puedeAccionar = ['EN_SALA', 'LLAMADO'].includes(estado);

            return (
              <div
                key={cita.id}
                className={`group relative bg-white rounded-[2.5rem] shadow-2xl border-2 transition-all duration-500
                  ${estado === 'LLAMADO' ? 'border-yellow-400 scale-105 ring-4 ring-yellow-50' : 'border-transparent hover:border-blue-200'}`}
              >
                <div className="absolute -top-4 left-8 bg-gray-900 text-white px-4 py-1 rounded-full text-xs font-black shadow-lg flex items-center gap-2">
                  <FaClock size={10} className="text-blue-400" />
                  {cita.hora_inicio.slice(0, 5)}
                </div>

                <div className="p-8 pt-10">
                  <div className="flex justify-between items-start mb-6">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors
                      ${estado === 'LLAMADO'
                        ? 'bg-yellow-100 text-yellow-600'
                        : 'bg-gray-100 text-gray-400 group-hover:bg-blue-600 group-hover:text-white'}`}
                    >
                      <FaUserInjured size={28} />
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      {estado === 'LLAMADO' && <span className="bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-[10px] font-black uppercase animate-pulse">{td('Llamado')}</span>}
                      {estado === 'EN_SALA' && <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[10px] font-black uppercase">{td('En Sala')}</span>}
                      {estado === 'ACEPTADA' && <span className="bg-indigo-50 text-indigo-500 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter">{td('Agendado')}</span>}
                      {estado === 'REALIZADA' && <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black uppercase">{td('Realizada')}</span>}
                      {estado === 'NO_ASISTIO' && <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-[10px] font-black uppercase">{td('No asistio')}</span>}
                    </div>
                  </div>

                  <h3 className="text-2xl font-black text-gray-800 leading-tight uppercase mb-1">{cita.paciente_nombre}</h3>
                  <p className="text-xs font-mono text-gray-400 font-bold mb-6">
                    {cita.paciente_doc}
                    <span className="mx-2">•</span>
                    {calcularEdad(cita.paciente_fecha_nacimiento)}
                  </p>

                  <div className="bg-gray-50 p-5 rounded-3xl mb-8 border border-gray-100 min-h-[100px]">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter block mb-2 flex items-center gap-1">
                      <FaNotesMedical className="text-blue-500" /> {td('Notas de Ingreso')}
                    </span>
                    <p className="text-xs text-gray-600 leading-relaxed italic">
                      {cita.nota_interna ? `"${cita.nota_interna}"` : td('Sin observaciones registradas.')}
                    </p>
                  </div>
                  {puedeAccionar ? (
                    <div className={`grid gap-4 ${estado === 'LLAMADO' ? 'grid-cols-3' : 'grid-cols-2'}`}>
                      <button
                        onClick={() => llamarPaciente(cita)}
                        disabled={!['EN_SALA', 'LLAMADO'].includes(estado)}
                        className={`flex flex-col items-center justify-center gap-1 py-4 rounded-2xl font-black shadow-xl active:scale-95 transition-all
                          ${!['EN_SALA', 'LLAMADO'].includes(estado)
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100'
                          }`}
                      >
                        <FaBullhorn size={18} />
                        <span className="text-[10px] uppercase">{estado === 'LLAMADO' ? td('Re-llamar') : td('Llamar')}</span>
                      </button>
                      {estado === 'LLAMADO' && (
                        <button
                          onClick={() => marcarNoAsistio(cita)}
                          className="flex flex-col items-center justify-center gap-1 bg-amber-500 hover:bg-amber-600 text-white py-4 rounded-2xl font-black shadow-xl shadow-amber-100 active:scale-95 transition-all"
                        >
                          <FaExclamationTriangle size={18} />
                          <span className="text-[10px] uppercase">{td('No llego')}</span>
                        </button>
                      )}
                      <button
                        onClick={() => finalizarAtencion(cita)}
                        disabled={estado !== 'LLAMADO'}
                        className={`flex flex-col items-center justify-center gap-1 py-4 rounded-2xl font-black shadow-xl active:scale-95 transition-all
                          ${estado !== 'LLAMADO'
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                            : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-100'
                          }`}
                      >
                        <FaCheckCircle size={18} />
                        <span className="text-[10px] uppercase">{td('Finalizar')}</span>
                      </button>
                    </div>
                  ) : (
                    <div className="text-center text-[10px] font-black uppercase tracking-widest text-gray-400 bg-gray-50 border border-gray-100 rounded-2xl py-4">
                      {estado === 'ACEPTADA' ? td('Esperando llegada a sala') : td('Sin acciones disponibles')}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default DashboardProfesional;
