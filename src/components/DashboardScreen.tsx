import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  TrendingUp, ShoppingBag, DollarSign, Receipt, Loader2, Calendar,
  Printer, Ban, Filter, ChevronDown, X, CheckCircle2, XCircle,
  Wallet, ArrowDownCircle, ArrowUpCircle,
} from 'lucide-react';
import { supabase, type Sale, type SaleItem, type FinancialTransaction } from '@/lib/supabase';
import { getDeviceInfo } from '@/lib/auth';
import ReceiptModal, { type ReceiptData } from '@/components/ReceiptModal';

const BRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const PAYMENT_LABELS: Record<string, string> = {
  PIX: 'PIX',
  DINHEIRO: 'Dinheiro',
  CARTAO_CREDITO: 'Cartão Crédito',
  CARTAO_DEBITO: 'Cartão Débito',
};

type PeriodMode = 'today' | 'week' | 'month' | 'range' | 'all';
type PaymentFilter = 'ALL' | 'PIX' | 'DINHEIRO' | 'CARTAO_CREDITO' | 'CARTAO_DEBITO';

function toLocalDateInput(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export default function DashboardScreen() {
  const [allSales, setAllSales] = useState<Sale[]>([]);
  const [allWorkOrders, setAllWorkOrders] = useState<{ total_amount: number; status: string; created_at: string }[]>([]);
  const [allTransactions, setAllTransactions] = useState<FinancialTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodMode>('all');
  const [refDate, setRefDate] = useState<string>(toLocalDateInput(new Date()));
  const [rangeStart, setRangeStart] = useState<string>(toLocalDateInput(new Date()));
  const [rangeEnd, setRangeEnd] = useState<string>(toLocalDateInput(new Date()));
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('ALL');
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<Sale | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const device = getDeviceInfo();
    const deviceId = device?.id ?? '';

    const [salesRes, txRes] = await Promise.all([
      supabase
        .from('sales')
        .select('id, device_id, subtotal, discount_type, discount_value, total_amount, payment_method, notes, status, created_at')
        .eq('device_id', deviceId)
        .order('created_at', { ascending: false })
        .limit(500),
      supabase
        .from('financial_transactions')
        .select('id, device_id, type, amount, description, category, transaction_date, created_at')
        .eq('device_id', deviceId)
        .order('transaction_date', { ascending: false })
        .limit(500),
    ]);

    if (salesRes.error) console.error('Erro ao buscar vendas:', salesRes.error);
    if (txRes.error) console.error('Erro ao buscar transações:', txRes.error);

    setAllSales((salesRes.data as Sale[]) ?? []);
    setAllTransactions((txRes.data as FinancialTransaction[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Period range
  const { from, to } = useMemo(() => {
    const now = new Date();
    if (period === 'today') {
      const d = new Date(refDate + 'T00:00:00');
      return { from: startOfDay(d), to: endOfDay(d) };
    }
    if (period === 'week') {
      const d = new Date(refDate + 'T00:00:00');
      const day = d.getDay(); // 0 = Sunday
      const start = new Date(d);
      start.setDate(d.getDate() - day);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      return { from: start, to: end };
    }
    if (period === 'month') {
      const d = new Date(refDate + 'T00:00:00');
      return {
        from: new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0),
        to: new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999),
      };
    }
    if (period === 'range') {
      const s = new Date(rangeStart + 'T00:00:00');
      const e = new Date(rangeEnd + 'T23:59:59');
      return { from: startOfDay(s), to: endOfDay(e) };
    }
    return { from: new Date(0), to: now };
  }, [period, refDate, rangeStart, rangeEnd]);

  const filteredSales = useMemo(() => {
    return allSales.filter((s) => {
      const created = new Date(s.created_at);
      if (created < from || created > to) return false;
      if (paymentFilter !== 'ALL' && s.payment_method !== paymentFilter) return false;
      return true;
    });
  }, [allSales, from, to, paymentFilter]);

  const filteredTransactions = useMemo(() => {
    return allTransactions.filter((t) => {
      const d = new Date(t.transaction_date + 'T00:00:00');
      return d >= from && d <= to;
    });
  }, [allTransactions, from, to]);

  const completed = filteredSales.filter((s) => s.status === 'COMPLETED');
  const cancelled = filteredSales.filter((s) => s.status === 'CANCELLED');

  // Financial metrics
  const totalRevenue = completed.reduce((s, x) => s + Number(x.total_amount), 0);
  const totalExpenses = filteredTransactions
    .filter((t) => t.type === 'SAIDA')
    .reduce((s, t) => s + Number(t.amount), 0);
  const totalAportes = filteredTransactions
    .filter((t) => t.type === 'ENTRADA')
    .reduce((s, t) => s + Number(t.amount), 0);
  const cashBalance = totalRevenue + totalAportes - totalExpenses;

  const cancelledValue = cancelled.reduce((s, x) => s + Number(x.total_amount), 0);
  const avgTicket = completed.length > 0 ? totalRevenue / completed.length : 0;

  const byMethod = completed.reduce<Record<string, number>>((acc, s) => {
    acc[s.payment_method] = (acc[s.payment_method] ?? 0) + Number(s.total_amount);
    return acc;
  }, {});
  const maxMethod = Math.max(...Object.values(byMethod), 1);

  const openReceipt = async (sale: Sale) => {
    const { data: items } = await supabase
      .from('sale_items')
      .select('id, sale_id, product_id, product_name, quantity, unit_price, subtotal, created_at')
      .eq('sale_id', sale.id);
    setReceipt({
      sale,
      items: (items as SaleItem[]) ?? [],
      device: getDeviceInfo() ?? null,
    });
  };

  const handleCancel = async (sale: Sale) => {
    setCancellingId(sale.id);
    try {
      const { data: items, error: itemsError } = await supabase
        .from('sale_items')
        .select('product_id, quantity')
        .eq('sale_id', sale.id);

      if (itemsError) throw itemsError;

      if (items && items.length > 0) {
        for (const it of items) {
          const { error: rpcError } = await supabase.rpc('increment_product_stock', {
            p_product_id: it.product_id,
            p_qty: it.quantity,
          });

          if (rpcError) {
            const { data: prod } = await supabase
              .from('products')
              .select('stock')
              .eq('id', it.product_id)
              .maybeSingle();

            if (prod) {
              const { error: updateStockErr } = await supabase
                .from('products')
                .update({ stock: (prod.stock ?? 0) + it.quantity })
                .eq('id', it.product_id);

              if (updateStockErr) console.error('Erro ao atualizar estoque:', updateStockErr);
            }
          }
        }
      }

      const deviceId = getDeviceInfo()?.id ?? '';
      const { error: updateSaleError } = await supabase
        .from('sales')
        .update({ status: 'CANCELLED' })
        .eq('id', sale.id)
        .eq('device_id', deviceId);

      if (updateSaleError) throw updateSaleError;

      await fetchAll();
      setConfirmCancel(null);
    } catch (err: any) {
      console.error('Erro detalhado ao cancelar venda:', err);
      alert(`Erro ao cancelar venda: ${err.message || 'Verifique o console'}`);
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-4">
      {/* Filters */}
      <div className="rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-brand-teal-dark dark:text-brand-teal-light" strokeWidth={2} />
          <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Filtros</h3>
        </div>
        <div className="flex flex-col lg:flex-row gap-3 flex-wrap">
          {/* Period mode */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex-wrap">
            {([
              { id: 'all', label: 'Tudo' },
              { id: 'today', label: 'Hoje' },
              { id: 'week', label: '7 dias' },
              { id: 'month', label: 'Mês' },
              { id: 'range', label: 'Período' },
            ] as { id: PeriodMode; label: string }[]).map((opt) => (
              <button
                key={opt.id}
                onClick={() => setPeriod(opt.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  period === opt.id
                    ? 'bg-white dark:bg-slate-900 text-brand-teal-dark dark:text-brand-teal-light shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Date inputs */}
          {(period === 'today' || period === 'week' || period === 'month') && (
            <DateInput label="Data" value={refDate} onChange={setRefDate} />
          )}
          {period === 'range' && (
            <>
              <DateInput label="De" value={rangeStart} onChange={setRangeStart} />
              <DateInput label="Até" value={rangeEnd} onChange={setRangeEnd} />
            </>
          )}

          {/* Payment filter */}
          <div className="relative">
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value as PaymentFilter)}
              className="appearance-none pl-3 pr-9 py-2 rounded-lg bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-brand-teal cursor-pointer"
            >
              <option value="ALL">Todas as formas</option>
              <option value="PIX">PIX</option>
              <option value="DINHEIRO">Dinheiro</option>
              <option value="CARTAO_CREDITO">Cartão Crédito</option>
              <option value="CARTAO_DEBITO">Cartão Débito</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>

          {(period !== 'all' || paymentFilter !== 'ALL') && (
            <button
              onClick={() => {
                setPeriod('all');
                setPaymentFilter('ALL');
              }}
              className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-red-500 transition-colors"
            >
              <X className="w-3.5 h-3.5" /> Limpar filtros
            </button>
          )}
        </div>
      </div>

      {/* KPIs - Financial metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="Faturamento Bruto" value={BRL(totalRevenue)} icon={DollarSign} sub={cancelledValue > 0 ? `${BRL(cancelledValue)} canceladas` : undefined} />
        <Kpi label="Total Saídas" value={BRL(totalExpenses)} icon={ArrowUpCircle} danger />
        <Kpi
          label="Saldo em Caixa"
          value={BRL(cashBalance)}
          icon={Wallet}
          tone={cashBalance >= 0 ? 'positive' : 'negative'}
        />
        <Kpi label="Ticket Médio" value={BRL(avgTicket)} icon={Receipt} />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MiniStat label="Vendas realizadas" value={String(completed.length)} icon={ShoppingBag} />
        <MiniStat label="Vendas canceladas" value={String(cancelled.length)} icon={XCircle} danger />
        <MiniStat label="Aportes/Entradas" value={BRL(totalAportes)} icon={ArrowDownCircle} positive />
        <MiniStat label="Transações fin." value={String(filteredTransactions.length)} icon={Wallet} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Payment methods */}
        <div className="rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm p-5">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Vendas por Forma de Pagamento</h3>
          {Object.keys(byMethod).length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">Nenhuma venda registrada no período.</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(byMethod).map(([method, value]) => (
                <div key={method}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600 dark:text-slate-300">{PAYMENT_LABELS[method] ?? method}</span>
                    <span className="font-medium text-slate-900 dark:text-white">{BRL(value)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-brand-teal-light to-brand-teal-dark transition-all"
                      style={{ width: `${(value / maxMethod) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent sales */}
        <div className="rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm p-5">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Vendas Recentes</h3>
          {loading ? (
            <div className="flex items-center justify-center py-8 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : filteredSales.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">Nenhuma venda no período selecionado.</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {filteredSales.slice(0, 30).map((s) => {
                const isCancelled = s.status === 'CANCELLED';
                return (
                  <div
                    key={s.id}
                    className={`flex items-center gap-2.5 p-2.5 rounded-lg border transition-colors ${
                      isCancelled
                        ? 'bg-red-50/50 dark:bg-red-950/20 border-red-200/60 dark:border-red-900/40'
                        : 'bg-slate-50 dark:bg-slate-800/40 border-transparent'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isCancelled
                          ? 'bg-red-100 dark:bg-red-950/40'
                          : 'bg-brand-teal/10'
                      }`}
                    >
                      {isCancelled ? (
                        <XCircle className="w-4 h-4 text-red-500" strokeWidth={2} />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-brand-teal-dark dark:text-brand-teal-light" strokeWidth={2} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-slate-900 dark:text-white truncate">
                        #{s.id.slice(0, 8)} · {PAYMENT_LABELS[s.payment_method] ?? s.payment_method}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {new Date(s.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                      </p>
                    </div>
                    <span
                      className={`text-sm font-bold ${
                        isCancelled
                          ? 'text-red-500 dark:text-red-400 line-through'
                          : 'text-brand-teal-dark dark:text-brand-teal-light'
                      }`}
                    >
                      {BRL(Number(s.total_amount))}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openReceipt(s)}
                        title="Reimprimir cupom"
                        className="w-7 h-7 rounded-lg text-slate-400 hover:text-brand-teal-dark dark:hover:text-brand-teal-light hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors"
                      >
                        <Printer className="w-3.5 h-3.5" strokeWidth={2} />
                      </button>
                      {!isCancelled && (
                        <button
                          onClick={() => setConfirmCancel(s)}
                          title="Cancelar venda"
                          className="w-7 h-7 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center justify-center transition-colors"
                        >
                          <Ban className="w-3.5 h-3.5" strokeWidth={2} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {receipt && (
        <ReceiptModal data={receipt} onClose={() => setReceipt(null)} />
      )}

      {confirmCancel && (
        <ConfirmCancelModal
          sale={confirmCancel}
          onCancel={() => setConfirmCancel(null)}
          onConfirm={() => handleCancel(confirmCancel)}
          loading={cancellingId === confirmCancel.id}
        />
      )}
    </div>
  );
}

function DateInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
      <span className="text-xs font-medium">{label}</span>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-brand-teal"
      />
    </label>
  );
}

function Kpi({
  label,
  value,
  icon: Icon,
  sub,
  danger,
  tone,
}: {
  label: string;
  value: string;
  icon: typeof DollarSign;
  sub?: string;
  danger?: boolean;
  tone?: 'positive' | 'negative';
}) {
  const isPositive = tone === 'positive';
  const isNegative = tone === 'negative';
  return (
    <div
      className={`rounded-2xl border shadow-sm p-4 transition-colors ${
        isPositive
          ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50'
          : isNegative
            ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/50'
            : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
        <div
          className={`w-9 h-9 rounded-lg flex items-center justify-center ${
            isPositive
              ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
              : isNegative
                ? 'bg-red-100 dark:bg-red-950/40 text-red-500'
                : danger
                  ? 'bg-red-100 dark:bg-red-950/40 text-red-500'
                  : 'bg-brand-teal/10 text-brand-teal-dark dark:text-brand-teal-light'
          }`}
        >
          <Icon className="w-4 h-4" strokeWidth={2} />
        </div>
      </div>
      <p
        className={`text-2xl font-bold ${
          isPositive
            ? 'text-emerald-600 dark:text-emerald-400'
            : isNegative
              ? 'text-red-500 dark:text-red-400'
              : danger
                ? 'text-red-500 dark:text-red-400'
                : 'text-slate-900 dark:text-white'
        }`}
      >
        {value}
      </p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">({sub})</p>}
    </div>
  );
}

function MiniStat({
  label,
  value,
  icon: Icon,
  danger,
  positive,
}: {
  label: string;
  value: string;
  icon: typeof DollarSign;
  danger?: boolean;
  positive?: boolean;
}) {
  return (
    <div className="rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm p-3 flex items-center gap-3">
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
          danger
            ? 'bg-red-100 dark:bg-red-950/40 text-red-500'
            : positive
              ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
              : 'bg-brand-teal/10 text-brand-teal-dark dark:text-brand-teal-light'
        }`}
      >
        <Icon className="w-4 h-4" strokeWidth={2} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{label}</p>
        <p
          className={`text-sm font-bold ${
            danger
              ? 'text-red-500 dark:text-red-400'
              : positive
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-slate-900 dark:text-white'
          }`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function ConfirmCancelModal({
  sale,
  onCancel,
  onConfirm,
  loading,
}: {
  sale: Sale;
  onCancel: () => void;
  onConfirm: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-red-100 dark:bg-red-950/40 flex items-center justify-center">
            <Ban className="w-5 h-5 text-red-500" strokeWidth={2} />
          </div>
          <h3 className="font-semibold text-slate-900 dark:text-white">Cancelar Venda</h3>
        </div>
        <div className="p-5">
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">
            Tem certeza que deseja cancelar a venda <span className="font-mono font-medium">#{sale.id.slice(0, 8)}</span>?
          </p>
          <p className="text-xs text-slate-400">
            O valor de {BRL(Number(sale.total_amount))} será descontado do faturamento e o estoque dos itens será restaurado. O registro da venda não será removido, apenas marcado como cancelada.
          </p>
          <div className="flex gap-2 mt-5">
            <button
              onClick={onCancel}
              disabled={loading}
              className="flex-1 py-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              Manter venda
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-red-500 text-white font-medium text-sm shadow-sm hover:bg-red-600 disabled:opacity-60 transition-all active:scale-[0.98]"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2.5} /> : <Ban className="w-4 h-4" strokeWidth={2.5} />}
              {loading ? 'Cancelando...' : 'Cancelar venda'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
