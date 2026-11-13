import { useCallback, useEffect, useState } from 'react';
import { AppointmentModal } from './components/AppointmentModal';
import { AppointmentsView } from './components/AppointmentsView';
import { ServicesView } from './components/ServicesView';
import { Sidebar, type NavSection } from './components/Sidebar';
import { StaffView } from './components/StaffView';
import { TelegramView } from './components/TelegramView';
import { TopBar } from './components/TopBar';
import type { Appointment, AppointmentStatus, SalonState } from './types';

async function apiRequest<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) {
    throw new Error(data.error || 'Error al comunicarse con el servidor.');
  }
  return data;
}

const EMPTY_STATE: SalonState = {
  appointments: [],
  staff: [],
  services: [],
  telegram: {
    configured: false,
    connected: false,
    maskedToken: null,
    mode: 'inactive',
    botUsername: null,
    botName: null,
    webhookUrl: null,
    lastError: null,
  },
  telegramLogs: [],
};

export default function App() {
  const [activeSection, setActiveSection] = useState<NavSection>('citas');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [salonState, setSalonState] = useState<SalonState>(EMPTY_STATE);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);

  const fetchState = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await apiRequest<SalonState>('/api/state');
      setSalonState(data);
      setLoadError(null);
    } catch (err) {
      if (!silent) {
        setLoadError(
          err instanceof Error ? err.message : 'No se pudo cargar la información del salón.'
        );
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchState(false);
    const interval = setInterval(() => {
      void fetchState(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchState]);

  const handleSaveAppointment = async (payload: {
    id?: string;
    clientName: string;
    clientPhone: string;
    date: string;
    time: string;
    serviceId: string;
    staffId: string;
    status: AppointmentStatus;
    notes: string;
  }) => {
    if (payload.id) {
      const res = await apiRequest<{ state: SalonState }>(`/api/appointments/${payload.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      setSalonState(res.state);
    } else {
      const res = await apiRequest<{ state: SalonState }>('/api/appointments', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setSalonState(res.state);
    }
  };

  const handleStatusChange = async (id: string, status: AppointmentStatus) => {
    const res = await apiRequest<{ state: SalonState }>(`/api/appointments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    setSalonState(res.state);
  };

  const handleDeleteAppointment = async (id: string) => {
    const res = await apiRequest<{ state: SalonState }>(`/api/appointments/${id}`, {
      method: 'DELETE',
    });
    setSalonState(res.state);
  };

  const handleAddStaff = async (payload: {
    name: string;
    specialty: string;
    schedule: string;
  }) => {
    const res = await apiRequest<{ state: SalonState }>('/api/staff', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setSalonState(res.state);
  };

  const handleToggleStaffActive = async (id: string, active: boolean) => {
    const res = await apiRequest<{ state: SalonState }>(`/api/staff/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ active }),
    });
    setSalonState(res.state);
  };

  const handleDeleteStaff = async (id: string) => {
    const res = await apiRequest<{ state: SalonState }>(`/api/staff/${id}`, {
      method: 'DELETE',
    });
    setSalonState(res.state);
  };

  const handleAddService = async (payload: {
    name: string;
    category: string;
    priceEur: number;
    durationMin: number;
  }) => {
    const res = await apiRequest<{ state: SalonState }>('/api/services', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setSalonState(res.state);
  };

  const handleToggleServiceActive = async (id: string, active: boolean) => {
    const res = await apiRequest<{ state: SalonState }>(`/api/services/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ active }),
    });
    setSalonState(res.state);
  };

  const handleDeleteService = async (id: string) => {
    const res = await apiRequest<{ state: SalonState }>(`/api/services/${id}`, {
      method: 'DELETE',
    });
    setSalonState(res.state);
  };

  const handleConnectBot = async (token: string, mode: 'webhook' | 'polling') => {
    const res = await apiRequest<{ state: SalonState }>('/api/telegram/connect', {
      method: 'POST',
      body: JSON.stringify({ token, mode }),
    });
    setSalonState(res.state);
  };

  const handleDisconnectBot = async () => {
    const res = await apiRequest<{ state: SalonState }>('/api/telegram/disconnect', {
      method: 'POST',
    });
    setSalonState(res.state);
  };

  const handleSimulateMessage = async (text: string, senderName: string) => {
    const res = await apiRequest<{
      reply: {
        text: string;
        buttons?: Array<Array<{ text: string; callback_data: string }>>;
      };
      state: SalonState;
    }>('/api/telegram/simulate', {
      method: 'POST',
      body: JSON.stringify({ text, senderName }),
    });
    setSalonState(res.state);
    return res.reply;
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <Sidebar
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        counts={{
          appointments: salonState.appointments.length,
          staff: salonState.staff.length,
          services: salonState.services.length,
          telegramConnected: salonState.telegram.connected,
        }}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          activeSection={activeSection}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onOpenNewAppointment={() => {
            setEditingAppointment(null);
            setModalOpen(true);
          }}
        />

        <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {loadError && (
            <div className="mb-6 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              <span>{loadError}</span>
              <button
                type="button"
                onClick={() => void fetchState(false)}
                className="rounded-md border border-red-300 bg-white px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
              >
                Reintentar
              </button>
            </div>
          )}

          {activeSection === 'citas' && (
            <AppointmentsView
              appointments={salonState.appointments}
              staff={salonState.staff}
              services={salonState.services}
              loading={loading}
              onOpenNew={() => {
                setEditingAppointment(null);
                setModalOpen(true);
              }}
              onEdit={(apt) => {
                setEditingAppointment(apt);
                setModalOpen(true);
              }}
              onStatusChange={handleStatusChange}
              onDelete={handleDeleteAppointment}
            />
          )}

          {activeSection === 'trabajadores' && (
            <StaffView
              staff={salonState.staff}
              appointments={salonState.appointments}
              onAddStaff={handleAddStaff}
              onToggleActive={handleToggleStaffActive}
              onDeleteStaff={handleDeleteStaff}
            />
          )}

          {activeSection === 'servicios' && (
            <ServicesView
              services={salonState.services}
              onAddService={handleAddService}
              onToggleActive={handleToggleServiceActive}
              onDeleteService={handleDeleteService}
            />
          )}

          {activeSection === 'telegram' && (
            <TelegramView
              telegram={salonState.telegram}
              logs={salonState.telegramLogs}
              onConnectBot={handleConnectBot}
              onDisconnectBot={handleDisconnectBot}
              onSimulateMessage={handleSimulateMessage}
            />
          )}
        </main>
      </div>

      <AppointmentModal
        isOpen={modalOpen}
        editingAppointment={editingAppointment}
        staff={salonState.staff}
        services={salonState.services}
        onClose={() => {
          setModalOpen(false);
          setEditingAppointment(null);
        }}
        onSave={handleSaveAppointment}
      />
    </div>
  );
}
