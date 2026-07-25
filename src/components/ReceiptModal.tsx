import { Printer, X, ShieldCheck } from 'lucide-react';
import type { Sale, SaleItem } from '@/lib/supabase';

const BRL = (v: number) =>
  Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const PAYMENT_LABELS: Record<string, string> = {
  PIX: 'PIX',
  DINHEIRO: 'Dinheiro',
  CARTAO_CREDITO: 'Cartão Crédito',
  CARTAO_DEBITO: 'Cartão Débito',
};

export type ReceiptData = {
  sale: Sale;
  items: SaleItem[];
  deviceName?: string | null;
};

export default function ReceiptModal({
  data,
  onClose,
}: {
  data: ReceiptData;
  onClose: () => void;
}) {
  const { sale, items, deviceName } = data;
  const cancelled = sale.status === 'CANCELLED';

  const handlePrint = () => {
    const printContents = document.getElementById('receipt-print-area')?.innerHTML ?? '';
    const win = window.open('', '_blank', 'width=380,height=600');
    if (!win) return;
    win.document.write(`
      <!doctype html><html><head><meta charset="utf-8"><title>Cupom ${sale.id.slice(0, 8)}</title>
      <style>
        * { font-family: 'Courier New', monospace; box-sizing: border-box; }
        body { width: 300px; margin: 0 auto; padding: 12px; color: #000; }
        .center { text-align: center; }
        .bold { font-weight: bold; }
        .row { display: flex; justify-content: space-between; font-size: 12px; line-height: 1.5; }
        .divider { border-top: 1px dashed #000; margin: 8px 0; }
        .item { font-size: 12px; line-height: 1.4; }
        .item .name { font-weight: bold; }
        .cancelled { color: #dc2626; font-weight: bold; }
        h2 { font-size: 14px; margin: 4px 0; }
        p { margin: 2px 0; font-size: 12px; }
      </style></head><body>${printContents}</body></html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
      win.close();
    }, 250);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-brand-teal/10 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-brand-teal-dark dark:text-brand-teal-light" strokeWidth={2} />
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-white">Cupom da Venda</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" strokeWidth={2} />
          </button>
        </div>

        {/* Printable receipt */}
        <div id="receipt-print-area" className="p-5 font-mono text-sm text-slate-900 dark:text-slate-100">
          <div className="text-center mb-3">
            <p className="font-bold text-base">CELULAR TECH</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Dispositivo: {deviceName ?? 'N/A'}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {new Date(sale.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Cupom: #{sale.id.slice(0, 8)}</p>
            {cancelled && (
              <p className="cancelled text-xs font-bold mt-1">*** VENDA CANCELADA ***</p>
            )}
          </div>

          <div className="border-t border-dashed border-slate-300 dark:border-slate-600 my-3" />

          {items.map((item) => (
            <div key={item.id} className="mb-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-medium">{item.product_name}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>{item.quantity} x {BRL(item.unit_price)}</span>
                <span>{BRL(item.subtotal)}</span>
              </div>
            </div>
          ))}

          <div className="border-t border-dashed border-slate-300 dark:border-slate-600 my-3" />

          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{BRL(sale.subtotal)}</span>
            </div>
            {Number(sale.discount_value) > 0 && (
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                <span>Desconto ({sale.discount_type === 'percentage' ? '%' : 'R$'})</span>
                <span>- {BRL(sale.discount_value)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-sm pt-1">
              <span>TOTAL</span>
              <span>{BRL(sale.total_amount)}</span>
            </div>
          </div>

          <div className="border-t border-dashed border-slate-300 dark:border-slate-600 my-3" />

          <div className="text-xs space-y-1">
            <div className="flex justify-between">
              <span>Pagamento</span>
              <span>{PAYMENT_LABELS[sale.payment_method] ?? sale.payment_method}</span>
            </div>
            {sale.notes && (
              <div>
                <span className="text-slate-500 dark:text-slate-400">Obs: </span>
                <span>{sale.notes}</span>
              </div>
            )}
          </div>

          <div className="border-t border-dashed border-slate-300 dark:border-slate-600 my-3" />
          <p className="text-center text-xs text-slate-500 dark:text-slate-400">
            Obrigado pela preferência!
          </p>
          <p className="text-center text-[10px] text-slate-400 mt-1">Celular Tech © 2026</p>
        </div>

        {/* Actions */}
        <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-800 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            Fechar
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-brand-teal text-white font-medium text-sm shadow-sm hover:bg-brand-teal-dark transition-all active:scale-[0.98]"
          >
            <Printer className="w-4 h-4" strokeWidth={2.5} />
            Imprimir
          </button>
        </div>
      </div>
    </div>
  );
}
