import { useState } from 'react';
import { ShieldCheck, Loader2, FileText } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getDeviceInfo, setDeviceToken } from '@/lib/auth';

const TERMS_TEXT = `1. Licença de Uso: O presente software é disponibilizado na modalidade de licença de uso temporária para gestão comercial e controle de balcão.
2. Responsabilidade pelos Dados: O licenciante não se responsabiliza pela veracidade ou inexatidão dos dados inseridos no sistema pelo usuário.
3. Suporte e Operação: O suporte técnico engloba correções operacionais e dúvidas de uso em horário comercial.
4. Pagamento e Inadimplência: O atraso no pagamento do plano contratado sujeitará o dispositivo à restrição de acesso ou suspensão temporária dos serviços.
5. Proteção de Dados (LGPD): Os dados armazenados destinam-se exclusivamente à operação da loja e não serão compartilhados com terceiros.`;

const TERMS_VERSION = 'v1.0';

type Props = {
  onAccepted: () => void;
};

export default function TermsModal({ onAccepted }: Props) {
  const [checked, setChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    if (!checked) return;
    const device = getDeviceInfo();
    if (!device) return;

    setSubmitting(true);
    setError('');

    const { error: updateError } = await supabase
      .from('authorized_devices')
      .update({
        terms_accepted: true,
        terms_accepted_at: new Date().toISOString(),
        terms_version: TERMS_VERSION,
      })
      .eq('id', device.id);

    if (updateError) {
      setError('Não foi possível registrar o aceite. Verifique sua conexão e tente novamente.');
      setSubmitting(false);
      return;
    }

    const updated = { ...device, terms_accepted: true, terms_accepted_at: new Date().toISOString(), terms_version: TERMS_VERSION };
    setDeviceToken(updated);
    setSubmitting(false);
    onAccepted();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-brand-teal/10 flex items-center justify-center">
            <FileText className="w-5 h-5 text-brand-teal-dark dark:text-brand-teal-light" strokeWidth={2} />
          </div>
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-white">Termos de Uso e Política de Privacidade</h2>
            <p className="text-xs text-slate-400">Aceite necessário para continuar</p>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-4">
              <pre className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300 font-sans leading-relaxed">
                {TERMS_TEXT}
              </pre>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 space-y-3 shrink-0">
          {error && (
            <p className="text-xs text-red-500 dark:text-red-400">{error}</p>
          )}

          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="mt-0.5 w-5 h-5 rounded border-slate-300 dark:border-slate-600 text-brand-teal focus:ring-brand-teal/30 cursor-pointer shrink-0"
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">
              Li e concordo com os Termos de Uso e a Política de Privacidade
            </span>
          </label>

          <button
            onClick={handleConfirm}
            disabled={!checked || submitting}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-brand-teal-light to-brand-teal-dark text-white font-semibold text-sm shadow-lg shadow-brand-teal/25 hover:shadow-brand-teal/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2.5} />
                Registrando...
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" strokeWidth={2.5} />
                Confirmar e Acessar Sistema
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
