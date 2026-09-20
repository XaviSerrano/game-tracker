import React, { useState, useEffect } from 'react';
import { UserGame, Game, GameStatus } from '../types.ts';
import { Search, SortAsc, Star, Flame, Clock, RefreshCw } from 'lucide-react';
import { GameCard } from './GameCard.tsx';

interface LibraryProps {
  userId: string;
  onSelectGame: (gameId: number) => void;
  token: string;
}

export const Library: React.FC<LibraryProps> = ({ userId, onSelectGame, token }) => {
  const [completeLib, setCompleteLib] = useState<(UserGame & { game: Game })[]>([]);
  const [filteredLib, setFilteredLib] = useState<(UserGame & { game: Game })[]>([]);
  const [activeTab, setActiveTab] = useState<GameStatus | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'rating' | 'hours' | 'name' | 'date'>('date');
  const [loading, setLoading] = useState(true);
  const [togglingWishlistId, setTogglingWishlistId] = useState<number | null>(null);

  const fetchLibrary = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/users/${userId}/library`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setCompleteLib(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLibrary();
  }, [userId]);

  useEffect(() => {
    // Filter and sort items
    let results = [...completeLib];

    // Filter by tab status
    if (activeTab !== 'ALL') {
      results = results.filter(item => item.status === activeTab);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      results = results.filter(item =>
        item.game.name.toLowerCase().includes(q) ||
        item.game.genres.some(gen => gen.toLowerCase().includes(q))
      );
    }

    // Sort
    if (sortBy === 'rating') {
      results.sort((a, b) => b.rating - a.rating);
    } else if (sortBy === 'hours') {
      results.sort((a, b) => b.hoursPlayed - a.hoursPlayed);
    } else if (sortBy === 'name') {
      results.sort((a, b) => a.game.name.localeCompare(b.game.name));
    } else if (sortBy === 'date') {
      results.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }

    setFilteredLib(results);
  }, [completeLib, activeTab, searchQuery, sortBy]);

  const handleToggleWishlist = async (gameId: number, e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();

    if (togglingWishlistId !== null) return;

    setTogglingWishlistId(gameId);

    try {
      const item = completeLib.find(i => i.gameId === gameId);
      if (!item) return;

      if (item.status === 'WISHLIST') {
        // Remove from wishlist
        const res = await fetch(`/api/library/${gameId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (res.ok) {
          setCompleteLib(prev => prev.filter(i => i.gameId !== gameId));
        }
      } else {
        // Change status to wishlist
        const res = await fetch('/api/library', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ gameId, status: 'WISHLIST' })
        });

        if (res.ok) {
          const updated = await res.json();
          setCompleteLib(prev => {
            const index = prev.findIndex(i => i.gameId === gameId);
            if (index !== -1) {
              const newLib = [...prev];
              newLib[index] = updated;
              return newLib;
            }
            return prev;
          });
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTogglingWishlistId(null);
    }
  };

  const STATUS_TABS: { label: string, value: GameStatus | 'ALL' }[] = [
    { label: 'Todo', value: 'ALL' },
    { label: 'Pendiente (Wishlist) ⭐️', value: 'WISHLIST' },
    { label: 'Jugando 🎮', value: 'PLAYING' },
    { label: 'Jugados', value: 'PLAYED' },
    { label: 'Completado 🏆', value: 'COMPLETED' },
    { label: 'Abandonado ❌', value: 'ABANDONED' },
  ];

  return (
    <div className="space-y-6 pb-20 selection:bg-blue-600 selection:text-white">
      {/* Title Header */}
      <div>
        <h2 className="text-2xl font-bold font-display text-white tracking-tight">
          Mi Biblioteca Gamer
        </h2>
        <p className="text-slate-400 text-xs">
          Organiza, filtra y analiza el estado actual y horas dedicadas de todos tus progresos de juego
        </p>
      </div>

      {/* Categories slider */}
      <div className="flex gap-2.5 overflow-x-auto pb-1 scrolling-touch">
        {STATUS_TABS.map(tab => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition border ${activeTab === tab.value ? 'bg-blue-600 text-white border-blue-500Shadow' : 'bg-[#0f121d] text-slate-400 border-slate-805 hover:text-white'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search and Sort panel */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Filtra por título o categoría dentro de tu biblioteca..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0f121d] border border-slate-800 text-slate-200 placeholder-slate-500 rounded-xl px-4 py-2.5 pl-11 text-xs focus:ring-1 focus:ring-blue-500 transition outline-none"
          />
          <Search className="absolute left-4 top-3 w-4.5 h-4.5 text-slate-500" />
        </div>

        <div className="flex items-center gap-2 bg-[#07090e] p-1 rounded-xl border border-slate-800">
          <span className="text-[10px] uppercase font-bold text-slate-500 px-2 tracking-wider flex items-center gap-1">
            <SortAsc className="w-3.5 h-3.5" /> Ordenar:
          </span>
          <button
            onClick={() => setSortBy('date')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${sortBy === 'date' ? 'bg-[#1e293b] text-blue-400' : 'text-slate-400'}`}
          >
            Fecha
          </button>
          <button
            onClick={() => setSortBy('rating')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${sortBy === 'rating' ? 'bg-[#1e293b] text-blue-400' : 'text-slate-400'}`}
          >
            Rating
          </button>
          <button
            onClick={() => setSortBy('hours')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${sortBy === 'hours' ? 'bg-[#1e293b] text-blue-400' : 'text-slate-400'}`}
          >
            Horas
          </button>
          <button
            onClick={() => setSortBy('name')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${sortBy === 'name' ? 'bg-[#1e293b] text-blue-400' : 'text-slate-400'}`}
          >
            A-Z
          </button>
        </div>
      </div>

      {/* Grid listing */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="animate-pulse bg-[#0f121d]/40 border border-slate-850 p-3 rounded-xl space-y-2">
              <div className="aspect-[3/4] bg-slate-800 rounded-lg w-full"></div>
              <div className="h-4 bg-slate-800 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      ) : filteredLib.length === 0 ? (
        <div className="py-12 bg-[#0f121d] border border-slate-800 p-8 rounded-2xl text-center space-y-2">
          <Clock className="w-8 h-8 text-slate-700 mx-auto" />
          <p className="text-slate-400 text-sm font-semibold">Biblioteca vacía</p>
          <p className="text-slate-500 text-xs max-w-sm mx-auto">
            Ninguno de tus registros coincide con el término de búsqueda o categoría actual. ¡Explora el catálogo y añade tu primer tracker!
          </p>
          {searchQuery && (
            <button
              onClick={() => { setSearchQuery(''); setActiveTab('ALL'); }}
              className="px-4 py-2 bg-slate-800 hover:text-white transition text-xs font-semibold rounded-xl text-slate-350 cursor-pointer flex items-center gap-1.5 mx-auto"
            >
              Reestablecer filtros
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredLib.map(item => (
            <GameCard
              key={item.gameId}
              game={item.game}
              userGameStatus={item.status}
              userGameRating={item.rating}
              userGameHours={item.hoursPlayed}
              userGameNotes={item.notes}
              onSelectGame={onSelectGame}
              onToggleWishlist={handleToggleWishlist}
              togglingWishlistId={togglingWishlistId}
            />
          ))}
        </div>
      )}
    </div>
  );
};
