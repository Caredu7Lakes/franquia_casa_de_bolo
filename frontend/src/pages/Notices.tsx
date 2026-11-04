import { FormEvent, useEffect, useState } from 'react';
import { api, apiError } from '../api/client';

type Notice = {
  id: string;
  message: string;
  active: boolean;
  weekdays: number[];
  start_time?: string | null;
  end_time?: string | null;
  created_at: string;
};

const WEEKDAYS = [
  { n: 0, label: 'Dom' },
  { n: 1, label: 'Seg' },
  { n: 2, label: 'Ter' },
  { n: 3, label: 'Qua' },
  { n: 4, label: 'Qui' },
  { n: 5, label: 'Sex' },
  { n: 6, label: 'Sáb' },
];

function weekdaysLabel(days: number[]): string {
  if (!days || days.length === 0) return 'Todos os dias';
  return days.slice().sort().map((d) => WEEKDAYS[d].label).join(', ');
}

function windowLabel(start?: string | null, end?: string | null): string {
  if (!start && !end) return 'Dia todo';
  return `${start ?? '00:00'}–${end ?? '23:59'}`;
}

export default function Notices() {
  const [rows, setRows] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<Notice | null>(null);
  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get<Notice[]>('/operational-notices');
      setRows(data);
      setError('');
    } catch (e) {
      setError(apiError(e, 'Falha ao carregar os avisos.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleActive(n: Notice) {
    try {
      await api.patch(`/operational-notices/${n.id}`, { active: !n.active });
      load();
    } catch (e) {
      setError(apiError(e, 'Falha ao alterar o aviso.'));
    }
  }

  async function remove(n: Notice) {
    if (!window.confirm('Excluir este aviso?')) return;
    try {
      await api.delete(`/operational-notices/${n.id}`);
      load();
    } catch (e) {
      setError(apiError(e, 'Falha ao excluir.'));
    }
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Avisos</h1>
        <button className="btn-primary" onClick={() => setCreating(true)}>+ Novo aviso</button>
      </div>
      <p className="mb-6 text-sm text-slate-500">
        Mensagens exibidas pelo bot no WhatsApp. Só aparecem quando <b>ativas</b> e dentro do dia/horário escolhidos (horário de São Paulo).
      </p>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">{error}</div>
      )}

      {loading ? (
        <p className="text-slate-500">Carregando…</p>
      ) : rows.length === 0 ? (
        <p className="text-slate-500">Nenhum aviso cadastrado.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((n) => (
            <div key={n.id} className="card flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-slate-800">{n.message}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {weekdaysLabel(n.weekdays)} · {windowLabel(n.start_time, n.end_time)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  onClick={() => toggleActive(n)}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    n.active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {n.active ? 'Ativo' : 'Inativo'}
                </button>
                <button className="btn-ghost" onClick={() => setEditing(n)}>Editar</button>
                <button
                  className="rounded-lg px-2 py-1 text-sm text-red-600 hover:bg-red-50"
                  onClick={() => remove(n)}
                >
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {creating && (
        <NoticeModal
          title="Novo aviso"
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            load();
          }}
          onSubmit={(payload) => api.post('/operational-notices', payload)}
        />
      )}

      {editing && (
        <NoticeModal
          title="Editar aviso"
          notice={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
          onSubmit={(payload) => api.patch(`/operational-notices/${editing.id}`, payload)}
        />
      )}
    </div>
  );
}

function NoticeModal({
  title,
  notice,
  onClose,
  onSaved,
  onSubmit,
}: {
  title: string;
  notice?: Notice;
  onClose: () => void;
  onSaved: () => void;
  onSubmit: (payload: any) => Promise<unknown>;
}) {
  const [message, setMessage] = useState(notice?.message ?? '');
  const [active, setActive] = useState(notice?.active ?? false);
  const [weekdays, setWeekdays] = useState<number[]>(notice?.weekdays ?? []);
  const [startTime, setStartTime] = useState(notice?.start_time ?? '');
  const [endTime, setEndTime] = useState(notice?.end_time ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function toggleDay(n: number) {
    setWeekdays((prev) => (prev.includes(n) ? prev.filter((d) => d !== n) : [...prev, n]));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (message.trim() === '') {
      setError('A mensagem é obrigatória.');
      return;
    }
    const payload = {
      message,
      active,
      weekdays,
      start_time: startTime === '' ? null : startTime,
      end_time: endTime === '' ? null : endTime,
    };
    setSaving(true);
    try {
      await onSubmit(payload);
      onSaved();
    } catch (err) {
      setError(apiError(err, 'Falha ao salvar o aviso.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
      >
        <h2 className="mb-4 text-lg font-bold text-slate-800">{title}</h2>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">{error}</div>
        )}

        <div className="mb-3">
          <label className="label">Mensagem</label>
          <textarea className="input" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} />
        </div>

        <div className="mb-3">
          <label className="label">Dias da semana (nenhum = todos)</label>
          <div className="flex flex-wrap gap-1">
            {WEEKDAYS.map((d) => (
              <button
                type="button"
                key={d.n}
                onClick={() => toggleDay(d.n)}
                className={`rounded-lg px-3 py-1 text-sm ${
                  weekdays.includes(d.n) ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-3 grid grid-cols-2 gap-3">
          <div>
            <label className="label">Das (vazio = início do dia)</label>
            <input className="input" type="time" value={startTime ?? ''} onChange={(e) => setStartTime(e.target.value)} />
          </div>
          <div>
            <label className="label">Até (vazio = fim do dia)</label>
            <input className="input" type="time" value={endTime ?? ''} onChange={(e) => setEndTime(e.target.value)} />
          </div>
        </div>

        <label className="mb-5 flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          Ativo (aparece no WhatsApp)
        </label>

        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </form>
    </div>
  );
}
