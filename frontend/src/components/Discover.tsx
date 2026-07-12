import React, { useState, useEffect } from 'react';
import { Game } from '../types.ts';
import { Search, SlidersHorizontal, Gamepad2, Star, Flame, Calendar, RefreshCw, Bookmark } from 'lucide-react';
import { SpotlightPanel } from './SpotlightPanel.tsx';
import { ParticleBackdrop } from './ParticleBackdrop.tsx';
import { ShimmerText } from './ShimmerText.tsx';
import { TiltCard } from './TiltCard.tsx';

interface DiscoverProps {
  onSelectGame: (gameId: number) => void;
  token: string;
}

export const Discover: React.FC<DiscoverProps> = ({ onSelectGame, token }) => {
  const [games, setGames] = useState<Game[]>([]);
  const [apiError, setApiError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [sortBy, setSortBy] = useState('popularity'); // 'popularity' | 'rating' | 'newest' | 'name'
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [wishlistIds, setWishlistIds] = useState<Set<number>>(new Set());
  const [savingWishlistGameId, setSavingWishlistGameId] = useState<number | null>(null);
  const [quickActionMessage, setQuickActionMessage] = useState('');

  // Preseeded Categories
  const GENRES = ["Action", "Adventure", "RPG", "Indie", "Metroidvania", "Platformer", "Roguelike", "Horror", "Survival", "Cozy", "Strategy", "Puzzle"];
  const PLATFORMS = ["PC", "PlayStation 5", "Nintendo Switch", "Xbox Series X/S", "PlayStation 4", "Xbox One", "Mac"];

  const searchGames = async (searchVal: string, genreVal: string, platformVal: string, sortVal: string) => {
    setLoading(true);
    setApiError(null);
    try {
      const params = new URLSearchParams();
      params.set('sort', sortVal);
      if (searchVal.trim()) params.set('search', searchVal.trim());
      if (genreVal) params.set('genre', genreVal);
      if (platformVal) params.set('platform', platformVal);

      const res = await fetch(`/api/games?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        const message = typeof data?.error === 'string' ? data.error : 'No se pudo cargar el catálogo.';
        throw new Error(message);
      }

      setGames(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Discover Error:", err);
      setGames([]);
      setApiError(err instanceof Error ? err.message : 'Error inesperado al consultar la API.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      searchGames(
        query,
        selectedGenre,
        selectedPlatform,
        sortBy
      );
    }, 300);

    return () => clearTimeout(timeout);
  }, [
    query,
    selectedGenre,
    selectedPlatform,
    sortBy
  ]);

  useEffect(() => {
    const fetchWishlist = async () => {
      try {
        const res = await fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) return;
        const me = await res.json();

        const libraryRes = await fetch(`/api/users/${me.id}/library`);
        if (!libraryRes.ok) return;
        const libraryData = await libraryRes.json();
        const ids = new Set<number>(
          (Array.isArray(libraryData) ? libraryData : [])
            .filter((item: any) => item?.status === 'WISHLIST')
            .map((item: any) => item.gameId)
        );
        setWishlistIds(ids);
      } catch (err) {
        console.error(err);
      }
    };

    fetchWishlist();
  }, [token]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    searchGames(query, selectedGenre, selectedPlatform, sortBy);
  };

  const handleQuickWishlist = async (gameId: number, e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (wishlistIds.has(gameId) || savingWishlistGameId === gameId) return;

    setSavingWishlistGameId(gameId);
    setQuickActionMessage('');

    try {
      const importRes = await fetch(`/api/games/import/${gameId}`, { method: 'POST' });
      const importData = await importRes.json();
      if (!importRes.ok) {
        throw new Error(importData?.error || 'No se pudo importar el juego.');
      }

      const saveRes = await fetch('/api/library', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ gameId, status: 'WISHLIST' })
      });
      const saveData = await saveRes.json();
      if (!saveRes.ok) {
        throw new Error(saveData?.error || 'No se pudo añadir a wishlist.');
      }

      setWishlistIds(prev => new Set([...prev, gameId]));
      setQuickActionMessage('¡Juego añadido a wishlist!');
      setTimeout(() => setQuickActionMessage(''), 3000);
    } catch (err: any) {
      setQuickActionMessage(`Error: ${err.message}`);
    } finally {
      setSavingWishlistGameId(null);
    }
  };

  return (
    <div className="space-y-6 pb-20 selection:bg-blue-600 selection:text-white">
      {/* Search Header */}
      <SpotlightPanel className="space-y-6 rounded-2xl border border-slate-800 bg-gradient-to-br from-[#0f121d] via-[#111317] to-[#0b0c0e] p-6 md:p-7">
        <ParticleBackdrop className="opacity-60" count={14} />
        <div className="flex items-center justify-between">
          <div className="space-y-3">
            <span className="inline-flex items-center rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-blue-400">
              React Bits Inspired
            </span>
            <h2 className="text-2xl font-bold font-display text-white tracking-tight">
              Descubrir <ShimmerText>Videojuegos</ShimmerText>
            </h2>
            <p className="max-w-2xl text-slate-400 text-xs leading-relaxed">
              Busca en el catálogo completo de IGDB o filtra según tus categorías preferidas
            </p>
          </div>
        </div>

        <form onSubmit={handleSearchSubmit} className="mt-3 flex gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Busca Elden Ring, Hollow Knight, Baldur's Gate..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-[#0f121d] border border-slate-800 text-slate-200 placeholder-slate-500 rounded-xl px-4 py-3 pl-11 text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition outline-none"
            />
            <Search className="absolute left-4 top-3.5 w-4.5 h-4.5 text-slate-500" />
          </div>
          <button
            type="submit"
            className="px-4 py-3 bg-blue-600 text-white rounded-xl text-xs font-semibold cursor-pointer hover:bg-blue-500 transition flex items-center gap-1.5"
          >
            Buscar
          </button>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3.5 py-3 border rounded-xl text-xs font-semibold cursor-pointer transition flex items-center gap-1.5 ${showFilters ? 'bg-slate-800/80 text-blue-400 border-blue-500/20' : 'bg-[#0f121d] text-slate-400 border-slate-805 hover:text-white'}`}
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </form>

        {/* Extended filters */}
        {showFilters && (
          <div className="mt-1 p-5 md:p-6 bg-[#0f121d] border border-slate-850 rounded-xl grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6 animate-fade-in">
            {/* Genre filter */}
            <div className="space-y-2.5">
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Género</label>
              <select
                value={selectedGenre}
                onChange={(e) => setSelectedGenre(e.target.value)}
                className="w-full bg-[#07090e] border border-slate-800 rounded-lg px-3 py-2.5 text-xs text-white outline-none focus:border-blue-500 transition"
              >
                <option value="">Todos los géneros</option>
                {GENRES.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            {/* Platform Filter */}
            <div className="space-y-2.5">
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Plataforma</label>
              <select
                value={selectedPlatform}
                onChange={(e) => setSelectedPlatform(e.target.value)}
                className="w-full bg-[#07090e] border border-slate-800 rounded-lg px-3 py-2.5 text-xs text-white outline-none focus:border-blue-500 transition"
              >
                <option value="">Todas las plataformas</option>
                {PLATFORMS.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            {/* Sorting */}
            <div className="space-y-2.5">
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Ordenar Catálogo</label>
              <div className="flex gap-1.5 bg-[#07090e] p-1.5 rounded-lg border border-slate-800">
                <button
                  type="button"
                  onClick={() => setSortBy('popularity')}
                  className={`flex-1 py-2 rounded-md text-[10px] font-bold transition flex items-center justify-center gap-1 ${sortBy === 'popularity' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/20' : 'text-slate-400'}`}
                >
                  <Flame className="w-3 h-3" /> Popular tags
                </button>
                <button
                  type="button"
                  onClick={() => setSortBy('rating')}
                  className={`flex-1 py-2 rounded-md text-[10px] font-bold transition flex items-center justify-center gap-1 ${sortBy === 'rating' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/20' : 'text-slate-400'}`}
                >
                  <Star className="w-3 h-3" /> Rating
                </button>
                <button
                  type="button"
                  onClick={() => { setQuery(''); setSortBy('newest'); }}
                  className={`flex-1 py-2 rounded-md text-[10px] font-bold transition flex items-center justify-center gap-1 ${sortBy === 'newest' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/20' : 'text-slate-400'}`}
                >
                  <Calendar className="w-3 h-3" /> Fecha
                </button>
              </div>
            </div>
          </div>
        )}
      </SpotlightPanel>

      {quickActionMessage && (
        <div className={`p-2.5 border text-xs rounded-xl ${quickActionMessage.includes('Error') ? 'bg-red-950/40 border-red-500/20 text-red-400' : 'bg-emerald-950/40 border-emerald-500/20 text-emerald-400'}`}>
          {quickActionMessage}
        </div>
      )}

      {/* Grid listing */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="space-y-2 animate-pulse bg-[#0f121d]/40 p-2.5 border border-slate-850 rounded-xl">
              <div className="w-full aspect-[3/4] bg-slate-800 rounded-lg"></div>
              <div className="h-4 bg-slate-800 rounded w-3/4"></div>
              <div className="h-3 bg-slate-800 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : apiError ? (
        <div className="bg-[#0f121d] border border-red-500/20 p-12 rounded-2xl text-center space-y-3">
          <Gamepad2 className="w-10 h-10 text-red-400 mx-auto" />
          <p className="text-red-300 text-sm font-semibold">Error cargando juegos</p>
          <p className="text-slate-400 text-xs max-w-sm mx-auto">{apiError}</p>
          <button
            onClick={() => searchGames(query, selectedGenre, selectedPlatform, sortBy)}
            className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl hover:text-white transition cursor-pointer flex items-center gap-1.5 mx-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Reintentar
          </button>
        </div>
      ) : games.length === 0 ? (
        <div className="bg-[#0f121d] border border-slate-800 p-12 rounded-2xl text-center space-y-3">
          <Gamepad2 className="w-10 h-10 text-slate-700 mx-auto" />
          <p className="text-slate-400 text-sm font-semibold">No se encontraron juegos</p>
          <p className="text-slate-500 text-xs max-w-sm mx-auto">
            Prueba a buscar con otras palabras, retira filtros o haz click en enter para realizar una query profunda a la API de IGDB.
          </p>
          <button
            onClick={() => { setQuery(''); setSelectedGenre(''); setSelectedPlatform(''); setSortBy('popularity'); }}
            className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl hover:text-white transition cursor-pointer flex items-center gap-1.5 mx-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Reestablecer filtros
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {games.map(game => (
            <TiltCard key={game.igdbId} className="rounded-xl">
              <div
                onClick={() => onSelectGame(game.igdbId)}
                className="group bg-[#0f121d] border border-slate-850/80 hover:border-slate-800 rounded-xl p-2.5 transition flex flex-col justify-between hover:translate-y-[-2px] duration-200 cursor-pointer block"
              >
                <div className="relative aspect-[3/4] rounded-lg overflow-hidden border border-slate-900 group-hover:shadow-lg group-hover:scale-[1.02] transition duration-200">
                  <img
                    src={game.cover}
                    alt={game.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  {game.rating && (
                    <div className="absolute top-2 right-2 bg-black/85 backdrop-blur-md text-[10px] font-bold text-yellow-400 border border-slate-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      {game.rating}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={(e) => handleQuickWishlist(game.igdbId, e)}
                    disabled={savingWishlistGameId === game.igdbId || wishlistIds.has(game.igdbId)}
                    className="absolute top-2 left-2 h-7 w-7 rounded-full bg-black/85 border border-slate-700 text-slate-300 hover:text-indigo-300 hover:border-indigo-500/40 flex items-center justify-center transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-80"
                    aria-label={wishlistIds.has(game.igdbId) ? 'Ya está en wishlist' : 'Añadir a wishlist'}
                  >
                    <Bookmark className={`w-3.5 h-3.5 ${wishlistIds.has(game.igdbId) ? 'fill-indigo-400 text-indigo-400' : ''}`} />
                  </button>
                </div>

                <div className="mt-3.5 flex-1 min-w-0">
                  <h3 className="text-xs font-bold text-white group-hover:text-blue-400 transition truncate leading-snug">
                    {game.name}
                  </h3>
                  <p className="text-[10px] text-slate-500 mt-1 truncate">
                    {game.genres.slice(0, 2).join(', ') || 'Videojuego'}
                  </p>
                </div>
              </div>
            </TiltCard>
          ))}
        </div>
      )}
    </div>
  );
};

