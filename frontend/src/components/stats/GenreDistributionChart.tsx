import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Sparkles } from 'lucide-react';
import { DistributionItem } from './types.ts';

interface GenreDistributionChartProps {
  data: DistributionItem[];
}

const MAX_VISIBLE_GENRES = 8;
const COLORS = ['#3b82f6', '#60a5fa', '#818cf8', '#a78bfa', '#c084fc', '#e879f9', '#f472b6', '#fb923c', '#64748b'];

function groupDistribution(data: DistributionItem[]): DistributionItem[] {
  const sorted = [...data].sort((a, b) => b.value - a.value);

  if (sorted.length <= MAX_VISIBLE_GENRES) {
    return sorted;
  }

  const visible = sorted.slice(0, MAX_VISIBLE_GENRES);
  const rest = sorted.slice(MAX_VISIBLE_GENRES);
  const othersTotal = rest.reduce((total, item) => total + item.value, 0);

  return [...visible, { name: 'Otros', value: othersTotal }];
}

export const GenreDistributionChart: React.FC<GenreDistributionChartProps> = ({ data }) => {
  const chartData = useMemo(() => groupDistribution(data).reverse(), [data]);
  const chartHeight = Math.max(chartData.length * 32, 160);

  return (
    <div className="bg-[#0f121d] border border-slate-850 p-5 rounded-2xl flex flex-col">
      <h3 className="font-semibold text-slate-300 font-display text-sm flex items-center gap-1.5">
        <Sparkles className="w-4.5 h-4.5 text-violet-400" /> Distribución de géneros
      </h3>

      {data.length === 0 ? (
        <p className="text-xs text-slate-500 py-10 text-center">
          Registra juegos en tu biblioteca para mapear tus géneros favoritos.
        </p>
      ) : (
        <div className="w-full mt-3" style={{ height: chartHeight }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
              <XAxis type="number" hide allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="name"
                stroke="#94a3b8"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                width={100}
              />
              <Tooltip
                cursor={{ fill: 'rgba(59, 130, 246, 0.06)' }}
                contentStyle={{ backgroundColor: '#07090e', borderColor: '#1e293b', borderRadius: '10px', fontSize: '11px' }}
                formatter={(value: number) => [`${value} juego${value === 1 ? '' : 's'}`, 'Total']}
              />
              <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={14}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={entry.name}
                    fill={entry.name === 'Otros' ? '#475569' : COLORS[index % COLORS.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
