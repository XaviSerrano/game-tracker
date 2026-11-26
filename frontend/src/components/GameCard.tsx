import React, { useState } from 'react';
import { Game, GameStatus } from '../types.ts';
import { Bookmark, BookmarkCheck, BookmarkPlus, Clock3, Gamepad2, Star, Trash2 } from 'lucide-react';
import { useLanguage } from '../i18n.tsx';

interface GameCardProps {
  game: Game;

  // Para Library - muestra más info
  userGameStatus?: GameStatus;
  userGameRating?: number;
  userGameHours?: number;

  // Para Discover - info de wishlist rápida
  isInWishlist?: boolean;
  isInCustomList?: boolean;

  // Modo visual
  variant?: 'default' | 'feed' | 'mobile';
  showDiscoverMeta?: boolean;

  // Callbacks
  onSelectGame: (gameId: number) => void;
  onManageStatus?: (game: Game) => void;
  onRemoveFromList?: () => void;
  onAddToCustomList?: (game: Game) => void;
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
  isInWishlist,
  isInCustomList = false,
  variant = 'default',
  showDiscoverMeta = false,
  onSelectGame,
  onManageStatus,
  onRemoveFromList,
  onAddToCustomList,
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
  const averageDuration = game.timeToBeat?.normally ?? game.averagePlaytimeHours;
  const durationText = averageDuration != null ? `${averageDuration} h ${t('de media')}` : `-- h ${t('de media')}`;
  const durationLabel = averageDuration != null
    ? `${t('Duración media')}: ${averageDuration} ${t('horas')}`
    : t('Duración media no disponible');
  const hasProgress = userGameStatus !== undefined && userGameStatus !== 'WISHLIST';
  const statusLabels: Record<GameStatus, string> = {
    WISHLIST: t('Pendiente'),
    PLAYING: t('Jugando'),
    PLAYED: t('Jugado'),
    COMPLETED: t('Completado'),
    ABANDONED: t('Abandonado')
  };

