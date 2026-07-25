import { ShoppingCart, Package, LayoutDashboard, Sun, Moon, LogOut, ShieldCheck } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { getDeviceInfo, clearDeviceToken } from '@/lib/auth';

export type Route = 'pdv' | 'estoque' | 'dashboard';

type NavbarProps = {
  route: Route;
  onNavigate: (r: Route) => void;
  onDisconnect: () => void;
};

const NAV_ITEMS: { id: Route; label: string; icon: typeof ShoppingCart }[] = [
  { id: 'pdv', label: 'PDV / Caixa', icon: ShoppingCart },
  { id: 'estoque', label: 'Estoque', icon: Package },
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
];

export default function Navbar({ route, onNavigate, onDisconnect }: NavbarProps) {
  const { theme, toggleTheme } = useTheme();
  const device = getDeviceInfo();

  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/80 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand + status */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-teal-light to-brand-teal-dark flex items-center justify-center shadow-md shadow-brand-teal/30 shrink-0">
            <ShieldCheck className="w-5 h-5 text-white" strokeWidth={2.2} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold tracking-wide text-slate-900 dark:text-white truncate">
              CELULAR TECH
            </p>
            <p className="text-[11px] text-brand-teal-dark dark:text-brand-teal-light flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Dispositivo Autorizado
            </p>
          </div>
        </div>

        {/* Nav (desktop) */}
        <nav className="hidden md:flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = route === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? 'bg-white dark:bg-slate-900 text-brand-teal-dark dark:text-brand-teal-light shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" strokeWidth={2} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            aria-label="Alternar tema"
            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" strokeWidth={2} /> : <Moon className="w-5 h-5" strokeWidth={2} />}
          </button>
          <button
            onClick={onDisconnect}
            className="flex items-center gap-2 px-3 h-9 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 border border-transparent hover:border-red-200 dark:hover:border-red-900/60 transition-all"
          >
            <LogOut className="w-4 h-4" strokeWidth={2} />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      <nav className="md:hidden flex items-center gap-1 px-3 pb-2 overflow-x-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = route === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                active
                  ? 'bg-brand-teal text-white'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" strokeWidth={2} />
              {item.label}
            </button>
          );
        })}
      </nav>

      {device && (
        <div className="hidden">
          {/* device info available globally via auth lib */}
        </div>
      )}
    </header>
  );
}
