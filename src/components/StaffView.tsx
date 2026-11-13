import { useState, type FormEvent } from 'react';
import { Trash2, UserPlus, Users } from 'lucide-react';
import type { Appointment, StaffMember } from '../types';

interface StaffViewProps {
  staff: StaffMember[];
  appointments: Appointment[];
  onAddStaff: (payload: { name: string; specialty: string; schedule: string }) => Promise<void>;
  onToggleActive: (id: string, active: boolean) => Promise<void>;
  onDeleteStaff: (id: string) => Promise<void>;
}

export function StaffView({
  staff,
  appointments,
  onAddStaff,
  onToggleActive,
  onDeleteStaff,
}: StaffViewProps) {
  const [name, setName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [schedule, setSchedule] = useState('09:30 - 19:30');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Introduce el nombre del profesional.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onAddStaff({
        name: name.trim(),
        specialty: specialty.trim() || 'Estilista general',
        schedule: schedule.trim() || '09:30 - 19:30',
      });
      setName('');
      setSpecialty('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el profesional.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* Add staff form */}
      <section className="lg:col-span-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3.5">
            <UserPlus className="h-4 w-4 text-blue-600" />
            <h2 className="font-display text-base font-semibold text-slate-900">
              Añadir profesional
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="stf-name" className="mb-1.5 block text-sm font-medium text-slate-700">
                Nombre completo
              </label>
              <input
                id="stf-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Marcos Vidal"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15"
                required
              />
            </div>

            <div>
              <label htmlFor="stf-spec" className="mb-1.5 block text-sm font-medium text-slate-700">
                Especialidad
              </label>
              <input
                id="stf-spec"
                type="text"
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                placeholder="Ej: Barbería y corte clásico"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15"
              />
            </div>

            <div>
              <label htmlFor="stf-sched" className="mb-1.5 block text-sm font-medium text-slate-700">
                Horario habitual
              </label>
              <input
                id="stf-sched"
                type="text"
                value={schedule}
                onChange={(e) => setSchedule(e.target.value)}
                placeholder="09:30 - 19:30"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 tabular-nums focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {submitting ? 'Guardando...' : 'Guardar profesional'}
            </button>
          </form>
        </div>
      </section>

      {/* Staff list */}
      <section className="lg:col-span-8">
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="font-display text-base font-semibold text-slate-900">
              Equipo del salón
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Los profesionales activos aparecen automáticamente disponibles en recepción y en el bot de Telegram.
            </p>
          </div>

          {staff.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
              <Users className="h-8 w-8 text-slate-300" />
              <p className="mt-2 text-sm font-medium text-slate-700">No hay profesionales registrados.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-500">
                    <th className="px-5 py-3">Profesional</th>
                    <th className="px-4 py-3">Especialidad</th>
                    <th className="px-4 py-3">Horario</th>
                    <th className="px-4 py-3 text-right">Citas</th>
                    <th className="px-4 py-3">Disponibilidad</th>
                    <th className="px-5 py-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {staff.map((member) => {
                    const assignedCount = appointments.filter(
                      (a) => a.staffId === member.id && a.status !== 'cancelada'
                    ).length;

                    return (
                      <tr key={member.id} className="hover:bg-slate-50/70">
                        <td className="px-5 py-3.5 font-medium text-slate-900 whitespace-nowrap">
                          {member.name}
                        </td>
                        <td className="px-4 py-3.5 text-slate-600">{member.specialty}</td>
                        <td className="px-4 py-3.5 font-mono text-xs tabular-nums text-slate-600 whitespace-nowrap">
                          {member.schedule}
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono tabular-nums text-slate-900">
                          {assignedCount}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => void onToggleActive(member.id, !member.active)}
                            className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                              member.active
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                : 'border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {member.active ? 'Activo' : 'En descanso'}
                          </button>
                        </td>
                        <td className="px-5 py-3.5 text-right whitespace-nowrap">
                          {confirmDeleteId === member.id ? (
                            <span className="inline-flex items-center gap-1.5 text-xs">
                              <button
                                type="button"
                                onClick={() => {
                                  void onDeleteStaff(member.id);
                                  setConfirmDeleteId(null);
                                }}
                                className="rounded bg-red-600 px-2 py-1 font-medium text-white hover:bg-red-700"
                              >
                                Borrar
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="rounded border border-slate-300 bg-white px-2 py-1 font-medium text-slate-700 hover:bg-slate-50"
                              >
                                No
                              </button>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(member.id)}
                              className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-700"
                              aria-label={`Eliminar a ${member.name}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
