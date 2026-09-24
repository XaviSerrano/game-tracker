import React, { useEffect, useState } from 'react';
import { Activity, User } from '../types.ts';
import {
  Users,
  Globe,
  Search,
  RefreshCw,
  Star,
  ChevronRight
} from 'lucide-react';
import { SpotlightPanel } from './SpotlightPanel.tsx';
import { ParticleBackdrop } from './ParticleBackdrop.tsx';
import { ShimmerText } from './ShimmerText.tsx';

interface HomeFeedProps {
  currentUser: User;
  onSelectGame: (gameId: number) => void;
  onSelectUser: (userId: string) => void;
  users: User[];
  token: string;
  onDiscover: () => void;
}

type FeedActivity = Activity & {
  author?: User | null;
  targetUser?: User | null;
};

export const HomeFeed: React.FC<HomeFeedProps> = ({
  currentUser,
  onSelectGame,
  onSelectUser,
  users,
  onDiscover
}) => {
  const [feedScope, setFeedScope] =
    useState<'all' | 'following'>('all');

  const [activities, setActivities] =
    useState<FeedActivity[]>([]);

  const [activityGames, setActivityGames] =
    useState<Record<number, any>>({});

  const [loading, setLoading] = useState(true);

  const fetchFeed = async () => {
    setLoading(true);

    try {
      const feedRes = await fetch(
        `/api/social/feed?userId=${currentUser.id}&scope=${feedScope}`
      );

      const feedData = await feedRes.json();

      const safeActivities = Array.isArray(feedData)
        ? feedData
        : [];

      setActivities(safeActivities);

      const activityGameIds = Array.from(
        new Set(
          safeActivities
            .map(
              (activity: Activity) => activity.gameId
            )
            .filter(
              (
                gameId: number | undefined
              ): gameId is number =>
                typeof gameId === 'number'
            )
        )
      );

      if (activityGameIds.length > 0) {
        const detailsResponses =
          await Promise.allSettled(
            activityGameIds.map(async (gameId) => {
              const gameRes = await fetch(
                `/api/games/${gameId}`
              );

              if (!gameRes.ok) {
                throw new Error(
                  `No se pudo cargar juego ${gameId}`
                );
              }

              return await gameRes.json();
            })
          );

        const resolvedGames: Record<number, any> = {};

        detailsResponses.forEach((result) => {
          if (
            result.status === 'fulfilled' &&
            typeof result.value?.igdbId === 'number'
          ) {
            resolvedGames[result.value.igdbId] =
              result.value;
          }
        });

        setActivityGames(resolvedGames);
      } else {
        setActivityGames({});
      }
    } catch (err) {
      console.error('Error fetching feed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeed();
  }, [feedScope]);

  const mapUserIdToUser = (
    uid: string,
    resolvedUser?: User | null
  ) => {
    return (
      resolvedUser ||
      users.find((u) => u.id === uid) || {
        id: uid,
        username: 'usuario',
        avatar:
          'https://api.dicebear.com/7.x/pixel-art/svg?seed=user',
        bio: ''
      }
    );
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();

    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) return 'Ahora mismo';
    if (diffMinutes < 60) {
      return `Hace ${diffMinutes} min`;
    }

    if (diffHours < 24) {
      return `Hace ${diffHours} ${
        diffHours === 1 ? 'hora' : 'horas'
      }`;
    }

    if (diffDays < 7) {
      return `Hace ${diffDays} ${
        diffDays === 1 ? 'día' : 'días'
      }`;
    }

    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short'
    });
  };

  const renderAction = (act: FeedActivity) => {
    const actor = mapUserIdToUser(
      act.userId,
      act.author
    );

    const username = (
      <button
        type="button"
        onClick={() => onSelectUser(act.userId)}
        className="font-bold text-white hover:text-[#dfad55] transition cursor-pointer"
      >
        @{actor.username}
      </button>
    );

    if (
      act.type === 'FOLLOWED' &&
      act.targetUserId
    ) {
      const target = mapUserIdToUser(
        act.targetUserId,
        act.targetUser
      );

      return (
        <div className="text-sm text-slate-300 leading-relaxed">
          {username}{' '}
          <span>comenzó a seguir a</span>{' '}
          <button
            type="button"
            onClick={() =>
              onSelectUser(act.targetUserId!)
            }
            className="font-bold text-white hover:text-[#dfad55] transition cursor-pointer"
          >
            @{target.username}
          </button>
        </div>
      );
    }

    if (act.type === 'REVIEW') {
      return (
        <div className="space-y-3">
          <div className="text-sm text-slate-300 leading-relaxed">
            {username}{' '}
            <span>ha publicado una reseña</span>
          </div>

          {act.details && (
            <div className="rounded-xl bg-[#090c12] border border-slate-800/80 px-4 py-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Star className="w-3.5 h-3.5 text-[#e2ad52] fill-[#e2ad52]" />

                <span className="text-[9px] uppercase tracking-widest font-bold text-slate-500">
                  Reseña
                </span>
              </div>

              <p className="text-xs leading-relaxed text-slate-300 italic">
                "{act.details}"
              </p>
            </div>
          )}
        </div>
      );
    }

    if (act.gameId) {
      return (
        <div className="text-sm text-slate-300 leading-relaxed">
          {username}{' '}
          <span>
            {act.details ||
              'actualizó su biblioteca'}
          </span>
        </div>
      );
    }

    return (
      <div className="text-sm text-slate-300 leading-relaxed">
        {username}{' '}
        <span>
          {act.details ||
            'realizó una acción social'}
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-20 selection:bg-[#dca94f] selection:text-black">

      {/* HERO */}
      <SpotlightPanel className="relative overflow-hidden bg-gradient-to-r from-[#0d1320] via-[#101522] to-[#080b10] border border-slate-800 p-6 rounded-2xl">
        <ParticleBackdrop
          className="opacity-40"
          count={18}
        />

        <div className="absolute top-0 right-0 w-80 h-80 bg-[#dca94f]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            <span className="inline-flex text-[9px] font-bold text-[#e1b35e] uppercase tracking-widest bg-[#dca94f]/10 px-2.5 py-1 rounded-full border border-[#dca94f]/20">
              Activo hoy
            </span>

            <h2 className="text-2xl md:text-3xl font-bold font-display text-white mt-3 tracking-tight">
              ¡Hola de{' '}
              <ShimmerText>nuevo</ShimmerText>
              , @{currentUser.username}!
            </h2>

            <p className="text-slate-400 text-xs mt-1 md:max-w-lg">
              Echa un vistazo a la actividad reciente de
              tus compañeros y descubre nuevos videojuegos.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onDiscover}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#dca84f] px-4 py-2.5 text-xs font-semibold text-[#17120a] transition hover:bg-[#e8b967] cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
              Explorar juegos
            </button>

            <button
              type="button"
              onClick={() => setFeedScope('all')}
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition flex items-center gap-1.5 border ${
                feedScope === 'all'
                  ? 'bg-[#dca84f] text-[#17120a] border-[#e5b660]'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              General
            </button>

            <button
              type="button"
              onClick={() =>
                setFeedScope('following')
              }
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition flex items-center gap-1.5 border ${
                feedScope === 'following'
                  ? 'bg-[#dca84f] text-[#17120a] border-[#e5b660]'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Siguiendo
            </button>
          </div>
        </div>
      </SpotlightPanel>

      {/* FEED */}
      <div className="space-y-4">

        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-200 font-display flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#dca84f]" />

            {feedScope === 'all'
              ? 'Actividad de la Comunidad'
              : 'Actividad de tus Seguidos'}
          </h3>

          <button
            type="button"
            onClick={fetchFeed}
            className="text-xs text-slate-500 hover:text-[#dca84f] transition flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            Actualizar
          </button>
        </div>

        {/* LOADING */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-[#0f1218] border border-slate-800 p-5 rounded-xl animate-pulse"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="flex gap-3">
                    <div className="w-11 h-11 rounded-full bg-slate-800 flex-shrink-0" />

                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-slate-800 rounded w-1/2" />
                      <div className="h-3 bg-slate-800 rounded w-2/3" />
                      <div className="h-16 bg-slate-800 rounded-xl mt-4" />
                    </div>
                  </div>

                  <div className="flex gap-4 md:border-l md:border-slate-800 md:pl-5">
                    <div className="w-24 h-32 bg-slate-800 rounded-lg flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-slate-800 rounded w-3/4" />
                      <div className="h-3 bg-slate-800 rounded w-1/2" />
                      <div className="h-14 bg-slate-800 rounded mt-4" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="bg-[#0f1218] border border-slate-800 border-dashed p-10 rounded-xl text-center space-y-2">
            <Users className="w-8 h-8 text-slate-600 mx-auto" />

            <p className="text-slate-400 text-sm font-semibold">
              No hay actividad reciente
            </p>

            <p className="text-slate-500 text-xs text-center max-w-xs mx-auto">
              {feedScope === 'following'
                ? 'Aún no sigues a ningún gamer o no han compartido aventuras de juego todavía. ¡Prueba a cambiar a General!'
                : 'Registra tus primeros progresos o sigue a otros gamers para ver actividad.'}
            </p>

            {feedScope === 'following' && (
              <button
                type="button"
                onClick={() => setFeedScope('all')}
                className="px-4 py-2 mt-2 bg-[#dca84f] text-[#17120a] text-xs font-semibold rounded-xl hover:bg-[#e8b967] transition cursor-pointer"
              >
                Ver Actividad General
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {activities.map((act) => {
              const actor = mapUserIdToUser(
                act.userId,
                act.author
              );

              const relatedGame =
                typeof act.gameId === 'number'
                  ? activityGames[act.gameId]
                  : undefined;

              const hasGame =
                typeof act.gameId === 'number' &&
                !!relatedGame;

              const isFollow =
                act.type === 'FOLLOWED' &&
                !!act.targetUserId;

              const targetUser = isFollow
                ? mapUserIdToUser(
                    act.targetUserId!,
                    act.targetUser
                  )
                : null;

              return (
                <article
                  key={act.id}
                  className="bg-[#0f1218] border border-slate-800/90 hover:border-slate-700 rounded-xl p-5 transition"
                >
                  <div
                    className={
                      hasGame || isFollow
                        ? 'grid grid-cols-1 md:grid-cols-2 gap-5'
                        : ''
                    }
                  >
                    {/* =========================
                        LEFT
                    ========================== */}
                    <div className="min-w-0 flex gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          onSelectUser(act.userId)
                        }
                        className="flex-shrink-0 cursor-pointer"
                      >
                        <img
                          src={actor.avatar}
                          alt={actor.username}
                          referrerPolicy="no-referrer"
                          className="w-11 h-11 rounded-full border border-slate-800 hover:border-[#dca84f]/60 transition"
                        />
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            {renderAction(act)}
                          </div>

                          <span className="text-[10px] text-slate-600 flex-shrink-0">
                            {formatTimeAgo(
                              act.createdAt
                            )}
                          </span>
                        </div>

                        {hasGame && (
                          <p className="text-[10px] text-slate-500 mt-2">
                            Actividad en{' '}
                            <span className="text-slate-400 font-semibold">
                              {relatedGame.name}
                            </span>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* =========================
                        RIGHT: GAME
                    ========================== */}
                    {hasGame && (
                      <div className="min-w-0 md:border-l md:border-slate-800 md:pl-5">
                        <div className="h-full flex gap-4">
                          <button
                            type="button"
                            onClick={() =>
                              onSelectGame(
                                relatedGame.igdbId
                              )
                            }
                            className="w-24 h-32 flex-shrink-0 rounded-lg overflow-hidden border border-slate-800 hover:border-[#dca84f]/60 transition cursor-pointer group"
                          >
                            <img
                              src={relatedGame.cover}
                              alt={relatedGame.name}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                            />
                          </button>

                          <div className="min-w-0 flex-1 flex flex-col justify-center">
                            <div className="flex items-start justify-between gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  onSelectGame(
                                    relatedGame.igdbId
                                  )
                                }
                                className="text-left min-w-0 cursor-pointer"
                              >
                                <h4 className="text-sm font-bold text-white hover:text-[#e1b35e] transition truncate">
                                  {relatedGame.name}
                                </h4>
                              </button>

                              <ChevronRight className="w-4 h-4 text-slate-600 flex-shrink-0 mt-0.5" />
                            </div>

                            {relatedGame.genres?.length >
                              0 && (
                              <p className="text-[9px] text-slate-500 mt-1 uppercase tracking-wide truncate">
                                {relatedGame.genres
                                  .slice(0, 3)
                                  .join(' · ')}
                              </p>
                            )}

                            {typeof relatedGame.rating ===
                              'number' && (
                              <div className="flex items-center gap-1.5 mt-2">
                                <Star className="w-3 h-3 text-[#dfad55] fill-[#dfad55]" />
                                <span className="text-[10px] font-bold text-[#dfad55]">
                                  {Math.round(relatedGame.rating)}
                                </span>
                              </div>
                            )}

                            {relatedGame.summary && (
                              <p className="text-[10px] text-slate-400 leading-relaxed mt-3 line-clamp-4">
                                {relatedGame.summary}
                              </p>
                            )}

                            <button
                              type="button"
                              onClick={() =>
                                onSelectGame(
                                  relatedGame.igdbId
                                )
                              }
                              className="text-[10px] text-slate-500 hover:text-[#dfad55] transition mt-3 text-left cursor-pointer"
                            >
                              Ver detalles →
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* =========================
                        RIGHT: FOLLOW USER
                    ========================== */}
                    {isFollow && targetUser && (
                      <div className="min-w-0 md:border-l md:border-slate-800 md:pl-5">
                        <button
                          type="button"
                          onClick={() =>
                            onSelectUser(
                              targetUser.id
                            )
                          }
                          className="w-full h-full flex items-center gap-4 text-left group cursor-pointer"
                        >
                          <img
                            src={targetUser.avatar}
                            alt={targetUser.username}
                            referrerPolicy="no-referrer"
                            className="w-20 h-20 rounded-full border border-slate-800 group-hover:border-[#dca84f]/60 transition"
                          />

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-white group-hover:text-[#e1b35e] transition truncate">
                                @{targetUser.username}
                              </h4>

                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#dca84f]/10 text-[#dfad55] border border-[#dca84f]/20">
                                Gamer
                              </span>
                            </div>

                            {targetUser.bio ? (
                              <p className="text-[10px] text-slate-400 leading-relaxed mt-2 line-clamp-3">
                                {targetUser.bio}
                              </p>
                            ) : (
                              <p className="text-[10px] text-slate-500 mt-2">
                                Descubre su perfil y actividad.
                              </p>
                            )}

                            <div className="flex items-center gap-1 mt-3 text-[10px] text-slate-500 group-hover:text-[#dfad55] transition">
                              Ver perfil
                              <ChevronRight className="w-3 h-3" />
                            </div>
                          </div>
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};