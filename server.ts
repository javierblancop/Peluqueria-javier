import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type {
  Appointment,
  AppointmentStatus,
  SalonState,
  ServiceItem,
  StaffMember,
  TelegramBotInfo,
  TelegramLogEntry,
  TelegramMode,
} from './src/types.ts';

const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'salon-db.json');

interface PersistedDatabase {
  appointments: Appointment[];
  staff: StaffMember[];
  services: ServiceItem[];
  telegramConfig: {
    token: string;
    mode: TelegramMode;
    botUsername: string | null;
    botName: string | null;
    webhookUrl: string | null;
    lastError: string | null;
  };
  telegramLogs: TelegramLogEntry[];
}

function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

function createInitialDb(): PersistedDatabase {
  const today = getTodayDateString();
  return {
    staff: [
      {
        id: 'stf-luis',
        name: 'Luis Morales',
        specialty: 'Cortes y degradados',
        schedule: '09:30 - 19:30',
        active: true,
      },
      {
        id: 'stf-sara',
        name: 'Sara Navarro',
        specialty: 'Colorimetría y mechas',
        schedule: '10:00 - 20:00',
        active: true,
      },
      {
        id: 'stf-elena',
        name: 'Elena Ruiz',
        specialty: 'Peinados y tratamientos',
        schedule: '09:30 - 18:00',
        active: true,
      },
    ],
    services: [
      {
        id: 'srv-corte',
        name: 'Corte Caballero',
        category: 'Corte',
        priceEur: 14,
        durationMin: 30,
        active: true,
      },
      {
        id: 'srv-corte-barba',
        name: 'Corte y Arreglo de Barba',
        category: 'Barbería',
        priceEur: 22,
        durationMin: 45,
        active: true,
      },
      {
        id: 'srv-tinte',
        name: 'Tinte Completo',
        category: 'Color',
        priceEur: 38,
        durationMin: 75,
        active: true,
      },
      {
        id: 'srv-lavado-peinado',
        name: 'Lavado y Peinado',
        category: 'Estilismo',
        priceEur: 18,
        durationMin: 40,
        active: true,
      },
    ],
    appointments: [
      {
        id: 'apt-101',
        clientName: 'Carlos Méndez',
        clientPhone: '612 480 219',
        date: today,
        time: '10:30',
        serviceId: 'srv-corte-barba',
        serviceName: 'Corte y Arreglo de Barba',
        priceEur: 22,
        durationMin: 45,
        staffId: 'stf-luis',
        staffName: 'Luis Morales',
        status: 'confirmada',
        source: 'web',
        notes: 'Degradado medio a tijera arriba',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'apt-102',
        clientName: 'Lucía Serrano',
        clientPhone: '645 912 034',
        date: today,
        time: '12:00',
        serviceId: 'srv-tinte',
        serviceName: 'Tinte Completo',
        priceEur: 38,
        durationMin: 75,
        staffId: 'stf-sara',
        staffName: 'Sara Navarro',
        status: 'confirmada',
        source: 'telegram',
        notes: 'Matiz cálido natural',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'apt-103',
        clientName: 'Javier Ortega',
        clientPhone: '698 113 740',
        date: today,
        time: '17:00',
        serviceId: 'srv-corte',
        serviceName: 'Corte Caballero',
        priceEur: 14,
        durationMin: 30,
        staffId: 'stf-luis',
        staffName: 'Luis Morales',
        status: 'pendiente',
        source: 'web',
        createdAt: new Date().toISOString(),
      },
    ],
    telegramConfig: {
      token: process.env.TELEGRAM_BOT_TOKEN?.trim() || '',
      mode: 'inactive',
      botUsername: null,
      botName: null,
      webhookUrl: null,
      lastError: null,
    },
    telegramLogs: [],
  };
}

