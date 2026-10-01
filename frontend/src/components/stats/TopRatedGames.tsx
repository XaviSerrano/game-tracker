import React from 'react';
import { Star } from 'lucide-react';
import { GameCard } from '../GameCard.tsx';
import { StatsGameSummary } from './types.ts';

interface TopRatedGamesProps {
  games: StatsGameSummary[];
  onSelectGame: (gameId: number) => void;
}

export const TopRatedGames: React.FC<TopRatedGamesProps> = ({ games, onSelectGame }) => (
  <div className="bg-[#0f121d] border border-slate-850 p-5 rounded-2xl">
    <h3 className="font-semibold text-slate-300 font-display text-sm mb-4 flex items-center gap-1.5">
      <Star className="w-4.5 h-4.5 text-yellow-500 fill-yellow-500/20" />
      Mis juegos mejor puntuados
    </h3>

    {games.length === 0 ? (
      <p className="text-xs text-slate-500 text-center py-6">
        Puntúa tus juegos de 1 a 5 estrellas para verlos listados aquí.
      </p>
    ) : (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
        {games.map(game => (
          <GameCard
            key={game.igdbId}
            game={game}
            userGameRating={game.myRating}
            userGameHours={game.hoursPlayed}
            onSelectGame={onSelectGame}
          />
        ))}
      </div>
    )}
  </div>
);
