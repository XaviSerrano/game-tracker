import React, { useEffect, useMemo, useState } from 'react';
import { Clock, Trophy, Star, Flame } from 'lucide-react';
import { GameStatus } from '../types.ts';
import { KpiCard } from './stats/KpiCard.tsx';
import { ActivityChart } from './stats/ActivityChart.tsx';
import { GenreDistributionChart } from './stats/GenreDistributionChart.tsx';
import { RatingsDistributionChart } from './stats/RatingsDistributionChart.tsx';
import { PlayerProfileCard } from './stats/PlayerProfileCard.tsx';
import { LibrarySummary } from './stats/LibrarySummary.tsx';
import { MostPlayedList } from './stats/MostPlayedList.tsx';
import { TopRatedGames } from './stats/TopRatedGames.tsx';
import { RecentActivityTimeline } from './stats/RecentActivityTimeline.tsx';
import { StatsSkeleton } from './stats/StatsSkeleton.tsx';
import { StatsEmptyState } from './stats/EmptyState.tsx';
import { StatsData, TimeRange, RecentActivityItem } from './stats/types.ts';

interface StatsDashboardProps {
  userId: string;
  token: string;
  onSelectGame: (gameId: number) => void;
}

const TIME_RANGE_OPTIONS: { label: string; value: TimeRange }[] = [
  { label: 'Todo el tiempo', value: 'all' },
  { label: 'Este año', value: 'year' },
  { label: 'Últimos 6 meses', value: '6m' }
];

export const StatsDashboard: React.FC<StatsDashboardProps> = ({ userId, token, onSelectGame }) => {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>('all');

  useEffect(() => {
    let cancelled = false;

    const fetchStats = async () => {
      setLoading(true);

      try {
        const [statsRes, feedRes] = await Promise.all([
          fetch(`/api/users/${userId}/stats`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch(`/api/social/feed?userId=${userId}&scope=following`)
        ]);

        const statsData = await statsRes.json();

        if (!statsRes.ok) {
          throw new Error(statsData?.error || 'No se pudieron cargar las estadísticas.');
        }

        if (cancelled) return;
        setStats(statsData);

        if (feedRes.ok) {
          const feedData: RecentActivityItem[] = await feedRes.json();
          if (!cancelled) {
            setRecentActivity(feedData.filter(activity => activity.userId === userId).slice(0, 8));
          }
        }
      } catch (err) {
        console.error('Error cargando estadísticas:', err);
        if (!cancelled) setStats(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchStats();

    return () => {
      cancelled = true;
    };
  }, [userId, token]);

  const libraryCounts = useMemo<Record<GameStatus, number> | null>(() => {
    if (!stats) return null;

    return {
      WISHLIST: stats.wishlistCount,
      PLAYING: stats.playingCount,
      PLAYED: stats.playedCount,
      COMPLETED: stats.completedCount,
      ABANDONED: stats.abandonedCount
    };
  }, [stats]);

  if (loading) {
    return <StatsSkeleton />;
  }

  if (!stats || !libraryCounts) {
    return <StatsEmptyState />;
  }

  return (
    <div className="space-y-6 pb-20 selection:bg-blue-600 selection:text-white">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold font-display text-white tracking-tight">Tus estadísticas</h2>
          <p className="text-slate-400 text-xs mt-1">
            Análisis visual de tus hábitos, plataformas y horas dedicadas de juego
          </p>
        </div>

        <div className="flex items-center gap-1 bg-slate-900/60 border border-slate-850 rounded-xl p-1 self-start">
          {TIME_RANGE_OPTIONS.map(option => (
            <button
              key={option.value}
              type="button"
              onClick={() => setTimeRange(option.value)}
              className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition cursor-pointer whitespace-nowrap ${
                timeRange === option.value
                  ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
                  : 'text-slate-500 hover:text-slate-300 border border-transparent'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={Clock}
          label="Horas jugadas"
          value={`${stats.totalHours.toLocaleString()}h`}
          secondary={stats.averageHoursPerGame > 0 ? `~${stats.averageHoursPerGame}h de media por juego` : undefined}
          accent="blue"
        />

        <KpiCard
          icon={Trophy}
          label="Juegos completados"
          value={`${stats.completedCount}`}
          secondary={`${stats.completionRate}% de ratio de finalización`}
          accent="emerald"
        />

        <KpiCard
          icon={Star}
          label="Rating medio"
          value={stats.ratedGamesCount > 0 ? `${stats.averageRating.toFixed(1)}/5` : '—'}
          secondary={stats.ratedGamesCount > 0 ? `Basado en ${stats.ratedGamesCount} juegos` : 'Aún sin valoraciones'}
          accent="amber"
        />

        <KpiCard
          icon={Flame}
          label="Juego más jugado"
          value={stats.mostPlayedGame ? stats.mostPlayedGame.name : '—'}
          secondary={stats.mostPlayedGame ? `${stats.mostPlayedGame.hoursPlayed}h jugadas` : 'Registra horas de juego'}
          accent="violet"
        />
      </div>

      {/* Actividad de juego */}
      <div className="grid grid-cols-1 gap-6">
        <ActivityChart data={stats.monthlyActivity} timeRange={timeRange} />
      </div>

      {/* Perfil de jugador + distribuciones */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <PlayerProfileCard
          favoriteGenre={stats.favoriteGenre}
          favoritePlatform={stats.favoritePlatform}
          averageRating={stats.averageRating}
          ratedGamesCount={stats.ratedGamesCount}
          averageHoursPerGame={stats.averageHoursPerGame}
          completionRate={stats.completionRate}
        />
        <GenreDistributionChart data={stats.genresDistribution} />
        <RatingsDistributionChart data={stats.ratingsDistribution} />
      </div>

      {/* Ranking de horas y biblioteca */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MostPlayedList games={stats.mostPlayedGames} onSelectGame={onSelectGame} />
        <LibrarySummary counts={libraryCounts} />
      </div>

      {/* Mejor puntuados */}
      <TopRatedGames games={stats.topRatedGames} onSelectGame={onSelectGame} />

      {/* Actividad reciente */}
      <RecentActivityTimeline activities={recentActivity} />
    </div>
  );
};
