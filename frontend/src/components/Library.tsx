import React, { useState, useEffect } from 'react';
import { UserGame, Game, GameStatus } from '../types.ts';
import { Search, SortAsc, Star, Flame, Clock, RefreshCw } from 'lucide-react';

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
            <button
              key={item.gameId}
              onClick={() => onSelectGame(item.gameId)}
              className="text-left group bg-[#0f121d] border border-slate-850/80 hover:border-slate-800 rounded-xl p-2.5 transition flex flex-col justify-between hover:translate-y-[-2px] duration-205 cursor-pointer block"
            >
              <div className="relative aspect-[3/4] rounded-lg overflow-hidden border border-slate-900 shadow">
                <img
                  src={item.game.cover}
                  alt={item.game.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                />

                {/* Rating display over cover */}
                {item.rating > 0 && (
                  <div className="absolute top-2 left-2 bg-black/85 backdrop-blur-md text-[9px] font-bold text-yellow-400 border border-slate-750 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    {item.rating}
                  </div>
                )}

                {/* Status indicator pill bottom */}
                <div className="absolute bottom-2 left-2 right-2 flex justify-between gap-1">
                  <span className={`text-[8px] font-bold border rounded-full px-2 py-0.5 text-center truncate ${item.status === 'COMPLETED' ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/20' : item.status === 'PLAYING' ? 'bg-blue-900/95 text-blue-300 border-blue-500/20' : item.status === 'WISHLIST' ? 'bg-indigo-950/90 text-indigo-300 border-indigo-500/20' : 'bg-slate-950/90 text-slate-300 border-slate-700'}`}>
                    {item.status}
                  </span>
                  {item.hoursPlayed > 0 && (
                    <span className="text-[8px] font-bold bg-black/85 backdrop-blur-md border border-slate-750 rounded-full px-2 py-0.5 font-mono text-slate-300">
                      {item.hoursPlayed}h
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-3.5 flex-1 min-w-0">
                <h3 className="text-xs font-bold text-white group-hover:text-blue-400 transition truncate leading-snug">
                  {item.game.name}
                </h3>
                {item.notes ? (
                  <p className="text-[9px] text-slate-500 mt-1 line-clamp-1 italic">
                    "{item.notes}"
                  </p>
                ) : (
                  <p className="text-[9px] text-slate-500 mt-1 truncate uppercase font-mono">
                    {item.game.genres.slice(0, 1).join(', ') || 'Videojuego'}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
