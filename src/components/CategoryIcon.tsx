import { Smartphone, Headphones, Tag, Cable, BatteryCharging, Speaker, Package } from 'lucide-react';

const CATEGORY_MAP: Record<string, { icon: typeof Smartphone; gradient: string }> = {
  Smartphones: { icon: Smartphone, gradient: 'from-brand-blue/40 to-brand-teal/30' },
  Áudio: { icon: Headphones, gradient: 'from-purple-400/30 to-brand-teal/30' },
  Acessórios: { icon: Cable, gradient: 'from-emerald-400/30 to-brand-teal/30' },
  Carregadores: { icon: BatteryCharging, gradient: 'from-amber-400/30 to-brand-teal/30' },
  Caixas: { icon: Speaker, gradient: 'from-rose-400/30 to-brand-teal/30' },
};

export const CATEGORIES = Object.keys(CATEGORY_MAP);

export function CategoryIcon({
  category,
  size = 'md',
}: {
  category: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const cfg = CATEGORY_MAP[category] ?? { icon: Package, gradient: 'from-brand-blue/30 to-brand-teal/20' };
  const Icon = cfg.icon;
  const dim = size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-14 h-14' : 'w-10 h-10';
  const iconDim = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-7 h-7' : 'w-5 h-5';

  return (
    <div className={`${dim} rounded-lg bg-gradient-to-br ${cfg.gradient} flex items-center justify-center shrink-0`}>
      <Icon className={`${iconDim} text-brand-teal-dark dark:text-brand-teal-light`} strokeWidth={1.8} />
    </div>
  );
}
