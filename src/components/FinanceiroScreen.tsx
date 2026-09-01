import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Wallet, ArrowDownCircle, ArrowUpCircle, Loader2, Trash2, Plus,
  Filter, RotateCcw, CalendarDays, CalendarRange, Calendar, ShoppingBag,
} from 'lucide-react';
import { supabase, type FinancialTransaction, type Sale } from '@/lib/supabase';
import { getDeviceInfo } from '@/lib/auth';
import { isDeviceReadOnlyNow } from '@/lib/readonly';

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

type FilterMode = 'mes' | 'dia' | 'periodo';

function todayLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function currentMonthString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function currentMonthRange(): { start: Date; end: Date } {
  const now = new Date();
  return {
    start: new Date(now.getFullYear(), now.getMonth(), 1),
    end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
  };
}

function computeDateRange(mode: FilterMode, day: string, month: string, start: string, end: string): { start: Date; end: Date } {
  if (mode === 'dia' && day) {
    const d = new Date(day + 'T00:00:00');
    return {
      start: d,
      end: new Date(day + 'T23:59:59.999'),
    };
  }
  if (mode === 'periodo' && start && end) {
    return {
      start: new Date(start + 'T00:00:00'),
      end: new Date(end + 'T23:59:59.999'),
    };
  }
  // mes (default)
  if (mode === 'mes' && month) {
    const [y, m] = month.split('-').map(Number);
    return {
      start: new Date(y, m - 1, 1),
      end: new Date(y, m, 0, 23, 59, 59, 999),
    };
  }
  return currentMonthRange();
}

