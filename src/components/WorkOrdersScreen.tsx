import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Wrench, Plus, Trash2, Printer, Loader2, X, Check, FileText,
  User, Smartphone, Shield, Search, Ban, Eye, Package, Pencil, AlertTriangle,
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

const todayISO = () => new Date().toISOString().slice(0, 10);

type FormState = {
  customer_name: string;
  customer_phone: string;
  customer_document: string;
  customer_address: string;
  customer_email: string;
  customer_rg: string;
  equipment_model: string;
  equipment_imei: string;
  defect_notes: string;
  warranty_terms: string;
  items: WorkOrderItem[];
  total_discount_type: 'fixed' | 'percentage';
  total_discount_value: string;
  order_date: string;
  delivery_date: string;
  status: string;
};

const EMPTY_FORM: FormState = {
  customer_name: '',
  customer_phone: '',
  customer_document: '',
  customer_address: '',
  customer_email: '',
  customer_rg: '',
  equipment_model: '',
  equipment_imei: '',
  defect_notes: '',
  warranty_terms: DEFAULT_WARRANTY,
  items: [{ name: '', qty: 1, unit_price: 0, discount_type: 'fixed', discount_value: 0, subtotal: 0 }],
  total_discount_type: 'fixed',
  total_discount_value: '',
  order_date: todayISO(),
  delivery_date: '',
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

const fmtDate = (s?: string | null): string => {
  if (!s) return '—';
  const d = new Date(s + (s.length <= 10 ? 'T00:00:00' : ''));
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteOrder, setDeleteOrder] = useState<WorkOrder | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const device = getDeviceInfo();
    const { data } = await supabase
      .from('work_orders')
      .select('id, device_id, order_number, customer_name, customer_phone, customer_document, customer_address, customer_email, customer_rg, equipment_model, equipment_imei, defect_notes, items_json, subtotal, discount_type, discount_value, total_amount, warranty_terms, status, order_date, delivery_date, created_at')
      .eq('device_id', device?.id ?? '')
      .order('created_at', { ascending: false })
      .limit(200);
    setOrders((data as WorkOrder[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
  fetchOrders();

  async function loadCompanyData() {
    try {
      // 1. Obtém as informações do dispositivo local (ex: token, id ou device_id)
      const deviceInfo = getDeviceInfo();
      
      if (!deviceInfo) return;

      // 2. Busca na tabela authorized_devices o registro que bate com o dispositivo local
      const { data, error } = await supabase
        .from('authorized_devices')
        .select('*')
        // Ajuste o campo do .eq para a chave usada na sua tabela (ex: 'id', 'device_token' ou 'device_id')
        .eq('id', deviceInfo.id) 
        .maybeSingle();

      if (error) {
        console.error('Erro ao carregar dados do dispositivo autorizador:', error);
        return;
      }

      if (data) {
        setCompany(data);
      }
    } catch (err) {
      console.error('Falha ao buscar empresa:', err);
    }
  }

  loadCompanyData();
}, [fetchOrders]);

  const itemsSubtotal = form.items.reduce((s, i) => s + itemSubtotal(i), 0);
  const totalDiscount = (() => {
    const raw = parseFloat(form.total_discount_value.replace(',', '.')) || 0;
    if (form.total_discount_type === 'percentage') {
      return Math.min(itemsSubtotal * (raw / 100), itemsSubtotal);
    }
    return Math.min(raw, itemsSubtotal);
  })();
  const total = Math.max(itemsSubtotal - totalDiscount, 0);

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
    setForm({ ...EMPTY_FORM, warranty_terms: DEFAULT_WARRANTY, order_date: todayISO() });
    setSignature(null);
    setError('');
  };

  const openNewForm = () => {
    resetForm();
    setEditingId(null);
    setShowForm(true);
  };

  const openEditForm = (order: WorkOrder) => {
    const items = (order.items_json ?? []) as WorkOrderItem[];
    const mappedItems = items.length > 0 ? items.map((i) => ({
      name: i.name,
      qty: Number(i.qty) || 1,
      unit_price: Number(i.unit_price) || 0,
      discount_type: i.discount_type ?? 'fixed',
      discount_value: Number(i.discount_value) || 0,
      subtotal: itemSubtotal({
        name: i.name,
        qty: Number(i.qty) || 1,
        unit_price: Number(i.unit_price) || 0,
        discount_type: i.discount_type ?? 'fixed',
        discount_value: Number(i.discount_value) || 0,
        subtotal: 0,
      }),
    })) : [{ name: '', qty: 1, unit_price: 0, discount_type: 'fixed', discount_value: 0, subtotal: 0 }];

    const hasTotalDiscount = Number(order.discount_value) > 0;
    let totalDiscountDisplay = '';
    if (hasTotalDiscount) {
      if (order.discount_type === 'percentage') {
        const sub = Number(order.subtotal) || 0;
        const pct = sub > 0 ? (Number(order.discount_value) / sub) * 100 : 0;
        totalDiscountDisplay = String(Math.round(pct * 100) / 100);
      } else {
        totalDiscountDisplay = String(Number(order.discount_value));
      }
    }

    setForm({
      customer_name: order.customer_name ?? '',
      customer_phone: order.customer_phone ?? '',
      customer_document: order.customer_document ?? '',
      customer_address: order.customer_address ?? '',
      customer_email: order.customer_email ?? '',
      customer_rg: order.customer_rg ?? '',
      equipment_model: order.equipment_model ?? '',
      equipment_imei: order.equipment_imei ?? '',
      defect_notes: order.defect_notes ?? '',
      warranty_terms: order.warranty_terms ?? DEFAULT_WARRANTY,
      items: mappedItems,
      total_discount_type: (order.discount_type as 'fixed' | 'percentage') ?? 'fixed',
      total_discount_value: totalDiscountDisplay,
      order_date: order.order_date ? order.order_date.slice(0, 10) : todayISO(),
      delivery_date: order.delivery_date ? order.delivery_date.slice(0, 10) : '',
      status: order.status ?? 'CONCLUIDO',
    });
    setSignature(null);
    setError('');
    setEditingId(order.id);
    setShowForm(true);
  };

  const handleDelete = async () => {
    if (!deleteOrder) return;
    setDeleting(true);
    const device = getDeviceInfo();
    await supabase.from('work_orders').delete().eq('id', deleteOrder.id).eq('device_id', device?.id ?? '');
    setDeleting(false);
    setDeleteOrder(null);
    fetchOrders();
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
    const cleanTotalDiscount = (() => {
      const raw = parseFloat(form.total_discount_value.replace(',', '.')) || 0;
      if (form.total_discount_type === 'percentage') {
        return Math.min(cleanSubtotal * (raw / 100), cleanSubtotal);
      }
      return Math.min(raw, cleanSubtotal);
    })();
    const cleanTotal = Math.max(cleanSubtotal - cleanTotalDiscount, 0);

    const payload = {
      device_id: device?.id ?? null,
      customer_name: form.customer_name.trim(),
      customer_phone: form.customer_phone.trim() || null,
      customer_document: form.customer_document.trim() || null,
      customer_address: form.customer_address.trim() || null,
      customer_email: form.customer_email.trim() || null,
      customer_rg: form.customer_rg.trim() || null,
      equipment_model: form.equipment_model.trim() || null,
      equipment_imei: form.equipment_imei.trim() || null,
      defect_notes: form.defect_notes.trim() || null,
      items_json: cleanItems,
      subtotal: cleanSubtotal,
      discount_type: form.total_discount_type,
      discount_value: cleanTotalDiscount,
      total_amount: cleanTotal,
      warranty_terms: form.warranty_terms.trim() || null,
      order_date: form.order_date || null,
      delivery_date: form.delivery_date || null,
      status: form.status,
    };

    let insError: { message: string } | null = null;
    if (editingId) {
      const res = await supabase.from('work_orders').update(payload).eq('id', editingId).eq('device_id', device?.id ?? '');
      insError = res.error ? { message: res.error.message } : null;
    } else {
      const res = await supabase.from('work_orders').insert(payload);
      insError = res.error ? { message: res.error.message } : null;
    }
    setSaving(false);
    if (insError) {
      setError('Não foi possível salvar a ordem de serviço.');
      return;
    }
    setShowForm(false);
    setEditingId(null);
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
                      {fmtDate(o.order_date)}
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
                        <button
                          onClick={() => openEditForm(o)}
                          title="Editar"
                          className="w-7 h-7 rounded-lg text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 flex items-center justify-center transition-colors"
                        >
                          <Pencil className="w-4 h-4" strokeWidth={2} />
                        </button>
                        <button
                          onClick={() => setDeleteOrder(o)}
                          title="Excluir"
                          className="w-7 h-7 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center justify-center transition-colors"
                        >
                          <Trash2 className="w-4 h-4" strokeWidth={2} />
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
          totalDiscount={totalDiscount}
          total={total}
          updateItem={updateItem}
          addItem={addItem}
          removeItem={removeItem}
          onSubmit={handleSubmit}
          onClose={() => { setShowForm(false); setEditingId(null); }}
          saving={saving}
          error={error}
          editingId={editingId}
        />
      )}

      {/* Delete confirmation */}
      {deleteOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-950/40 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-500" strokeWidth={2} />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">Excluir ordem de serviço?</h3>
                <p className="text-xs text-slate-400 mt-0.5">Esta ação não pode ser desfeita.</p>
              </div>
            </div>
            <div className="rounded-lg bg-slate-50 dark:bg-slate-800/40 p-3 mb-4 text-sm text-slate-600 dark:text-slate-300">
              <p className="font-medium text-slate-900 dark:text-white">OS #{String(deleteOrder.order_number).padStart(4, '0')} — {deleteOrder.customer_name}</p>
              {deleteOrder.equipment_model && <p className="text-xs text-slate-400 mt-0.5">{deleteOrder.equipment_model}</p>}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteOrder(null)}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-red-500 text-white font-medium text-sm shadow-sm hover:bg-red-600 disabled:opacity-60 transition-all active:scale-[0.98]"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2.5} /> : <Trash2 className="w-4 h-4" strokeWidth={2.5} />}
                {deleting ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
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
  itemsSubtotal, totalDiscount, total,
  updateItem, addItem, removeItem,
  onSubmit, onClose, saving, error, editingId,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  signature: string | null;
  setSignature: (s: string | null) => void;
  itemsSubtotal: number;
  totalDiscount: number;
  total: number;
  updateItem: (idx: number, patch: Partial<WorkOrderItem>) => void;
  addItem: () => void;
  removeItem: (idx: number) => void;
  onSubmit: () => void;
  onClose: () => void;
  saving: boolean;
  error: string;
  editingId: string | null;
}) {
  const totalDiscountOpen = form.total_discount_value !== '';
  const toggleTotalDiscount = () => {
    setForm((f) => ({
      ...f,
      total_discount_value: f.total_discount_value === '' ? '0' : '',
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-brand-teal/10 flex items-center justify-center">
              <Wrench className="w-5 h-5 text-brand-teal-dark dark:text-brand-teal-light" strokeWidth={2} />
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-white">{editingId ? 'Editar Ordem de Serviço' : 'Nova Ordem de Serviço'}</h3>
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
                  placeholder="Nome completo do cliente"
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
              <Field label="CPF / CNPJ">
                <input
                  value={form.customer_document}
                  onChange={(e) => setForm((f) => ({ ...f, customer_document: e.target.value }))}
                  className={inputCls}
                  placeholder="000.000.000-00"
                />
              </Field>
              <Field label="RG">
                <input
                  value={form.customer_rg}
                  onChange={(e) => setForm((f) => ({ ...f, customer_rg: e.target.value }))}
                  className={inputCls}
                  placeholder="00.000.000-0"
                />
              </Field>
              <Field label="E-mail">
                <input
                  value={form.customer_email}
                  onChange={(e) => setForm((f) => ({ ...f, customer_email: e.target.value }))}
                  className={inputCls}
                  placeholder="cliente@email.com"
                />
              </Field>
              <Field label="Endereço">
                <input
                  value={form.customer_address}
                  onChange={(e) => setForm((f) => ({ ...f, customer_address: e.target.value }))}
                  className={inputCls}
                  placeholder="Rua, número, bairro, cidade"
                />
              </Field>
            </div>
          </Section>

          {/* Dates */}
          <Section icon={FileText} title="Datas">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Data do Pedido">
                <input
                  type="date"
                  value={form.order_date}
                  onChange={(e) => setForm((f) => ({ ...f, order_date: e.target.value }))}
                  className={inputCls}
                />
              </Field>
              <Field label="Data da Entrega">
                <input
                  type="date"
                  value={form.delivery_date}
                  onChange={(e) => setForm((f) => ({ ...f, delivery_date: e.target.value }))}
                  className={inputCls}
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
                <span>Subtotal dos itens</span><span>{BRL(itemsSubtotal)}</span>
              </div>

              {/* Total discount */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={toggleTotalDiscount}
                  className={`flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md transition-colors ${
                    totalDiscountOpen
                      ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30'
                      : 'text-slate-400 hover:text-brand-teal-dark dark:hover:text-brand-teal-light'
                  }`}
                >
                  <Shield className="w-3 h-3" />
                  {totalDiscountOpen ? 'Desconto sobre o total ativo' : 'Aplicar desconto sobre o total'}
                </button>
                {totalDiscountOpen && (
                  <div className="flex items-center gap-1 ml-auto">
                    <div className="flex rounded-md overflow-hidden border border-slate-200 dark:border-slate-700">
                      <button
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, total_discount_type: 'fixed' }))}
                        className={`px-1.5 py-1 text-[11px] ${form.total_discount_type === 'fixed' ? 'bg-brand-teal text-white' : 'bg-white dark:bg-slate-800 text-slate-500'}`}
                      >R$</button>
                      <button
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, total_discount_type: 'percentage' }))}
                        className={`px-1.5 py-1 text-[11px] ${form.total_discount_type === 'percentage' ? 'bg-brand-teal text-white' : 'bg-white dark:bg-slate-800 text-slate-500'}`}
                      >%</button>
                    </div>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={form.total_discount_value}
                      onChange={(e) => setForm((f) => ({ ...f, total_discount_value: e.target.value }))}
                      placeholder="0,00"
                      className="w-20 px-2 py-1 rounded-md bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-brand-teal"
                    />
                  </div>
                )}
              </div>

              {totalDiscount > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                  <span>Desconto sobre o total</span><span>- {BRL(totalDiscount)}</span>
                </div>
              )}
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

          {/* Signature 
          <Section icon={FileText} title="Assinatura do Cliente">
            <SignaturePad value={signature} onChange={setSignature} />
          </Section>*/}

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
            {saving ? 'Salvando...' : editingId ? 'Salvar Alterações' : 'Salvar OS'}
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
  const [discountOpen, setDiscountOpen] = useState((Number(item.discount_value) || 0) > 0);
  const boxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setQuery(item.name);
  }, [item.name]);

  useEffect(() => {
    if (!showSuggest) return;
    const t = setTimeout(async () => {
      const q = query.trim().toLowerCase();
      let data: Product[] | null = null;
      const device = getDeviceInfo();
      if (q) {
        const res = await supabase
          .from('products')
          .select('id, name, price, stock, category, device_id, created_at')
          .ilike('name', `%${q}%`)
          .eq('device_id', device?.id ?? '')
          .limit(6);
        data = (res.data as Product[]) ?? [];
      } else {
        const res = await supabase
          .from('products')
          .select('id, name, price, stock, category, device_id, created_at')
          .eq('device_id', device?.id ?? '')
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
          onClick={() => {
            const next = !discountOpen;
            setDiscountOpen(next);
            if (!next) updateItem(idx, { discount_value: 0 });
          }}
          className={`flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md transition-colors ${
            discountOpen
              ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30'
              : 'text-slate-400 hover:text-brand-teal-dark dark:hover:text-brand-teal-light'
          }`}
        >
          <Shield className="w-3 h-3" />
          {discountOpen ? 'Desconto do item ativo' : 'Aplicar desconto no item'}
        </button>
        {discountOpen && (
          <div className="flex items-center gap-1 ml-auto">
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
              placeholder="0,00"
              className="w-20 px-2 py-1 rounded-md bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-brand-teal"
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

/* ---------------- Print Preview (Com dados completos do emissor) ---------------- */

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

  // Fallbacks para garantir que as informações do emissor sempre apareçam
  const companyName = company?.device_name || 'CELULAR TECH';
  const companyCnpj = company?.company_cnpj || '';
  const companyAddress = company?.company_address || '';
  const companyPhone = company?.company_phone || '';
  const companyEmail = company?.company_email || '';
  const logoUrl = '/images/logo-R&G.jpg' || '';

  const handlePrint = () => {
    const node = document.getElementById('os-print-area');
    if (!node) return;
    const win = window.open('', '_blank', 'width=820,height=1160');
    if (!win) return;
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>OS #${String(order.order_number).padStart(4, '0')}</title>
      <style>
        * { font-family: 'Segoe UI', Roboto, Arial, sans-serif; box-sizing: border-box; }
        body { margin: 0; padding: 24px; color: #0f172a; background: #fff; }
        .doc { max-width: 780px; margin: 0 auto; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #0d9488; padding-bottom: 16px; gap: 16px; }
        .brand { display: flex; gap: 12px; align-items: flex-start; }
        .logo-img { width: 64px; height: 64px; object-fit: contain; border-radius: 8px; }
        .logo-fallback { width: 56px; height: 56px; border-radius: 12px; background: linear-gradient(135deg, #14b8a6, #0f766e); display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; font-size: 14px; text-align: center; }
        .company-name { font-size: 20px; font-weight: 700; line-height: 1.2; color: #0f172a; }
        .company-meta { font-size: 11px; color: #475569; margin-top: 4px; line-height: 1.5; }
        .company-meta span { display: block; }
        .doc-meta { text-align: right; font-size: 11px; color: #64748b; flex-shrink: 0; }
        .doc-meta .num { font-size: 20px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
        .doc-meta .meta-line { margin-bottom: 2px; }
        .paragraph { margin-top: 20px; padding-top: 14px; border-top: 1px solid #e2e8f0; }
        .para-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #0d9488; margin-bottom: 8px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 24px; font-size: 12px; }
        .info-grid .label { color: #64748b; }
        .info-grid .value { font-weight: 600; color: #0f172a; }
        .notes { font-size: 12px; color: #334155; margin-top: 6px; background: #f8fafc; padding: 8px; rounded: 6px; border: 1px solid #e2e8f0; }
        .items-table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 8px; }
        .items-table th { text-align: left; padding: 8px 10px; background: #0d9488; color: #fff; font-weight: 600; font-size: 11px; text-transform: uppercase; }
        .items-table th.center { text-align: center; }
        .items-table th.right { text-align: right; }
        .items-table td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
        .items-table td.center { text-align: center; }
        .items-table td.right { text-align: right; }
        .items-table tbody tr:nth-child(even) { background: #f8fafc; }
        .item-disc { font-size: 10px; color: #059669; margin-top: 2px; }
        .totals { margin-top: 12px; margin-left: auto; width: 280px; font-size: 12px; }
        .totals .row { display: flex; justify-content: space-between; padding: 3px 0; }
        .totals .grand { font-size: 15px; font-weight: 700; border-top: 2px solid #0f172a; padding-top: 8px; margin-top: 6px; }
        .warranty { font-size: 11px; color: #334155; line-height: 1.6; white-space: pre-line; background: #f8fafc; padding: 10px; border-radius: 6px; border: 1px solid #e2e8f0; }
        .sign-row { display: flex; justify-content: space-between; gap: 40px; margin-top: 48px; }
        .sign-box { flex: 1; text-align: center; }
        .sign-line { border-top: 1px solid #475569; padding-top: 6px; font-size: 11px; font-weight: 600; color: #334155; }
        .footer { text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; margin-top: 24px; }
        @media print { body { padding: 0; } }
      </style></head><body>${node.innerHTML}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
      win.close();
    }, 300);
  };

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
            {/* Header com Logo e Dados de Emissor Completo */}
            <div className="header">
              <div className="brand">
                <img 
      src= '/images/logo-R&G.jpg' 
      alt={companyName} 
      className="logo-img" 
      onError={(e) => {
        // Se por algum motivo o arquivo local falhar, esconde a imagem para não quebrar o layout
        (e.target as HTMLElement).style.display = 'none';
      }}/>
                <div>
                  <div className="company-name">{companyName}</div>
                  <div className="company-meta">
                    {companyCnpj && <span>CNPJ: {companyCnpj}</span>}
                    {companyAddress && <span>Endereço: {companyAddress}</span>}
                    {companyPhone && <span>Tel: {companyPhone}</span>}
                    {companyEmail && <span>E-mail: {companyEmail}</span>}
                  </div>
                </div>
              </div>
              <div className="doc-meta">
                <div className="num">OS #{String(order.order_number).padStart(4, '0')}</div>
                <div className="meta-line">Data do Pedido: {fmtDate(order.order_date)}</div>
                <div className="meta-line">Entrega Estimada: {fmtDate(order.delivery_date)}</div>
                <div className="meta-line">Status: {STATUS_LABELS[order.status] ?? order.status}</div>
              </div>
            </div>

            {/* Dados do Cliente */}
            <div className="paragraph">
              <div className="para-title">Dados do Cliente</div>
              <div className="info-grid">
                <div><span className="label">Nome: </span><span className="value">{order.customer_name}</span></div>
                {order.customer_document && <div><span className="label">CPF / CNPJ: </span><span className="value">{order.customer_document}</span></div>}
                {order.customer_rg && <div><span className="label">RG: </span><span className="value">{order.customer_rg}</span></div>}
                {order.customer_phone && <div><span className="label">Telefone: </span><span className="value">{order.customer_phone}</span></div>}
                {order.customer_email && <div><span className="label">E-mail: </span><span className="value">{order.customer_email}</span></div>}
                {order.customer_address && <div><span className="label">Endereço: </span><span className="value">{order.customer_address}</span></div>}
              </div>

              {/* Equipamento */}
              {(order.equipment_model || order.equipment_imei || order.defect_notes) && (
                <div style={{ marginTop: '12px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Equipamento / Aparelho</div>
                  <div className="info-grid">
                    {order.equipment_model && <div><span className="label">Modelo: </span><span className="value">{order.equipment_model}</span></div>}
                    {order.equipment_imei && <div><span className="label">IMEI / Nº Série: </span><span className="value">{order.equipment_imei}</span></div>}
                  </div>
                  {order.defect_notes && <div className="notes"><strong>Defeito/Observação:</strong> {order.defect_notes}</div>}
                </div>
              )}
            </div>

            {/* Tabela de Itens e Serviços */}
            {items.length > 0 && (
              <div className="paragraph">
                <div className="para-title">Itens e Serviços Solicitados</div>
                <table className="items-table">
                  <thead>
                    <tr>
                      <th>Descrição</th>
                      <th className="center">Qtd</th>
                      <th className="right">Unitário</th>
                      <th className="right">Desconto</th>
                      <th className="right">Subtotal</th>
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
                                Desc: {it.discount_type === 'percentage' ? `${dv}%` : BRL(disc)}
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
                  {Number(order.discount_value) > 0 && (
                    <div className="row" style={{ color: '#059669' }}>
                      <span>Desconto Global</span>
                      <span>- {BRL(Number(order.discount_value))}</span>
                    </div>
                  )}
                  <div className="row grand"><span>Total Final</span><span>{BRL(Number(order.total_amount))}</span></div>
                </div>
              </div>
            )}

            {/* Termo de Garantia */}
            {order.warranty_terms && (
              <div className="paragraph">
                <div className="para-title">Termo de Garantia e Condições</div>
                <div className="warranty">{order.warranty_terms}</div>
              </div>
            )}

            {/* Linhas de Assinatura Física */}
            <div className="sign-row">
              <div className="sign-box">
                <div className="sign-line">Assinatura do Cliente</div>
                <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>{order.customer_name}</div>
              </div>
              <div className="sign-box">
                <div className="sign-line">Assinatura do Responsável / Técnico</div>
                <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>{companyName}</div>
              </div>
            </div>

            {/* Rodapé do documento */}
            <div className="footer">
              {companyName} {companyCnpj && `· CNPJ: ${companyCnpj}`} {companyPhone && `· Tel: ${companyPhone}`}
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
