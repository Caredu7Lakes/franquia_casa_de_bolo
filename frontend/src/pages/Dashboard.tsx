import { useEffect, useState } from 'react';
import { api, apiError } from '../api/client';
import { menuLabel } from '../lib/constants';

type FreqRow = { menu_option: string; total_requests: string };
type PeakRow = { day_of_week: string; hour_of_day: string; interaction_count: string };
type OptInCustomer = { id: string };

type SalesSummary = { period_days: number; revenue: number; orders_count: number; average_ticket: number };
type ChannelRow = { channel: string; orders_count: string; revenue: string };
type Retention = { period_days: number; active: number; inactive: number; total: number };
type TopProduct = { product: string; qty: string; revenue: string };

const DAY_PT: Record<string, string> = {
  Monday: 'Segunda', Tuesday: 'Terça', Wednesday: 'Quarta', Thursday: 'Quinta',
  Friday: 'Sexta', Saturday: 'Sábado', Sunday: 'Domingo',
};

function dayPt(raw: string): string {
  const key = (raw || '').trim();
  return DAY_PT[key] ?? key;
}

function brl(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function Dashboard() {
  const [freq, setFreq] = useState<FreqRow[]>([]);
  const [peak, setPeak] = useState<PeakRow[]>([]);
  const [optIn, setOptIn] = useState<OptInCustomer[]>([]);
  const [sales, setSales] = useState<SalesSummary | null>(null);
  const [channels, setChannels] = useState<ChannelRow[]>([]);
  const [retention, setRetention] = useState<Retention | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get<FreqRow[]>('/analytics/frequent-questions'),
      api.get<PeakRow[]>('/analytics/peak-hours'),
      api.get<OptInCustomer[]>('/analytics/opted-in-customers'),
      api.get<SalesSummary>('/analytics/sales-summary'),
      api.get<ChannelRow[]>('/analytics/sales-by-channel'),
      api.get<Retention>('/analytics/customer-retention'),
      api.get<TopProduct[]>('/analytics/top-products'),
    ])
      .then(([f, p, o, s, c, r, tp]) => {
        setFreq(f.data);
        setPeak(p.data);
        setOptIn(o.data);
        setSales(s.data);
        setChannels(c.data);
        setRetention(r.data);
        setTopProducts(tp.data);
      })
      .catch((e) => setError(apiError(e, 'Falha ao carregar os indicadores.')))
      .finally(() => setLoading(false));
  }, []);

  const totalInteractions = freq.reduce((acc, r) => acc + Number(r.total_requests || 0), 0);
  const maxFreq = Math.max(1, ...freq.map((r) => Number(r.total_requests || 0)));
  const maxProductQty = Math.max(1, ...topProducts.map((p) => Number(p.qty || 0)));

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-800">Dashboard</h1>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">{error}</div>
      )}

      {loading ? (
        <p className="text-slate-500">Carregando…</p>
      ) : (
        <>
          {/* Vendas — KPIs reais (últimos 18 dias) */}
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Kpi label="Receita (18 dias)" value={brl(sales?.revenue ?? 0)} />
            <Kpi label="Pedidos (18 dias)" value={String(sales?.orders_count ?? 0)} />
            <Kpi label="Ticket médio" value={brl(sales?.average_ticket ?? 0)} />
          </div>

          {/* Engajamento do bot — KPIs reais */}
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Kpi label="Interações registradas" value={String(totalInteractions)} />
            <Kpi label="Opções de menu usadas" value={String(freq.length)} />
            <Kpi label="Clientes com opt-in" value={String(optIn.length)} />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Produtos mais vendidos — real */}
            <section className="card">
              <h2 className="mb-4 font-semibold text-slate-700">Produtos mais vendidos</h2>
              {topProducts.length === 0 ? (
                <p className="text-sm text-slate-500">Sem vendas ainda.</p>
              ) : (
                <ul className="space-y-3">
                  {topProducts.map((p) => {
                    const qty = Number(p.qty || 0);
                    const pct = Math.round((qty / maxProductQty) * 100);
                    return (
                      <li key={p.product}>
                        <div className="mb-1 flex justify-between text-sm">
                          <span className="text-slate-700">{p.product}</span>
                          <span className="font-medium text-slate-500">{qty} un · {brl(Number(p.revenue || 0))}</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-slate-100">
                          <div className="h-2 rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {/* Vendas por canal — real */}
            <section className="card">
              <h2 className="mb-4 font-semibold text-slate-700">Vendas por canal</h2>
              {channels.length === 0 ? (
                <p className="text-sm text-slate-500">Sem vendas ainda.</p>
              ) : (
                <div className="overflow-hidden rounded-lg ring-1 ring-slate-200">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-left text-slate-500">
                      <tr>
                        <th className="px-3 py-2 font-medium">Canal</th>
                        <th className="px-3 py-2 text-right font-medium">Pedidos</th>
                        <th className="px-3 py-2 text-right font-medium">Receita</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {channels.map((c, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2 text-slate-700">{c.channel}</td>
                          <td className="px-3 py-2 text-right text-slate-600">{c.orders_count}</td>
                          <td className="px-3 py-2 text-right font-medium text-slate-600">{brl(Number(c.revenue || 0))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Interações mais frequentes — real */}
            <section className="card">
              <h2 className="mb-4 font-semibold text-slate-700">Interações mais frequentes</h2>
              {freq.length === 0 ? (
                <p className="text-sm text-slate-500">Sem dados ainda.</p>
              ) : (
                <ul className="space-y-3">
                  {freq.map((r) => {
                    const total = Number(r.total_requests || 0);
                    const pct = Math.round((total / maxFreq) * 100);
                    return (
                      <li key={r.menu_option}>
                        <div className="mb-1 flex justify-between text-sm">
                          <span className="text-slate-700">{menuLabel(r.menu_option)}</span>
                          <span className="font-medium text-slate-500">{total}</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-slate-100">
                          <div className="h-2 rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {/* Horários de pico — real */}
            <section className="card">
              <h2 className="mb-4 font-semibold text-slate-700">Horários de pico</h2>
              {peak.length === 0 ? (
                <p className="text-sm text-slate-500">Sem dados ainda.</p>
              ) : (
                <div className="overflow-hidden rounded-lg ring-1 ring-slate-200">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-left text-slate-500">
                      <tr>
                        <th className="px-3 py-2 font-medium">Dia</th>
                        <th className="px-3 py-2 font-medium">Hora</th>
                        <th className="px-3 py-2 text-right font-medium">Interações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {peak.slice(0, 10).map((r, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2 text-slate-700">{dayPt(r.day_of_week)}</td>
                          <td className="px-3 py-2 text-slate-700">{String(r.hour_of_day).padStart(2, '0')}h</td>
                          <td className="px-3 py-2 text-right font-medium text-slate-600">{r.interaction_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>

          {/* Retenção — real */}
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Kpi label="Clientes ativos (18 dias)" value={String(retention?.active ?? 0)} />
            <Kpi label="Clientes inativos" value={String(retention?.inactive ?? 0)} />
            <Kpi label="Base total" value={String(retention?.total ?? 0)} />
          </div>

          {/* Conversão — placeholder (aguarda atribuição) */}
          <div className="mt-6">
            <section className="card relative overflow-hidden opacity-75">
              <span className="absolute right-4 top-4 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-amber-200">
                Em breve
              </span>
              <h2 className="mb-2 font-semibold text-slate-700">Conversão — interações → pedidos</h2>
              <p className="max-w-2xl text-sm text-slate-500">
                Vai medir quantos clientes que conversaram com o bot fecharam pedido,
                mostrando a eficácia do atendimento em gerar venda. Requer rastrear a
                origem do pedido (atribuição) — em desenvolvimento.
              </p>
              <div className="mt-4 flex items-end gap-2">
                <span className="text-3xl font-bold text-slate-300">—</span>
                <span className="mb-1 text-sm text-slate-400">taxa de conversão</span>
              </div>
            </section>
          </div>

          {/* Marketing — placeholder (aguarda persistência de campanha) */}
          <div className="mt-6">
            <section className="card relative overflow-hidden opacity-75">
              <span className="absolute right-4 top-4 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-amber-200">
                Em breve
              </span>
              <h2 className="mb-2 font-semibold text-slate-700">Marketing — resultado de campanha</h2>
              <p className="max-w-2xl text-sm text-slate-500">
                Vai mostrar enviados, entregues e retorno de cada disparo em massa.
                Requer registrar cada envio no banco (persistência de campanha) — em
                desenvolvimento.
              </p>
              <div className="mt-4 flex items-end gap-2">
                <span className="text-3xl font-bold text-slate-300">—</span>
                <span className="mb-1 text-sm text-slate-400">taxa de entrega</span>
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="card">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-1 text-3xl font-bold text-brand-700">{value}</div>
    </div>
  );
}