function loadDatabase(): PersistedDatabase {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_PATH)) {
    const initial = createInitialDb();
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2), 'utf8');
    return initial;
  }
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    const parsed = JSON.parse(raw) as PersistedDatabase;
    return {
      appointments: Array.isArray(parsed.appointments) ? parsed.appointments : [],
      staff: Array.isArray(parsed.staff) ? parsed.staff : [],
      services: Array.isArray(parsed.services) ? parsed.services : [],
      telegramConfig: parsed.telegramConfig || {
        token: process.env.TELEGRAM_BOT_TOKEN?.trim() || '',
        mode: 'inactive',
        botUsername: null,
        botName: null,
        webhookUrl: null,
        lastError: null,
      },
      telegramLogs: Array.isArray(parsed.telegramLogs) ? parsed.telegramLogs : [],
    };
  } catch {
    const fallback = createInitialDb();
    fs.writeFileSync(DB_PATH, JSON.stringify(fallback, null, 2), 'utf8');
    return fallback;
  }
}

let db: PersistedDatabase = loadDatabase();

function saveDatabase(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
}

function getEffectiveToken(): string {
  return db.telegramConfig.token?.trim() || process.env.TELEGRAM_BOT_TOKEN?.trim() || '';
}

function maskToken(token: string): string | null {
  if (!token) return null;
  if (token.length <= 12) return '••••••';
  return `${token.slice(0, 6)}••••••${token.slice(-4)}`;
}

function getPublicTelegramInfo(): TelegramBotInfo {
  const token = getEffectiveToken();
  return {
    configured: Boolean(token),
    connected: Boolean(token && db.telegramConfig.botUsername && db.telegramConfig.mode !== 'inactive'),
    maskedToken: maskToken(token),
    mode: db.telegramConfig.mode,
    botUsername: db.telegramConfig.botUsername,
    botName: db.telegramConfig.botName,
    webhookUrl: db.telegramConfig.webhookUrl,
    lastError: db.telegramConfig.lastError,
  };
}

function getPublicState(): SalonState {
  const sortedAppointments = [...db.appointments].sort((a, b) => {
    const dateCmp = a.date.localeCompare(b.date);
    if (dateCmp !== 0) return dateCmp;
    return a.time.localeCompare(b.time);
  });
  return {
    appointments: sortedAppointments,
    staff: db.staff,
    services: db.services,
    telegram: getPublicTelegramInfo(),
    telegramLogs: db.telegramLogs.slice(-40),
  };
}

function appendTelegramLog(entry: Omit<TelegramLogEntry, 'id' | 'timestamp'>): void {
  db.telegramLogs.push({
    id: `log-${crypto.randomUUID().slice(0, 8)}`,
    timestamp: new Date().toISOString(),
    ...entry,
  });
  if (db.telegramLogs.length > 80) {
    db.telegramLogs = db.telegramLogs.slice(-80);
  }
  saveDatabase();
}

// Conversational Telegram Booking State per chatId
interface BookingSession {
  step: 'service' | 'staff' | 'date' | 'time' | 'name';
  serviceId?: string;
  staffId?: string;
  date?: string;
  time?: string;
}

const bookingSessions = new Map<string, BookingSession>();

interface InlineButton {
  text: string;
  callback_data: string;
}

interface BotReply {
  text: string;
  buttons?: InlineButton[][];
  appointmentCreated?: Appointment;
}

const TIME_SLOTS = ['10:00', '10:30', '11:30', '12:30', '16:00', '17:00', '18:00', '19:00'];

function formatDateOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function getAvailableSlotsFor(date: string, staffId: string): string[] {
  const taken = new Set(
    db.appointments
      .filter((a) => a.date === date && a.staffId === staffId && a.status !== 'cancelada')
      .map((a) => a.time)
  );
  return TIME_SLOTS.filter((slot) => !taken.has(slot));
}

