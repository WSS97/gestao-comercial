import { useState } from 'react';
import {
  Settings, X, Eye, EyeOff, Loader2, Lock, ShieldCheck, MessageCircle, AlertCircle, CheckCircle2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getDeviceInfo } from '@/lib/auth';
import { useAdminAuth } from '@/context/AdminAuthContext';

type Props = {
  onClose: () => void;
};

export default function SecuritySettingsModal({ onClose }: Props) {
  const { senhaAdmin, setSenhaAdmin } = useAdminAuth();
  const hasPassword = Boolean(senhaAdmin && senhaAdmin.trim() !== '');

  const [showForm, setShowForm] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!newPassword.trim()) {
      setError('A senha não pode estar vazia.');
      return;
    }
    if (newPassword.length < 4) {
      setError('A senha deve ter pelo menos 4 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem. Digite novamente.');
      return;
    }

    setSaving(true);
    const device = getDeviceInfo();
    const deviceId = device?.id ?? '';

    if (!deviceId) {
      setError('Dispositivo não identificado. Reinicie o aplicativo.');
      setSaving(false);
      return;
    }

    const { data: updatedRows, error: updateError } = await supabase
      .from('authorized_devices')
      .update({ senha_admin: newPassword })
      .eq('id', deviceId)
      .select('id');

    if (updateError || !updatedRows || updatedRows.length === 0) {
      setError('Erro ao salvar a senha no banco de dados. Tente novamente.');
      setSaving(false);
      return;
    }

    setSenhaAdmin(newPassword);
    setSaving(false);
    setSuccess(true);
    setNewPassword('');
    setConfirmPassword('');
    setShowForm(false);

    setTimeout(() => {
      setSuccess(false);
      onClose();
    }, 1800);
  };

  const handleCancel = () => {
    setShowForm(false);
    setNewPassword('');
    setConfirmPassword('');
    setError('');
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="relative px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 shrink-0">
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="absolute top-4 right-4 w-8 h-8 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" strokeWidth={2} />
          </button>
          <div className="flex items-center gap-3 pr-8">
            <div className="w-10 h-10 rounded-xl bg-brand-teal/10 flex items-center justify-center shrink-0">
              <Settings className="w-5 h-5 text-brand-teal-dark dark:text-brand-teal-light" strokeWidth={2} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">Configurações de Segurança</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Proteção do Dashboard e Financeiro</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto">
          {success && (
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 mb-4">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" strokeWidth={2} />
              <p className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">
                Senha configurada com sucesso! Suas telas financeiras agora estão protegidas.
              </p>
            </div>
          )}

          {!hasPassword && !showForm && (
            <div className="space-y-4">
              <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50">
                <span className="text-lg leading-none mt-0.5">💡</span>
                <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                  Proteja seus dados financeiros! Deseja ocultar o Dashboard e a tela de Financeiro contra o acesso de funcionários?
                </p>
              </div>
              <button
                onClick={() => setShowForm(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-brand-teal text-white font-medium text-sm shadow-sm hover:bg-brand-teal-dark transition-all active:scale-[0.98]"
              >
                <Lock className="w-4 h-4" strokeWidth={2.2} />
                Configurar Senha
              </button>
            </div>
          )}

          {!hasPassword && showForm && (
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                  Nova Senha Admin
                </label>
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Digite a nova senha"
                    autoFocus
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-brand-teal transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew((v) => !v)}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  >
                    {showNew ? <EyeOff className="w-4 h-4" strokeWidth={2} /> : <Eye className="w-4 h-4" strokeWidth={2} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                  Confirmar Senha Admin
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a nova senha"
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-brand-teal transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" strokeWidth={2} /> : <Eye className="w-4 h-4" strokeWidth={2} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-xs text-red-500 dark:text-red-400">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-60"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-brand-teal text-white font-medium text-sm shadow-sm hover:bg-brand-teal-dark disabled:opacity-60 transition-all active:scale-[0.98]"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2.5} /> : <ShieldCheck className="w-4 h-4" strokeWidth={2.2} />}
                  {saving ? 'Salvando...' : 'Salvar Senha'}
                </button>
              </div>
            </form>
          )}

          {hasPassword && (
            <div className="space-y-4">
              <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50">
                <Lock className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" strokeWidth={2} />
                <p className="text-sm text-emerald-700 dark:text-emerald-300 font-medium leading-relaxed">
                  Seu financeiro já está protegido com uma senha administrativa.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Por motivos de segurança e auditoria, para alterar ou remover a senha cadastrada, entre em contato diretamente com o suporte técnico do sistema.
                </p>
              </div>

              <a
                href="https://wa.me"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-emerald-500 text-white font-medium text-sm shadow-sm hover:bg-emerald-600 transition-all active:scale-[0.98]"
              >
                <MessageCircle className="w-4 h-4" strokeWidth={2.2} />
                Solicitar Alteração no Whatsapp
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
