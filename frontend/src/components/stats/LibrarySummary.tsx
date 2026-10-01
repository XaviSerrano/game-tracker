import React from 'react';
import { Library } from 'lucide-react';
import { GameStatus } from '../../types.ts';
import { STATUS_META } from './statusMeta.ts';

interface LibrarySummaryProps {
  counts: Record<GameStatus, number>;
}

const ORDER: GameStatus[] = ['PLAYING', 'PLAYED', 'COMPLETED', 'ABANDONED', 'WISHLIST'];

export const LibrarySummary: React.FC<LibrarySummaryProps> = ({ counts }) => {
  const total = ORDER.reduce((sum, status) => sum + counts[status], 0);

  return (
    <div className="bg-[#0f121d] border border-slate-850 p-5 rounded-2xl">
      <h3 className="font-semibold text-slate-300 font-display text-sm mb-4 flex items-center gap-1.5">
        <Library className="w-4.5 h-4.5 text-blue-400" /> Biblioteca
      </h3>

      {total === 0 ? (
        <p className="text-xs text-slate-500 text-center py-6">
          Tu biblioteca está vacía. Añade juegos para ver aquí su desglose.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {ORDER.map(status => {
            const meta = STATUS_META[status];
            return (
              <div
                key={status}
                className={`min-w-0 rounded-xl border ${meta.border} ${meta.bg} px-2 py-3 flex flex-col items-center gap-1.5 text-center`}
              >
                <meta.icon className={`w-4 h-4 ${meta.text}`} />
                <span className="text-lg font-black text-white font-display leading-none">{counts[status]}</span>
                <span
                  title={meta.label}
                  className="w-full truncate text-[9px] font-bold uppercase tracking-tight text-slate-400"
                >
                  {meta.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
