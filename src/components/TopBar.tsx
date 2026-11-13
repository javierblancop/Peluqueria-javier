import { Menu, Plus } from 'lucide-react';
import type { NavSection } from './Sidebar';

interface TopBarProps {
  activeSection: NavSection;
  onOpenMobileMenu: () => void;
  onOpenNewAppointment: () => void;
}

const SECTION_TITLES: Record<NavSection, string> = {
  citas: 'Agenda y citas',
  trabajadores: 'Equipo profesional',
  servicios: 'Servicios y tarifas',
  telegram: 'Bot de Telegram',
};

export function TopBar({
  activeSection,
  onOpenMobileMenu,
  onOpenNewAppointment,
}: TopBarProps) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-8 border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 lg:hidden"
          aria-label="Abrir menú"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex min-w-0 items-center gap-2 text-sm">
          <span className="hidden text-slate-400 sm:inline whitespace-nowrap">
            Peluquería Pro
          </span>
          <span className="hidden text-slate-300 sm:inline" aria-hidden="true">
            /
          </span>
          <h1 className="truncate font-display text-base font-semibold text-slate-900 sm:text-lg">
            {SECTION_TITLES[activeSection]}
          </h1>
        </div>
      </div>

      <div className="shrink-0">
        <button
          type="button"
          onClick={onOpenNewAppointment}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 whitespace-nowrap shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Nueva cita</span>
        </button>
      </div>
    </header>
  );
}
