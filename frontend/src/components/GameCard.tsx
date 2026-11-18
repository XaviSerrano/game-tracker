import React, { useState } from 'react';
import { Game, GameStatus } from '../types.ts';
import { Bookmark, Gamepad2, Star, Trash2 } from 'lucide-react';
import { useLanguage } from '../i18n.tsx';

interface GameCardProps {
  game: Game;

  // Para Library - muestra más info
  userGameStatus?: GameStatus;
  userGameRating?: number;
  userGameHours?: number;
  userGameNotes?: string;

  // Para Discover - info de wishlist rápida
  isInWishlist?: boolean;

  // Modo visual
  variant?: 'default' | 'feed' | 'mobile';
  showDiscoverMeta?: boolean;

  // Callbacks
  onSelectGame: (gameId: number) => void;
  onManageStatus?: (game: Game) => void;
  onRemoveFromList?: () => void;
  statusActionDisabled?: boolean;
  onToggleWishlist?: (
    gameId: number,
    e: React.MouseEvent<HTMLButtonElement>
  ) => void;

  // Estados
  togglingWishlistId?: number | null;
  savingWishlistGameId?: number | null;
}

export const GameCard: React.FC<GameCardProps> = ({
  game,
  userGameStatus,
  userGameRating,
  userGameHours,
  userGameNotes,
  isInWishlist,
  variant = 'default',
  showDiscoverMeta = false,
  onSelectGame,
  onManageStatus,
  onRemoveFromList,
  statusActionDisabled = false,
  onToggleWishlist,
  togglingWishlistId,
  savingWishlistGameId,
}) => {
  const { t } = useLanguage();
  const [failedCover, setFailedCover] = useState<string | null>(null);
  const isLoadingWishlist =
    togglingWishlistId === game.igdbId ||
    savingWishlistGameId === game.igdbId;

  const showFullLibraryCard = userGameStatus !== undefined;
  const isFeedCard = variant === 'feed';
  const isMobileCard = variant === 'mobile';

  const bookmarkActive = isInWishlist ?? userGameStatus === 'WISHLIST';
  const hasProgress = userGameStatus !== undefined && userGameStatus !== 'WISHLIST';
  const statusLabels: Record<GameStatus, string> = {
    WISHLIST: t('Pendiente'),
    PLAYING: t('Jugando'),
    PLAYED: t('Jugado'),
    COMPLETED: t('Completado'),
    ABANDONED: t('Abandonado')
  };

  const handleCardClick = () => {
    onSelectGame(game.igdbId);
  };

  const handleCardKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelectGame(game.igdbId);
    }
  };

  if (isMobileCard) {
    const releaseYear = game.releaseDate && game.releaseDate !== 'Unknown'
      ? game.releaseDate.slice(0, 4)
      : '';
    const summary = game.summary?.trim();
    const hasSummary = summary && summary.toLowerCase() !== 'no summary available.';

    return (
      <div
        className="group flex h-full min-w-0 gap-3 rounded-xl border border-white/[0.06] bg-[#17243b] p-2.5 text-left transition-colors hover:border-white/15"
      >
        <button
          type="button"
          onClick={handleCardClick}
          aria-label={`${t('Ver detalles de')} ${game.name}`}
          style={{ width: '10.5rem', flex: '0 0 10.5rem' }}
          className="relative min-h-[8.5rem] shrink-0 self-stretch overflow-hidden rounded-lg bg-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {game.cover && failedCover !== game.cover ? (
            <img
              src={game.cover}
              alt=""
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={() => setFailedCover(game.cover)}
              className="absolute inset-0 size-full object-cover"
            />
          ) : (
            <div aria-hidden="true" className="absolute inset-0 flex items-center justify-center text-slate-500">
              <Gamepad2 className="size-9" />
            </div>
          )}
        </button>

        <div className="flex min-w-0 flex-1 flex-col py-0.5">
          <button
            type="button"
            onClick={handleCardClick}
            aria-label={`${t('Ver detalles de')} ${game.name}`}
            className="flex min-h-0 min-w-0 flex-1 flex-col text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <div className="flex min-w-0 items-start justify-between gap-2">
              <h3 className="line-clamp-2 min-w-0 text-[17px] font-bold leading-tight text-white group-hover:text-accent-hover">
                {game.name}
              </h3>
              {game.rating ? (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-black/20 px-1.5 py-1 text-xs font-semibold text-amber-200">
                  <Star className="size-3 fill-amber-300 text-amber-300" aria-hidden="true" />
                  {Math.round(game.rating)}
                </span>
              ) : null}
            </div>

            <p className="mt-1 truncate text-[11px] font-medium text-slate-300">
              {[releaseYear, ...game.genres.slice(0, 2)].filter(Boolean).join(' · ') || t('Videojuego')}
            </p>
            {showFullLibraryCard && (
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                {!isMobileCard && (
                  <span className="rounded-md border border-white/10 bg-black/15 px-1.5 py-0.5 text-[10px] font-medium text-slate-200">
                    {statusLabels[userGameStatus]}
                  </span>
                )}
                {userGameHours > 0 && (
                  <span className="text-[10px] text-slate-400">{userGameHours} h</span>
                )}
                {userGameRating > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] text-slate-400">
                    <Star className="size-3 fill-amber-300 text-amber-300" aria-hidden="true" />
                    {userGameRating}
                  </span>
                )}
              </div>
            )}
            <p className="mt-2 line-clamp-4 text-[13px] leading-[1.4rem] text-slate-200">
              {hasSummary ? summary : t('Sin descripción.')}
            </p>
            {showFullLibraryCard && userGameNotes && (
              <p className="mt-1 line-clamp-1 text-[11px] italic text-slate-400">{userGameNotes}</p>
            )}
          </button>

          <div className="flex min-w-0 items-end justify-between gap-2 pt-2">
            <p className="min-w-0 truncate text-[10px] leading-5 text-slate-400">
              {game.platforms.slice(0, 2).join(' · ')}
            </p>
            <div className="flex shrink-0 items-center gap-1.5">
              {onToggleWishlist && (
                <button
                  type="button"
                  aria-label={bookmarkActive ? `${t('Quitar')} ${game.name} ${t('de la wishlist')}` : `${t('Añadir')} ${game.name} ${t('a la wishlist')}`}
                  aria-pressed={bookmarkActive}
                  onClick={event => { event.stopPropagation(); onToggleWishlist(game.igdbId, event); }}
                  disabled={isLoadingWishlist}
                  className={`flex size-11 items-center justify-center rounded-lg border transition disabled:opacity-50 ${bookmarkActive ? 'border-indigo-400/40 bg-indigo-400/10 text-indigo-200' : 'border-white/10 text-slate-300 hover:bg-white/[0.06]'}`}
                >
                  <Bookmark className={`size-4 ${bookmarkActive ? 'fill-indigo-300 text-indigo-300' : ''}`} aria-hidden="true" />
                </button>
              )}
              {onManageStatus && (
                <button
                  type="button"
                  aria-label={`${t('Gestionar estado del juego')}: ${game.name}${hasProgress ? ` (${statusLabels[userGameStatus]})` : ''}`}
                  onClick={event => { event.stopPropagation(); onManageStatus(game); }}
                  disabled={statusActionDisabled}
                  className="flex size-11 items-center justify-center rounded-lg border border-white/10 text-slate-300 transition hover:bg-white/[0.06] disabled:opacity-50"
                >
                  <Gamepad2 className="size-4" aria-hidden="true" />
                </button>
              )}
              {onRemoveFromList && (
                <button
                  type="button"
                  aria-label={`${t('Eliminar de la lista')}: ${game.name}`}
                  onClick={event => { event.stopPropagation(); onRemoveFromList(); }}
                  className="flex size-11 items-center justify-center rounded-lg border border-red-400/25 text-red-300 transition hover:bg-red-500/10"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${t('Ver detalles de')} ${game.name}`}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      className={`
        w-full h-full min-w-0 text-left group
        rounded-xl
        transition-colors
        flex flex-col
        cursor-pointer
        duration-200
        focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent
        ${isFeedCard ? 'p-2 bg-[#0f121d] border border-slate-800 hover:border-slate-700' : ''}
      `}
    >
      <div
        className={`
          relative
          overflow-hidden
          aspect-[3/4]
          ${isFeedCard ? 'rounded-lg border border-slate-900' : 'rounded-xl bg-slate-900'}
        `}
      >
        {game.cover && failedCover !== game.cover ? (
          <img
            src={game.cover}
            alt={game.name}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setFailedCover(game.cover)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div aria-hidden="true" className="flex h-full w-full items-center justify-center bg-slate-900 text-slate-500">
            <Gamepad2 className="h-10 w-10" />
          </div>
        )}

        {/* Wishlist */}
        {onToggleWishlist && !isFeedCard && (
          <button
            type="button"
            aria-label={bookmarkActive ? `${t('Quitar')} ${game.name} ${t('de la wishlist')}` : `${t('Añadir')} ${game.name} ${t('a la wishlist')}`}
            aria-pressed={bookmarkActive}
            onClick={(e) => {
              e.stopPropagation();
              onToggleWishlist(game.igdbId, e);
            }}
            disabled={isLoadingWishlist}
            title={
              bookmarkActive
                ? t('Remover de Wishlist')
                : t('Añadir a Wishlist')
            }
            className={`
              absolute top-2 left-2
              h-10 w-10
              rounded-full
              flex items-center justify-center
              transition
              cursor-pointer
              disabled:cursor-not-allowed
              disabled:opacity-60
              bg-black/85
              ${
                bookmarkActive
                  ? 'border border-indigo-500/40 text-indigo-300'
                  : 'border border-slate-700 text-slate-300 hover:text-indigo-300 hover:border-indigo-500/40'
              }
            `}
          >
            <Bookmark
              className={`
                w-4 h-4
                ${bookmarkActive ? 'fill-indigo-400 text-indigo-400' : ''}
              `}
            />
          </button>
        )}

        {onManageStatus && !isFeedCard && (
          <button
            type="button"
            aria-label={`${t('Gestionar estado del juego')}: ${game.name}${hasProgress ? ` (${statusLabels[userGameStatus]})` : ''}`}
            title={hasProgress ? `${t('Gestionar estado del juego')}: ${statusLabels[userGameStatus]}` : t('Gestionar estado del juego')}
            disabled={statusActionDisabled}
            onClick={(event) => {
              event.stopPropagation();
              onManageStatus(game);
            }}
            className={`absolute left-2 ${onToggleWishlist ? 'top-14' : 'top-2'} flex h-10 w-10 items-center justify-center rounded-full border bg-black/85 ${hasProgress ? 'border-accent text-accent' : 'border-slate-700 text-slate-200'} hover:border-accent/60 hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50`}
          >
            <Gamepad2 className="size-5" aria-hidden="true" />
          </button>
        )}

        {/* Rating */}
        {game.rating ? (
          <div className="absolute top-2 right-2 bg-black/85 backdrop-blur-md text-[10px] font-bold border border-slate-700 px-2 py-0.5 rounded-full flex items-center gap-1">
            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
            <span className="text-yellow-400">{game.rating}</span>
          </div>
        ) : null}

        {/* Library status */}
        {showFullLibraryCard && (
          <div className="absolute bottom-2 left-2 right-2 flex justify-between gap-1">
            {(userGameStatus !== 'WISHLIST' || bookmarkActive) && <span
              className={`
                text-[10px]
                font-bold
                border
                rounded-full
                px-2
                py-0.5
                text-center
                truncate
                ${
                  userGameStatus === 'COMPLETED'
                    ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/20'
                    : userGameStatus === 'PLAYING'
                      ? 'bg-blue-900/95 text-blue-300 border-blue-500/20'
                      : userGameStatus === 'WISHLIST'
                        ? 'bg-indigo-950/90 text-indigo-300 border-indigo-500/20'
                        : 'bg-slate-950/90 text-slate-300 border-slate-700'
                }
              `}
            >
              {statusLabels[userGameStatus]}
            </span>}

            {userGameHours !== undefined && userGameHours > 0 && (
              <span className="text-[10px] font-bold bg-black/85 backdrop-blur-md border border-slate-750 rounded-full px-2 py-0.5 font-mono text-slate-300">
                {userGameHours}h
              </span>
            )}
          </div>
        )}
      </div>

      {/* Title */}
      <div
        className={`
          flex-1 min-w-0
          ${isFeedCard ? 'mt-2' : 'mt-2.5'}
        `}
      >
        <h3
          className={`
            font-bold
            text-white
            group-hover:text-accent
            transition
            line-clamp-2
            leading-snug
            min-h-[2lh]
            ${isFeedCard ? 'text-xs' : 'text-sm'}
          `}
        >
          {game.name}
        </h3>

        {!isFeedCard && (
          <>
            {showFullLibraryCard ? (
              userGameNotes ? (
                <p className="text-xs text-slate-400 mt-1 line-clamp-1 italic">
                  "{userGameNotes}"
                </p>
              ) : (
                <p className="text-xs text-slate-400 mt-1 truncate uppercase font-mono">
                  {game.genres.slice(0, 1).join(', ') || t('Videojuego')}
                </p>
              )
            ) : (
              <div className="mt-1 space-y-0.5">
                <p className="min-h-4 truncate text-xs text-slate-400">
                  {game.genres.slice(0, 2).join(', ') || t('Videojuego')}
                </p>
                {showDiscoverMeta && (
                  <p className="min-h-4 truncate text-xs text-slate-400">
                    {[game.releaseDate !== 'Unknown' ? game.releaseDate?.slice(0, 4) : '', game.platforms.slice(0, 2).join(', ')]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                )}
              </div>
            )}
          </>
        )}

        {isFeedCard && (
          <p className="text-xs text-slate-400 mt-0.5 truncate">
            {game.genres?.slice(0, 1).join(', ') || t('Videojuego')}
          </p>
        )}
      </div>
    </div>
  );
};
