import { useEffect, useState } from 'react';
import { api, apiError } from '../api/client';
import { formatCurrency, formatDate, menuLabel } from '../lib/constants';

type MaskedCustomer = {
  id: string;
  name: string;
  phone_number: string;
  opt_in_promotions: boolean;
  orders_count: number;
  average_ticket?: number | string;
  last_order_at?: string;
  tags?: string[];
  nps_score?: number;
  created_at: string;
};

type FullCustomer = MaskedCustomer & {
  email?: string;
  notes?: string;
  total_spent?: number | string;
  interactions?: { id: string; menuOption: string; userMessage: string; created_at: string }[];
  orders?: { id: string; total?: number | string; channel?: string; created_at: string }[];
};

export default function Customers() {
  const [rows, setRows] = useState<MaskedCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [optInOnly, setOptInOnly] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get<MaskedCustomer[]>('/customers', {
        params: optInOnly ? { optIn: 'true' } : {},
      });
      setRows(data);
      setError('');
    } catch (e) {
      setError(apiError(e, 'Falha ao carregar os clientes.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [optInOnly]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-800">Clientes</h1>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={optInOnly} onChange={(e) => setOptInOnly(e.target.checked)} />
          SÃ³ com opt-in
        </label>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">{error}</div>
      )}

      {loading ? (
        <p className="text-slate-500">Carregandoâ€¦</p>
      ) : rows.length === 0 ? (
        <p className="text-slate-500">Nenhum cliente encontrado.</p>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">Telefone</th>
                <th className="px-4 py-3 font-medium">Opt-in</th>
                <th className="px-4 py-3 text-right font-medium">Pedidos</th>
                <th className="px-4 py-3 text-right font-medium">Ticket mÃ©dio</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-700">{c.name}</td>
                  <td className="px-4 py-3 text-slate-500">{c.phone_number}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${c.opt_in_promotions ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                      {c.opt_in_promotions ? 'Sim' : 'NÃ£o'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">{c.orders_count ?? 0}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(c.average_ticket)}</td>
                  <td className="px-4 py-3 text-right">
                    <button className="btn-ghost" onClick={() => setSelected(c.id)}>Detalhes</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <CustomerDrawer id={selected} onClose={() => setSelected(null)} onSaved={load} />
      )}
    </div>
  );
}

function CustomerDrawer({ id, onClose, onSaved }: { id: string; onClose: () => void; onSaved: () => void }) {
  async function exportData() {
    setError('');
    try {
      const { data } = await api.get(`/customers/${id}/export`);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `cliente-${id}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(apiError(e, 'Falha ao exportar os dados.'));
    }
  }

  async function anonymize() {
    if (!window.confirm('Anonimizar este titular? Remove nome, telefone, e-mail, endereco e mensagens. Irreversivel (direito de exclusao - LGPD).')) return;
    setError('');
    try {
      await api.post(`/customers/${id}/anonymize`);
      onSaved();
      onClose();
    } catch (e) {
      setError(apiError(e, 'Falha ao anonimizar.'));
    }
  }
  const [c, setC] = useState<FullCustomer | null>(null);
  const [error, setError] = useState('');
  const [tags, setTags] = useState('');
  const [notes, setNotes] = useState('');
  const [nps, setNps] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get<FullCustomer>(`/customers/${id}`)
      .then(({ data }) => {
        setC(data);
        setTags((data.tags ?? []).join(', '));
        setNotes(data.notes ?? '');
        setNps(data.nps_score != null ? String(data.nps_score) : '');
      })
      .catch((e) => setError(apiError(e, 'Falha ao carregar o cliente.')));
  }, [id]);

  async function save() {
    setSaving(true);
    setError('');
    try {
      await api.patch(`/customers/${id}`, {
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        notes,
        nps_score: nps === '' ? undefined : Number(nps),
      });
      onSaved();
      onClose();
    } catch (e) {
      setError(apiError(e, 'Falha ao salvar.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div className="h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">Cliente</h2>
          <button className="btn-ghost" onClick={onClose}>Fechar</button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">{error}</div>
        )}

        {!c ? (
          <p className="text-slate-500">Carregandoâ€¦</p>
        ) : (
          <>
            <dl className="mb-6 space-y-1 text-sm">
              <Row label="Nome" value={c.name} />
              <Row label="Telefone" value={c.phone_number} />
              <Row label="E-mail" value={c.email || 'â€”'} />
              <Row label="Pedidos" value={String(c.orders_count ?? 0)} />
              <Row label="Total gasto" value={formatCurrency(c.total_spent)} />
              <Row label="Ãšltimo pedido" value={formatDate(c.last_order_at)} />
              <Row label="Opt-in" value={c.opt_in_promotions ? 'Sim' : 'NÃ£o'} />
            </dl>

            <div className="mb-3">
              <label className="label">Tags (separadas por vÃ­rgula)</label>
              <input className="input" value={tags} onChange={(e) => setTags(e.target.value)} />
            </div>
            <div className="mb-3">
              <label className="label">Notas</label>
              <textarea className="input" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div className="mb-5">
              <label className="label">NPS (0â€“10)</label>
              <input className="input" type="number" min="0" max="10" value={nps} onChange={(e) => setNps(e.target.value)} />
            </div>

            <div className="mb-4 border-t border-slate-200 pt-4">
              <h3 className="mb-2 font-semibold text-slate-700">Dados do titular (LGPD)</h3>
              <div className="flex gap-2">
                <button className="btn-ghost flex-1" onClick={exportData}>Exportar dados</button>
                <button className="flex-1 rounded-lg px-3 py-2 text-sm font-medium text-red-700 ring-1 ring-red-200 hover:bg-red-50" onClick={anonymize}>Anonimizar</button>
              </div>
            </div>
            <button className="btn-primary w-full" onClick={save} disabled={saving}>
              {saving ? 'Salvandoâ€¦' : 'Salvar alteraÃ§Ãµes'}
            </button>

            {c.interactions && c.interactions.length > 0 && (
              <div className="mt-6">
                <h3 className="mb-2 font-semibold text-slate-700">Ãšltimas interaÃ§Ãµes</h3>
                <ul className="space-y-2 text-sm">
                  {c.interactions.slice(0, 10).map((i) => (
                    <li key={i.id} className="rounded-lg bg-slate-50 px-3 py-2">
                      <div className="flex justify-between">
                        <span className="font-medium text-slate-700">{menuLabel(i.menuOption)}</span>
                        <span className="text-xs text-slate-400">{formatDate(i.created_at)}</span>
                      </div>
                      {i.userMessage && <div className="text-slate-500">â€œ{i.userMessage}â€</div>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-slate-400">{label}</dt>
      <dd className="text-right font-medium text-slate-700">{value}</dd>
    </div>
  );
}
