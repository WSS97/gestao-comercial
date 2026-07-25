import { useState, useRef, useEffect } from 'react';
import { ShieldCheck, KeyRound, Loader2, AlertCircle, Lock, Smartphone, CheckCircle2, ArrowRight } from 'lucide-react';
import { supabase, type AuthorizedDevice } from '@/lib/supabase';
import { setDeviceToken } from '@/lib/auth';

type Status = 'idle' | 'validating' | 'success' | 'error';

export default function ActivationScreen({ onActivated }: { onActivated: () => void }) {
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [device, setDevice] = useState<AuthorizedDevice | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      setStatus('error');
      setErrorMsg('Digite a chave de acesso para continuar.');
      return;
    }

    setStatus('validating');
    setErrorMsg('');

    try {
      const { data, error } = await supabase
        .from('authorized_devices')
        .select('id, device_name, access_code, is_active, created_at')
        .eq('access_code', trimmed)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setStatus('error');
        setErrorMsg('Chave de acesso inválida ou não autorizada. Verifique e tente novamente.');
        return;
      }

      const deviceData = data as AuthorizedDevice;
      setDeviceToken(deviceData);
      setDevice(deviceData);
      setStatus('success');
    } catch {
      setStatus('error');
      setErrorMsg('Não foi possível validar a chave. Verifique sua conexão e tente novamente.');
    }
  };

  if (status === 'success' && device) {
    return <ActivatedView device={device} onContinue={onActivated} />;
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden bg-slate-950">
      {/* Ambient background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[32rem] h-[32rem] rounded-full bg-brand-teal/20 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 w-[32rem] h-[32rem] rounded-full bg-brand-blue/20 blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40rem] h-[40rem] rounded-full bg-brand-blue/10 blur-[140px]" />
      </div>

      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      <div className="relative w-full max-w-md">
        {/* Brand header */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-4">
            <div className="absolute inset-0 bg-brand-teal/30 blur-xl rounded-full" />
            <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-teal-light to-brand-teal-dark flex items-center justify-center shadow-lg shadow-brand-teal/40">
              <ShieldCheck className="w-8 h-8 text-white" strokeWidth={2.2} />
            </div>
          </div>
          <h1 className="text-sm font-semibold tracking-[0.25em] text-brand-teal-light uppercase">
            Celular Tech
          </h1>
          <p className="mt-1 text-xs text-slate-500 tracking-wide">Sistema de Ativação de Dispositivo</p>
        </div>

        {/* Card */}
        <div className="relative rounded-2xl bg-slate-900/70 backdrop-blur-xl border border-slate-800 shadow-2xl shadow-black/40 p-8">
          <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-brand-teal/60 to-transparent" />

          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-slate-800/80 border border-slate-700 flex items-center justify-center">
              <Lock className="w-5 h-5 text-brand-teal-light" strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Primeiro Acesso</h2>
              <p className="text-xs text-slate-400">Ativação necessária para continuar</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="access-code" className="block text-sm font-medium text-slate-300 mb-2">
                Digite a chave de acesso
              </label>
              <div className="relative group">
                <KeyRound
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-brand-teal-light transition-colors"
                  strokeWidth={2}
                />
                <input
                  ref={inputRef}
                  id="access-code"
                  type="text"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value);
                    if (status === 'error') setStatus('idle');
                  }}
                  placeholder="HESC-XXXX-XXXX"
                  autoComplete="off"
                  spellCheck={false}
                  disabled={status === 'validating'}
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-slate-950/60 border border-slate-700 text-white placeholder-slate-600 font-mono text-sm tracking-wider focus:outline-none focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20 transition-all disabled:opacity-50"
                />
              </div>
            </div>

            {status === 'error' && (
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-950/40 border border-red-900/60 animate-fadeIn">
                <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" strokeWidth={2} />
                <p className="text-sm text-red-300">{errorMsg}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={status === 'validating'}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-brand-teal-light to-brand-teal-dark text-white font-semibold text-sm shadow-lg shadow-brand-teal/30 hover:shadow-brand-teal/50 focus:outline-none focus:ring-2 focus:ring-brand-teal/40 transition-all disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98]"
            >
              {status === 'validating' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2.5} />
                  Validando acesso...
                </>
              ) : (
                <>
                  Ativar Dispositivo
                  <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-800">
            <p className="text-xs text-slate-500 text-center leading-relaxed">
              A chave de acesso foi fornecida junto ao seu dispositivo autorizado.
              Cada chave é válida para um único dispositivo.
            </p>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-600">
          Celular Tech © 2026 — Todos os direitos reservados
        </p>
      </div>
    </div>
  );
}

function ActivatedView({ device, onContinue }: { device: AuthorizedDevice; onContinue: () => void }) {
  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden bg-slate-950">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[32rem] h-[32rem] rounded-full bg-brand-teal/25 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 w-[32rem] h-[32rem] rounded-full bg-brand-blue/25 blur-[120px]" />
      </div>

      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      <div className="relative w-full max-w-md">
        <div className="rounded-2xl bg-slate-900/70 backdrop-blur-xl border border-slate-800 shadow-2xl shadow-black/40 p-8 text-center">
          <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-brand-teal/60 to-transparent" />

          <div className="relative inline-flex mb-6">
            <div className="absolute inset-0 bg-brand-teal/40 blur-xl rounded-full" />
            <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-brand-teal-light to-brand-teal-dark flex items-center justify-center shadow-lg shadow-brand-teal/40 animate-popIn">
              <CheckCircle2 className="w-10 h-10 text-white" strokeWidth={2.2} />
            </div>
          </div>

          <h2 className="text-xl font-bold text-white mb-2">Dispositivo Ativado</h2>
          <p className="text-sm text-slate-400 mb-6">
            O acesso foi autorizado com sucesso. Seu dispositivo está pronto para uso.
          </p>

          <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-4 mb-6 text-left space-y-3">
            <div className="flex items-center gap-3">
              <Smartphone className="w-4 h-4 text-brand-teal-light shrink-0" strokeWidth={2} />
              <div className="min-w-0">
                <p className="text-xs text-slate-500">Dispositivo</p>
                <p className="text-sm font-medium text-white truncate">{device.device_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <KeyRound className="w-4 h-4 text-brand-teal-light shrink-0" strokeWidth={2} />
              <div className="min-w-0">
                <p className="text-xs text-slate-500">Chave de Acesso</p>
                <p className="text-sm font-mono font-medium text-white tracking-wider truncate">
                  {device.access_code}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-4 h-4 text-brand-teal-light shrink-0" strokeWidth={2} />
              <div>
                <p className="text-xs text-slate-500">Status</p>
                <p className="text-sm font-medium text-brand-teal-light">Ativo e Autorizado</p>
              </div>
            </div>
          </div>

          <button
            onClick={onContinue}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-brand-teal-light to-brand-teal-dark text-white font-semibold text-sm shadow-lg shadow-brand-teal/30 hover:shadow-brand-teal/50 transition-all active:scale-[0.98]"
          >
            Ir para o PDV
            <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
          </button>
        </div>

        <p className="mt-6 text-center text-xs text-slate-600">
          Celular Tech © 2026 — Todos os direitos reservados
        </p>
      </div>
    </div>
  );
}
