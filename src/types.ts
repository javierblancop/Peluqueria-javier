export type AppointmentStatus = 'confirmada' | 'pendiente' | 'completada' | 'cancelada';

export type BookingSource = 'web' | 'telegram';

export interface Appointment {
  id: string;
  clientName: string;
  clientPhone: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  serviceId: string;
  serviceName: string;
  priceEur: number;
  durationMin: number;
  staffId: string;
  staffName: string;
  status: AppointmentStatus;
  source: BookingSource;
  telegramChatId?: string;
  notes?: string;
  createdAt: string;
}

export interface StaffMember {
  id: string;
  name: string;
  specialty: string;
  schedule: string;
  active: boolean;
}

export interface ServiceItem {
  id: string;
  name: string;
  category: string;
  priceEur: number;
  durationMin: number;
  active: boolean;
}

export type TelegramMode = 'inactive' | 'webhook' | 'polling';

export interface TelegramLogEntry {
  id: string;
  timestamp: string;
  direction: 'in' | 'out';
  chatId: string;
  sender: string;
  text: string;
}

export interface TelegramBotInfo {
  configured: boolean;
  connected: boolean;
  maskedToken: string | null;
  mode: TelegramMode;
  botUsername: string | null;
  botName: string | null;
  webhookUrl: string | null;
  lastError: string | null;
}

export interface SalonState {
  appointments: Appointment[];
  staff: StaffMember[];
  services: ServiceItem[];
  telegram: TelegramBotInfo;
  telegramLogs: TelegramLogEntry[];
}
