import { useState, type FormEvent } from 'react';
import { Scissors, Trash2 } from 'lucide-react';
import type { ServiceItem } from '../types';

interface ServicesViewProps {
  services: ServiceItem[];
  onAddService: (payload: {
    name: string;
    category: string;
    priceEur: number;
    durationMin: number;
  }) => Promise<void>;
  onToggleActive: (id: string, active: boolean) => Promise<void>;
  onDeleteService: (id: string) => Promise<void>;
}

export function ServicesView({
  services,
  onAddService,
  onToggleActive,
  onDeleteService,
}: ServicesViewProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Corte');
  const [priceEur, setPriceEur] = useState('15');
  const [durationMin, setDurationMin] = useState('30');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const numericPrice = Number(priceEur);
    const numericDuration = Number(durationMin);
    if (!name.trim()) {
      setError('Introduce el nombre del servicio.');
      return;
    }
    if (Number.isNaN(numericPrice) || numericPrice < 0) {
      setError('Introduce un precio válido en euros.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onAddService({
        name: name.trim(),
        category,
        priceEur: numericPrice,
        durationMin: Number.isNaN(numericDuration) || numericDuration <= 0 ? 30 : numericDuration,
      });
      setName('');
      setPriceEur('15');
      setDurationMin('30');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el servicio.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* Add service form */}
      <section className="lg:col-span-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3.5">
            <Scissors className="h-4 w-4 text-blue-600" />
            <h2 className="font-display text-base font-semibold text-slate-900">
              Nuevo servicio
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="srv-name" className="mb-1.5 block text-sm font-medium text-slate-700">
                Nombre del servicio
              </label>
              <input
                id="srv-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Mechas Balayage"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15"
                required
              />
            </div>

            <div>
              <label htmlFor="srv-cat" className="mb-1.5 block text-sm font-medium text-slate-700">
                Categoría
              </label>
              <select
                id="srv-cat"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15"
              >
                <option value="Corte">Corte</option>
                <option value="Barbería">Barbería</option>
                <option value="Color">Color</option>
                <option value="Estilismo">Estilismo</option>
                <option value="Tratamiento">Tratamiento</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="srv-price" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Precio (€)
                </label>
                <input
                  id="srv-price"
                  type="number"
                  min="0"
                  step="0.5"
                  value={priceEur}
                  onChange={(e) => setPriceEur(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 tabular-nums focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15"
                  required
                />
              </div>
              <div>
                <label htmlFor="srv-dur" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Duración (min)
                </label>
                <input
                  id="srv-dur"
                  type="number"
                  min="5"
                  step="5"
                  value={durationMin}
                  onChange={(e) => setDurationMin(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 tabular-nums focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {submitting ? 'Guardando...' : 'Guardar servicio'}
            </button>
          </form>
        </div>
      </section>

      {/* Services list */}
      <section className="lg:col-span-8">
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="font-display text-base font-semibold text-slate-900">
              Tarifas vigentes
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Catálogo de precios y tiempos estimados sincronizados con el bot de reservas.
            </p>
          </div>

          {services.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
              <Scissors className="h-8 w-8 text-slate-300" />
              <p className="mt-2 text-sm font-medium text-slate-700">No hay servicios configurados.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-500">
                    <th className="px-5 py-3">Servicio</th>
                    <th className="px-4 py-3">Categoría</th>
                    <th className="px-4 py-3 text-right">Duración</th>
                    <th className="px-4 py-3 text-right">Precio</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-5 py-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {services.map((srv) => (
                    <tr key={srv.id} className="hover:bg-slate-50/70">
                      <td className="px-5 py-3.5 font-medium text-slate-900">{srv.name}</td>
                      <td className="px-4 py-3.5 text-slate-600">{srv.category}</td>
                      <td className="px-4 py-3.5 text-right font-mono text-xs tabular-nums text-slate-600 whitespace-nowrap">
                        {srv.durationMin} min
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-semibold tabular-nums text-slate-900 whitespace-nowrap">
                        {srv.priceEur} €
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => void onToggleActive(srv.id, !srv.active)}
                          className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                            srv.active
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              : 'border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {srv.active ? 'Visible' : 'Oculto'}
                        </button>
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        {confirmDeleteId === srv.id ? (
                          <span className="inline-flex items-center gap-1.5 text-xs">
                            <button
                              type="button"
                              onClick={() => {
                                void onDeleteService(srv.id);
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
                            onClick={() => setConfirmDeleteId(srv.id)}
                            className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-700"
                            aria-label={`Eliminar servicio ${srv.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
