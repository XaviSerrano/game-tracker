import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Star } from 'lucide-react';
import { RatingBucket } from './types.ts';

interface RatingsDistributionChartProps {
  data: RatingBucket[];
}

export const RatingsDistributionChart: React.FC<RatingsDistributionChartProps> = ({ data }) => {
  const totalRated = data.reduce((total, bucket) => total + bucket.count, 0);
  const chartData = data.map(bucket => ({ ...bucket, label: `${bucket.stars}★` }));

  return (
    <div className="bg-[#0f121d] border border-slate-850 p-5 rounded-2xl flex flex-col">
      <h3 className="font-semibold text-slate-300 font-display text-sm flex items-center gap-1.5">
        <Star className="w-4.5 h-4.5 text-yellow-500 fill-yellow-500/20" /> Distribución de valoraciones
      </h3>

      {totalRated === 0 ? (
        <p className="text-xs text-slate-500 py-10 text-center">
          Puntúa tus juegos de 1 a 5 estrellas para ver aquí cómo se reparten.
        </p>
      ) : (
        <div className="h-48 w-full mt-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                cursor={{ fill: 'rgba(234, 179, 8, 0.06)' }}
                contentStyle={{ backgroundColor: '#07090e', borderColor: '#1e293b', borderRadius: '10px', fontSize: '11px' }}
                formatter={(value: number) => [`${value} juego${value === 1 ? '' : 's'}`, 'Total']}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={32}>
                {chartData.map(bucket => (
                  <Cell key={bucket.stars} fill={bucket.stars >= 4 ? '#eab308' : bucket.stars === 3 ? '#f59e0b' : '#64748b'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
