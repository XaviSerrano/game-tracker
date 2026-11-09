import React, { useMemo, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { MonthlyActivityPoint, ActivityMetric, TimeRange } from './types.ts';
import { useLanguage } from '../../i18n.tsx';
import { ChartDataTable } from './ChartDataTable.tsx';

interface ActivityChartProps {
  data: MonthlyActivityPoint[];
  timeRange: TimeRange;
}

const METRIC_CONFIG: Record<ActivityMetric, { label: string; suffix: string; color: string }> = {
  hours: { label: 'Horas jugadas', suffix: 'h', color: '#3b82f6' },
  completed: { label: 'Juegos completados', suffix: '', color: '#10b981' },
  added: { label: 'Juegos añadidos', suffix: '', color: '#8b5cf6' }
};

function filterByTimeRange(data: MonthlyActivityPoint[], timeRange: TimeRange): MonthlyActivityPoint[] {
  if (timeRange === '6m') {
    return data.slice(-6);
  }

  if (timeRange === 'year') {
    const currentYear = new Date().getFullYear();
    return data.filter(point => point.monthKey.startsWith(String(currentYear)));
  }

  return data;
}

export const ActivityChart: React.FC<ActivityChartProps> = ({ data, timeRange }) => {
  const { t } = useLanguage();
  const [metric, setMetric] = useState<ActivityMetric>('hours');

  const filteredData = useMemo(() => filterByTimeRange(data, timeRange), [data, timeRange]);
  const config = METRIC_CONFIG[metric];
  const hasData = filteredData.some(point => point[metric] > 0);

  return (
    <div className="lg:col-span-2 bg-[#0f121d] border border-slate-850 p-5 rounded-2xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-semibold text-slate-300 font-display text-sm flex items-center gap-1.5">
          <TrendingUp className="w-4.5 h-4.5 text-blue-400" /> {t('Actividad de juego')}
        </h3>

        <div className="flex flex-wrap items-center gap-1 bg-slate-900/60 border border-slate-850 rounded-xl p-1">
          {(Object.keys(METRIC_CONFIG) as ActivityMetric[]).map(key => (
            <button
              key={key}
              type="button"
              aria-pressed={metric === key}
              onClick={() => setMetric(key)}
              className={`min-h-11 text-sm sm:min-h-0 sm:text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                metric === key
                  ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
                  : 'text-slate-400 hover:text-slate-300 border border-transparent'
              }`}
            >
              {t(METRIC_CONFIG[key].label)}
            </button>
          ))}
        </div>
      </div>

      <div className="h-72 w-full">
        {!hasData ? (
          <div className="h-full flex items-center justify-center text-base sm:text-xs text-slate-400 text-center px-6">
            {t('Todavía no hay datos de')} "{t(config.label).toLowerCase()}" {t('en este periodo.')}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={filteredData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorActivity" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={config.color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={config.color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#1c1f26" strokeDasharray="3 3" />
              <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#07090e', borderColor: '#1e293b', borderRadius: '12px' }}
                labelStyle={{ color: '#94a3b8', fontSize: '11px', fontWeight: 'bold' }}
                formatter={(value: number) => [`${value}${config.suffix}`, t(config.label)]}
              />
              <Area
                type="monotone"
                dataKey={metric}
                stroke={config.color}
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorActivity)"
                name={t(config.label)}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
      {hasData && (
        <ChartDataTable
          label={t('Actividad de juego')}
          categoryLabel={t('Mes')}
          valueLabel={t(config.label)}
          rows={filteredData.map(point => ({ label: point.label, value: `${point[metric]}${config.suffix}` }))}
        />
      )}
    </div>
  );
};
