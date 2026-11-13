import { Bot, Calendar, Scissors, Users, X } from 'lucide-react';

export type NavSection = 'citas' | 'trabajadores' | 'servicios' | 'telegram';

interface SidebarProps {
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  counts: {
    appointments: number;
    staff: number;
    services: number;
    telegramConnected: boolean;
  };
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const NAV_ITEMS: Array<{
  id: NavSection;
  label: string;
  icon: typeof Calendar;
}> = [
  { id: 'citas', label: 'Agenda y citas', icon: Calendar },
  { id: 'trabajadores', label: 'Equipo', icon: Users },
  { id: 'servicios', label: 'Servicios y tarifas', icon: Scissors },
  { id: 'telegram', label: 'Bot de Telegram', icon: Bot },
];

export function Sidebar({
  activeSection,
  onSelectSection,
  counts,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const handleSelect = (id: NavSection) => {
    onSelectSection(id);
    onCloseMobile();
  };

  const navContent = (
    <div className="flex h-full flex-col justify-between bg-white px-4 py-5">
      <div>
        <div className="flex items-center justify-between px-2 pb-6">
          <span className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap">
            Peluquería Pro
          </span>
          <button
            type="button"
            onClick={onCloseMobile}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 lg:hidden"
            aria-label="Cerrar menú"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="space-y-1" aria-label="Navegación principal">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item.id)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon
                    className={`h-4 w-4 shrink-0 ${
                      isActive ? 'text-blue-600' : 'text-slate-400'
                    }`}
                  />
                  <span>{item.label}</span>
                </span>
                {item.id === 'citas' && (
                  <span className="font-mono text-xs tabular-nums text-slate-500">
                    {counts.appointments}
                  </span>
                )}
                {item.id === 'trabajadores' && (
                  <span className="font-mono text-xs tabular-nums text-slate-500">
                    {counts.staff}
                  </span>
                )}
                {item.id === 'servicios' && (
                  <span className="font-mono text-xs tabular-nums text-slate-500">
                    {counts.services}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-slate-200 px-2 pt-4 text-xs text-slate-500">
        <p className="font-medium text-slate-700">Sincronización en la nube</p>
        <p className="mt-1 tabular-nums">
          {counts.staff} profesionales · {counts.services} servicios
        </p>
        <p className="mt-0.5 text-slate-500">
          Bot Telegram: {counts.telegramConnected ? 'Conectado' : 'En espera'}
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:block">
        <div className="sticky top-0 h-screen">{navContent}</div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative z-50 w-64 border-r border-slate-200 bg-white">
            {navContent}
          </aside>
        </div>
      )}
    </>
  );
}
