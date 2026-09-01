import { Eye } from 'lucide-react';

export default function ReadOnlyBanner() {
  return (
    <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/60 px-4 py-2">
      <div className="flex items-center justify-center gap-2 text-center">
        <Eye className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" strokeWidth={2} />
        <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
          Modo de Leitura Ativo: Ações de cadastro e venda estão temporariamente suspensas.
        </p>
      </div>
    </div>
  );
}
