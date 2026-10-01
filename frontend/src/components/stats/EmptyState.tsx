import React from 'react';
import { BarChart3 } from 'lucide-react';

interface StatsEmptyStateProps {
  message?: string;
}

export const StatsEmptyState: React.FC<StatsEmptyStateProps> = ({
  message = 'No se pudieron calcular estadísticas. Comienza a completar juegos en tu biblioteca.'
}) => (
  <div className="text-center py-20 text-slate-500 flex flex-col items-center gap-3">
    <div className="p-3 bg-slate-900/60 border border-slate-850 rounded-2xl">
      <BarChart3 className="w-6 h-6 text-slate-600" />
    </div>
    <p className="max-w-sm text-sm">{message}</p>
  </div>
);
