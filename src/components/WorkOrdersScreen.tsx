import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Wrench, Plus, Trash2, Printer, Loader2, X, Check, FileText,
  User, Smartphone, Shield, Search, Ban, Eye, Package,
} from 'lucide-react';
import {
  supabase, type WorkOrder, type WorkOrderItem, type AuthorizedDevice, type Product,
} from '@/lib/supabase';
import { getDeviceInfo } from '@/lib/auth';

const BRL = (v: number) =>
  Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const STATUS_LABELS: Record<string, string> = {
  PENDENTE: 'Pendente',
  EM_ANDAMENTO: 'Em andamento',
  CONCLUIDO: 'Concluído',
  CANCELADO: 'Cancelado',
};
const STATUS_COLORS: Record<string, string> = {
  PENDENTE: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
  EM_ANDAMENTO: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400',
  CONCLUIDO: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
  CANCELADO: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400',
};

const DEFAULT_WARRANTY = `1. Prazo de Garantia: 90 dias a contar desta data (ou garantia oficial da fabricante caso o aparelho seja novo lacrado).
2. A garantia cobre exclusivamente defeitos de fabricação ou vícios de funcionamento do hardware.
3. A GARANTIA SERÁ AUTOMATICAMENTE ANULADA EM CASO DE:
- Quedas, trincados, riscos profundos ou marcas de impacto;
- Contato com líquidos, umidade ou oxidação interna;
- Remoção ou violação dos selos de garantia da loja/aparelho;
- Tentativa de desbloqueio, "root" ou manutenção por terceiros;
- Qualquer dano causado por mau uso em geral.`;

type FormState = {
  customer_name: string;
  customer_phone: string;
  customer_document: string;
  equipment_model: string;
  equipment_imei: string;
  defect_notes: string;
  warranty_terms: string;
  items: WorkOrderItem[];
  status: string;
};

const EMPTY_FORM: FormState = {
  customer_name: '',
  customer_phone: '',
  customer_document: '',
  equipment_model: '',
  equipment_imei: '',
  defect_notes: '',
  warranty_terms: DEFAULT_WARRANTY,
  items: [{ name: '', qty: 1, unit_price: 0, discount_type: 'fixed', discount_value: 0, subtotal: 0 }],
  status: 'CONCLUIDO',
};

function itemSubtotal(it: WorkOrderItem): number {
  const gross = Number(it.qty) * Number(it.unit_price);
  const dv = Number(it.discount_value) || 0;
  if (it.discount_type === 'percentage') {
    return Math.max(gross - gross * (Math.min(dv, 100) / 100), 0);
  }
  return Math.max(gross - Math.min(dv, gross), 0);
}

