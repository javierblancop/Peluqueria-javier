import { useMemo, useState } from 'react';
import { Calendar, CheckCircle2, Clock, Pencil, Search, Trash2, XCircle } from 'lucide-react';
import type { Appointment, AppointmentStatus, ServiceItem, StaffMember } from '../types';

interface AppointmentsViewProps {
  appointments: Appointment[];
  staff: StaffMember[];
  services: ServiceItem[];
  loading: boolean;
  onOpenNew: () => void;
  onEdit: (appointment: Appointment) => void;
  onStatusChange: (id: string, status: AppointmentStatus) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const STATUS_META: Record<
  AppointmentStatus,
  { label: string; colorClass: string; icon: typeof CheckCircle2 }
> = {
  confirmada: {
    label: 'Confirmada',
    colorClass: 'text-emerald-700',
    icon: CheckCircle2,
  },
  pendiente: {
    label: 'Pendiente',
    colorClass: 'text-amber-700',
    icon: Clock,
  },
  completada: {
    label: 'Completada',
    colorClass: 'text-blue-700',
    icon: CheckCircle2,
  },
  cancelada: {
    label: 'Cancelada',
    colorClass: 'text-red-700',
    icon: XCircle,
  },
};

export function AppointmentsView({
  appointments,
  staff,
  services,
  loading,
  onOpenNew,
  onEdit,
  onStatusChange,
  onDelete,
}: AppointmentsViewProps) {
  const today = new Date().toISOString().split('T')[0];
  const [dateFilterMode, setDateFilterMode] = useState<'all' | 'today' | 'custom'>('all');
  const [customDate, setCustomDate] = useState(today);
  const [statusFilter, setStatusFilter] = useState<'all' | AppointmentStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const metrics = useMemo(() => {
    const todayApts = appointments.filter(
      (a) => a.date === today && a.status !== 'cancelada'
    );
    const revenueToday = todayApts.reduce((sum, a) => sum + (a.priceEur || 0), 0);
    const activeStaffCount = staff.filter((s) => s.active).length;
    const activeServiceCount = services.filter((s) => s.active).length;
    return {
      todayCount: todayApts.length,
      totalCount: appointments.length,
      revenueToday,
      activeStaffCount,
      activeServiceCount,
    };
  }, [appointments, staff, services, today]);

  const filteredAppointments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return appointments.filter((a) => {
      if (dateFilterMode === 'today' && a.date !== today) return false;
      if (dateFilterMode === 'custom' && customDate && a.date !== customDate) return false;
      if (statusFilter !== 'all' && a.status !== statusFilter) return false;
      if (q) {
        const hay = `${a.clientName} ${a.staffName} ${a.serviceName} ${a.clientPhone}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [appointments, dateFilterMode, customDate, statusFilter, searchQuery, today]);

  return (
    <div className="space-y-6">
      {/* KPI summary bar */}
      <section
        aria-label="Resumen operativo"
        className="grid grid-cols-2 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white lg:grid-cols-4 lg:divide-x lg:divide-y-0"
      >
        <div className="p-5">
          <p className="text-xs font-medium text-slate-500">Citas para hoy</p>
          <p className="mt-1.5 font-display text-2xl font-bold tabular-nums text-slate-900">
            {metrics.todayCount}
          </p>
          <p className="mt-1 text-xs text-slate-500 tabular-nums">{today}</p>
        </div>

        <div className="border-l border-slate-200 p-5 lg:border-l-0">
          <p className="text-xs font-medium text-slate-500">Total registradas</p>
          <p className="mt-1.5 font-display text-2xl font-bold tabular-nums text-slate-900">
            {metrics.totalCount}
          </p>
          <p className="mt-1 text-xs text-slate-500">Web y Telegram</p>
        </div>

        <div className="p-5">
          <p className="text-xs font-medium text-slate-500">Ingresos previstos hoy</p>
          <p className="mt-1.5 font-display text-2xl font-bold tabular-nums text-blue-700">
            {metrics.revenueToday.toFixed(0)} €
          </p>
          <p className="mt-1 text-xs text-slate-500">Citas activas del día</p>
        </div>

        <div className="border-l border-slate-200 p-5 lg:border-l-0">
          <p className="text-xs font-medium text-slate-500">Capacidad del salón</p>
          <p className="mt-1.5 font-display text-2xl font-bold tabular-nums text-slate-900">
            {metrics.activeStaffCount}
          </p>
          <p className="mt-1 text-xs text-slate-500 tabular-nums">
            Profesionales · {metrics.activeServiceCount} servicios
          </p>
        </div>
      </section>

      {/* Agenda table container */}
      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900">
              Agenda en la nube
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Gestiona reservas recibidas desde recepción o automáticamente por Telegram.
            </p>
          </div>

          {/* Filter controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center rounded-lg bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setDateFilterMode('all')}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  dateFilterMode === 'all'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Todas
              </button>
              <button
                type="button"
                onClick={() => setDateFilterMode('today')}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  dateFilterMode === 'today'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Hoy
              </button>
              <button
                type="button"
                onClick={() => setDateFilterMode('custom')}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  dateFilterMode === 'custom'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Por fecha
              </button>
            </div>

            {dateFilterMode === 'custom' && (
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                aria-label="Filtrar por fecha"
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 tabular-nums focus:border-blue-600 focus:outline-none"
              />
            )}

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | AppointmentStatus)}
              aria-label="Filtrar por estado"
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:border-blue-600 focus:outline-none"
            >
              <option value="all">Todos los estados</option>
              <option value="confirmada">Confirmada</option>
              <option value="pendiente">Pendiente</option>
              <option value="completada">Completada</option>
              <option value="cancelada">Cancelada</option>
            </select>

            <div className="relative min-w-[200px]">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar cliente o estilista..."
                className="w-full rounded-lg border border-slate-300 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Table content */}
        {loading ? (
          <div className="space-y-3 p-6">
            <div className="h-10 animate-pulse rounded-lg bg-slate-100" />
            <div className="h-10 animate-pulse rounded-lg bg-slate-100" />
            <div className="h-10 animate-pulse rounded-lg bg-slate-100" />
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
            <Calendar className="h-9 w-9 text-slate-300" />
            <h3 className="mt-3 font-display text-sm font-semibold text-slate-900">
              No hay citas para mostrar
            </h3>
            <p className="mt-1 max-w-sm text-sm text-slate-500">
              {appointments.length === 0
                ? 'Todavía no hay reservas registradas en el servidor.'
                : 'Prueba a cambiar los filtros de fecha, estado o búsqueda.'}
            </p>
            <button
              type="button"
              onClick={onOpenNew}
              className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Registrar primera cita
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-500">
                  <th className="px-5 py-3">Cliente</th>
                  <th className="px-4 py-3">Fecha y hora</th>
                  <th className="px-4 py-3">Servicio</th>
                  <th className="px-4 py-3">Profesional</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Importe</th>
                  <th className="px-5 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {filteredAppointments.map((apt) => {
                  const meta = STATUS_META[apt.status];
                  const StatusIcon = meta.icon;
                  return (
                    <tr key={apt.id} className="hover:bg-slate-50/70">
                      <td className="px-5 py-3.5 align-top">
                        <div className="font-medium text-slate-900">{apt.clientName}</div>
                        <div className="mt-0.5 text-xs text-slate-500 tabular-nums">
                          {apt.clientPhone}
                          <span aria-hidden="true"> · </span>
                          <span>{apt.source === 'telegram' ? 'Bot Telegram' : 'Recepción Web'}</span>
                        </div>
                        {apt.notes && (
                          <div className="mt-1 text-xs text-slate-500">{apt.notes}</div>
                        )}
                      </td>
                      <td className="px-4 py-3.5 align-top font-mono text-xs tabular-nums text-slate-700 whitespace-nowrap">
                        <div>{apt.date}</div>
                        <div className="mt-0.5 font-semibold text-slate-900">{apt.time}</div>
                      </td>
                      <td className="px-4 py-3.5 align-top">
                        <div className="text-slate-900">{apt.serviceName}</div>
                        <div className="mt-0.5 text-xs text-slate-500 tabular-nums">
                          {apt.durationMin} min
                        </div>
                      </td>
                      <td className="px-4 py-3.5 align-top text-slate-700 whitespace-nowrap">
                        {apt.staffName}
                      </td>
                      <td className="px-4 py-3.5 align-top whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <StatusIcon className={`h-3.5 w-3.5 shrink-0 ${meta.colorClass}`} />
                          <select
                            value={apt.status}
                            onChange={(e) =>
                              void onStatusChange(apt.id, e.target.value as AppointmentStatus)
                            }
                            aria-label={`Estado de cita de ${apt.clientName}`}
                            className={`rounded border border-transparent bg-transparent py-0.5 pr-1 text-xs font-medium hover:border-slate-300 focus:border-blue-600 focus:bg-white focus:outline-none ${meta.colorClass}`}
                          >
                            <option value="confirmada">Confirmada</option>
                            <option value="pendiente">Pendiente</option>
                            <option value="completada">Completada</option>
                            <option value="cancelada">Cancelada</option>
                          </select>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right align-top font-mono text-sm font-medium tabular-nums text-slate-900 whitespace-nowrap">
                        {apt.priceEur} €
                      </td>
                      <td className="px-5 py-3.5 text-right align-top whitespace-nowrap">
                        {confirmDeleteId === apt.id ? (
                          <span className="inline-flex items-center gap-1.5 text-xs">
                            <span className="text-slate-600">¿Borrar?</span>
                            <button
                              type="button"
                              onClick={() => {
                                void onDelete(apt.id);
                                setConfirmDeleteId(null);
                              }}
                              className="rounded bg-red-600 px-2 py-1 font-medium text-white hover:bg-red-700"
                            >
                              Sí
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
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => onEdit(apt)}
                              className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                              aria-label={`Editar cita de ${apt.clientName}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(apt.id)}
                              className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-700"
                              aria-label={`Eliminar cita de ${apt.clientName}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
