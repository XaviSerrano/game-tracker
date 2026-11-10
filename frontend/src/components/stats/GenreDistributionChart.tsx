import React, { useMemo } from 'react';
import { Sparkles } from 'lucide-react';
import { DistributionItem } from './types.ts';
import { useLanguage } from '../../i18n.tsx';

interface GenreDistributionChartProps {
  data: DistributionItem[];
  totalGames: number;
}

const MAX_VISIBLE_GENRES = 6;
const COLORS = ['#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899'];

const byValueThenName = (a: DistributionItem, b: DistributionItem) =>
  b.value - a.value || a.name.localeCompare(b.name);

export const GenreDistributionChart: React.FC<GenreDistributionChartProps> = ({ data, totalGames }) => {
  const { t } = useLanguage();

  const { visible, hiddenCount } = useMemo(() => {
    const sorted = [...data].sort(byValueThenName);
    const base = Math.max(totalGames, ...sorted.map(item => item.value), 1);
    const shown = sorted.slice(0, MAX_VISIBLE_GENRES);

    return {
      visible: shown.map(item => ({
        ...item,
        percent: Math.round((item.value / base) * 100),
        width: (item.value / base) * 100
      })),
      hiddenCount: sorted.length - shown.length
    };
  }, [data, totalGames]);

  return (
    <div className="bg-[#0f121d] border border-slate-850 p-5 rounded-2xl flex flex-col">
      <h3 className="font-semibold text-slate-300 font-display text-sm flex items-center gap-1.5">
        <Sparkles className="w-4.5 h-4.5 text-violet-400" /> {t('Distribución de géneros')}
      </h3>

      {data.length === 0 ? (
        <p className="text-base sm:text-xs text-slate-400 py-10 text-center">
          {t('Registra juegos en tu biblioteca para mapear tus géneros favoritos.')}
        </p>
      ) : (
        <>
          <ul className="mt-4 space-y-3">
            {visible.map((item, index) => (
              <li key={item.name}>
                <div className="flex items-baseline justify-between gap-3 text-xs">
                  <span className="min-w-0 truncate font-medium text-slate-200" title={t(item.name)}>
                    {t(item.name)}
                  </span>
                  <span className="shrink-0 tabular-nums text-slate-400">
                    <span className="font-semibold text-slate-200">{item.value}</span>
                    <span className="ml-1.5">{item.percent}%</span>
                  </span>
                </div>
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-800/70">
                  <div
                    className="h-full rounded-full transition-[width] duration-500"
                    style={{
                      width: `${Math.max(item.width, 2)}%`,
                      backgroundColor: COLORS[index % COLORS.length]
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>

          <p className="mt-3 text-[11px] leading-snug text-slate-500">
            {hiddenCount > 0 && `+${hiddenCount} ${t('géneros más')} · `}
            {t('% sobre los juegos de tu biblioteca; un juego puede tener varios géneros.')}
          </p>
        </>
      )}
    </div>
  );
};
