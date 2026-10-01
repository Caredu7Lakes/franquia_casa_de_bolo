import { FormEvent, useState } from 'react';
import { api, apiError } from '../api/client';

export default function Marketing() {
  const [messageText, setMessageText] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [onlyOptIn, setOnlyOptIn] = useState(true);
  const [delay, setDelay] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<string>('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setResult('');
    if (!messageText.trim() && !mediaUrl.trim()) {
      setError('Informe uma mensagem ou uma mídia.');
      return;
    }
    setSending(true);
    try {
      const { data } = await api.post('/marketing/campaign', {
        messageText: messageText.trim() || undefined,
        mediaUrl: mediaUrl.trim() || undefined,
        onlyOptIn,
        delayBetweenMessagesMs: delay === '' ? undefined : Number(delay),
      });
      setResult(typeof data === 'object' ? JSON.stringify(data) : String(data));
    } catch (err) {
      setError(apiError(err, 'Falha ao iniciar a campanha.'));
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-800">Marketing</h1>

      <form onSubmit={submit} className="card max-w-xl">
        <p className="mb-4 text-sm text-slate-500">
          Dispara uma campanha para a base. Por padrão, só para quem deu opt-in (LGPD). O envio é
          serial, com delay anti-ban.
        </p>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">{error}</div>
        )}
        {result && (
          <div className="mb-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700 ring-1 ring-green-200">
            Campanha iniciada. {result}
          </div>
        )}

        <div className="mb-3">
          <label className="label">Mensagem</label>
          <textarea className="input" rows={4} value={messageText} onChange={(e) => setMessageText(e.target.value)} placeholder="Texto da campanha…" />
        </div>

        <div className="mb-3">
          <label className="label">URL de mídia (opcional)</label>
          <input className="input" value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} placeholder="https://…/imagem.jpg" />
        </div>

        <div className="mb-3">
          <label className="label">Delay entre mensagens (ms, opcional)</label>
          <input className="input" type="number" min="0" value={delay} onChange={(e) => setDelay(e.target.value)} placeholder="ex.: 3000" />
        </div>

        <label className="mb-5 flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={onlyOptIn} onChange={(e) => setOnlyOptIn(e.target.checked)} />
          Enviar apenas para clientes com opt-in (recomendado)
        </label>

        <button type="submit" className="btn-primary" disabled={sending}>
          {sending ? 'Disparando…' : 'Iniciar campanha'}
        </button>
      </form>
    </div>
  );
}
