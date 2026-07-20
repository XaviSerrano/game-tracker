import React, { useEffect, useState } from 'react';
import { Game, Activity, User, UserGame } from '../types.ts';
import { Heart, Stars, Users, Globe, ExternalLink } from 'lucide-react';
import { SpotlightPanel } from './SpotlightPanel.tsx';
import { ParticleBackdrop } from './ParticleBackdrop.tsx';
import { ShimmerText } from './ShimmerText.tsx';
import { TiltCard } from './TiltCard.tsx';

interface HomeFeedProps {
  currentUser: User;
  onSelectGame: (gameId: number) => void;
  onSelectUser: (userId: string) => void;
  users: User[];
  token: string;
}

type FeedActivity = Activity & {
  author?: User | null;
  targetUser?: User | null;
};

export const HomeFeed: React.FC<HomeFeedProps> = ({ currentUser, onSelectGame, onSelectUser, users, token }) => {
  const [feedScope, setFeedScope] = useState<'all' | 'following'>('all');
  const [activities, setActivities] = useState<FeedActivity[]>([]);
  const [recs, setRecs] = useState<{ game: Game; score: number }[]>([]);
  const [activityGames, setActivityGames] = useState<Record<number, Game>>({});
  const [loading, setLoading] = useState(true);

  const fetchFeedAndRecs = async () => {
    setLoading(true);
    try {
      // 1. Fetch Feed
      const feedRes = await fetch(`/api/social/feed?userId=${currentUser.id}&scope=${feedScope}`);
      const feedData = await feedRes.json();
      setActivities(Array.isArray(feedData) ? feedData : []);

      const activityGameIds = Array.isArray(feedData)
        ? Array.from(new Set(feedData
            .map((activity: Activity) => activity.gameId)
            .filter((gameId: number | undefined): gameId is number => typeof gameId === 'number')))
        : [];

      if (activityGameIds.length > 0) {
        const detailsResponses = await Promise.allSettled(
          activityGameIds.map(async (gameId) => {
            const gameRes = await fetch(`/api/games/${gameId}`);
            if (!gameRes.ok) {
              throw new Error(`No se pudo cargar juego ${gameId}`);
            }
            const gameData = await gameRes.json();
            return gameData as Game;
          })
        );

        const resolvedGames: Record<number, Game> = {};
        detailsResponses.forEach((result) => {
          if (result.status === 'fulfilled' && typeof result.value?.igdbId === 'number') {
            resolvedGames[result.value.igdbId] = result.value;
          }
        });
        setActivityGames(resolvedGames);
      } else {
        setActivityGames({});
      }

      // 2. Fetch recommendations
      const recsRes = await fetch('/api/recommendations', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (recsRes.ok) {
        const recsData = await recsRes.json();
        setRecs(recsData.slice(0, 5));
      }
    } catch (err) {
      console.error("Error fetching feed/recs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedAndRecs();
  }, [feedScope]);

  const mapUserIdToUser = (uid: string, resolvedUser?: User | null) => {
    return resolvedUser || users.find(u => u.id === uid) || {
      id: uid,
      username: 'usuario',
      avatar: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=user',
      bio: ''
    };
  };

  const renderActivityDescription = (act: FeedActivity) => {
    const actor = mapUserIdToUser(act.userId, act.author);
    let nameMarkup = (
      <button 
        onClick={() => onSelectUser(act.userId)}
        className="font-bold text-white hover:text-blue-400 text-left transition cursor-pointer"
      >
        @{actor.username}
      </button>
    );

    if (act.type === 'FOLLOWED' && act.targetUserId) {
      const target = mapUserIdToUser(act.targetUserId, act.targetUser);
      return (
        <span className="text-xs text-slate-300">
          {nameMarkup} comenzó a seguir a <button onClick={() => onSelectUser(act.targetUserId)} className="font-bold text-white hover:text-blue-400 transition cursor-pointer">@{target.username}</button>
        </span>
      );
    }

    if (act.gameId) {
      return (
        <span className="text-xs text-slate-300">
          {nameMarkup} {act.details || 'actualizó su biblioteca'}
        </span>
      );
    }

    return (
      <span className="text-xs text-slate-300">
        {nameMarkup} {act.details || 'realizó una acción social'}
      </span>
    );
  };

  return (
    <div className="space-y-6 pb-20 selection:bg-blue-600 selection:text-white">
      {/* Welcome Hero card */}
      <SpotlightPanel className="bg-gradient-to-r from-slate-900 via-[#0f121d] to-[#07090e] border border-slate-800 p-6 rounded-2xl">
        <ParticleBackdrop className="opacity-70" count={18} />
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-500/20">
              Activo hoy
            </span>
            <h2 className="text-2xl md:text-3xl font-bold font-display text-white mt-3 tracking-tight">
              ¡Hola de <ShimmerText>nuevo</ShimmerText>, @{currentUser.username}!
            </h2>
            <p className="text-slate-400 text-xs mt-1 md:max-w-md">
              Echa un vistazo a la actividad reciente de tus compañeros y explora tu motor de recomendación personalizado.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFeedScope('all')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition flex items-center gap-1.5 border ${feedScope === 'all' ? 'bg-blue-600 text-white border-blue-500Shadow' : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'}`}
            >
              <Globe className="w-3.5 h-3.5" /> General
            </button>
            <button
              onClick={() => setFeedScope('following')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition flex items-center gap-1.5 border ${feedScope === 'following' ? 'bg-blue-600 text-white border-blue-500Shadow' : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'}`}
            >
              <Users className="w-3.5 h-3.5" /> Siguiendo
            </button>
          </div>
        </div>
      </SpotlightPanel>

      {/* Grid container */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity feed column */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-300 font-display flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-500"></span>
              {feedScope === 'all' ? 'Actividad de la Comunidad' : 'Actividad de tus Seguidos'}
            </h3>
            <button
              onClick={fetchFeedAndRecs}
              className="text-xs text-slate-500 hover:text-blue-400 transition"
            >
              Actualizar Feed
            </button>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-[#0f121d] border border-slate-850 p-4 rounded-xl animate-pulse space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-slate-800"></div>
                    <div className="space-y-1.5 flex-1">
                      <div className="h-3 bg-slate-800 rounded w-1/3"></div>
                      <div className="h-3 bg-slate-800 rounded w-2/3"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : activities.length === 0 ? (
            <div className="bg-[#0f121d] border border-slate-800 border-dashed p-10 rounded-xl text-center space-y-2">
              <Users className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-slate-400 text-sm font-semibold">No hay actividad reciente</p>
              <p className="text-slate-500 text-xs text-center max-w-xs mx-auto">
                {feedScope === 'following'
                  ? 'Aún no sigues a ningún gamer o no han compartido aventuras de juego todavía. ¡Prueba a cambiar a General!'
                  : 'Registra tus primeros progresos o sigue a otros gamers para ver actividad.'}
              </p>
              {feedScope === 'following' && (
                <button
                  onClick={() => setFeedScope('all')}
                  className="px-4 py-2 mt-2 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-500 transition cursor-pointer"
                >
                  Ver Actividad General
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {activities.map(act => {
                const actor = mapUserIdToUser(act.userId, act.author);
                const relatedGame = typeof act.gameId === 'number' ? activityGames[act.gameId] : undefined;
                return (
                  <div
                    key={act.id}
                    className="bg-[#0f121d] border border-slate-850 hover:border-slate-800 p-4 rounded-xl transition flex gap-3 block"
                  >
                    <button
                      onClick={() => onSelectUser(act.userId)}
                      className="flex-shrink-0 cursor-pointer"
                    >
                      <img
                        src={actor.avatar}
                        alt={actor.username}
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 rounded-full border border-slate-800"
                      />
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="truncate leading-normal">
                          {renderActivityDescription(act)}
                        </div>
                        <span className="text-[10px] text-slate-600 flex-shrink-0">
                          {new Date(act.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                      </div>

                      {/* Details view for game completions or reviews */}
                      {act.gameId && (
                        <div className="mt-3 flex gap-3 p-2 rounded-lg bg-[#07090e]/60 border border-slate-800/50 hover:bg-[#07090e]/90 cursor-pointer transition"
                             onClick={() => act.gameId && onSelectGame(act.gameId)}>
                          <img
                            src={relatedGame?.cover || 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1u0f.jpg'}
                            alt={relatedGame?.name || `Juego ${act.gameId}`}
                            referrerPolicy="no-referrer"
                            className="w-10 h-14 rounded object-cover border border-slate-800 flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              {relatedGame?.name && (
                                <p className="text-[10px] text-slate-500 truncate">{relatedGame.name}</p>
                              )}
                              <p className="text-xs font-bold text-white hover:text-blue-400 transition truncate">
                                Ver juego en el catálogo
                              </p>
                              <p className="text-[10px] text-slate-500 mt-0.5">
                                Ver puntuaciones medias, plataformas y añadir a biblioteca
                              </p>
                            </div>
                            <ExternalLink className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Personalized recommendations & stats snippet column */}
        <div className="space-y-6">
          {/* Smart recommendation widget */}
          <TiltCard className="rounded-2xl">
            <div className="bg-[#0f121d] border border-slate-800 p-5 rounded-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none"></div>
              <div className="flex items-center justify-between mb-4 relative z-10">
                <h3 className="font-semibold text-slate-300 font-display flex items-center gap-2">
                  <Stars className="w-4 h-4 text-indigo-400" />
                  Tu <ShimmerText className="font-semibold">Rincón Inteligente</ShimmerText>
                </h3>
                <span className="text-[9px] bg-indigo-500/15 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full font-bold">
                  HÍBRIDO 40-35-25%
                </span>
              </div>

              {loading ? (
                <div className="space-y-2.5">
                  {[1, 2].map(i => (
                    <div key={i} className="flex gap-2.5 animate-pulse">
                      <div className="w-10 h-14 bg-slate-800 rounded"></div>
                      <div className="space-y-1.5 flex-1 py-1">
                        <div className="h-3 bg-slate-800 rounded w-2/3"></div>
                        <div className="h-2.5 bg-slate-800 rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : recs.length === 0 ? (
                <div className="text-center py-4 space-y-1">
                  <Stars className="w-6 h-6 text-slate-700 mx-auto" />
                  <p className="text-slate-500 text-xs">Registra nuevos ratings en tu biblioteca para habilitar recomendaciones personalizadas por similitud cosine.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recs.map(({ game, score }) => (
                    <button
                      key={game.igdbId}
                      onClick={() => onSelectGame(game.igdbId)}
                      className="w-full text-left flex gap-3 p-2 bg-[#07090e]/40 hover:bg-[#07090e] border border-slate-800/40 rounded-xl transition group cursor-pointer"
                    >
                      <img
                        src={game.cover}
                        alt={game.name}
                        referrerPolicy="no-referrer"
                        className="w-10 h-14 rounded object-cover shadow border border-slate-850 group-hover:scale-105 transition"
                      />
                      <div className="flex-1 min-w-0 py-0.5">
                        <h4 className="text-xs font-bold text-white group-hover:text-blue-400 transition truncate">
                          {game.name}
                        </h4>
                        <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider truncate font-mono">
                          {game.genres.slice(0, 2).join(' / ')}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500"
                              style={{ width: `${score}%` }}
                            ></div>
                          </div>
                          <span className="text-[9px] font-bold text-indigo-400 font-mono">
                            {score}% coincidencia
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </TiltCard>

        </div>
      </div>
    </div>
  );
};
