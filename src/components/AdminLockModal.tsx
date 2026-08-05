import { useState } from 'react';
import { Lock, Loader2, X, AlertCircle } from 'lucide-react';
import { useAdminAuth } from '@/context/AdminAuthContext';

type Props = {
  viewName: string;
  onClose: () => void;
};

export default function AdminLockModal({ viewName, onClose }: Props) {
  const { senhaAdmin, unlock } = useAdminAuth();
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setChecking(true);

    // Simulate a brief check for UX feedback
    setTimeout(() => {
      if (senhaAdmin && password === senhaAdmin) {
        unlock(remember);
        setChecking(false);
        onClose();
      } else {
        setError('Senha incorreta. Tente novamente.');
        setChecking(false);
      }
    }, 300);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="relative px-5 py-5 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-950">
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="absolute top-4 right-4 w-8 h-8 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" strokeWidth={2} />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-brand-teal/10 flex items-center justify-center">
              <Lock className="w-5 h-5 text-brand-teal-dark dark:text-brand-teal-light" strokeWidth={2} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">Area Restrita</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">{viewName}</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Digite a senha do administrador para acessar este menu.
          </p>

          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
              Senha do administrador
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoFocus
              className="w-full px-3.5 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-brand-teal transition-all"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-xs text-red-500 dark:text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-brand-teal focus:ring-brand-teal focus:ring-offset-0 cursor-pointer"
            />
            <span className="text-sm text-slate-600 dark:text-slate-300">Lembrar para este acesso</span>
          </label>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={checking}
              className="flex-1 py-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={checking || !password}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-brand-teal text-white font-medium text-sm shadow-sm hover:bg-brand-teal-dark disabled:opacity-60 transition-all active:scale-[0.98]"
            >
              {checking ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2.5} /> : <Lock className="w-4 h-4" strokeWidth={2.5} />}
              {checking ? 'Verificando...' : 'Desbloquear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
