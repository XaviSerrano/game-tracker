import React, { useEffect, useState } from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Clock, Trophy, Gamepad2, Heart, Star, Sparkles, TrendingUp } from 'lucide-react';
import { User } from '../types.ts';

interface StatsDashboardProps {
  userId: string;
  token: string;
}

export const StatsDashboard: React.FC<StatsDashboardProps> = ({ userId, token }) => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/users/${userId}/stats`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [userId]);

  const COLORS = ['#3b82f6', '#4f46e5', '#8b5cf6', '#a855f7', '#ec4899', '#f43f5e', '#f97316'];

  if (loading) {
    return (
      <div className="space-y-6 pb-20 animate-pulse selection:bg-blue-600 selection:text-white">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-slate-850 rounded-2xl w-full"></div>
          ))}
        </div>
        <div className="h-72 bg-slate-850 rounded-2xl w-full"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12 text-slate-500">
        <p>No se pudieron calcular estadísticas. Comienza a completar juegos en tu biblioteca.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 selection:bg-blue-600 selection:text-white">
      {/* Title Header */}
      <div>
        <h2 className="text-2xl font-bold font-display text-white tracking-tight">Estadísticas e Historial</h2>
        <p className="text-slate-400 text-xs">Análisis visual profundo de tus hábitos, plataformas y horas dedicadas de juego</p>
      </div>

      {/* Numerical Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Hours Played */}
        <div className="bg-[#0f121d] border border-slate-850 p-4 rounded-2xl flex items-center gap-3.5 block relative overflow-hidden">
          <div className="p-2.5 bg-blue-600/15 text-blue-400 rounded-xl border border-blue-500/20 flex-shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Horas totales</span>
            <span className="text-xl font-black text-white font-display leading-tight">{stats.totalHours.toLocaleString()}h</span>
          </div>
        </div>

        {/* Completions */}
        <div className="bg-[#0f121d] border border-slate-850 p-4 rounded-2xl flex items-center gap-3.5 block relative overflow-hidden">
          <div className="p-2.5 bg-emerald-600/15 text-emerald-400 rounded-xl border border-emerald-500/20 flex-shrink-0">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Completados</span>
            <span className="text-xl font-black text-white font-display leading-tight">{stats.completedCount} juegos</span>
          </div>
        </div>

        {/* Favorite genre */}
        <div className="bg-[#0f121d] border border-slate-850 p-4 rounded-2xl flex items-center gap-3.5 block relative overflow-hidden">
          <div className="p-2.5 bg-violet-600/15 text-violet-400 rounded-xl border border-violet-500/20 flex-shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Género favorito</span>
            <span className="text-sm font-black text-white font-display truncate block leading-tight">{stats.favoriteGenre}</span>
          </div>
        </div>

        {/* Favorite Platform */}
        <div className="bg-[#0f121d] border border-slate-850 p-4 rounded-2xl flex items-center gap-3.5 block relative overflow-hidden">
          <div className="p-2.5 bg-indigo-600/15 text-indigo-400 rounded-xl border border-indigo-500/20 flex-shrink-0">
            <Gamepad2 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Plataforma estrella</span>
            <span className="text-sm font-black text-white font-display truncate block leading-tight">{stats.favoritePlatform}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Evolution monthly chart (Area) */}
        <div className="lg:col-span-2 bg-[#0f121d] border border-slate-850 p-5 rounded-2xl space-y-4">
          <h3 className="font-semibold text-slate-300 font-display text-sm flex items-center gap-1.5">
            <TrendingUp className="w-4.5 h-4.5 text-blue-400" /> gaming evolución horas
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.monthlyStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" stroke="#475569" fontSize={10} tickLine={false} />
                <YAxis stroke="#475569" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#07090e', borderColor: '#1e293b', borderRadius: '12px' }}
                  labelStyle={{ color: '#94a3b8', fontSize: '11px', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="hours" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorHours)" name="Horas Jugadas" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Genres Pie Saturation */}
        <div className="bg-[#0f121d] border border-slate-850 p-5 rounded-2xl flex flex-col justify-between">
          <h3 className="font-semibold text-slate-350 font-display text-sm">Distribución de Géneros</h3>
          {stats.genresDistribution.length === 0 ? (
            <p className="text-xs text-slate-500 py-10 text-center">Registra juegos en tu estante para mapear saturaciones.</p>
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 mt-3">
              <div className="h-40 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.genresDistribution.slice(0, 5)}
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {stats.genresDistribution.slice(0, 5).map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#07090e', borderColor: '#1e293b', borderRadius: '8px', fontSize: '10px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legend highlights */}
              <div className="grid grid-cols-2 gap-2 mt-4 w-full">
                {stats.genresDistribution.slice(0, 4).map((item: any, idx: number) => (
                  <div key={item.name} className="flex items-center gap-1.5 text-[10px]">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                    <span className="text-slate-400 truncate flex-1">{item.name}</span>
                    <span className="font-bold text-white font-mono">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Top Rated library titles */}
      <div className="bg-[#0f121d] border border-slate-850 p-5 rounded-2xl">
        <h3 className="font-semibold text-slate-300 font-display text-sm mb-4 flex items-center gap-1.5">
          <Star className="w-4.5 h-4.5 text-yellow-500 fill-yellow-500/20" /> Mis juegos mejor puntuados
        </h3>
        {stats.topRatedGames.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-6">Puntúa tus juegos de 1 a 5 estrellas para verlos listados aquí.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
            {stats.topRatedGames.map((game: any) => (
              <div
                key={game.gameId}
                className="bg-[#07090e]/60 border border-slate-850 p-2.5 rounded-xl flex sm:flex-col items-center gap-3"
              >
                <img
                  src={game.cover}
                  alt={game.name}
                  referrerPolicy="no-referrer"
                  className="w-10 sm:w-full h-14 sm:aspect-[3/4] object-cover rounded shadow"
                />
                <div className="flex-1 sm:w-full text-left sm:text-center min-w-0">
                  <h4 className="text-xs font-bold text-white truncate">{game.name}</h4>
                  <div className="flex items-center sm:justify-center gap-1 text-yellow-400 mt-1">
                    <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-500 animate-pulse" />
                    <span className="text-xs font-bold text-white">{game.myRating}</span>
                    <span className="text-[10px] text-slate-600">/5</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
