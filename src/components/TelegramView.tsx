import { useState, type FormEvent } from 'react';
import { Bot, Check, Copy, Eye, EyeOff, Send, Unplug } from 'lucide-react';
import type { TelegramBotInfo, TelegramLogEntry } from '../types';

interface SimMessage {
  id: string;
  sender: 'client' | 'bot';
  text: string;
  buttons?: Array<Array<{ text: string; callback_data: string }>>;
}

interface TelegramViewProps {
  telegram: TelegramBotInfo;
  logs: TelegramLogEntry[];
  onConnectBot: (token: string, mode: 'webhook' | 'polling') => Promise<void>;
  onDisconnectBot: () => Promise<void>;
  onSimulateMessage: (
    text: string,
    senderName: string
  ) => Promise<{
    text: string;
    buttons?: Array<Array<{ text: string; callback_data: string }>>;
  }>;
}

export function TelegramView({
  telegram,
  logs,
  onConnectBot,
  onDisconnectBot,
  onSimulateMessage,
}: TelegramViewProps) {
  const [tokenInput, setTokenInput] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [mode, setMode] = useState<'polling' | 'webhook'>(
    telegram.mode === 'webhook' ? 'webhook' : 'polling'
  );
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  // Simulator state
  const [clientName, setClientName] = useState('Andrea López');
  const [simInput, setSimInput] = useState('');
  const [simSending, setSimSending] = useState(false);
  const [simMessages, setSimMessages] = useState<SimMessage[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text: 'Prueba aquí el flujo de reservas de Telegram. Pulsa un comando o escribe /reservar.',
      buttons: [
        [
          { text: 'Iniciar reserva', callback_data: '/reservar' },
          { text: 'Ver servicios', callback_data: '/servicios' },
        ],
        [{ text: 'Ver equipo', callback_data: '/equipo' }],
      ],
    },
  ]);

  const webhookEndpoint =
    typeof window !== 'undefined'
      ? `${window.location.origin}/api/telegram/webhook`
      : '/api/telegram/webhook';

  const handleCopyWebhook = async () => {
    try {
      await navigator.clipboard.writeText(webhookEndpoint);
      setCopiedWebhook(true);
      setTimeout(() => setCopiedWebhook(false), 2000);
    } catch {
      // Clipboard fallback ignored
    }
  };

  const handleConnect = async (e: FormEvent) => {
    e.preventDefault();
    setConnecting(true);
    setConnectError(null);
    try {
      await onConnectBot(tokenInput.trim(), mode);
      setTokenInput('');
    } catch (err) {
      setConnectError(err instanceof Error ? err.message : 'Error al conectar con Telegram.');
    } finally {
      setConnecting(false);
    }
  };

  const sendSimCommand = async (payloadText: string, displayLabel?: string) => {
    if (!payloadText.trim() || simSending) return;
    setSimSending(true);
    const userMsg: SimMessage = {
      id: `u-${Date.now()}`,
      sender: 'client',
      text: displayLabel || payloadText,
    };
    setSimMessages((prev) => [...prev, userMsg]);
    try {
      const reply = await onSimulateMessage(payloadText, clientName.trim() || 'Cliente Prueba');
      setSimMessages((prev) => [
        ...prev,
        {
          id: `b-${Date.now()}`,
          sender: 'bot',
          text: reply.text,
          buttons: reply.buttons,
        },
      ]);
    } catch (err) {
      setSimMessages((prev) => [
        ...prev,
        {
          id: `b-err-${Date.now()}`,
          sender: 'bot',
          text: err instanceof Error ? err.message : 'Error al procesar el comando.',
        },
      ]);
    } finally {
      setSimSending(false);
    }
  };

  const handleSimSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const txt = simInput.trim();
    if (!txt) return;
    setSimInput('');
    await sendSimCommand(txt);
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* Left column: Bot configuration */}
      <section className="space-y-6 lg:col-span-5">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3.5">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-blue-600" />
              <h2 className="font-display text-base font-semibold text-slate-900">
                Conexión con Telegram
              </h2>
            </div>
            <span
              className={`text-xs font-semibold ${
                telegram.connected ? 'text-emerald-700' : 'text-slate-500'
              }`}
            >
              {telegram.connected ? 'Conectado' : 'Sin conectar'}
            </span>
          </div>

          <div className="mt-4 space-y-3 text-sm">
            {telegram.connected ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-3.5 text-emerald-900">
                <p className="font-medium">
                  Bot activo: @{telegram.botUsername}
                </p>
                <p className="mt-1 text-xs text-emerald-800">
                  Modo: {telegram.mode === 'webhook' ? 'Webhook Cloud' : 'Polling automático 24/7'}
                  {telegram.maskedToken && (
                    <>
                      <span aria-hidden="true"> · </span>
                      <span className="font-mono">{telegram.maskedToken}</span>
                    </>
                  )}
                </p>
              </div>
            ) : (
              <p className="text-sm text-slate-600">
                Conecta tu bot de <span className="font-mono text-xs">@BotFather</span> para que tus
                clientes consulten tarifas y reserven citas directamente desde Telegram.
              </p>
            )}

            {telegram.lastError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {telegram.lastError}
              </div>
            )}

            {connectError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {connectError}
              </div>
            )}
          </div>

          <form onSubmit={handleConnect} className="mt-4 space-y-4">
            <div>
              <label htmlFor="tg-token" className="mb-1.5 block text-sm font-medium text-slate-700">
                Token del Bot {telegram.configured ? '(opcional para actualizar)' : ''}
              </label>
              <div className="relative">
                <input
                  id="tg-token"
                  type={showToken ? 'text' : 'password'}
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder={
                    telegram.maskedToken
                      ? `Token guardado (${telegram.maskedToken})`
                      : 'Pega el token de @BotFather'
                  }
                  className="w-full rounded-lg border border-slate-300 py-2 pl-3 pr-10 font-mono text-xs text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15"
                />
                <button
                  type="button"
                  onClick={() => setShowToken((prev) => !prev)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  aria-label={showToken ? 'Ocultar token' : 'Mostrar token'}
                >
                  {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Modo de recepción
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMode('polling')}
                  className={`rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
                    mode === 'polling'
                      ? 'border-blue-600 bg-blue-50 text-blue-900'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-semibold">Polling 24/7</div>
                  <div className="mt-0.5 text-slate-500">Sin configuración extra</div>
                </button>
                <button
                  type="button"
                  onClick={() => setMode('webhook')}
                  className={`rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
                    mode === 'webhook'
                      ? 'border-blue-600 bg-blue-50 text-blue-900'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-semibold">Webhook Cloud</div>
                  <div className="mt-0.5 text-slate-500">Push instantáneo HTTPS</div>
                </button>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-600">URL del Webhook</span>
                <button
                  type="button"
                  onClick={handleCopyWebhook}
                  className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                >
                  {copiedWebhook ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedWebhook ? 'Copiado' : 'Copiar'}</span>
                </button>
              </div>
              <p className="mt-1 break-all font-mono text-xs text-slate-700">
                {webhookEndpoint}
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="submit"
                disabled={connecting}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {connecting ? 'Verificando...' : telegram.connected ? 'Actualizar bot' : 'Conectar bot'}
              </button>
              {telegram.connected && (
                <button
                  type="button"
                  onClick={() => void onDisconnectBot()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  title="Desconectar bot"
                >
                  <Unplug className="h-4 w-4" />
                  <span>Desconectar</span>
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Supported commands */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="font-display text-sm font-semibold text-slate-900">
            Comandos disponibles para clientes
          </h3>
          <dl className="mt-3 divide-y divide-slate-100 text-xs">
            <div className="flex justify-between gap-4 py-2">
              <dt className="font-mono font-semibold text-blue-700">/reservar</dt>
              <dd className="text-right text-slate-600">Asistente guiado paso a paso</dd>
            </div>
            <div className="flex justify-between gap-4 py-2">
              <dt className="font-mono font-semibold text-blue-700">/servicios</dt>
              <dd className="text-right text-slate-600">Catálogo de servicios y precios</dd>
            </div>
            <div className="flex justify-between gap-4 py-2">
              <dt className="font-mono font-semibold text-blue-700">/equipo</dt>
              <dd className="text-right text-slate-600">Profesionales y horarios activos</dd>
            </div>
            <div className="flex justify-between gap-4 py-2">
              <dt className="font-mono font-semibold text-blue-700">/citas</dt>
              <dd className="text-right text-slate-600">Consulta de reservas del cliente</dd>
            </div>
            <div className="flex justify-between gap-4 py-2">
              <dt className="font-mono font-semibold text-blue-700">/cancelar</dt>
              <dd className="text-right text-slate-600">Cancela la reserva en curso</dd>
            </div>
          </dl>
        </div>
      </section>

      {/* Right column: Interactive simulator & logs */}
      <section className="space-y-6 lg:col-span-7">
        <div className="flex flex-col rounded-xl border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900">
                Simulador interactivo del bot
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Las reservas confirmadas aquí se guardan directamente en la agenda real.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="sim-client" className="text-xs font-medium text-slate-600">
                Cliente:
              </label>
              <input
                id="sim-client"
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-36 rounded-lg border border-slate-300 px-2.5 py-1 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="h-[360px] space-y-3 overflow-y-auto bg-slate-50/70 p-4">
            {simMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.sender === 'client' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[85%] whitespace-pre-line rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    msg.sender === 'client'
                      ? 'bg-blue-600 text-white'
                      : 'border border-slate-200 bg-white text-slate-800'
                  }`}
                >
                  {msg.text}
                </div>

                {msg.buttons && msg.buttons.length > 0 && (
                  <div className="mt-2 flex max-w-[85%] flex-col gap-1.5">
                    {msg.buttons.map((row, rIdx) => (
                      <div key={rIdx} className="flex flex-wrap gap-1.5">
                        {row.map((btn) => (
                          <button
                            key={btn.callback_data}
                            type="button"
                            disabled={simSending}
                            onClick={() => void sendSimCommand(btn.callback_data, btn.text)}
                            className="rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-50 disabled:opacity-50"
                          >
                            {btn.text}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <form
            onSubmit={handleSimSubmit}
            className="flex items-center gap-2 border-t border-slate-200 p-3"
          >
            <input
              type="text"
              value={simInput}
              onChange={(e) => setSimInput(e.target.value)}
              placeholder="Escribe un comando (/reservar, /servicios, Hola)..."
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15"
            />
            <button
              type="submit"
              disabled={simSending || !simInput.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              <span>Enviar</span>
            </button>
          </form>
        </div>

        {/* Recent activity log */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="font-display text-sm font-semibold text-slate-900">
            Historial reciente de mensajes ({logs.length})
          </h3>
          {logs.length === 0 ? (
            <p className="mt-2 text-xs text-slate-500">
              Aún no se han registrado conversaciones con el bot.
            </p>
          ) : (
            <div className="mt-3 max-h-48 space-y-2 overflow-y-auto divide-y divide-slate-100 text-xs">
              {[...logs].reverse().slice(0, 12).map((entry) => (
                <div key={entry.id} className="flex items-baseline justify-between gap-3 pt-2 first:pt-0">
                  <div className="min-w-0">
                    <span className="font-semibold text-slate-800">{entry.sender}: </span>
                    <span className="text-slate-600">{entry.text.split('\n')[0]}</span>
                  </div>
                  <span className="shrink-0 font-mono text-[11px] tabular-nums text-slate-400">
                    {new Date(entry.timestamp).toLocaleTimeString('es-ES', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