function processBotMessage(chatId: string, rawInput: string, senderName: string): BotReply {
  const input = rawInput.trim();
  const lower = input.toLowerCase();

  if (lower === '/cancelar' || lower === 'cancelar') {
    bookingSessions.delete(chatId);
    return {
      text: 'Reserva cancelada. Escribe /reservar cuando quieras iniciar una nueva cita.',
      buttons: [[{ text: 'Reservar cita', callback_data: '/reservar' }]],
    };
  }

  if (lower === '/start' || lower === '/ayuda' || lower === 'hola' || lower === 'menu') {
    bookingSessions.delete(chatId);
    return {
      text:
        `Hola ${senderName}, bienvenido a Peluquería Pro.\n\n` +
        `Puedo ayudarte a consultar tarifas, ver el equipo y reservar tu cita 24/7:\n` +
        `• /reservar — Iniciar reserva guiada\n` +
        `• /servicios — Lista de servicios y precios\n` +
        `• /equipo — Profesionales disponibles\n` +
        `• /citas — Ver tus próximas citas`,
      buttons: [
        [
          { text: 'Reservar cita', callback_data: '/reservar' },
          { text: 'Ver servicios', callback_data: '/servicios' },
        ],
        [
          { text: 'Ver equipo', callback_data: '/equipo' },
          { text: 'Mis citas', callback_data: '/citas' },
        ],
      ],
    };
  }

  if (lower === '/servicios') {
    const activeServices = db.services.filter((s) => s.active);
    if (activeServices.length === 0) {
      return { text: 'Actualmente no hay servicios activos configurados.' };
    }
    const list = activeServices
      .map((s, idx) => `${idx + 1}. ${s.name} — ${s.priceEur} € (${s.durationMin} min)`)
      .join('\n');
    return {
      text: `Servicios y tarifas vigentes:\n\n${list}\n\nPulsa "Reservar cita" para elegir hora.`,
      buttons: [[{ text: 'Reservar cita', callback_data: '/reservar' }]],
    };
  }

  if (lower === '/equipo') {
    const activeStaff = db.staff.filter((s) => s.active);
    if (activeStaff.length === 0) {
      return { text: 'No hay profesionales disponibles en este momento.' };
    }
    const list = activeStaff
      .map((s) => `• ${s.name} — ${s.specialty} (${s.schedule})`)
      .join('\n');
    return {
      text: `Nuestro equipo profesional:\n\n${list}`,
      buttons: [[{ text: 'Reservar cita', callback_data: '/reservar' }]],
    };
  }

  if (lower === '/citas') {
    const own = db.appointments.filter(
      (a) => a.telegramChatId === chatId && a.status !== 'cancelada'
    );
    if (own.length === 0) {
      return {
        text: 'No tienes citas registradas desde este chat todavía.',
        buttons: [[{ text: 'Reservar ahora', callback_data: '/reservar' }]],
      };
    }
    const lines = own
      .map((a) => `• ${a.date} ${a.time} — ${a.serviceName} con ${a.staffName} (${a.status})`)
      .join('\n');
    return {
      text: `Tus citas registradas:\n\n${lines}`,
      buttons: [[{ text: 'Nueva reserva', callback_data: '/reservar' }]],
    };
  }

  if (lower === '/reservar') {
    const activeServices = db.services.filter((s) => s.active);
    if (activeServices.length === 0) {
      return { text: 'No hay servicios disponibles para reservar.' };
    }
    bookingSessions.set(chatId, { step: 'service' });
    return {
      text: 'Paso 1 de 5 — Elige el servicio que deseas:',
      buttons: activeServices.map((s) => [
        { text: `${s.name} (${s.priceEur} €)`, callback_data: `srv:${s.id}` },
      ]),
    };
  }

  // Handle ongoing booking wizard
  const session = bookingSessions.get(chatId);
  if (session) {
    if (session.step === 'service') {
      const targetId = input.startsWith('srv:') ? input.slice(4) : null;
      const service = db.services.find(
        (s) =>
          s.active &&
          (s.id === targetId || s.name.toLowerCase().includes(lower))
      );
      if (!service) {
        return {
          text: 'No reconocí ese servicio. Selecciona uno de los botones:',
          buttons: db.services
            .filter((s) => s.active)
            .map((s) => [{ text: `${s.name} (${s.priceEur} €)`, callback_data: `srv:${s.id}` }]),
        };
      }
      session.serviceId = service.id;
      session.step = 'staff';
      const activeStaff = db.staff.filter((st) => st.active);
      return {
        text: `Servicio: ${service.name} (${service.priceEur} €)\n\nPaso 2 de 5 — ¿Con qué profesional quieres atenderte?`,
        buttons: activeStaff.map((st) => [
          { text: `${st.name} (${st.specialty})`, callback_data: `stf:${st.id}` },
        ]),
      };
    }

    if (session.step === 'staff') {
      const targetId = input.startsWith('stf:') ? input.slice(4) : null;
      const member = db.staff.find(
        (st) => st.active && (st.id === targetId || st.name.toLowerCase().includes(lower))
      );
      if (!member) {
        return {
          text: 'Selecciona un profesional de la lista:',
          buttons: db.staff
            .filter((st) => st.active)
            .map((st) => [{ text: st.name, callback_data: `stf:${st.id}` }]),
        };
      }
      session.staffId = member.id;
      session.step = 'date';
      const d0 = formatDateOffset(0);
      const d1 = formatDateOffset(1);
      const d2 = formatDateOffset(2);
      return {
        text: `Profesional: ${member.name}\n\nPaso 3 de 5 — Elige una fecha (o escribe YYYY-MM-DD):`,
        buttons: [
          [
            { text: `Hoy (${d0})`, callback_data: `date:${d0}` },
            { text: `Mañana (${d1})`, callback_data: `date:${d1}` },
          ],
          [{ text: `Pasado (${d2})`, callback_data: `date:${d2}` }],
        ],
      };
    }

    if (session.step === 'date') {
      const pickedDate = input.startsWith('date:') ? input.slice(5) : input;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(pickedDate)) {
        return { text: 'Formato no válido. Usa YYYY-MM-DD (ejemplo: 2026-11-15) o pulsa un botón.' };
      }
      session.date = pickedDate;
      session.step = 'time';
      const available = getAvailableSlotsFor(pickedDate, session.staffId || '');
      if (available.length === 0) {
        session.step = 'date';
        return { text: `No quedan huecos libres el ${pickedDate}. Elige otra fecha.` };
      }
      const rows: InlineButton[][] = [];
      for (let i = 0; i < available.length; i += 2) {
        const pair = available.slice(i, i + 2).map((slot) => ({
          text: slot,
          callback_data: `time:${slot}`,
        }));
        rows.push(pair);
      }
      return {
        text: `Fecha: ${pickedDate}\n\nPaso 4 de 5 — Selecciona la hora disponible:`,
        buttons: rows,
      };
    }

    if (session.step === 'time') {
      const pickedTime = input.startsWith('time:') ? input.slice(5) : input;
      if (!/^\d{2}:\d{2}$/.test(pickedTime)) {
        return { text: 'Por favor elige una hora en formato HH:MM o usa los botones.' };
      }
      session.time = pickedTime;
      session.step = 'name';
      return {
        text: `Hora: ${pickedTime}\n\nPaso 5 de 5 — Escribe tu nombre completo para confirmar la cita (o pulsa el botón):`,
        buttons: [[{ text: `Confirmar como ${senderName}`, callback_data: `confirm:${senderName}` }]],
      };
    }

    if (session.step === 'name') {
      const clientName = input.startsWith('confirm:') ? input.slice(8).trim() : input;
      const service = db.services.find((s) => s.id === session.serviceId);
      const member = db.staff.find((st) => st.id === session.staffId);
      if (!service || !member || !session.date || !session.time) {
        bookingSessions.delete(chatId);
        return { text: 'La sesión expiró. Escribe /reservar para empezar de nuevo.' };
      }

      const newAppointment: Appointment = {
        id: `apt-${crypto.randomUUID().slice(0, 8)}`,
        clientName: clientName || senderName,
        clientPhone: 'Telegram',
        date: session.date,
        time: session.time,
        serviceId: service.id,
        serviceName: service.name,
        priceEur: service.priceEur,
        durationMin: service.durationMin,
        staffId: member.id,
        staffName: member.name,
        status: 'confirmada',
        source: 'telegram',
        telegramChatId: chatId,
        notes: 'Reserva automática vía Bot Telegram',
        createdAt: new Date().toISOString(),
      };
      db.appointments.push(newAppointment);
      saveDatabase();
      bookingSessions.delete(chatId);

      return {
        text:
          `Cita confirmada correctamente.\n\n` +
          `Cliente: ${newAppointment.clientName}\n` +
          `Servicio: ${newAppointment.serviceName} (${newAppointment.priceEur} €)\n` +
          `Profesional: ${newAppointment.staffName}\n` +
          `Fecha y hora: ${newAppointment.date} a las ${newAppointment.time}\n\n` +
          `Te esperamos en Peluquería Pro.`,
        buttons: [[{ text: 'Ver mis citas', callback_data: '/citas' }]],
        appointmentCreated: newAppointment,
      };
    }
  }

  return {
    text: 'No entendí ese mensaje. Usa /reservar para agendar una cita, /servicios para ver tarifas o /ayuda para ver opciones.',
    buttons: [
      [
        { text: 'Reservar cita', callback_data: '/reservar' },
        { text: 'Ver servicios', callback_data: '/servicios' },
      ],
    ],
  };
}