  const renderActions = (compact: boolean) => {
    if (isFeedCard) return null;

    const buttonClass = compact
      ? 'flex size-11 items-center justify-center rounded-lg border border-white/10 text-slate-300 transition hover:bg-white/[0.06] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50'
      : 'grid size-10 shrink-0 place-items-center rounded-full text-slate-300 transition duration-200 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50';

    return (
      <div className={compact ? 'flex min-w-0 items-center justify-end gap-1.5 pt-2' : 'absolute inset-x-0 bottom-0 z-20 flex items-center justify-center gap-0.5 bg-gradient-to-r from-transparent via-[#090b10]/85 to-transparent'}>
        {onToggleWishlist && (
          <button
            type="button"
            aria-label={bookmarkActive ? `${t('Quitar')} ${game.name} ${t('de la wishlist')}` : `${t('Añadir')} ${game.name} ${t('a la wishlist')}`}
            aria-pressed={bookmarkActive}
            title={bookmarkActive ? t('Remover de Wishlist') : t('Añadir a Wishlist')}
            onClick={event => { event.stopPropagation(); onToggleWishlist(game.igdbId, event); }}
            disabled={isLoadingWishlist}
            className={`${buttonClass} ${bookmarkActive ? compact ? 'border-indigo-400/40 bg-indigo-400/10 text-indigo-200 hover:text-indigo-100' : 'bg-indigo-400/20 text-indigo-200 hover:bg-indigo-400/30 hover:text-indigo-100' : ''}`}
          >
            <Bookmark className={`size-5 ${bookmarkActive ? 'fill-indigo-300 text-indigo-300' : ''}`} aria-hidden="true" />
          </button>
        )}
        {onManageStatus && (
          <button
            type="button"
            aria-label={`${t('Gestionar estado del juego')}: ${game.name}${hasProgress ? ` (${statusLabels[userGameStatus]})` : ''}`}
            title={hasProgress ? `${t('Gestionar estado del juego')}: ${statusLabels[userGameStatus]}` : t('Gestionar estado del juego')}
            onClick={event => { event.stopPropagation(); onManageStatus(game); }}
            disabled={statusActionDisabled}
            className={`${buttonClass} ${hasProgress ? compact ? 'text-accent hover:border-accent/30 hover:bg-accent/10' : 'bg-accent/20 text-accent hover:bg-accent/30' : ''}`}
          >
            <Gamepad2 className="size-5" aria-hidden="true" />
          </button>
        )}
        {onAddToCustomList && (
          <button
            type="button"
            aria-label={`${t('Añadir a lista personalizada')}: ${game.name}`}
            title={t('Añadir a lista personalizada')}
            aria-pressed={isInCustomList}
            onClick={event => { event.stopPropagation(); onAddToCustomList(game); }}
            className={`${buttonClass} ${isInCustomList ? compact ? 'border-indigo-400/40 bg-indigo-400/10 text-indigo-200 hover:bg-indigo-400/20' : 'bg-indigo-400/20 text-indigo-200 hover:bg-indigo-400/30 hover:text-indigo-100' : compact ? '' : 'hover:bg-indigo-300/15 hover:text-indigo-100'}`}
          >
            {isInCustomList
              ? <BookmarkCheck className="size-5 fill-indigo-300/30 text-indigo-200" aria-hidden="true" />
              : <BookmarkPlus className="size-5" aria-hidden="true" />}
          </button>
        )}
        {onRemoveFromList && (
          <button
            type="button"
            aria-label={`${t('Eliminar de la lista')}: ${game.name}`}
            title={t('Eliminar de la lista')}
            onClick={event => { event.stopPropagation(); onRemoveFromList(); }}
            className={`${buttonClass} ${compact ? 'text-red-300 hover:bg-red-500/10' : 'text-red-200 hover:bg-red-400/20 hover:text-red-100'}`}
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>
    );
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

    return (
      <div
        className="group flex h-full min-h-[14.5rem] min-w-0 gap-3 rounded-xl border border-white/[0.06] bg-[#17243b] p-2.5 text-left transition-colors hover:border-white/15"
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
            className="flex min-w-0 flex-1 flex-col text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
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

            <p className="mt-2 line-clamp-1 text-sm font-semibold leading-5 text-slate-100">
              {game.genres.slice(0, 2).join(' · ') || t('Videojuego')}
            </p>
            <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
              {releaseYear && <span>{releaseYear}</span>}
              {releaseYear && <span aria-hidden="true" className="text-slate-600">·</span>}
              <span className="inline-flex items-center gap-1" aria-label={durationLabel} title={durationLabel}>
                <Clock3 className="size-3.5 text-accent" aria-hidden="true" />
                <span>{durationText}</span>
              </span>
            </div>
            {showFullLibraryCard && (
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <span className="rounded-md border border-white/10 bg-black/15 px-1.5 py-0.5 text-[10px] font-medium text-slate-200">
                  {statusLabels[userGameStatus]}
                </span>
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
          </button>

          {renderActions(true)}
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

        {/* Rating */}
        {game.rating ? (
          <div className="absolute top-2 right-2 bg-black/85 backdrop-blur-md text-[10px] font-bold border border-slate-700 px-2 py-0.5 rounded-full flex items-center gap-1">
            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
            <span className="text-yellow-400">{game.rating}</span>
          </div>
        ) : null}

        {/* Library status */}
        {showFullLibraryCard && (
          <div className="absolute bottom-12 left-2 right-2 z-10 flex justify-between gap-1">
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
        {renderActions(false)}
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
              <p className="text-xs text-slate-400 mt-1 truncate uppercase font-mono">
                {game.genres.slice(0, 1).join(', ') || t('Videojuego')}
              </p>
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
                <p className="inline-flex min-h-4 items-center gap-1 truncate text-xs text-slate-400" aria-label={durationLabel} title={durationLabel}>
                    <Clock3 className="size-3 shrink-0 text-accent" aria-hidden="true" />
                    {durationText}
                </p>
              </div>
            )}
          </>
        )}

        {isFeedCard && (
          <p className="text-xs text-slate-400 mt-0.5 truncate">
            {game.genres?.slice(0, 1).join(', ') || t('Videojuego')}
          </p>
        )}
        {!isFeedCard && showFullLibraryCard && (
          <p className="mt-1 inline-flex items-center gap-1 truncate text-xs text-slate-400" aria-label={durationLabel} title={durationLabel}>
            <Clock3 className="size-3 shrink-0 text-accent" aria-hidden="true" />
            {durationText}
          </p>
        )}
      </div>
    </div>
  );
};
