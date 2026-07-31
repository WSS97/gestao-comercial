import { useState, useEffect, useCallback } from 'react';
import {
  Search, Package, Plus, Loader2, AlertTriangle, Edit3, X, Check, AlertCircle,
} from 'lucide-react';
import { supabase, type Product } from '@/lib/supabase';
import { getDeviceInfo } from '@/lib/auth';
import { CategoryIcon, CATEGORIES } from '@/components/CategoryIcon';

const BRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function EstoqueScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Product | null>(null);
  const [editStock, setEditStock] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [saving, setSaving] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const device = getDeviceInfo();
    const { data } = await supabase
      .from('products')
      .select('id, name, price, stock, category, device_id, created_at')
      .eq('device_id', device?.id ?? '')
      .order('name');
    setProducts((data as Product[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.trim().toLowerCase())
  );

  const lowStock = products.filter((p) => p.stock <= 5).length;
  const totalItems = products.reduce((s, p) => s + p.stock, 0);
  const stockValue = products.reduce((s, p) => s + p.price * p.stock, 0);

  const startEdit = (p: Product) => {
    setEditing(p);
    setEditStock(String(p.stock));
    setEditPrice(String(p.price));
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    const newStock = parseInt(editStock, 10);
    const newPrice = parseFloat(editPrice.replace(',', '.'));
    if (Number.isNaN(newStock) || Number.isNaN(newPrice)) {
      setSaving(false);
      return;
    }
    await supabase
      .from('products')
      .update({ stock: newStock, price: newPrice })
      .eq('id', editing.id);
    setProducts((prev) =>
      prev.map((p) => (p.id === editing.id ? { ...p, stock: newStock, price: newPrice } : p))
    );
    setEditing(null);
    setSaving(false);
  };

  return (
    <div className="p-4 sm:p-6 space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard label="Produtos cadastrados" value={String(products.length)} icon={Package} />
        <StatCard label="Itens em estoque" value={String(totalItems)} icon={Package} />
        <StatCard
          label="Estoque baixo"
          value={String(lowStock)}
          icon={AlertTriangle}
          highlight={lowStock > 0}
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" strokeWidth={2} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar produto..."
            className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-brand-teal transition-all"
          />
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-teal text-white font-medium text-sm shadow-sm hover:bg-brand-teal-dark transition-all active:scale-[0.98] whitespace-nowrap"
        >
          <Plus className="w-4 h-4" strokeWidth={2.5} />
          Cadastrar Produto
        </button>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <th className="px-4 py-3 font-medium">Produto</th>
                  <th className="px-4 py-3 font-medium">Categoria</th>
                  <th className="px-4 py-3 font-medium text-right">Preço</th>
                  <th className="px-4 py-3 font-medium text-right">Estoque</th>
                  <th className="px-4 py-3 font-medium text-right">Valor</th>
                  <th className="px-4 py-3 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const low = p.stock <= 5;
                  const isEditing = editing?.id === p.id;
                  return (
                    <tr
                      key={p.id}
                      className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <CategoryIcon category={p.category} size="sm" />
                          <span className="font-medium text-slate-900 dark:text-white">{p.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{p.category}</td>
                      <td className="px-4 py-3 text-right text-slate-900 dark:text-white">
                        {isEditing ? (
                          <input
                            value={editPrice}
                            onChange={(e) => setEditPrice(e.target.value)}
                            className="w-24 px-2 py-1 text-right rounded border border-brand-teal bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                          />
                        ) : (
                          BRL(p.price)
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isEditing ? (
                          <input
                            value={editStock}
                            onChange={(e) => setEditStock(e.target.value)}
                            className="w-16 px-2 py-1 text-right rounded border border-brand-teal bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                          />
                        ) : (
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                              low
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            {low && <AlertTriangle className="w-3 h-3" />}
                            {p.stock} un
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-500 dark:text-slate-400">
                        {BRL(p.price * p.stock)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={saveEdit}
                              disabled={saving}
                              className="w-7 h-7 rounded-lg bg-emerald-500 text-white flex items-center justify-center hover:bg-emerald-600 transition-colors"
                            >
                              <Check className="w-4 h-4" strokeWidth={2.5} />
                            </button>
                            <button
                              onClick={() => setEditing(null)}
                              className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                            >
                              <X className="w-4 h-4" strokeWidth={2.5} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEdit(p)}
                            className="w-7 h-7 rounded-lg text-slate-400 hover:text-brand-teal-dark dark:hover:text-brand-teal-light hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors ml-auto"
                          >
                            <Edit3 className="w-4 h-4" strokeWidth={2} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="py-12 text-center text-sm text-slate-400">Nenhum produto encontrado.</div>
            )}
          </div>
        )}
      </div>

      {showAdd && (
        <AddProductModal
          onClose={() => setShowAdd(false)}
          onSaved={() => {
            setShowAdd(false);
            fetchProducts();
          }}
        />
      )}
    </div>
  );
}

function AddProductModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0] ?? 'Acessórios');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const numPrice = parseFloat(price.replace(',', '.'));
    const numStock = parseInt(stock, 10);

    if (!trimmedName) {
      setError('Informe o nome do produto.');
      return;
    }
    if (Number.isNaN(numPrice) || numPrice < 0) {
      setError('Informe um preço válido.');
      return;
    }
    if (Number.isNaN(numStock) || numStock < 0) {
      setError('Informe um estoque válido.');
      return;
    }

    setSaving(true);
    setError('');
    const device = getDeviceInfo();
    const { error: insertError } = await supabase
      .from('products')
      .insert({ name: trimmedName, price: numPrice, stock: numStock, category, device_id: device?.id ?? null });
    setSaving(false);

    if (insertError) {
      setError('Não foi possível cadastrar o produto. Tente novamente.');
      return;
    }
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-brand-teal/10 flex items-center justify-center">
              <Plus className="w-5 h-5 text-brand-teal-dark dark:text-brand-teal-light" strokeWidth={2} />
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-white">Cadastrar Produto</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" strokeWidth={2} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
              Nome do produto
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Capa Silicone iPhone 16"
              autoFocus
              className="w-full px-3 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-brand-teal transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
              Categoria
            </label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all border ${
                    category === c
                      ? 'bg-brand-teal/10 border-brand-teal text-brand-teal-dark dark:text-brand-teal-light'
                      : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300'
                  }`}
                >
                  <CategoryIcon category={c} size="sm" />
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                Preço (R$)
              </label>
              <input
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0,00"
                inputMode="decimal"
                className="w-full px-3 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-brand-teal transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                Estoque
              </label>
              <input
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                placeholder="0"
                inputMode="numeric"
                className="w-full px-3 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-brand-teal transition-all"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" strokeWidth={2} />
              <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-brand-teal text-white font-medium text-sm shadow-sm hover:bg-brand-teal-dark disabled:opacity-60 transition-all active:scale-[0.98]"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2.5} /> : <Check className="w-4 h-4" strokeWidth={2.5} />}
              {saving ? 'Salvando...' : 'Cadastrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  highlight,
}: {
  label: string;
  value: string;
  icon: typeof Package;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm p-4 flex items-center gap-3">
      <div
        className={`w-11 h-11 rounded-xl flex items-center justify-center ${
          highlight
            ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
            : 'bg-brand-teal/10 text-brand-teal-dark dark:text-brand-teal-light'
        }`}
      >
        <Icon className="w-5 h-5" strokeWidth={2} />
      </div>
      <div>
        <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
        <p className="text-lg font-bold text-slate-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
}
