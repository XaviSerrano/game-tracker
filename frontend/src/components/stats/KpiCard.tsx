import React from 'react';
import { LucideIcon } from 'lucide-react';

interface KpiCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  secondary?: string;
  accent?: 'blue' | 'emerald' | 'violet' | 'amber';
}

const ACCENT_CLASSES: Record<NonNullable<KpiCardProps['accent']>, { bg: string; text: string; border: string }> = {
  blue: { bg: 'bg-blue-600/15', text: 'text-blue-400', border: 'border-blue-500/20' },
  emerald: { bg: 'bg-emerald-600/15', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  violet: { bg: 'bg-violet-600/15', text: 'text-violet-400', border: 'border-violet-500/20' },
  amber: { bg: 'bg-amber-600/15', text: 'text-amber-400', border: 'border-amber-500/20' }
};

export const KpiCard: React.FC<KpiCardProps> = ({ icon: Icon, label, value, secondary, accent = 'blue' }) => {
  const colors = ACCENT_CLASSES[accent];

  return (
    <div className="bg-[#0f121d] border border-slate-850 p-4 rounded-2xl flex items-center gap-3.5 relative overflow-hidden transition hover:border-slate-700 hover:translate-y-[-1px] duration-200">
      <div className={`p-2.5 ${colors.bg} ${colors.text} rounded-xl border ${colors.border} flex-shrink-0`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">{label}</span>
        <span className="text-xl font-black text-white font-display leading-tight truncate block" title={value}>
          {value}
        </span>
        {secondary && (
          <span className="text-[10px] text-slate-500 truncate block mt-0.5">{secondary}</span>
        )}
      </div>
    </div>
  );
};