// Real Telegram Bot API helpers
async function callTelegramApi<T>(token: string, method: string, body?: Record<string, unknown>): Promise<T> {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = (await response.json()) as { ok: boolean; result?: T; description?: string };
  if (!json.ok) {
    throw new Error(json.description || `Error en Telegram API (${method})`);
  }
  return json.result as T;
}

async function sendTelegramReply(token: string, chatId: string, reply: BotReply): Promise<void> {
  const payload: Record<string, unknown> = {
    chat_id: chatId,
    text: reply.text,
  };
  if (reply.buttons && reply.buttons.length > 0) {
    payload.reply_markup = { inline_keyboard: reply.buttons };
  }
  await callTelegramApi(token, 'sendMessage', payload);
}

interface TelegramUpdate {
  update_id: number;
  message?: {
    chat: { id: number; first_name?: string; username?: string };
    from?: { first_name?: string; last_name?: string; username?: string };
    text?: string;
  };
  callback_query?: {
    id: string;
    from?: { first_name?: string; last_name?: string; username?: string };
    message?: { chat: { id: number } };
    data?: string;
  };
}

async function handleTelegramUpdate(update: TelegramUpdate, token: string): Promise<void> {
  let chatId: string | null = null;
  let text = '';
  let senderName = 'Cliente';

  if (update.callback_query?.message?.chat?.id && update.callback_query.data) {
    chatId = String(update.callback_query.message.chat.id);
    text = update.callback_query.data;
    senderName =
      update.callback_query.from?.first_name ||
      update.callback_query.from?.username ||
      'Cliente';
    await callTelegramApi(token, 'answerCallbackQuery', {
      callback_query_id: update.callback_query.id,
    }).catch(() => {});
  } else if (update.message?.chat?.id && update.message.text) {
    chatId = String(update.message.chat.id);
    text = update.message.text;
    senderName =
      update.message.from?.first_name ||
      update.message.chat.first_name ||
      update.message.from?.username ||
      'Cliente';
  }

  if (!chatId || !text) return;

  appendTelegramLog({
    direction: 'in',
    chatId,
    sender: senderName,
    text,
  });

  const reply = processBotMessage(chatId, text, senderName);
  await sendTelegramReply(token, chatId, reply);

  appendTelegramLog({
    direction: 'out',
    chatId,
    sender: db.telegramConfig.botUsername ? `@${db.telegramConfig.botUsername}` : 'Bot',
    text: reply.text,
  });
}

