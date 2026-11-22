import { apiFetch } from '../api.ts';
import React, { useState, useEffect } from 'react';
import { UserGame, Game, GameStatus } from '../types.ts';
import { Search, SortAsc, Star, Flame, Clock, RefreshCw, ChevronDown } from 'lucide-react';
import { GameCard } from './GameCard.tsx';
import { GameStatusDialog } from './GameStatusDialog.tsx';
import { useLanguage } from '../i18n.tsx';
import { useIsMobileLayout } from '../hooks/useIsMobileLayout.ts';
import { GameStatusIcon } from './GameStatusIcon.tsx';
import { CustomListPicker } from './CustomListPicker.tsx';

interface LibraryProps {
  userId: string;
  onSelectGame: (gameId: number) => void;
  token: string;
}

export const Library: React.FC<LibraryProps> = ({ userId, onSelectGame, token }) => {
  const { t } = useLanguage();
  const useMobileCardLayout = useIsMobileLayout();
  const [completeLib, setCompleteLib] = useState<(UserGame & { game: Game })[]>([]);
  const [filteredLib, setFilteredLib] = useState<(UserGame & { game: Game })[]>([]);
  const [activeTab, setActiveTab] = useState<GameStatus | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'rating' | 'hours' | 'name' | 'date'>('date');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [wishlistError, setWishlistError] = useState(false);
  const [togglingWishlistId, setTogglingWishlistId] = useState<number | null>(null);
  const [statusGame, setStatusGame] = useState<(UserGame & { game: Game }) | null>(null);
  const [customListGame, setCustomListGame] = useState<Game | null>(null);

  const fetchLibrary = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await apiFetch(`/api/users/${userId}/library`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error(`Library request failed: ${res.status}`);
      const data = await res.json();
      setCompleteLib(data);
    } catch (err) {
      console.error(err);
      setLoadError(true);
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
      results = results.filter(item => activeTab === 'WISHLIST' ? item.isInWishlist : item.status === activeTab);
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
    setWishlistError(false);

    try {
      const item = completeLib.find(i => i.gameId === gameId);
      if (!item) return;

      const res = await apiFetch(`/api/library/${gameId}/wishlist`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ enabled: !item.isInWishlist })
      });
      if (!res.ok) throw new Error(`Wishlist update failed: ${res.status}`);
      const { userGame } = await res.json();
      setCompleteLib(prev => userGame
        ? prev.map(entry => entry.gameId === gameId ? userGame : entry)
        : prev.filter(entry => entry.gameId !== gameId));
    } catch (err) {
      console.error(err);
      setWishlistError(true);
    } finally {
      setTogglingWishlistId(null);
    }
  };


  const STATUS_TABS: {
    label: string;
    value: GameStatus | 'ALL';
  }[] = [
    { label: t('Todo'), value: 'ALL' },
    { label: t('Lista de deseos'), value: 'WISHLIST' },
    { label: t('Jugando'), value: 'PLAYING' },
    { label: t('Jugados'), value: 'PLAYED' },
    { label: t('Completado'), value: 'COMPLETED' },
    { label: t('Abandonado'), value: 'ABANDONED' },
  ];

  return (
    <div className="space-y-6 pb-20 selection:bg-accent/30 selection:text-white">
      {/* Title Header */}
      <div>
        <h2 className="text-2xl font-bold font-display text-white tracking-tight">
          {t('Mi Biblioteca Gamer')}
        </h2>
        <p className="mt-1 text-base text-slate-400 sm:text-sm">
          {t('Organiza, filtra y analiza el estado actual y horas dedicadas de todos tus progresos de juego')}
        </p>
      </div>

      {/* Categories slider */}
      {wishlistError && <p role="alert" className="text-sm text-red-300">{t('No se pudo actualizar la wishlist.')}</p>}
      <div className={useMobileCardLayout ? 'relative' : 'flex flex-wrap gap-2'}>
      {useMobileCardLayout ? (
        <>
          {activeTab !== 'ALL' && <GameStatusIcon status={activeTab} aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 z-10 size-4 -translate-y-1/2 text-accent" />}
          <select
            aria-label={t('Selecciona un estado')}
            value={activeTab}
            onChange={event => setActiveTab(event.target.value as GameStatus | 'ALL')}
            className={`min-h-11 w-full appearance-none rounded-xl border bg-[#0f121d] py-2 pl-4 pr-11 text-base font-semibold outline-none transition focus:ring-1 focus:ring-accent ${activeTab === 'ALL' ? 'border-slate-800 text-slate-200' : 'border-accent/50 pl-11 text-accent'}`}
          >
            {STATUS_TABS.map(tab => <option key={tab.value} value={tab.value}>{tab.label}</option>)}
          </select>
          <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        </>
      ) : STATUS_TABS.map(tab => (
        <button
          key={tab.value}
          type="button"
          aria-pressed={activeTab === tab.value}
          onClick={() => setActiveTab(tab.value)}
          className={`min-h-11 px-4 py-2 rounded-xl text-sm sm:text-xs font-semibold cursor-pointer transition border ${
            activeTab === tab.value
              ? 'bg-accent text-on-accent border-accent'
              : 'bg-[#0f121d] text-slate-400 border-slate-800 hover:text-white'
          }`}
        >
          {tab.value !== 'ALL' && <GameStatusIcon status={tab.value} className="mr-1.5 inline size-3.5 align-[-2px]" />}
          <span>{tab.label}</span>
        </button>
      ))}
      </div>

      {/* Search and Sort panel */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            aria-label={t('Filtra por título o categoría dentro de tu biblioteca...')}
            placeholder={t('Filtra por título o categoría dentro de tu biblioteca...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full min-h-11 bg-[#0f121d] border border-slate-800 text-slate-200 placeholder-slate-400 rounded-xl px-4 py-2.5 pl-11 text-base sm:text-xs focus:ring-1 focus:ring-accent transition outline-none"
          />
          <Search className="absolute left-4 top-3 w-4.5 h-4.5 text-slate-500" />
        </div>

        <div className="flex flex-wrap items-center gap-2 bg-[#07090e] p-1 rounded-xl border border-slate-800">
          <span className="basis-full sm:basis-auto text-xs sm:text-[10px] uppercase font-bold text-slate-400 px-2 tracking-wider flex items-center gap-1">
            <SortAsc className="w-3.5 h-3.5" /> {t('Ordenar:')}
          </span>
          <button
            type="button"
            aria-pressed={sortBy === 'date'}
            onClick={() => setSortBy('date')}
            className={`min-h-11 min-w-11 flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-sm sm:text-xs font-semibold transition ${sortBy === 'date' ? 'bg-[#1e293b] text-accent' : 'text-slate-400'}`}
          >
            {t('Fecha')}
          </button>
          <button
            type="button"
            aria-pressed={sortBy === 'rating'}
            onClick={() => setSortBy('rating')}
            className={`min-h-11 min-w-11 flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-sm sm:text-xs font-semibold transition ${sortBy === 'rating' ? 'bg-[#1e293b] text-accent' : 'text-slate-400'}`}
          >
            Rating
          </button>
          <button
            type="button"
            aria-pressed={sortBy === 'hours'}
            onClick={() => setSortBy('hours')}
            className={`min-h-11 min-w-11 flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-sm sm:text-xs font-semibold transition ${sortBy === 'hours' ? 'bg-[#1e293b] text-accent' : 'text-slate-400'}`}
          >
            {t('Horas')}
          </button>
          <button
            type="button"
            aria-pressed={sortBy === 'name'}
            onClick={() => setSortBy('name')}
            className={`min-h-11 min-w-11 flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-sm sm:text-xs font-semibold transition ${sortBy === 'name' ? 'bg-[#1e293b] text-accent' : 'text-slate-400'}`}
          >
            A-Z
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_8px_rgba(59,130,246,0.7)]" />

          <p className="text-[11px] uppercase tracking-widest font-semibold text-slate-500">
            {t('Biblioteca')}
          </p>

          <span className="px-2 py-0.5 rounded-md bg-accent/10 border border-accent/20 text-[11px] font-bold text-accent">
            {filteredLib.length}
          </span>

          <span className="text-[11px] text-slate-600">
            {filteredLib.length === 1 ? t('juego') : t('juegos')}
          </span>
        </div>

        {(searchQuery || activeTab !== 'ALL') && (
          <span className="text-[10px] text-slate-600">
            {t('Filtrado por')} "{searchQuery}"
          </span>
        )}
      </div>

      {/* Grid listing */}
      {loading ? (
        <div className={`mx-auto grid w-full grid-cols-1 ${useMobileCardLayout ? 'gap-3' : 'max-w-[16rem] gap-5 sm:max-w-none sm:grid-cols-2 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'}`}>
          {[1, 2, 3, 4].map(i => (
            useMobileCardLayout ? (
              <div key={i} className="flex h-40 animate-pulse gap-3 rounded-xl border border-white/[0.06] bg-[#17243b] p-2.5">
                <div className="w-[10.5rem] shrink-0 rounded-lg bg-slate-700/70" />
                <div className="flex min-w-0 flex-1 flex-col py-1">
                  <div className="h-5 w-3/4 rounded bg-slate-700/70" />
                  <div className="mt-2 h-3 w-1/2 rounded bg-slate-700/50" />
                  <div className="mt-3 space-y-2">
                    <div className="h-3 w-full rounded bg-slate-700/50" />
                    <div className="h-3 w-5/6 rounded bg-slate-700/50" />
                    <div className="h-3 w-2/3 rounded bg-slate-700/50" />
                  </div>
                </div>
              </div>
            ) : (
              <div key={i} className="animate-pulse bg-[#0f121d]/40 border border-slate-850 p-3 rounded-xl space-y-2">
                <div className="aspect-[3/4] bg-slate-800 rounded-lg w-full"></div>
                <div className="h-4 bg-slate-800 rounded w-2/3"></div>
              </div>
            )
          ))}
        </div>
      ) : loadError ? (
        <div role="alert" className="rounded-2xl border border-red-500/20 bg-[#0f121d] p-8 text-center">
          <p className="text-sm font-semibold text-red-300">{t('No se pudo cargar tu biblioteca.')}</p>
          <button type="button" onClick={() => void fetchLibrary()} className="mt-4 rounded-xl bg-slate-800 px-4 py-2 text-sm text-white">{t('Reintentar')}</button>
        </div>
      ) : filteredLib.length === 0 ? (
        <div className="py-12 bg-[#0f121d] border border-slate-800 p-8 rounded-2xl text-center space-y-2">
          <Clock className="w-8 h-8 text-slate-700 mx-auto" />
          <p className="text-base sm:text-sm text-slate-300 font-semibold">{t('Biblioteca vacía')}</p>
          <p className="text-base sm:text-xs text-slate-400 max-w-sm mx-auto">
            {t('Ninguno de tus registros coincide con el término de búsqueda o categoría actual. ¡Explora el catálogo y añade tu primer tracker!')}
          </p>
          {searchQuery && (
            <button
              onClick={() => { setSearchQuery(''); setActiveTab('ALL'); }}
              className="px-4 py-2 bg-slate-800 hover:text-white transition text-xs font-semibold rounded-xl text-slate-300 cursor-pointer flex items-center gap-1.5 mx-auto"
            >
              {t('Reestablecer filtros')}
            </button>
          )}
        </div>
      ) : (
        <div className={`mx-auto grid w-full grid-cols-1 ${useMobileCardLayout ? 'gap-y-3' : 'max-w-[16rem] gap-5 sm:max-w-none sm:grid-cols-2 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'}`}>
          {filteredLib.map(item => (
            <GameCard
              key={item.gameId}
              game={item.game}
              variant={useMobileCardLayout ? 'mobile' : 'default'}
              userGameStatus={item.status}
              isInWishlist={item.isInWishlist}
              userGameRating={item.rating}
              userGameHours={item.hoursPlayed}
              userGameNotes={item.notes}
              onSelectGame={onSelectGame}
              onAddToCustomList={setCustomListGame}
              onManageStatus={() => setStatusGame(item)}
              statusActionDisabled={togglingWishlistId !== null}
              onToggleWishlist={handleToggleWishlist}
              togglingWishlistId={togglingWishlistId}
            />
          ))}
        </div>
      )}
      {statusGame && (
        <GameStatusDialog
          game={statusGame.game}
          status={statusGame.status}
          token={token}
          onClose={() => setStatusGame(null)}
          onSaved={saved => setCompleteLib(previous => previous.map(item => item.gameId === saved.gameId ? saved : item))}
          onRemoved={gameId => setCompleteLib(previous => previous.filter(item => item.gameId !== gameId))}
        />
      )}
      <CustomListPicker game={customListGame} userId={userId} token={token} onClose={() => setCustomListGame(null)} />
    </div>
  );
};
