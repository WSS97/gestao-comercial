import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Wallet, ArrowDownCircle, ArrowUpCircle, Loader2, Trash2, Plus, X, Check,
} from 'lucide-react';
import { supabase, type FinancialTransaction } from '@/lib/supabase';
import { getDeviceInfo } from '@/lib/auth';

const BRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const CATEGORIES = [
  'Peças/Insumos',
  'Estrutura/Custos Fixos',
  'Pessoal/Pró-labore',
  'Marketing/Anúncios',
  'Aporte Inicial',
  'Outros',
] as const;

const TYPE_LABELS: Record<string, string> = {
  ENTRADA: 'Entrada / Aporte',
  SAIDA: 'Saída / Despesa',
};

function todayLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function currentMonthRange(): { start: Date; end: Date } {
  const now = new Date();
  return {
    start: new Date(now.getFullYear(), now.getMonth(), 1),
    end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
  };
}

export default function FinanceiroScreen() {
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // form state
  const [type, setType] = useState<'ENTRADA' | 'SAIDA'>('SAIDA');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [date, setDate] = useState<string>(todayLocal());
  const [formError, setFormError] = useState('');

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    const device = getDeviceInfo();
    const { data, error } = await supabase
      .from('financial_transactions')
      .select('id, device_id, type, amount, description, category, transaction_date, created_at')
      .eq('device_id', device?.id ?? '')
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) console.error('Erro ao buscar transações:', error);
    setTransactions((data as FinancialTransaction[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const monthRange = useMemo(currentMonthRange, []);

  const monthTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const d = new Date(t.transaction_date + 'T00:00:00');
      return d >= monthRange.start && d <= monthRange.end;
    });
  }, [transactions, monthRange]);

  const monthEntradas = monthTransactions
    .filter((t) => t.type === 'ENTRADA')
    .reduce((s, t) => s + Number(t.amount), 0);
  const monthSaidas = monthTransactions
    .filter((t) => t.type === 'SAIDA')
    .reduce((s, t) => s + Number(t.amount), 0);
  const monthBalance = monthEntradas - monthSaidas;

  const parseAmount = (raw: string): number => {
    const cleaned = raw.replace(/\s/g, '').replace('R$', '').replace(/\./g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
  };

  const formatAmount = (raw: string): string => {
    const num = parseAmount(raw);
    if (num === 0 && raw.trim() === '') return '';
    return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const value = parseAmount(amount);
    if (!description.trim()) {
      setFormError('Informe uma descrição.');
      return;
    }
    if (value <= 0) {
      setFormError('Informe um valor válido.');
      return;
    }
    if (!date) {
      setFormError('Informe a data.');
      return;
    }

    setSubmitting(true);
    const device = getDeviceInfo();
    const { error } = await supabase.from('financial_transactions').insert({
      device_id: device?.id ?? null,
      type,
      amount: value,
      description: description.trim(),
      category,
      transaction_date: date,
    });

    if (error) {
      setFormError('Erro ao registrar movimentação. Tente novamente.');
      setSubmitting(false);
      return;
    }

    // reset form
    setType('SAIDA');
    setAmount('');
    setDescription('');
    setCategory(CATEGORIES[0]);
    setDate(todayLocal());
    setSubmitting(false);
    await fetchTransactions();
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const { error } = await supabase.from('financial_transactions').delete().eq('id', id);
    if (error) {
      console.error('Erro ao excluir transação:', error);
      alert('Erro ao excluir transação. Tente novamente.');
      setDeletingId(null);
      return;
    }
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    setDeletingId(null);
  };

  return (
    <div className="p-4 sm:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-teal/10 flex items-center justify-center">
          <Wallet className="w-5 h-5 text-brand-teal-dark dark:text-brand-teal-light" strokeWidth={2} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Financeiro</h2>
          <p className="text-xs text-slate-400">Registre entradas e saídas do seu caixa</p>
        </div>
      </div>

      {/* Month summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <SummaryCard
          label="Entradas (mês)"
          value={BRL(monthEntradas)}
          icon={ArrowDownCircle}
          tone="positive"
        />
        <SummaryCard
          label="Saídas (mês)"
          value={BRL(monthSaidas)}
          icon={ArrowUpCircle}
          tone="negative"
        />
        <SummaryCard
          label="Saldo (mês)"
          value={BRL(monthBalance)}
          icon={Wallet}
          tone={monthBalance >= 0 ? 'positive' : 'negative'}
        />
      </div>

      {/* Form */}
      <div className="rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm p-5">
        <h3 className="font-semibold text-slate-900 dark:text-white mb-4 text-sm">Nova movimentação</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Type */}
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Tipo</label>
              <div className="relative">
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as 'ENTRADA' | 'SAIDA')}
                  className="w-full appearance-none pl-3 pr-9 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-brand-teal cursor-pointer transition-all"
                >
                  <option value="SAIDA">Saída / Despesa</option>
                  <option value="ENTRADA">Entrada / Aporte</option>
                </select>
                <ChevronDownIcon />
              </div>
            </div>

            {/* Value */}
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Valor (R$)</label>
              <input
                value={amount}
                /*onChange={(e) => setAmount(formatAmount(e.target.value))}*/
                placeholder="0,00"
                inputMode="decimal"
                className="w-full px-3 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-brand-teal transition-all"
              />
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Data</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-brand-teal transition-all"
              />
            </div>

            {/* Description */}
            <div className="sm:col-span-2 lg:col-span-1">
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Descrição</label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex.: Compra de capas"
                className="w-full px-3 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-brand-teal transition-all"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Categoria</label>
              <div className="relative">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full appearance-none pl-3 pr-9 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-brand-teal cursor-pointer transition-all"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <ChevronDownIcon />
              </div>
            </div>
          </div>

          {formError && (
            <p className="text-xs text-red-500 dark:text-red-400">{formError}</p>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-brand-teal text-white font-medium text-sm shadow-sm hover:bg-brand-teal-dark disabled:opacity-60 transition-all active:scale-[0.98]"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2.5} /> : <Plus className="w-4 h-4" strokeWidth={2.5} />}
              {submitting ? 'Registrando...' : 'Registrar movimentação'}
            </button>
          </div>
        </form>
      </div>

      {/* Transactions table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Histórico do mês</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {monthTransactions.length} movimentação(ões) em {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : monthTransactions.length === 0 ? (
          <div className="py-12 text-center">
            <Wallet className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700 mb-2" strokeWidth={1.5} />
            <p className="text-sm text-slate-400">Nenhuma movimentação registrada neste mês.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/40 text-left">
                  <th className="px-4 py-2.5 text-xs font-medium text-slate-500 dark:text-slate-400">Tipo</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-slate-500 dark:text-slate-400">Descrição</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-slate-500 dark:text-slate-400 hidden sm:table-cell">Categoria</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-slate-500 dark:text-slate-400 hidden sm:table-cell">Data</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-slate-500 dark:text-slate-400 text-right">Valor</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-slate-500 dark:text-slate-400 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {monthTransactions.map((t) => {
                  const isEntrada = t.type === 'ENTRADA';
                  return (
                    <tr
                      key={t.id}
                      className="border-t border-slate-100 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                            isEntrada
                              ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
                              : 'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400'
                          }`}
                        >
                          {isEntrada ? <ArrowDownCircle className="w-3 h-3" /> : <ArrowUpCircle className="w-3 h-3" />}
                          {TYPE_LABELS[t.type]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-900 dark:text-white max-w-[200px] truncate">
                        {t.description}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400 hidden sm:table-cell">
                        {t.category}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400 hidden sm:table-cell">
                        {new Date(t.transaction_date + 'T00:00:00').toLocaleDateString('pt-BR')}
                      </td>
                      <td
                        className={`px-4 py-3 text-sm font-bold text-right ${
                          isEntrada
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-red-500 dark:text-red-400'
                        }`}
                      >
                        {isEntrada ? '+' : '-'} {BRL(Number(t.amount))}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDelete(t.id)}
                          disabled={deletingId === t.id}
                          title="Excluir"
                          className="w-7 h-7 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center justify-center transition-colors disabled:opacity-60 ml-auto"
                        >
                          {deletingId === t.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" strokeWidth={2} />
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: typeof Wallet;
  tone: 'positive' | 'negative';
}) {
  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
        <div
          className={`w-9 h-9 rounded-lg flex items-center justify-center ${
            tone === 'positive'
              ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
              : 'bg-red-100 dark:bg-red-950/40 text-red-500'
          }`}
        >
          <Icon className="w-4 h-4" strokeWidth={2} />
        </div>
      </div>
      <p
        className={`text-2xl font-bold ${
          tone === 'positive' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function ChevronDownIcon() {
  return (
    <svg
      className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}
