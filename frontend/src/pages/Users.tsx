import { FormEvent, useEffect, useState } from 'react';
import { api, apiError } from '../api/client';

type User = {
  id: string;
  email: string;
  name?: string;
  role: 'OWNER' | 'OPERATOR';
  active: boolean;
  created_at: string;
};

const ROLES: { value: User['role']; label: string }[] = [
  { value: 'OPERATOR', label: 'Operador' },
  { value: 'OWNER', label: 'Dono (OWNER)' },
];

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get<User[]>('/users');
      setUsers(data);
      setError('');
    } catch (e) {
      setError(apiError(e, 'Falha ao carregar os usuários.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleActive(u: User) {
    try {
      await api.patch(`/users/${u.id}`, { active: !u.active });
      load();
    } catch (e) {
      setError(apiError(e, 'Falha ao atualizar o usuário.'));
    }
  }

  async function resetPassword(u: User) {
    const senha = window.prompt(`Nova senha para ${u.email} (mín. 6 caracteres):`);
    if (!senha) return;
    try {
      await api.patch(`/users/${u.id}`, { password: senha });
      alert('Senha atualizada.');
    } catch (e) {
      setError(apiError(e, 'Falha ao redefinir a senha.'));
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Usuários</h1>
        <button className="btn-primary" onClick={() => setCreating(true)}>+ Novo usuário</button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">{error}</div>
      )}

      {loading ? (
        <p className="text-slate-500">Carregando…</p>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">E-mail</th>
                <th className="px-4 py-3 font-medium">Papel</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-700">{u.name || '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{u.email}</td>
                  <td className="px-4 py-3 text-slate-600">{u.role === 'OWNER' ? 'Dono' : 'Operador'}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${u.active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                      {u.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button className="btn-ghost" onClick={() => resetPassword(u)}>Senha</button>
                      <button className="btn-ghost" onClick={() => toggleActive(u)}>
                        {u.active ? 'Desativar' : 'Ativar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {creating && (
        <CreateUserModal
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function CreateUserModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<User['role']>('OPERATOR');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('A senha deve ter ao menos 6 caracteres.');
      return;
    }
    setSaving(true);
    try {
      await api.post('/users', { email, name, password, role });
      onSaved();
    } catch (err) {
      setError(apiError(err, 'Falha ao cadastrar o usuário.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={submit} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-bold text-slate-800">Novo usuário</h2>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">{error}</div>
        )}

        <div className="mb-3">
          <label className="label">Nome</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="mb-3">
          <label className="label">E-mail</label>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="mb-3">
          <label className="label">Senha (mín. 6)</label>
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <div className="mb-5">
          <label className="label">Papel</label>
          <select className="input" value={role} onChange={(e) => setRole(e.target.value as User['role'])}>
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Salvando…' : 'Cadastrar'}
          </button>
        </div>
      </form>
    </div>
  );
}
