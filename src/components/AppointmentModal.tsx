import { useEffect, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import type { Appointment, AppointmentStatus, ServiceItem, StaffMember } from '../types';

interface AppointmentModalProps {
  isOpen: boolean;
  editingAppointment: Appointment | null;
  staff: StaffMember[];
  services: ServiceItem[];
  onClose: () => void;
  onSave: (payload: {
    id?: string;
    clientName: string;
    clientPhone: string;
    date: string;
    time: string;
    serviceId: string;
    staffId: string;
    status: AppointmentStatus;
    notes: string;
  }) => Promise<void>;
}

export function AppointmentModal({
  isOpen,
  editingAppointment,
  staff,
  services,
  onClose,
  onSave,
}: AppointmentModalProps) {
  const activeStaff = staff.filter((s) => s.active);
  const activeServices = services.filter((s) => s.active);

  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('10:00');
  const [serviceId, setServiceId] = useState('');
  const [staffId, setStaffId] = useState('');
  const [status, setStatus] = useState<AppointmentStatus>('confirmada');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    if (editingAppointment) {
      setClientName(editingAppointment.clientName);
      setClientPhone(editingAppointment.clientPhone === 'Sin teléfono' ? '' : editingAppointment.clientPhone);
      setDate(editingAppointment.date);
      setTime(editingAppointment.time);
      setServiceId(editingAppointment.serviceId);
      setStaffId(editingAppointment.staffId);
      setStatus(editingAppointment.status);
      setNotes(editingAppointment.notes || '');
    } else {
      setClientName('');
      setClientPhone('');
      setDate(new Date().toISOString().split('T')[0]);
      setTime('10:00');
      setServiceId(activeServices[0]?.id || services[0]?.id || '');
      setStaffId(activeStaff[0]?.id || staff[0]?.id || '');
      setStatus('confirmada');
      setNotes('');
    }
  }, [isOpen, editingAppointment, staff, services]);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) {
      setError('Introduce el nombre del cliente.');
      return;
    }
    if (!date || !time) {
      setError('Selecciona fecha y hora.');
      return;
    }
    if (!serviceId || !staffId) {
      setError('Debes tener al menos un servicio y un profesional configurado.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onSave({
        id: editingAppointment?.id,
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim(),
        date,
        time,
        serviceId,
        staffId,
        status,
        notes: notes.trim(),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la cita.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-appointment-title"
    >
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-lg">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 id="modal-appointment-title" className="font-display text-lg font-semibold text-slate-900">
            {editingAppointment ? 'Editar cita' : 'Registrar nueva cita'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Cerrar ventana"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="apt-client" className="mb-1.5 block text-sm font-medium text-slate-700">
                Nombre del cliente
              </label>
              <input
                id="apt-client"
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Ej: Carlos Méndez"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15"
                required
              />
            </div>

            <div>
              <label htmlFor="apt-phone" className="mb-1.5 block text-sm font-medium text-slate-700">
                Teléfono (opcional)
              </label>
              <input
                id="apt-phone"
                type="tel"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="Ej: 612 345 678"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 tabular-nums focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15"
              />
            </div>

            <div>
              <label htmlFor="apt-date" className="mb-1.5 block text-sm font-medium text-slate-700">
                Fecha
              </label>
              <input
                id="apt-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 tabular-nums focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15"
                required
              />
            </div>

            <div>
              <label htmlFor="apt-time" className="mb-1.5 block text-sm font-medium text-slate-700">
                Hora
              </label>
              <input
                id="apt-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 tabular-nums focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15"
                required
              />
            </div>

            <div>
              <label htmlFor="apt-service" className="mb-1.5 block text-sm font-medium text-slate-700">
                Servicio
              </label>
              <select
                id="apt-service"
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15"
              >
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.priceEur} € · {s.durationMin} min)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="apt-staff" className="mb-1.5 block text-sm font-medium text-slate-700">
                Profesional
              </label>
              <select
                id="apt-staff"
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15"
              >
                {staff.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {editingAppointment && (
            <div>
              <label htmlFor="apt-status" className="mb-1.5 block text-sm font-medium text-slate-700">
                Estado de la cita
              </label>
              <select
                id="apt-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as AppointmentStatus)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15"
              >
                <option value="confirmada">Confirmada</option>
                <option value="pendiente">Pendiente</option>
                <option value="completada">Completada</option>
                <option value="cancelada">Cancelada</option>
              </select>
            </div>
          )}

          <div>
            <label htmlFor="apt-notes" className="mb-1.5 block text-sm font-medium text-slate-700">
              Notas internas (opcional)
            </label>
            <input
              id="apt-notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Degradado bajo, prefiere máquina al 2"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15"
            />
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {submitting ? 'Guardando...' : editingAppointment ? 'Guardar cambios' : 'Registrar cita'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