// Background polling loop when mode === 'polling'
let pollingTimer: ReturnType<typeof setTimeout> | null = null;
let pollingOffset = 0;

function stopPollingLoop(): void {
  if (pollingTimer) {
    clearTimeout(pollingTimer);
    pollingTimer = null;
  }
}

async function runPollingIteration(): Promise<void> {
  if (db.telegramConfig.mode !== 'polling') return;
  const token = getEffectiveToken();
  if (!token) return;

  try {
    const updates = await callTelegramApi<TelegramUpdate[]>(token, 'getUpdates', {
      offset: pollingOffset,
      timeout: 20,
      allowed_updates: ['message', 'callback_query'],
    });
    db.telegramConfig.lastError = null;
    for (const upd of updates) {
      pollingOffset = Math.max(pollingOffset, upd.update_id + 1);
      await handleTelegramUpdate(upd, token);
    }
  } catch (err) {
    db.telegramConfig.lastError = err instanceof Error ? err.message : 'Error de polling';
    saveDatabase();
  }

  if (db.telegramConfig.mode === 'polling') {
    pollingTimer = setTimeout(() => {
      void runPollingIteration();
    }, 1500);
  }
}

function startPollingLoop(): void {
  stopPollingLoop();
  if (db.telegramConfig.mode === 'polling' && getEffectiveToken()) {
    pollingTimer = setTimeout(() => {
      void runPollingIteration();
    }, 500);
  }
}