export default function WorkOrdersScreen() {
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [signature, setSignature] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [printOrder, setPrintOrder] = useState<WorkOrder | null>(null);
  const [company, setCompany] = useState<AuthorizedDevice | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('work_orders')
      .select('id, device_id, order_number, customer_name, customer_phone, customer_document, equipment_model, equipment_imei, defect_notes, items_json, subtotal, discount_type, discount_value, total_amount, warranty_terms, status, created_at')
      .order('created_at', { ascending: false })
      .limit(200);
    setOrders((data as WorkOrder[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchOrders();
    setCompany(getDeviceInfo());
  }, [fetchOrders]);

  const itemsSubtotal = form.items.reduce((s, i) => s + itemSubtotal(i), 0);
  const total = itemsSubtotal;

  const updateItem = (idx: number, patch: Partial<WorkOrderItem>) => {
    setForm((f) => ({
      ...f,
      items: f.items.map((it, i) => {
        if (i !== idx) return it;
        const next = { ...it, ...patch };
        next.subtotal = itemSubtotal(next);
        return next;
      }),
    }));
  };

  const addItem = () =>
    setForm((f) => ({
      ...f,
      items: [...f.items, { name: '', qty: 1, unit_price: 0, discount_type: 'fixed', discount_value: 0, subtotal: 0 }],
    }));

  const removeItem = (idx: number) =>
    setForm((f) => ({
      ...f,
      items: f.items.filter((_, i) => i !== idx),
    }));

  const resetForm = () => {
    setForm({ ...EMPTY_FORM, warranty_terms: DEFAULT_WARRANTY });
    setSignature(null);
    setError('');
  };

  const openNewForm = () => {
    resetForm();
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.customer_name.trim()) {
      setError('Informe o nome do cliente.');
      return;
    }
    const filled = form.items.filter((i) => i.name.trim());
    if (filled.length === 0) {
      setError('Adicione ao menos um item.');
      return;
    }
    setSaving(true);
    setError('');
    const device = getDeviceInfo();
    const cleanItems = filled.map((i) => ({
      name: i.name.trim(),
      qty: Number(i.qty) || 1,
      unit_price: Number(i.unit_price) || 0,
      discount_type: i.discount_type ?? 'fixed',
      discount_value: Number(i.discount_value) || 0,
      subtotal: itemSubtotal(i),
    }));
    const cleanSubtotal = cleanItems.reduce((s, i) => s + i.subtotal, 0);

    const payload = {
      device_id: device?.id ?? null,
      customer_name: form.customer_name.trim(),
      customer_phone: form.customer_phone.trim() || null,
      customer_document: form.customer_document.trim() || null,
      equipment_model: form.equipment_model.trim() || null,
      equipment_imei: form.equipment_imei.trim() || null,
      defect_notes: form.defect_notes.trim() || null,
      items_json: cleanItems,
      subtotal: cleanSubtotal,
      discount_type: 'fixed',
      discount_value: 0,
      total_amount: cleanSubtotal,
      warranty_terms: form.warranty_terms.trim() || null,
      status: form.status,
    };

    const { error: insError } = await supabase.from('work_orders').insert(payload);
    setSaving(false);
    if (insError) {
      setError('Não foi possível salvar a ordem de serviço.');
      return;
    }
    setShowForm(false);
    resetForm();
    fetchOrders();
  };

  const filtered = orders.filter((o) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      o.customer_name.toLowerCase().includes(q) ||
      (o.equipment_model ?? '').toLowerCase().includes(q) ||
      String(o.order_number).includes(q)
    );
  });

  return (
    <div className="p-4 sm:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-brand-teal-dark dark:text-brand-teal-light" strokeWidth={2} />
            Ordens de Serviço / Documentos
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Gere OS, termos de garantia e comprovantes com dados da empresa.
          </p>
        </div>
        <button
          onClick={openNewForm}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-teal text-white font-medium text-sm shadow-sm hover:bg-brand-teal-dark transition-all active:scale-[0.98] whitespace-nowrap"
        >
          <Plus className="w-4 h-4" strokeWidth={2.5} />
          Nova Ordem de Serviço
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" strokeWidth={2} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por cliente, equipamento ou nº da OS..."
          className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-brand-teal transition-all"
        />
      </div>

      {/* List */}
      <div className="rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
            <FileText className="w-10 h-10" strokeWidth={1.2} />
            <p className="text-sm">Nenhuma ordem de serviço registrada.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <th className="px-4 py-3 font-medium">Nº</th>
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 font-medium">Equipamento</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Total</th>
                  <th className="px-4 py-3 font-medium text-right">Data</th>
                  <th className="px-4 py-3 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <tr
                    key={o.id}
                    className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">
                      #{String(o.order_number).padStart(4, '0')}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900 dark:text-white">{o.customer_name}</p>
                      {o.customer_phone && (
                        <p className="text-[11px] text-slate-400">{o.customer_phone}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                      {o.equipment_model || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[o.status] ?? STATUS_COLORS.CONCLUIDO}`}>
                        {STATUS_LABELS[o.status] ?? o.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-white">
                      {BRL(Number(o.total_amount))}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-slate-400">
                      {new Date(o.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setPrintOrder(o)}
                          title="Visualizar / Imprimir"
                          className="w-7 h-7 rounded-lg text-slate-400 hover:text-brand-teal-dark dark:hover:text-brand-teal-light hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors"
                        >
                          <Eye className="w-4 h-4" strokeWidth={2} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Form modal */}
      {showForm && (
        <WorkOrderForm
          form={form}
          setForm={setForm}
          signature={signature}
          setSignature={setSignature}
          itemsSubtotal={itemsSubtotal}
          total={total}
          updateItem={updateItem}
          addItem={addItem}
          removeItem={removeItem}
          onSubmit={handleSubmit}
          onClose={() => setShowForm(false)}
          saving={saving}
          error={error}
        />
      )}

      {/* Print preview */}
      {printOrder && (
        <PrintPreview order={printOrder} company={company} onClose={() => setPrintOrder(null)} />
      )}
    </div>
  );
}

/* ---------------- Form ---------------- */

function WorkOrderForm({
  form, setForm, signature, setSignature,
  itemsSubtotal, total,
  updateItem, addItem, removeItem,
  onSubmit, onClose, saving, error,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  signature: string | null;
  setSignature: (s: string | null) => void;
  itemsSubtotal: number;
  total: number;
  updateItem: (idx: number, patch: Partial<WorkOrderItem>) => void;
  addItem: () => void;
  removeItem: (idx: number) => void;
  onSubmit: () => void;
  onClose: () => void;
  saving: boolean;
  error: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-brand-teal/10 flex items-center justify-center">
              <Wrench className="w-5 h-5 text-brand-teal-dark dark:text-brand-teal-light" strokeWidth={2} />
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-white">Nova Ordem de Serviço</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" strokeWidth={2} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Customer */}
          <Section icon={User} title="Dados do Cliente">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Nome *">
                <input
                  value={form.customer_name}
                  onChange={(e) => setForm((f) => ({ ...f, customer_name: e.target.value }))}
                  className={inputCls}
                  placeholder="Nome do cliente"
                />
              </Field>
              <Field label="Telefone">
                <input
                  value={form.customer_phone}
                  onChange={(e) => setForm((f) => ({ ...f, customer_phone: e.target.value }))}
                  className={inputCls}
                  placeholder="(00) 00000-0000"
                />
              </Field>
              <Field label="CPF / RG">
                <input
                  value={form.customer_document}
                  onChange={(e) => setForm((f) => ({ ...f, customer_document: e.target.value }))}
                  className={inputCls}
                  placeholder="000.000.000-00"
                />
              </Field>
            </div>
          </Section>

          {/* Equipment */}
          <Section icon={Smartphone} title="Equipamento">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Modelo">
                <input
                  value={form.equipment_model}
                  onChange={(e) => setForm((f) => ({ ...f, equipment_model: e.target.value }))}
                  className={inputCls}
                  placeholder="Ex.: iPhone 13 128GB"
                />
              </Field>
              <Field label="IMEI / N° de Série">
                <input
                  value={form.equipment_imei}
                  onChange={(e) => setForm((f) => ({ ...f, equipment_imei: e.target.value }))}
                  className={inputCls}
                  placeholder="000000000000000"
                />
              </Field>
              <Field label="Defeito / Observação" full>
                <textarea
                  value={form.defect_notes}
                  onChange={(e) => setForm((f) => ({ ...f, defect_notes: e.target.value }))}
                  rows={2}
                  className={inputCls + ' resize-none'}
                  placeholder="Descrição do defeito relatado..."
                />
              </Field>
            </div>
          </Section>

          {/* Items */}
          <Section icon={FileText} title="Itens / Serviços">
            <div className="space-y-2">
              {form.items.map((it, idx) => (
                <ItemRow
                  key={idx}
                  item={it}
                  idx={idx}
                  updateItem={updateItem}
                  removeItem={removeItem}
                />
              ))}
              <button
                onClick={addItem}
                className="flex items-center gap-1.5 text-xs font-medium text-brand-teal-dark dark:text-brand-teal-light hover:underline mt-1"
              >
                <Plus className="w-3.5 h-3.5" /> Adicionar item
              </button>
            </div>

            {/* Totals */}
            <div className="mt-3 text-sm space-y-1">
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>Subtotal</span><span>{BRL(itemsSubtotal)}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-900 dark:text-white pt-1 border-t border-slate-200 dark:border-slate-700">
                <span>Total</span><span>{BRL(total)}</span>
              </div>
            </div>
          </Section>

          {/* Warranty */}
          <Section icon={Shield} title="Termo de Garantia">
            <textarea
              value={form.warranty_terms}
              onChange={(e) => setForm((f) => ({ ...f, warranty_terms: e.target.value }))}
              rows={9}
              className={inputCls + ' resize-y text-xs leading-relaxed'}
            />
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, warranty_terms: DEFAULT_WARRANTY }))}
              className="text-[11px] text-slate-400 hover:text-brand-teal-dark dark:hover:text-brand-teal-light mt-1 flex items-center gap-1"
            >
              <Shield className="w-3 h-3" /> Restaurar texto padrão
            </button>
          </Section>

          {/* Signature */}
          <Section icon={FileText} title="Assinatura do Cliente">
            <SignaturePad value={signature} onChange={setSignature} />
          </Section>

          {/* Status */}
          <Field label="Status">
            <select
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              className={inputCls + ' cursor-pointer'}
            >
              <option value="PENDENTE">Pendente</option>
              <option value="EM_ANDAMENTO">Em andamento</option>
              <option value="CONCLUIDO">Concluído</option>
              <option value="CANCELADO">Cancelado</option>
            </select>
          </Field>

          {error && (
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50">
              <Ban className="w-4 h-4 text-red-500 mt-0.5 shrink-0" strokeWidth={2} />
              <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex gap-2 px-5 py-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onSubmit}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-brand-teal text-white font-medium text-sm shadow-sm hover:bg-brand-teal-dark disabled:opacity-60 transition-all active:scale-[0.98]"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2.5} /> : <Check className="w-4 h-4" strokeWidth={2.5} />}
            {saving ? 'Salvando...' : 'Salvar OS'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Item Row with suggestions ---------------- */

function ItemRow({
  item,
  idx,
  updateItem,
  removeItem,
}: {
  item: WorkOrderItem;
  idx: number;
  updateItem: (idx: number, patch: Partial<WorkOrderItem>) => void;
  removeItem: (idx: number) => void;
}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [showSuggest, setShowSuggest] = useState(false);
  const [query, setQuery] = useState(item.name);
  const boxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setQuery(item.name);
  }, [item.name]);

  useEffect(() => {
    if (!showSuggest) return;
    const t = setTimeout(async () => {
      const q = query.trim().toLowerCase();
      let data: Product[] | null = null;
      if (q) {
        const res = await supabase
          .from('products')
          .select('id, name, price, stock, category, created_at')
          .ilike('name', `%${q}%`)
          .limit(6);
        data = (res.data as Product[]) ?? [];
      } else {
        const res = await supabase
          .from('products')
          .select('id, name, price, stock, category, created_at')
          .order('name')
          .limit(6);
        data = (res.data as Product[]) ?? [];
      }
      setProducts(data ?? []);
    }, 180);
    return () => clearTimeout(t);
  }, [query, showSuggest]);

  useEffect(() => {
    if (!showSuggest) return;
    const handler = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setShowSuggest(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showSuggest]);

  const pickProduct = (p: Product) => {
    updateItem(idx, { name: p.name, unit_price: p.price });
    setQuery(p.name);
    setShowSuggest(false);
  };

  const hasDiscount = (Number(item.discount_value) || 0) > 0;

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-2.5 space-y-2 bg-slate-50/50 dark:bg-slate-800/20">
      <div className="grid grid-cols-12 gap-2 items-center">
        {/* Name with suggestions */}
        <div ref={boxRef} className="col-span-5 relative">
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              updateItem(idx, { name: e.target.value });
              setShowSuggest(true);
            }}
            onFocus={() => setShowSuggest(true)}
            placeholder="Digite ou selecione do estoque"
            className="w-full px-2.5 py-2 rounded-lg bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-brand-teal"
          />
          {showSuggest && products.length > 0 && (
            <div className="absolute z-20 mt-1 w-full rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg max-h-48 overflow-y-auto">
              {products.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => pickProduct(p)}
                  className="w-full flex items-center justify-between px-2.5 py-2 text-left hover:bg-brand-teal/5 dark:hover:bg-brand-teal/10 transition-colors border-b border-slate-100 dark:border-slate-700/60 last:border-0"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <Package className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="text-sm text-slate-900 dark:text-white truncate">{p.name}</span>
                  </span>
                  <span className="text-xs font-medium text-brand-teal-dark dark:text-brand-teal-light shrink-0 ml-2">
                    {BRL(p.price)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <input
          type="number"
          min={1}
          value={item.qty}
          onChange={(e) => updateItem(idx, { qty: Number(e.target.value) })}
          title="Quantidade"
          className="col-span-2 px-2.5 py-2 rounded-lg bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-brand-teal"
        />
        <input
          type="number"
          min={0}
          step="0.01"
          value={item.unit_price}
          onChange={(e) => updateItem(idx, { unit_price: Number(e.target.value) })}
          placeholder="Preço"
          title="Preço unitário"
          className="col-span-3 px-2.5 py-2 rounded-lg bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-brand-teal"
        />
        <span className="col-span-1 text-right text-xs font-medium text-slate-600 dark:text-slate-300">
          {BRL(item.subtotal)}
        </span>
        <button
          onClick={() => removeItem(idx)}
          className="col-span-1 w-7 h-7 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center justify-center transition-colors mx-auto"
        >
          <Trash2 className="w-4 h-4" strokeWidth={2} />
        </button>
      </div>

      {/* Per-item discount */}
      <div className="flex items-center gap-2 pl-1">
        <button
          type="button"
          onClick={() => updateItem(idx, { discount_value: hasDiscount ? 0 : undefined })}
          className={`flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md transition-colors ${
            hasDiscount
              ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30'
              : 'text-slate-400 hover:text-brand-teal-dark dark:hover:text-brand-teal-light'
          }`}
        >
          <Shield className="w-3 h-3" />
          {hasDiscount ? 'Desconto ativo' : 'Aplicar desconto'}
        </button>
        {hasDiscount && (
          <div className="flex items-center gap-1">
            <div className="flex rounded-md overflow-hidden border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => updateItem(idx, { discount_type: 'fixed' })}
                className={`px-1.5 py-1 text-[11px] ${item.discount_type === 'fixed' ? 'bg-brand-teal text-white' : 'bg-white dark:bg-slate-800 text-slate-500'}`}
              >R$</button>
              <button
                type="button"
                onClick={() => updateItem(idx, { discount_type: 'percentage' })}
                className={`px-1.5 py-1 text-[11px] ${item.discount_type === 'percentage' ? 'bg-brand-teal text-white' : 'bg-white dark:bg-slate-800 text-slate-500'}`}
              >%</button>
            </div>
            <input
              type="number"
              min={0}
              step="0.01"
              value={item.discount_value ?? 0}
              onChange={(e) => updateItem(idx, { discount_value: Number(e.target.value) })}
              className="w-20 px-2 py-1 rounded-md bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-brand-teal"
            />
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- Signature Pad ---------------- */

function SignaturePad({ value, onChange }: { value: string | null; onChange: (s: string | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const hasInk = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(ratio, ratio);
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#0f172a';
    }
  }, []);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    drawing.current = true;
    const ctx = canvasRef.current?.getContext('2d');
    const p = pos(e);
    ctx?.beginPath();
    ctx?.moveTo(p.x, p.y);
  };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext('2d');
    const p = pos(e);
    ctx?.lineTo(p.x, p.y);
    ctx?.stroke();
    hasInk.current = true;
  };
  const end = () => {
    drawing.current = false;
    if (hasInk.current && canvasRef.current) {
      onChange(canvasRef.current.toDataURL('image/png'));
    }
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    hasInk.current = false;
    onChange(null);
  };

  return (
    <div>
      <div className="relative rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 overflow-hidden">
        <canvas
          ref={canvasRef}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
          className="w-full h-32 touch-none cursor-crosshair"
        />
        {!value && (
          <span className="absolute inset-0 flex items-center justify-center text-xs text-slate-400 pointer-events-none">
            Assine aqui com o dedo ou mouse
          </span>
        )}
      </div>
      <div className="flex justify-between items-center mt-1.5">
        <p className="text-[11px] text-slate-400">
          {value ? 'Assinatura capturada.' : 'A assinatura aparece no documento impresso.'}
        </p>
        <button
          onClick={clear}
          className="text-xs text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1"
        >
          <Trash2 className="w-3 h-3" /> Limpar
        </button>
      </div>
    </div>
  );
}

/* ---------------- Print Preview ---------------- */

function PrintPreview({
  order,
  company,
  onClose,
}: {
  order: WorkOrder;
  company: AuthorizedDevice | null;
  onClose: () => void;
}) {
  const items = (order.items_json ?? []) as WorkOrderItem[];

  const handlePrint = () => {
    const node = document.getElementById('os-print-area');
    if (!node) return;
    const win = window.open('', '_blank', 'width=820,height=1160');
    if (!win) return;
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>OS ${order.order_number}</title>
      <style>
        * { font-family: 'Segoe UI', Roboto, Arial, sans-serif; box-sizing: border-box; }
        body { margin: 0; padding: 24px; color: #0f172a; }
        .doc { max-width: 780px; margin: 0 auto; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #0d9488; padding-bottom: 16px; }
        .brand { display: flex; gap: 12px; align-items: center; }
        .logo { width: 56px; height: 56px; border-radius: 12px; background: linear-gradient(135deg, #14b8a6, #0f766e); display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; font-size: 20px; }
        .company-name { font-size: 20px; font-weight: 700; }
        .company-meta { font-size: 11px; color: #64748b; margin-top: 2px; line-height: 1.5; }
        .doc-meta { text-align: right; font-size: 11px; color: #64748b; }
        .doc-meta .num { font-size: 18px; font-weight: 700; color: #0f172a; }
        .section { margin-top: 18px; }
        .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #0d9488; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 8px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 24px; font-size: 12px; }
        .grid .label { color: #64748b; }
        .grid .value { font-weight: 600; }
        .notes { font-size: 12px; color: #334155; margin-top: 4px; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px; }
        th { text-align: left; padding: 6px 8px; background: #f1f5f9; color: #475569; font-weight: 600; font-size: 11px; text-transform: uppercase; }
        td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; }
        td.right { text-align: right; }
        td.center { text-align: center; }
        .item-disc { font-size: 10px; color: #059669; }
        .totals { margin-top: 10px; margin-left: auto; width: 260px; font-size: 12px; }
        .totals .row { display: flex; justify-content: space-between; padding: 2px 0; }
        .totals .grand { font-size: 15px; font-weight: 700; border-top: 2px solid #0f172a; padding-top: 6px; margin-top: 4px; }
        .warranty { margin-top: 16px; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc; font-size: 11px; color: #334155; line-height: 1.6; white-space: pre-line; }
        .sign-row { display: flex; justify-content: space-between; gap: 24px; margin-top: 28px; }
        .sign-box { flex: 1; text-align: center; }
        .sign-img { height: 70px; margin: 0 auto 4px; display: block; }
        .sign-line { border-top: 1px solid #475569; padding-top: 4px; font-size: 11px; color: #64748b; }
        .footer { margin-top: 20px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 8px; }
        @media print { body { padding: 0; } }
      </style></head><body>${node.innerHTML}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
      win.close();
    }, 300);
  };

  const companyName = company?.device_name || 'CELULAR TECH';
  const initials = companyName.slice(0, 2).toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn overflow-y-auto">
      <div className="w-full max-w-3xl my-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-brand-teal-dark dark:text-brand-teal-light" strokeWidth={2} />
            Documento — OS #{String(order.order_number).padStart(4, '0')}
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-brand-teal text-white text-sm font-medium hover:bg-brand-teal-dark transition-all active:scale-[0.98]"
            >
              <Printer className="w-4 h-4" strokeWidth={2.5} /> Imprimir
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5" strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Printable area */}
        <div id="os-print-area" className="p-6 sm:p-8 bg-white text-slate-900">
          <div className="doc">
            {/* Header */}
            <div className="header">
              <div className="brand">
                <div className="logo">{initials}</div>
                <div>
                  <div className="company-name">{companyName}</div>
                  <div className="company-meta">
                    {company?.company_cnpj && <div>CNPJ: {company.company_cnpj}</div>}
                    {company?.company_phone && <div>Tel: {company.company_phone}</div>}
                    {company?.company_email && <div>{company.company_email}</div>}
                    {company?.company_address && <div>{company.company_address}</div>}
                  </div>
                </div>
              </div>
              <div className="doc-meta">
                <div className="num">OS #{String(order.order_number).padStart(4, '0')}</div>
                <div>{new Date(order.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
                <div>Status: {STATUS_LABELS[order.status] ?? order.status}</div>
              </div>
            </div>

            {/* Customer */}
            <div className="section">
              <div className="section-title">Dados do Cliente</div>
              <div className="grid">
                <div><span className="label">Nome: </span><span className="value">{order.customer_name}</span></div>
                {order.customer_phone && <div><span className="label">Telefone: </span><span className="value">{order.customer_phone}</span></div>}
                {order.customer_document && <div><span className="label">Documento: </span><span className="value">{order.customer_document}</span></div>}
              </div>
            </div>

            {/* Equipment */}
            {(order.equipment_model || order.equipment_imei || order.defect_notes) && (
              <div className="section">
                <div className="section-title">Equipamento</div>
                <div className="grid">
                  {order.equipment_model && <div><span className="label">Modelo: </span><span className="value">{order.equipment_model}</span></div>}
                  {order.equipment_imei && <div><span className="label">IMEI/Série: </span><span className="value">{order.equipment_imei}</span></div>}
                </div>
                {order.defect_notes && <div className="notes">Defeito relatado: {order.defect_notes}</div>}
              </div>
            )}

            {/* Items */}
            {items.length > 0 && (
              <div className="section">
                <div className="section-title">Itens / Serviços</div>
                <table>
                  <thead>
                    <tr>
                      <th>Descrição</th>
                      <th className="text-center">Qtd</th>
                      <th className="text-right">Unitário</th>
                      <th className="text-right">Desc.</th>
                      <th className="text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, i) => {
                      const dv = Number(it.discount_value) || 0;
                      const gross = Number(it.qty) * Number(it.unit_price);
                      const disc = it.discount_type === 'percentage'
                        ? gross * (Math.min(dv, 100) / 100)
                        : Math.min(dv, gross);
                      return (
                        <tr key={i}>
                          <td>
                            {it.name}
                            {dv > 0 && (
                              <div className="item-disc">
                                Desc. {it.discount_type === 'percentage' ? `${dv}%` : BRL(disc)}
                              </div>
                            )}
                          </td>
                          <td className="center">{it.qty}</td>
                          <td className="right">{BRL(Number(it.unit_price))}</td>
                          <td className="right">{dv > 0 ? `- ${BRL(disc)}` : '—'}</td>
                          <td className="right">{BRL(Number(it.subtotal))}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="totals">
                  <div className="row"><span>Subtotal</span><span>{BRL(Number(order.subtotal))}</span></div>
                  <div className="row grand"><span>Total</span><span>{BRL(Number(order.total_amount))}</span></div>
                </div>
              </div>
            )}

            {/* Warranty */}
            {order.warranty_terms && (
              <div className="warranty">
                <strong>Termo de Garantia</strong><br />
                {order.warranty_terms}
              </div>
            )}

            {/* Signature */}
            <div className="sign-row">
              <div className="sign-box">
                <div className="sign-line">Cliente</div>
              </div>
              <div className="sign-box">
                <div className="sign-line">{companyName}</div>
              </div>
            </div>

            <div className="footer">
              Documento gerado em {new Date().toLocaleString('pt-BR')} · {companyName}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- helpers ---------------- */

const inputCls =
  'w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-brand-teal transition-all';

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof User;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <Icon className="w-3.5 h-3.5 text-brand-teal-dark dark:text-brand-teal-light" strokeWidth={2} />
        <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{title}</h4>
      </div>
      {children}
    </div>
  );
}

function Field({
  label,
  children,
  full,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">{label}</label>
      {children}
    </div>
  );
}
