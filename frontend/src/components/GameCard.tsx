import React from 'react';
import { Game, GameStatus } from '../types.ts';
import { Bookmark, Star } from 'lucide-react';

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
  variant?: 'default' | 'feed';

  // Callbacks
  onSelectGame: (gameId: number) => void;
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
  onSelectGame,
  onToggleWishlist,
  togglingWishlistId,
  savingWishlistGameId,
}) => {
  const isLoadingWishlist =
    togglingWishlistId === game.igdbId ||
    savingWishlistGameId === game.igdbId;

  const showFullLibraryCard = userGameStatus !== undefined;
  const isFeedCard = variant === 'feed';

  const bookmarkActive = showFullLibraryCard
    ? userGameStatus === 'WISHLIST'
    : isInWishlist;

  const handleCardClick = () => {
    onSelectGame(game.igdbId);
  };

  const handleCardKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelectGame(game.igdbId);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Ver detalles de ${game.name}`}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      className={`
        w-full h-full min-w-0 text-left group
        bg-[#0f121d]
        border border-slate-850/80
        hover:border-slate-700
        rounded-xl
        transition
        flex flex-col
        cursor-pointer
        hover:translate-y-[-2px]
        duration-200
        ${isFeedCard ? 'p-2' : 'p-2.5'}
      `}
    >
      <div
        className={`
          relative
          rounded-lg
          overflow-hidden
          border border-slate-900
          group-hover:shadow-lg
          group-hover:scale-[1.02]
          transition
          duration-200
          aspect-[3/4]
        `}
      >
        <img
          src={game.cover}
          alt={game.name}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover"
        />

        {/* Wishlist */}
        {onToggleWishlist && !isFeedCard && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleWishlist(game.igdbId, e);
            }}
            disabled={isLoadingWishlist}
            title={
              bookmarkActive
                ? 'Remover de Wishlist'
                : 'Añadir a Wishlist'
            }
            className={`
              absolute top-2 left-2
              h-7 w-7
              rounded-full
              flex items-center justify-center
              transition
              cursor-pointer
              disabled:cursor-not-allowed
              disabled:opacity-60
              ${
                bookmarkActive
                  ? 'bg-indigo-500/20 border border-indigo-500/40 text-indigo-300'
                  : 'bg-black/85 border border-slate-700 text-slate-300 hover:text-indigo-300 hover:border-indigo-500/40'
              }
            `}
          >
            <Bookmark
              className={`
                w-3.5 h-3.5
                ${bookmarkActive ? 'fill-indigo-400 text-indigo-400' : ''}
              `}
            />
          </button>
        )}

        {/* Rating */}
        {(game.rating || userGameRating) && (
          <div className="absolute top-2 right-2 bg-black/85 backdrop-blur-md text-[10px] font-bold border border-slate-700 px-2 py-0.5 rounded-full flex items-center gap-1">
            {userGameRating && userGameRating > 0 ? (
              <>
                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />

                <span className="text-yellow-400">
                  {userGameRating}
                </span>

                <span className="text-slate-500">/</span>

                <span className="text-slate-400">
                  {game.rating}
                </span>
              </>
            ) : game.rating ? (
              <>
                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />

                <span className="text-yellow-400">
                  {game.rating}
                </span>
              </>
            ) : null}
          </div>
        )}

        {/* Library status */}
        {showFullLibraryCard && (
          <div className="absolute bottom-2 left-2 right-2 flex justify-between gap-1">
            <span
              className={`
                text-[8px]
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
              {userGameStatus}
            </span>

            {userGameHours && userGameHours > 0 && (
              <span className="text-[8px] font-bold bg-black/85 backdrop-blur-md border border-slate-750 rounded-full px-2 py-0.5 font-mono text-slate-300">
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
          ${isFeedCard ? 'mt-2' : 'mt-3.5'}
        `}
      >
        <h3
          className={`
            font-bold
            text-white
            group-hover:text-blue-400
            transition
            truncate
            leading-snug
            ${isFeedCard ? 'text-[11px]' : 'text-xs'}
          `}
        >
          {game.name}
        </h3>

        {!isFeedCard && (
          <>
            {showFullLibraryCard ? (
              userGameNotes ? (
                <p className="text-[9px] text-slate-500 mt-1 line-clamp-1 italic">
                  "{userGameNotes}"
                </p>
              ) : (
                <p className="text-[9px] text-slate-500 mt-1 truncate uppercase font-mono">
                  {game.genres.slice(0, 1).join(', ') || 'Videojuego'}
                </p>
              )
            ) : (
              <p className="text-[10px] text-slate-500 mt-1 truncate">
                {game.genres.slice(0, 2).join(', ') || 'Videojuego'}
              </p>
            )}
          </>
        )}

        {isFeedCard && (
          <p className="text-[9px] text-slate-500 mt-0.5 truncate">
            {game.genres?.slice(0, 1).join(', ') || 'Videojuego'}
          </p>
        )}
      </div>
    </div>
  );
};