async function bootstrapServer(): Promise<void> {
  const app = express();
  app.use(express.json());

  // Health
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, timestamp: new Date().toISOString() });
  });

  // Full state
  app.get('/api/state', (_req, res) => {
    res.json(getPublicState());
  });

  // Appointments CRUD
  app.post('/api/appointments', (req, res) => {
    const { clientName, clientPhone, date, time, serviceId, staffId, notes, status } = req.body as {
      clientName?: string;
      clientPhone?: string;
      date?: string;
      time?: string;
      serviceId?: string;
      staffId?: string;
      notes?: string;
      status?: AppointmentStatus;
    };

    if (!clientName?.trim() || !date || !time || !serviceId || !staffId) {
      res.status(400).json({ error: 'Faltan campos obligatorios para registrar la cita.' });
      return;
    }

    const service = db.services.find((s) => s.id === serviceId);
    const member = db.staff.find((st) => st.id === staffId);
    if (!service || !member) {
      res.status(400).json({ error: 'Servicio o profesional no encontrado.' });
      return;
    }

    const appointment: Appointment = {
      id: `apt-${crypto.randomUUID().slice(0, 8)}`,
      clientName: clientName.trim(),
      clientPhone: clientPhone?.trim() || 'Sin teléfono',
      date,
      time,
      serviceId: service.id,
      serviceName: service.name,
      priceEur: service.priceEur,
      durationMin: service.durationMin,
      staffId: member.id,
      staffName: member.name,
      status: status || 'confirmada',
      source: 'web',
      notes: notes?.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    db.appointments.push(appointment);
    saveDatabase();
    res.status(201).json({ appointment, state: getPublicState() });
  });

  app.patch('/api/appointments/:id', (req, res) => {
    const { id } = req.params;
    const idx = db.appointments.findIndex((a) => a.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Cita no encontrada.' });
      return;
    }
    const existing = db.appointments[idx];
    const patch = req.body as Partial<Appointment>;

    let nextService = db.services.find((s) => s.id === (patch.serviceId || existing.serviceId));
    let nextStaff = db.staff.find((st) => st.id === (patch.staffId || existing.staffId));

    db.appointments[idx] = {
      ...existing,
      clientName: patch.clientName?.trim() || existing.clientName,
      clientPhone: patch.clientPhone?.trim() ?? existing.clientPhone,
      date: patch.date || existing.date,
      time: patch.time || existing.time,
      status: patch.status || existing.status,
      notes: patch.notes !== undefined ? patch.notes : existing.notes,
      serviceId: nextService ? nextService.id : existing.serviceId,
      serviceName: nextService ? nextService.name : existing.serviceName,
      priceEur: nextService ? nextService.priceEur : existing.priceEur,
      durationMin: nextService ? nextService.durationMin : existing.durationMin,
      staffId: nextStaff ? nextStaff.id : existing.staffId,
      staffName: nextStaff ? nextStaff.name : existing.staffName,
    };
    saveDatabase();
    res.json({ appointment: db.appointments[idx], state: getPublicState() });
  });

  app.delete('/api/appointments/:id', (req, res) => {
    const { id } = req.params;
    const before = db.appointments.length;
    db.appointments = db.appointments.filter((a) => a.id !== id);
    if (db.appointments.length === before) {
      res.status(404).json({ error: 'Cita no encontrada.' });
      return;
    }
    saveDatabase();
    res.json({ ok: true, state: getPublicState() });
  });

  // Staff CRUD
  app.post('/api/staff', (req, res) => {
    const { name, specialty, schedule } = req.body as {
      name?: string;
      specialty?: string;
      schedule?: string;
    };
    if (!name?.trim()) {
      res.status(400).json({ error: 'El nombre del profesional es obligatorio.' });
      return;
    }
    const member: StaffMember = {
      id: `stf-${crypto.randomUUID().slice(0, 8)}`,
      name: name.trim(),
      specialty: specialty?.trim() || 'Estilista general',
      schedule: schedule?.trim() || '09:30 - 19:30',
      active: true,
    };
    db.staff.push(member);
    saveDatabase();
    res.status(201).json({ member, state: getPublicState() });
  });

  app.patch('/api/staff/:id', (req, res) => {
    const { id } = req.params;
    const idx = db.staff.findIndex((s) => s.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Profesional no encontrado.' });
      return;
    }
    const patch = req.body as Partial<StaffMember>;
    db.staff[idx] = {
      ...db.staff[idx],
      name: patch.name?.trim() || db.staff[idx].name,
      specialty: patch.specialty?.trim() || db.staff[idx].specialty,
      schedule: patch.schedule?.trim() || db.staff[idx].schedule,
      active: typeof patch.active === 'boolean' ? patch.active : db.staff[idx].active,
    };
    saveDatabase();
    res.json({ member: db.staff[idx], state: getPublicState() });
  });

  app.delete('/api/staff/:id', (req, res) => {
    const { id } = req.params;
    db.staff = db.staff.filter((s) => s.id !== id);
    saveDatabase();
    res.json({ ok: true, state: getPublicState() });
  });

  // Services CRUD
  app.post('/api/services', (req, res) => {
    const { name, category, priceEur, durationMin } = req.body as {
      name?: string;
      category?: string;
      priceEur?: number;
      durationMin?: number;
    };
    if (!name?.trim() || typeof priceEur !== 'number' || Number.isNaN(priceEur) || priceEur < 0) {
      res.status(400).json({ error: 'Nombre y precio válido son obligatorios.' });
      return;
    }
    const service: ServiceItem = {
      id: `srv-${crypto.randomUUID().slice(0, 8)}`,
      name: name.trim(),
      category: category?.trim() || 'General',
      priceEur: Number(priceEur),
      durationMin: Number(durationMin) > 0 ? Number(durationMin) : 30,
      active: true,
    };
    db.services.push(service);
    saveDatabase();
    res.status(201).json({ service, state: getPublicState() });
  });

  app.patch('/api/services/:id', (req, res) => {
    const { id } = req.params;
    const idx = db.services.findIndex((s) => s.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Servicio no encontrado.' });
      return;
    }
    const patch = req.body as Partial<ServiceItem>;
    db.services[idx] = {
      ...db.services[idx],
      name: patch.name?.trim() || db.services[idx].name,
      category: patch.category?.trim() || db.services[idx].category,
      priceEur: typeof patch.priceEur === 'number' ? patch.priceEur : db.services[idx].priceEur,
      durationMin: typeof patch.durationMin === 'number' ? patch.durationMin : db.services[idx].durationMin,
      active: typeof patch.active === 'boolean' ? patch.active : db.services[idx].active,
    };
    saveDatabase();
    res.json({ service: db.services[idx], state: getPublicState() });
  });

  app.delete('/api/services/:id', (req, res) => {
    const { id } = req.params;
    db.services = db.services.filter((s) => s.id !== id);
    saveDatabase();
    res.json({ ok: true, state: getPublicState() });
  });

  // Telegram Configuration & Webhook
  app.post('/api/telegram/connect', async (req, res) => {
    const { token: submittedToken, mode } = req.body as {
      token?: string;
      mode?: 'webhook' | 'polling';
    };
    const token = submittedToken?.trim() || getEffectiveToken();
    const targetMode: TelegramMode = mode === 'webhook' ? 'webhook' : 'polling';

    if (!token) {
      res.status(400).json({ error: 'Introduce un token de Bot de Telegram válido.' });
      return;
    }

    try {
      const me = await callTelegramApi<{ id: number; username: string; first_name: string }>(
        token,
        'getMe'
      );

      stopPollingLoop();

      let webhookUrl: string | null = null;
      if (targetMode === 'webhook') {
        const baseUrl =
          process.env.APP_URL?.replace(/\/$/, '') ||
          `${req.protocol}://${req.get('host')}`;
        webhookUrl = `${baseUrl}/api/telegram/webhook`;
        await callTelegramApi(token, 'setWebhook', { url: webhookUrl });
      } else {
        await callTelegramApi(token, 'deleteWebhook', { drop_pending_updates: false });
      }

      db.telegramConfig = {
        token,
        mode: targetMode,
        botUsername: me.username,
        botName: me.first_name,
        webhookUrl,
        lastError: null,
      };
      saveDatabase();

      if (targetMode === 'polling') {
        startPollingLoop();
      }

      res.json({ ok: true, state: getPublicState() });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo validar el token con Telegram.';
      db.telegramConfig.lastError = message;
      saveDatabase();
      res.status(400).json({ error: message, state: getPublicState() });
    }
  });

  app.post('/api/telegram/disconnect', async (_req, res) => {
    stopPollingLoop();
    const token = getEffectiveToken();
    if (token) {
      await callTelegramApi(token, 'deleteWebhook', { drop_pending_updates: false }).catch(() => {});
    }
    db.telegramConfig = {
      token: '',
      mode: 'inactive',
      botUsername: null,
      botName: null,
      webhookUrl: null,
      lastError: null,
    };
    saveDatabase();
    res.json({ ok: true, state: getPublicState() });
  });

  app.post('/api/telegram/webhook', async (req, res) => {
    const token = getEffectiveToken();
    if (!token) {
      res.status(200).json({ ok: false });
      return;
    }
    try {
      const update = req.body as TelegramUpdate;
      await handleTelegramUpdate(update, token);
      res.status(200).json({ ok: true });
    } catch (err) {
      db.telegramConfig.lastError = err instanceof Error ? err.message : 'Error procesando webhook';
      saveDatabase();
      res.status(200).json({ ok: true });
    }
  });

  // Interactive Bot Simulator endpoint (uses exact same conversational engine & DB)
  app.post('/api/telegram/simulate', (req, res) => {
    const { text, senderName, chatId } = req.body as {
      text?: string;
      senderName?: string;
      chatId?: string;
    };
    if (!text?.trim()) {
      res.status(400).json({ error: 'Escribe un comando o mensaje para probar el bot.' });
      return;
    }
    const simChatId = chatId || 'sim-client-1';
    const clientLabel = senderName?.trim() || 'Cliente Prueba';

    appendTelegramLog({
      direction: 'in',
      chatId: simChatId,
      sender: clientLabel,
      text: text.trim(),
    });

    const reply = processBotMessage(simChatId, text.trim(), clientLabel);

    appendTelegramLog({
      direction: 'out',
      chatId: simChatId,
      sender: db.telegramConfig.botUsername ? `@${db.telegramConfig.botUsername}` : 'Bot Peluquería',
      text: reply.text,
    });

    res.json({
      reply,
      state: getPublicState(),
    });
  });

  // Resume polling on boot if previously active
  if (db.telegramConfig.mode === 'polling' && getEffectiveToken()) {
    startPollingLoop();
  }

  // Vite dev middleware or static dist serving
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Peluquería Pro server listening on http://0.0.0.0:${PORT}`);
  });
}

void bootstrapServer();