function formatPeriodLabel(mode: FilterMode, range: { start: Date; end: Date }): string {
  if (mode === 'dia') {
    return range.start.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  }
  if (mode === 'periodo') {
    return `${range.start.toLocaleDateString('pt-BR')} a ${range.end.toLocaleDateString('pt-BR')}`;
  }
  return range.start.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

export default function FinanceiroScreen({ readOnly }: { readOnly?: boolean }) {
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // filter state
  const [filterMode, setFilterMode] = useState<FilterMode>('mes');
  const [filterDay, setFilterDay] = useState<string>(todayLocal());
  const [filterMonth, setFilterMonth] = useState<string>(currentMonthString());
  const [filterStart, setFilterStart] = useState<string>(todayLocal());
  const [filterEnd, setFilterEnd] = useState<string>(todayLocal());

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
    const [txRes, salesRes] = await Promise.all([
      supabase
        .from('financial_transactions')
        .select('id, device_id, type, amount, description, category, transaction_date, created_at')
        .eq('device_id', device?.id ?? '')
        .order('transaction_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(500),
      supabase
        .from('sales')
        .select('id, device_id, total_amount, payment_method, status, created_at')
        .eq('device_id', device?.id ?? '')
        .order('created_at', { ascending: false })
        .limit(500),
    ]);

    if (txRes.error) console.error('Erro ao buscar transações:', txRes.error);
    if (salesRes.error) console.error('Erro ao buscar vendas:', salesRes.error);

    setTransactions((txRes.data as FinancialTransaction[]) ?? []);
    setSales((salesRes.data as Sale[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const dateRange = useMemo(
    () => computeDateRange(filterMode, filterDay, filterMonth, filterStart, filterEnd),
    [filterMode, filterDay, filterMonth, filterStart, filterEnd],
  );

  const isDefaultFilter = filterMode === 'mes' && filterMonth === currentMonthString();

  const handleClearFilters = () => {
    setFilterMode('mes');
    setFilterMonth(currentMonthString());
    setFilterDay(todayLocal());
    setFilterStart(todayLocal());
    setFilterEnd(todayLocal());
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const d = new Date(t.transaction_date + 'T00:00:00');
      return d >= dateRange.start && d <= dateRange.end;
    });
  }, [transactions, dateRange]);

  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      if (s.status !== 'COMPLETED') return false;
      const d = new Date(s.created_at);
      return d >= dateRange.start && d <= dateRange.end;
    });
  }, [sales, dateRange]);

  const salesRevenue = filteredSales.reduce((s, x) => s + Number(x.total_amount), 0);

  const totalEntradas = filteredTransactions
    .filter((t) => t.type === 'ENTRADA')
    .reduce((s, t) => s + Number(t.amount), 0);
  const totalSaidas = filteredTransactions
    .filter((t) => t.type === 'SAIDA')
    .reduce((s, t) => s + Number(t.amount), 0);

  const aportesEntradas = totalEntradas;
  const totalIncome = salesRevenue + totalEntradas;

  // Saldo em Caixa é cumulativo — contabiliza todo o histórico, ignorando o filtro de período
  const allTimeSalesRevenue = useMemo(
    () => sales.filter((s) => s.status === 'COMPLETED').reduce((s, x) => s + Number(x.total_amount), 0),
    [sales],
  );
  const allTimeEntradas = useMemo(
    () => transactions.filter((t) => t.type === 'ENTRADA').reduce((s, t) => s + Number(t.amount), 0),
    [transactions],
  );
  const allTimeSaidas = useMemo(
    () => transactions.filter((t) => t.type === 'SAIDA').reduce((s, t) => s + Number(t.amount), 0),
    [transactions],
  );
  const cashBalance = allTimeSalesRevenue + allTimeEntradas - allTimeSaidas;

  type UnifiedTx = {
    id: string;
    type: 'ENTRADA' | 'SAIDA';
    typeLabel: string;
    description: string;
    category: string;
    date: string;
    amount: number;
    deletable: boolean;
  };

  const unifiedTransactions: UnifiedTx[] = useMemo(() => {
    const salesRows: UnifiedTx[] = filteredSales.map((s) => ({
      id: `sale-${s.id}`,
      type: 'ENTRADA' as const,
      typeLabel: 'Venda PDV',
      description: `Venda PDV · ${(s.payment_method ?? '—').toUpperCase()}`,
      category: 'Vendas',
      date: s.created_at,
      amount: Number(s.total_amount),
      deletable: false,
    }));

    const manualRows: UnifiedTx[] = filteredTransactions.map((t) => ({
      id: t.id,
      type: t.type,
      typeLabel: TYPE_LABELS[t.type] ?? t.type,
      description: t.description,
      category: t.category,
      date: t.transaction_date,
      amount: Number(t.amount),
      deletable: true,
    }));

    return [...salesRows, ...manualRows].sort((a, b) => {
      const da = new Date(a.date).getTime();
      const db = new Date(b.date).getTime();
      return db - da;
    });
  }, [filteredSales, filteredTransactions]);

  const parseAmount = (raw: string): number => {
    const cleaned = raw.replace(/\s/g, '').replace('R$', '').replace(/\./g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
  };

  const handleAmountChange = (raw: string) => {
    const cleaned = raw.replace(/[^0-9,.]/g, '');
    setAmount(cleaned);
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
    if (device?.id && await isDeviceReadOnlyNow(device.id)) {
      setFormError('Modo de leitura ativo. Movimentações estão suspensas.');
      setSubmitting(false);
      return;
    }
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

    setType('SAIDA');
    setAmount('');
    setDescription('');
    setCategory(CATEGORIES[0]);
    setDate(todayLocal());
    setSubmitting(false);
    await fetchTransactions();
  };

  const handleDelete = async (id: string) => {
    if (readOnly) return;
    setDeletingId(id);
    const device = getDeviceInfo();
    if (device?.id && await isDeviceReadOnlyNow(device.id)) {
      setDeletingId(null);
      return;
    }
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

  const periodLabel = formatPeriodLabel(filterMode, dateRange);

  const filterTabs: { mode: FilterMode; label: string; icon: typeof Calendar }[] = [
    { mode: 'mes', label: 'Mês/Ano', icon: Calendar },
    { mode: 'dia', label: 'Dia', icon: CalendarDays },
    { mode: 'periodo', label: 'Período', icon: CalendarRange },
  ];

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

      {/* Filter bar */}
      <div className="rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm p-4">
        <div className="flex flex-col lg:flex-row lg:items-end gap-4">
          {/* Filter mode tabs */}
          <div className="flex flex-col gap-1.5">
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">Período</label>
            <div className="inline-flex p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 gap-0.5">
              {filterTabs.map((tab) => {
                const active = filterMode === tab.mode;
                return (
                  <button
                    key={tab.mode}
                    onClick={() => setFilterMode(tab.mode)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                      active
                        ? 'bg-white dark:bg-slate-700 text-brand-teal-dark dark:text-brand-teal-light shadow-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                    }`}
                  >
                    <tab.icon className="w-3.5 h-3.5" strokeWidth={2} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Filter inputs */}
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filterMode === 'dia' && (
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Dia específico</label>
                <input
                  type="date"
                  value={filterDay}
                  onChange={(e) => setFilterDay(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-brand-teal transition-all"
                />
              </div>
            )}

            {filterMode === 'mes' && (
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Mês/Ano</label>
                <input
                  type="month"
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-brand-teal transition-all"
                />
              </div>
            )}

            {filterMode === 'periodo' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Data inicial</label>
                  <input
                    type="date"
                    value={filterStart}
                    onChange={(e) => setFilterStart(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-brand-teal transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Data final</label>
                  <input
                    type="date"
                    value={filterEnd}
                    onChange={(e) => setFilterEnd(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-brand-teal transition-all"
                  />
                </div>
              </>
            )}
          </div>

          {/* Clear filters */}
          <div className="flex items-end">
            <button
              onClick={handleClearFilters}
              disabled={isDefaultFilter}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98] whitespace-nowrap"
            >
              <RotateCcw className="w-4 h-4" strokeWidth={2} />
              Limpar Filtros
            </button>
          </div>
        </div>

        {/* Active period indicator */}
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 text-xs text-slate-400">
          <Filter className="w-3.5 h-3.5" strokeWidth={2} />
          <span>Exibindo dados de: <span className="font-medium text-slate-600 dark:text-slate-300">{periodLabel}</span></span>
        </div>
      </div>

      {/* Resumo */}
      <div>
        <h3 className="font-semibold text-slate-900 dark:text-white text-sm mb-3">Resumo</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <SummaryCard
            label="Saldo em Caixa"
            value={BRL(cashBalance)}
            icon={Wallet}
            tone={cashBalance >= 0 ? 'positive' : 'negative'}
          />
          <SummaryCard
            label="Aportes/Entradas"
            value={BRL(aportesEntradas)}
            icon={ArrowDownCircle}
            tone="positive"
          />
          <SummaryCard
            label="Vendas"
            value={BRL(salesRevenue)}
            icon={ShoppingBag}
            tone="positive"
          />
          <SummaryCard
            label="Entrada Total"
            value={BRL(totalIncome)}
            icon={ArrowDownCircle}
            tone="positive"
          />
          <SummaryCard
            label="Saída"
            value={BRL(totalSaidas)}
            icon={ArrowUpCircle}
            tone="negative"
          />
          <SummaryCard
            label="Resumo"
            value={BRL(totalIncome - totalSaidas)}
            icon={Wallet}
            tone={(totalIncome - totalSaidas) >= 0 ? 'positive' : 'negative'}
          />
        </div>
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
                onChange={(e) => handleAmountChange(e.target.value)}
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
              disabled={submitting || readOnly}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-brand-teal text-white font-medium text-sm shadow-sm hover:bg-brand-teal-dark disabled:opacity-60 transition-all active:scale-[0.98]"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2.5} /> : <Plus className="w-4 h-4" strokeWidth={2.5} />}
              {submitting ? 'Registrando...' : 'Registrar movimentação'}
            </button>
          </div>
        </form>
      </div>

      {/* Transações Financeiras table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Transações Financeiras</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {unifiedTransactions.length} transação(ões) · {periodLabel}
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : unifiedTransactions.length === 0 ? (
          <div className="py-12 text-center">
            <Wallet className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700 mb-2" strokeWidth={1.5} />
            <p className="text-sm text-slate-400">Nenhuma transação registrada no período selecionado.</p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0 z-10">
                <tr className="bg-slate-50 dark:bg-slate-800/80 text-left backdrop-blur">
                  <th className="px-4 py-2.5 text-xs font-medium text-slate-500 dark:text-slate-400">Tipo</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-slate-500 dark:text-slate-400">Descrição</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-slate-500 dark:text-slate-400 hidden sm:table-cell">Categoria</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-slate-500 dark:text-slate-400 hidden sm:table-cell">Data</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-slate-500 dark:text-slate-400 text-right">Valor</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-slate-500 dark:text-slate-400 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {unifiedTransactions.map((t) => {
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
                          {t.typeLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-900 dark:text-white max-w-[220px] truncate">
                        {t.description}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400 hidden sm:table-cell">
                        {t.category}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400 hidden sm:table-cell">
                        {new Date(t.date).toLocaleDateString('pt-BR')}
                      </td>
                      <td
                        className={`px-4 py-3 text-sm font-bold text-right ${
                          isEntrada
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-red-500 dark:text-red-400'
                        }`}
                      >
                        {isEntrada ? '+' : '-'} {BRL(t.amount)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {t.deletable ? (
                          <button
                            onClick={() => handleDelete(t.id)}
                            disabled={deletingId === t.id || readOnly}
                            title="Excluir"
                            className="w-7 h-7 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center justify-center transition-colors disabled:opacity-60 ml-auto"
                          >
                            {deletingId === t.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" strokeWidth={2} />
                            )}
                          </button>
                        ) : (
                          <span className="text-xs text-slate-300 dark:text-slate-700">—</span>
                        )}
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
