import { Package } from 'lucide-react';

export function CategoryIcon({
  category,
  size = 'md',
}: {
  category: string | null;
  size?: 'sm' | 'md' | 'lg';
}) {
  const Icon = Package;
  const dim = size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-14 h-14' : 'w-10 h-10';
  const iconDim = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-7 h-7' : 'w-5 h-5';

  return (
    <div aria-label={category ?? 'Sem categoria'} className={`${dim} rounded-lg bg-gradient-to-br from-brand-blue/30 to-brand-teal/20 flex items-center justify-center shrink-0`}>
      <Icon className={`${iconDim} text-brand-teal-dark dark:text-brand-teal-light`} strokeWidth={1.8} />
    </div>
  );
}
