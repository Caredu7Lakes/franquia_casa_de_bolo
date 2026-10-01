import { useEffect, useState } from 'react';
import { api, apiError } from '../api/client';
import { menuLabel } from '../lib/constants';

type FreqRow = { menu_option: string; total_requests: string };
type PeakRow = { day_of_week: string; hour_of_day: string; interaction_count: string };
type OptInCustomer = { id: string };

const DAY_PT: Record<string, string> = {
  Monday: 'Segunda', Tuesday: 'Terça', Wednesday: 'Quarta', Thursday: 'Quinta',
  Friday: 'Sexta', Saturday: 'Sábado', Sunday: 'Domingo',
};

function dayPt(raw: string): string {
  const key = (raw || '').trim();
  return DAY_PT[key] ?? key;
}

export default function Dashboard() {
  const [freq, setFreq] = useState<FreqRow[]>([]);
  const [peak, setPeak] = useState<PeakRow[]>([]);
  const [optIn, setOptIn] = useState<OptInCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get<FreqRow[]>('/analytics/frequent-questions'),
      api.get<PeakRow[]>('/analytics/peak-hours'),
      api.get<OptInCustomer[]>('/analytics/opted-in-customers'),
    ])
      .then(([f, p, o]) => {
        setFreq(f.data);
        setPeak(p.data);
        setOptIn(o.data);
      })
      .catch((e) => setError(apiError(e, 'Falha ao carregar os indicadores.')))
      .finally(() => setLoading(false));
  }, []);

  const totalInteractions = freq.reduce((acc, r) => acc + Number(r.total_requests || 0), 0);
  const maxFreq = Math.max(1, ...freq.map((r) => Number(r.total_requests || 0)));

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
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Kpi label="Interações registradas" value={totalInteractions} />
            <Kpi label="Opções de menu usadas" value={freq.length} />
            <Kpi label="Clientes com opt-in" value={optIn.length} />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
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
        </>
      )}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="card">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-1 text-3xl font-bold text-brand-700">{value}</div>
    </div>
  );
}
