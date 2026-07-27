import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search, Plus, Minus, Trash2, ShoppingCart, Tag, CreditCard,
  Banknote, QrCode, Wallet, Loader2, CheckCircle2, X, Receipt, Percent, StickyNote, PlusCircle,
} from 'lucide-react';
import { supabase, type Product, type PaymentMethod, type SaleItem, type Sale } from '@/lib/supabase';
import { getDeviceInfo } from '@/lib/auth';
import { CategoryIcon } from '@/components/CategoryIcon';
import ReceiptModal, { type ReceiptData } from '@/components/ReceiptModal';

type CartItem = {
  product: Product;
  quantity: number;
};

const PAYMENT_METHODS: { id: PaymentMethod; label: string; icon: typeof CreditCard }[] = [
  { id: 'PIX', label: 'PIX', icon: QrCode },
  { id: 'DINHEIRO', label: 'Dinheiro', icon: Banknote },
  { id: 'CARTAO_CREDITO', label: 'Crédito', icon: CreditCard },
  { id: 'CARTAO_DEBITO', label: 'Débito', icon: Wallet },
];

const BRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function PDVScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountType, setDiscountType] = useState<'fixed' | 'percentage'>('fixed');
  const [discountValue, setDiscountValue] = useState<string>('');
  const [additionalAmount, setAdditionalAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [lastSale, setLastSale] = useState<{ id: string; total: number } | null>(null);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [error, setError] = useState('');

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('id, name, price, stock, category, created_at')
      .order('name');
    if (error) {
      setError('Não foi possível carregar os produtos.');
      setProducts([]);
    } else {
      setProducts((data as Product[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category));
    return ['all', ...Array.from(set)];
  }, [products]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      const matchCat = category === 'all' || p.category === category;
      const matchSearch = !q || p.name.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [products, search, category]);

  const subtotal = useMemo(
    () => cart.reduce((sum, i) => sum + i.product.price * i.quantity, 0),
    [cart]
  );

  const discount = useMemo(() => {
    const raw = parseFloat(discountValue.replace(',', '.')) || 0;
    if (discountType === 'percentage') {
      return Math.min(subtotal * (raw / 100), subtotal);
    }
    return Math.min(raw, subtotal);
  }, [discountValue, discountType, subtotal]);

  const additional = useMemo(
    () => Math.max(parseFloat(additionalAmount.replace(',', '.')) || 0, 0),
    [additionalAmount]
  );

  const total = Math.max(subtotal - discount + additional, 0);

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return prev;
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      if (product.stock <= 0) return prev;
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.product.id !== id) return i;
          const next = i.quantity + delta;
          if (next > i.product.stock) return i;
          return { ...i, quantity: next };
        })
        .filter((i) => i.quantity > 0)
    );
  };

  const removeItem = (id: string) => {
    setCart((prev) => prev.filter((i) => i.product.id !== id));
  };

  const clearCart = () => {
    setCart([]);
    setDiscountValue('');
    setAdditionalAmount('');
    setNotes('');
    setLastSale(null);
  };

  const finalizeSale = async () => {
    if (cart.length === 0) return;
    setSubmitting(true);
    setError('');
    const device = getDeviceInfo();

    try {
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert({
          device_id: device?.id ?? null,
          subtotal,
          discount_type: discountType,
          discount_value: discount,
          additional_amount: additional,
          total_amount: total,
          payment_method: paymentMethod,
          notes: notes.trim() || null,
          status: 'COMPLETED',
        })
        .select('id, total_amount')
        .single();

      if (saleError) throw saleError;

      const items: Omit<SaleItem, 'id' | 'created_at'>[] = cart.map((i) => ({
        sale_id: sale.id,
        product_id: i.product.id,
        product_name: i.product.name,
        quantity: i.quantity,
        unit_price: i.product.price,
        subtotal: i.product.price * i.quantity,
      }));

      const { error: itemsError } = await supabase.from('sale_items').insert(items);
      if (itemsError) throw itemsError;

      await Promise.all(
        cart.map((i) =>
          supabase
            .from('products')
            .update({ stock: Math.max(i.product.stock - i.quantity, 0) })
            .eq('id', i.product.id)
        )
      );

      setLastSale({ id: sale.id, total: sale.total_amount });

      const { data: fullSale } = await supabase
        .from('sales')
        .select('id, device_id, subtotal, discount_type, discount_value, additional_amount, total_amount, payment_method, notes, status, created_at')
        .eq('id', sale.id)
        .maybeSingle();
      const { data: saleItems } = await supabase
        .from('sale_items')
        .select('id, sale_id, product_id, product_name, quantity, unit_price, subtotal, created_at')
        .eq('sale_id', sale.id);
      if (fullSale && saleItems) {
        setReceipt({
          sale: fullSale as Sale,
          items: saleItems as SaleItem[],
          deviceName: getDeviceInfo()?.device_name ?? null,
        });
      }

      setCart([]);
      setDiscountValue('');
      setAdditionalAmount('');
      setNotes('');
      fetchProducts();
    } catch {
      setError('Falha ao registrar a venda. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 p-4 sm:p-6 h-[calc(100vh-4rem)]">
      {/* Products panel */}
      <div className="flex-1 flex flex-col min-h-0 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" strokeWidth={2} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar produto..."
              className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-transparent focus:border-brand-teal focus:bg-white dark:focus:bg-slate-900 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none transition-all"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  category === c
                    ? 'bg-brand-teal text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {c === 'all' ? 'Todos' : c}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
              <Search className="w-8 h-8" strokeWidth={1.5} />
              <p className="text-sm">Nenhum produto encontrado.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filtered.map((p) => {
                const out = p.stock <= 0;
                return (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    disabled={out}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      out
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:bg-brand-teal/5 dark:hover:bg-brand-teal/10'
                    }`}
                  >
                    <CategoryIcon category={p.category} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                        {p.name}
                      </p>
                      <p className="text-[11px] text-slate-400">{p.category}</p>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${out ? 'bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                      {out ? 'Sem estoque' : `${p.stock} un`}
                    </span>
                    <span className="text-sm font-bold text-brand-teal-dark dark:text-brand-teal-light w-20 text-right shrink-0">
                      {BRL(p.price)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Cart panel */}
      <div className="lg:w-[380px] xl:w-[420px] flex flex-col min-h-0 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Cart header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-brand-teal-dark dark:text-brand-teal-light" strokeWidth={2} />
            <h2 className="font-semibold text-slate-900 dark:text-white">Carrinho</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-brand-teal/10 text-brand-teal-dark dark:text-brand-teal-light">
              {cart.reduce((s, i) => s + i.quantity, 0)} itens
            </span>
          </div>
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="text-xs text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" /> Limpar
            </button>
          )}
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto p-3">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
              <ShoppingCart className="w-10 h-10" strokeWidth={1.2} />
              <p className="text-sm">Selecione produtos para iniciar a venda.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {cart.map((item) => (
                <div
                  key={item.product.id}
                  className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 animate-slideUp"
                >
                  <CategoryIcon category={item.product.category} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                      {item.product.name}
                    </p>
                    <p className="text-xs text-slate-500">{BRL(item.product.price)} / un</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => updateQty(item.product.id, -1)}
                      className="w-7 h-7 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
                    >
                      <Minus className="w-3.5 h-3.5" strokeWidth={2.5} />
                    </button>
                    <span className="w-7 text-center text-sm font-semibold text-slate-900 dark:text-white">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQty(item.product.id, 1)}
                      disabled={item.quantity >= item.product.stock}
                      className="w-7 h-7 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
                    </button>
                  </div>
                  <div className="text-right w-20">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      {BRL(item.product.price * item.quantity)}
                    </p>
                  </div>
                  <button
                    onClick={() => removeItem(item.product.id)}
                    className="text-slate-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" strokeWidth={2} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Summary + checkout */}
        <div className="border-t border-slate-200 dark:border-slate-800 p-4 space-y-3 bg-slate-50/50 dark:bg-slate-900/40">
          {/* Notes */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
              <StickyNote className="w-3.5 h-3.5" />
              Observação no cupom
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Ex.: Cliente retirou na loja, sem embalagem..."
              className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-brand-teal resize-none transition-all"
            />
          </div>

          {/* Additional fee + Discount */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                <PlusCircle className="w-3 h-3" /> Taxa / Valor adicional
              </label>
              <input
                value={additionalAmount}
                onChange={(e) => setAdditionalAmount(e.target.value)}
                placeholder="0,00"
                inputMode="decimal"
                className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-brand-teal"
              />
            </div>
            <div>
              <label className="flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                <Tag className="w-3 h-3" /> Desconto
              </label>
              <div className="flex gap-1">
                <div className="flex rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                  <button
                    onClick={() => setDiscountType('fixed')}
                    className={`px-2 py-1.5 text-xs font-medium ${discountType === 'fixed' ? 'bg-brand-teal text-white' : 'bg-white dark:bg-slate-800 text-slate-500'}`}
                  >
                    <Tag className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDiscountType('percentage')}
                    className={`px-2 py-1.5 text-xs font-medium ${discountType === 'percentage' ? 'bg-brand-teal text-white' : 'bg-white dark:bg-slate-800 text-slate-500'}`}
                  >
                    <Percent className="w-3.5 h-3.5" />
                  </button>
                </div>
                <input
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  placeholder={discountType === 'fixed' ? 'R$' : '%'}
                  className="flex-1 min-w-0 px-2 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-brand-teal"
                />
              </div>
            </div>
          </div>

          {/* Totals */}
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between text-slate-500 dark:text-slate-400">
              <span>Subtotal</span>
              <span>{BRL(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                <span>Desconto</span>
                <span>- {BRL(discount)}</span>
              </div>
            )}
            {additional > 0 && (
              <div className="flex justify-between text-amber-600 dark:text-amber-400">
                <span>Taxa adicional</span>
                <span>+ {BRL(additional)}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-1.5 border-t border-slate-200 dark:border-slate-700">
              <span className="font-semibold text-slate-900 dark:text-white">Total</span>
              <span className="text-xl font-bold text-brand-teal-dark dark:text-brand-teal-light">
                {BRL(total)}
              </span>
            </div>
          </div>

          {/* Payment methods */}
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Forma de pagamento</p>
            <div className="grid grid-cols-4 gap-1.5">
              {PAYMENT_METHODS.map((m) => {
                const Icon = m.icon;
                const active = paymentMethod === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setPaymentMethod(m.id)}
                    className={`flex flex-col items-center gap-1 py-2 rounded-lg text-[10px] font-medium transition-all ${
                      active
                        ? 'bg-brand-teal text-white shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-brand-teal'
                    }`}
                  >
                    <Icon className="w-4 h-4" strokeWidth={2} />
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-500 bg-red-50 dark:bg-red-950/30 p-2 rounded-lg">{error}</p>
          )}

          {lastSale && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" strokeWidth={2} />
              <p className="text-xs text-emerald-700 dark:text-emerald-300 flex-1">
                Venda #{lastSale.id.slice(0, 8)} concluída — {BRL(lastSale.total)}
              </p>
              {receipt && (
                <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <Receipt className="w-3.5 h-3.5" /> Cupom aberto
                </span>
              )}
            </div>
          )}

          <button
            onClick={finalizeSale}
            disabled={cart.length === 0 || submitting}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-brand-teal-light to-brand-teal-dark text-white font-semibold text-sm shadow-lg shadow-brand-teal/25 hover:shadow-brand-teal/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2.5} />
                Processando...
              </>
            ) : (
              <>
                <Receipt className="w-4 h-4" strokeWidth={2.5} />
                Finalizar Venda
              </>
            )}
          </button>
        </div>
      </div>

      {receipt && (
        <ReceiptModal
          data={receipt}
          onClose={() => {
            setReceipt(null);
            setLastSale(null);
          }}
        />
      )}
    </div>
  );
}
