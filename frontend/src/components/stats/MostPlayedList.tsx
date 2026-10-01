import React from 'react';
import { Clock, Flame } from 'lucide-react';
import { StatsGameSummary } from './types.ts';

interface MostPlayedListProps {
  games: StatsGameSummary[];
  onSelectGame: (gameId: number) => void;
}

export const MostPlayedList: React.FC<MostPlayedListProps> = ({ games, onSelectGame }) => {
  const maxHours = games.length > 0 ? games[0].hoursPlayed : 0;

  return (
    <div className="bg-[#0f121d] border border-slate-850 p-5 rounded-2xl">
      <h3 className="font-semibold text-slate-300 font-display text-sm mb-4 flex items-center gap-1.5">
        <Flame className="w-4.5 h-4.5 text-orange-400" /> Mis juegos más jugados
      </h3>

      {games.length === 0 ? (
        <p className="text-xs text-slate-500 text-center py-6">
          Registra horas de juego en tu biblioteca para ver aquí tu ranking personal.
        </p>
      ) : (
        <div className="space-y-2.5">
          {games.map((game, index) => (
            <button
              key={game.igdbId}
              type="button"
              onClick={() => onSelectGame(game.igdbId)}
              className="w-full flex items-center gap-3 p-2 rounded-xl border border-transparent hover:border-slate-800 hover:bg-slate-900/50 transition cursor-pointer text-left"
            >
              <span className="text-xs font-black text-slate-600 w-4 flex-shrink-0 font-mono">{index + 1}</span>

              <img
                src={game.cover}
                alt={game.name}
                referrerPolicy="no-referrer"
                className="w-10 h-14 object-cover rounded-lg border border-slate-900 flex-shrink-0"
              />

              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-white truncate">{game.name}</p>
                <div className="w-full h-1.5 bg-slate-900 rounded-full mt-2 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full"
                    style={{ width: `${maxHours > 0 ? Math.max((game.hoursPlayed / maxHours) * 100, 4) : 0}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0 pl-1">
                <Clock className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-sm font-black text-white font-display leading-none">
                  {game.hoursPlayed}
                  <span className="text-[10px] text-slate-500 font-bold">h</span>
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
