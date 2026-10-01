import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { clearToken, getTokenPayload } from '../auth/auth';

const nav = [
  { to: '/', label: 'Dashboard', end: true, icon: '📊' },
  { to: '/produtos', label: 'Produtos', icon: '🍰' },
  { to: '/clientes', label: 'Clientes', icon: '👥' },
  { to: '/marketing', label: 'Marketing', icon: '📣' },
];

export default function Layout() {
  const navigate = useNavigate();
  const role = getTokenPayload()?.role;

  function logout() {
    clearToken();
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-screen md:flex">
      <aside className="flex shrink-0 flex-col gap-1 bg-brand-900 p-4 text-brand-50 md:w-60">
        <div className="mb-4 px-2">
          <div className="text-lg font-bold">🍰 Casa do Bolo</div>
          <div className="text-xs text-brand-200">Painel administrativo</div>
        </div>
        <nav className="flex flex-row gap-1 md:flex-col">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive ? 'bg-white/15 text-white' : 'text-brand-100 hover:bg-white/10'
                }`
              }
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto hidden md:block">
          {role && <div className="px-3 py-1 text-xs text-brand-200">Perfil: {role}</div>}
          <button onClick={logout} className="w-full rounded-lg px-3 py-2 text-left text-sm text-brand-100 hover:bg-white/10">
            Sair
          </button>
        </div>
        <button onClick={logout} className="rounded-lg px-3 py-2 text-sm text-brand-100 hover:bg-white/10 md:hidden">
          Sair
        </button>
      </aside>

      <main className="flex-1 p-4 md:p-8">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
