import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Gamepad2, RefreshCw, Search, SlidersHorizontal, Users } from 'lucide-react';
import { Game, GameStatus, User } from '../types.ts';
import { GameCard } from './GameCard.tsx';
import { ParticleBackdrop } from './ParticleBackdrop.tsx';
import { ShimmerText } from './ShimmerText.tsx';
import { SpotlightPanel } from './SpotlightPanel.tsx';
import { TiltCard } from './TiltCard.tsx';

interface DiscoverProps {
  onSelectGame: (gameId: number) => void;
  onSelectUser: (userId: string) => void;
  token?: string;
  onAuthRequired?: () => void;
}

interface DiscoverFilters {
  query: string;
  genreId: string;
  platformId: string;
  yearFrom: string;
  yearTo: string;
  minRating: string;
  sort: 'relevance' | 'newest' | 'rating' | 'popularity';
  page: number;
}

interface CatalogOption {
  id: number;
  name: string;
  slug: string;
}

interface DiscoverHome {
  newReleases: Game[];
  upcoming: Game[];
  popular: Game[];
  topRated: Game[];
}

const DEFAULT_FILTERS: DiscoverFilters = {
  query: '',
  genreId: '',
  platformId: '',
  yearFrom: '',
  yearTo: '',
  minRating: '',
  sort: 'relevance',
  page: 0
};

const readFiltersFromUrl = (): DiscoverFilters => {
  if (typeof window === 'undefined') return DEFAULT_FILTERS;
  const params = new URLSearchParams(window.location.search);
  return {
    query: params.get('q') || '',
    genreId: params.get('genres')?.split(',')[0] || '',
    platformId: params.get('platforms')?.split(',')[0] || '',
    yearFrom: params.get('yearFrom') || '',
    yearTo: params.get('yearTo') || '',
    minRating: params.get('minRating') || '',
    sort: ['relevance', 'newest', 'rating', 'popularity'].includes(params.get('sort') || '')
      ? params.get('sort') as DiscoverFilters['sort']
      : 'relevance',
    page: Math.max(0, Number.parseInt(params.get('page') || '0', 10) || 0)
  };
};

const makeSearchParams = (filters: DiscoverFilters) => {
  const params = new URLSearchParams();
  if (filters.query.trim()) params.set('q', filters.query.trim());
  if (filters.genreId) params.set('genres', filters.genreId);
  if (filters.platformId) params.set('platforms', filters.platformId);
  if (filters.yearFrom) params.set('yearFrom', filters.yearFrom);
  if (filters.yearTo) params.set('yearTo', filters.yearTo);
  if (filters.minRating) params.set('minRating', filters.minRating);
  if (filters.sort !== 'relevance') params.set('sort', filters.sort);
  if (filters.page > 0) params.set('page', String(filters.page));
  return params;
};

const GameSkeletons: React.FC<{ count?: number }> = ({ count = 8 }) => (
  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
    {Array.from({ length: count }, (_, index) => (
      <div key={index} className="animate-pulse rounded-xl border border-slate-850 bg-[#0f121d] p-2.5">
        <div className="aspect-[3/4] rounded-lg bg-slate-800" />
        <div className="mt-3 h-3 w-3/4 rounded bg-slate-800" />
        <div className="mt-2 h-2.5 w-1/2 rounded bg-slate-800" />
      </div>
    ))}
  </div>
);

export const Discover: React.FC<DiscoverProps> = ({ onSelectGame, onSelectUser, token, onAuthRequired }) => {
  const [filters, setFilters] = useState<DiscoverFilters>(readFiltersFromUrl);
  const [games, setGames] = useState<Game[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [home, setHome] = useState<DiscoverHome | null>(null);
  const [genres, setGenres] = useState<CatalogOption[]>([]);
  const [platforms, setPlatforms] = useState<CatalogOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingHome, setLoadingHome] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [homeError, setHomeError] = useState<string | null>(null);
  const [taxonomyError, setTaxonomyError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [expandedRails, setExpandedRails] = useState<Set<keyof DiscoverHome>>(new Set());
  const [libraryStatuses, setLibraryStatuses] = useState<Map<number, GameStatus>>(new Map());
  const [savingWishlistGameId, setSavingWishlistGameId] = useState<number | null>(null);
  const [quickActionMessage, setQuickActionMessage] = useState('');
  const [shortSearchForced, setShortSearchForced] = useState(false);
  const skipUrlSync = useRef(false);
  const forceShortSearch = useRef(false);
  const isUserSearch = filters.query.trim().startsWith('@');
  const hasActiveFilters = Boolean(
    filters.query.trim() || filters.genreId || filters.platformId || filters.yearFrom
      || filters.yearTo || filters.minRating || filters.sort !== 'relevance'
  );
  const genreById = useMemo(() => new Map(genres.map(option => [String(option.id), option.name])), [genres]);
  const platformById = useMemo(() => new Map(platforms.map(option => [String(option.id), option.name])), [platforms]);

  const fetchHome = useCallback(async (signal?: AbortSignal) => {
    setLoadingHome(true);
    setHomeError(null);
    try {
      const response = await fetch('/api/discover/home', { signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'No se pudo cargar Descubrir.');
      setHome(data);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setHomeError(error instanceof Error ? error.message : 'Error inesperado al cargar el catálogo.');
    } finally {
      if (!signal?.aborted) setLoadingHome(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void fetchHome(controller.signal);
    return () => controller.abort();
  }, [fetchHome]);

  useEffect(() => {
    const controller = new AbortController();
    const loadTaxonomies = async () => {
      try {
        const [genreResponse, platformResponse] = await Promise.all([
          fetch('/api/igdb/genres', { signal: controller.signal }),
          fetch('/api/igdb/platforms', { signal: controller.signal })
        ]);
        const [genreData, platformData] = await Promise.all([genreResponse.json(), platformResponse.json()]);
        if (!genreResponse.ok) throw new Error(genreData?.error || 'No se pudieron cargar los géneros.');
        if (!platformResponse.ok) throw new Error(platformData?.error || 'No se pudieron cargar las plataformas.');
        setGenres(Array.isArray(genreData) ? genreData : []);
        setPlatforms(Array.isArray(platformData) ? platformData : []);
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setTaxonomyError(error instanceof Error ? error.message : 'No se pudieron cargar los filtros.');
      }
    };
    void loadTaxonomies();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      skipUrlSync.current = true;
      setFilters(readFiltersFromUrl());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      if (skipUrlSync.current) {
        skipUrlSync.current = false;
      } else {
        const params = makeSearchParams(filters);
        const search = params.toString();
        const nextUrl = `${window.location.pathname}${search ? `?${search}` : ''}${window.location.hash}`;
        window.history.pushState(null, '', nextUrl);
      }

      const query = filters.query.trim();
      if (isUserSearch) {
        const username = query.slice(1).trim();
        setApiError(null);
        setGames([]);
        if (!username) {
          setUsers([]);
          setLoading(false);
          return;
        }

        setLoading(true);
        try {
          const response = await fetch(`/api/users?search=${encodeURIComponent(username)}`, { signal: controller.signal });
          const data = await response.json();
          if (!response.ok) throw new Error(data?.error || 'No se pudieron buscar los usuarios.');
          setUsers(Array.isArray(data) ? data : []);
        } catch (error) {
          if (error instanceof DOMException && error.name === 'AbortError') return;
          setUsers([]);
          setApiError(error instanceof Error ? error.message : 'Error inesperado al buscar usuarios.');
        } finally {
          if (!controller.signal.aborted) setLoading(false);
        }
        return;
      }

      setUsers([]);
      if (query.length === 1 && !forceShortSearch.current) {
        setApiError(null);
        setGames([]);
        setLoading(false);
        setHasMore(false);
        return;
      }
      forceShortSearch.current = false;

      if (!hasActiveFilters) {
        setGames([]);
        setApiError(null);
        setLoading(false);
        setLoadingMore(false);
        return;
      }

      const isAppending = filters.page > 0;
      setLoading(!isAppending);
      setLoadingMore(isAppending);
      setApiError(null);

      try {
        const params = makeSearchParams(filters);
        params.set('limit', '20');
        const response = await fetch(`/api/games/search?${params.toString()}`, { signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || 'No se pudo buscar en el catálogo.');
        const items: Game[] = Array.isArray(data?.items) ? data.items : [];
        setGames(previous => {
          if (!isAppending) return items;
          const merged = new Map(previous.map(game => [game.igdbId, game]));
          items.forEach(game => merged.set(game.igdbId, game));
          return [...merged.values()];
        });
        setHasMore(Boolean(data?.hasMore));
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setApiError(error instanceof Error ? error.message : 'Error inesperado al consultar IGDB.');
        if (!isAppending) setGames([]);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    }, isUserSearch ? 300 : 350);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [filters, hasActiveFilters, isUserSearch]);

  useEffect(() => {
    const loadLibrary = async () => {
      if (!token) {
        setLibraryStatuses(new Map());
        return;
      }
      try {
        const meResponse = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!meResponse.ok) return;
        const me = await meResponse.json();
        const libraryResponse = await fetch(`/api/users/${me.id}/library`);
        if (!libraryResponse.ok) return;
        const data = await libraryResponse.json();
        setLibraryStatuses(new Map(
          (Array.isArray(data) ? data : [])
            .filter((entry: any) => Number.isSafeInteger(entry?.gameId) && typeof entry?.status === 'string')
            .map((entry: any) => [entry.gameId, entry.status as GameStatus])
        ));
      } catch (error) {
        console.error('Error loading library statuses for Discover:', error);
      }
    };
    void loadLibrary();
  }, [token]);

  const updateFilters = (updates: Partial<DiscoverFilters>) => {
    if (updates.query !== undefined && updates.query.trim().length !== 1) {
      setShortSearchForced(false);
    }
    setFilters(current => ({ ...current, ...updates, page: updates.page ?? 0 }));
  };

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    forceShortSearch.current = true;
    setShortSearchForced(filters.query.trim().length === 1);
    setFilters(current => ({ ...current, page: 0 }));
  };

  const clearFilters = () => {
    forceShortSearch.current = false;
    setFilters(DEFAULT_FILTERS);
  };

  const handleQuickWishlist = async (gameId: number, event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!token) {
      onAuthRequired?.();
      return;
    }
    if (libraryStatuses.has(gameId) || savingWishlistGameId === gameId) return;

    setSavingWishlistGameId(gameId);
    setQuickActionMessage('');
    try {
      const importResponse = await fetch(`/api/games/import/${gameId}`, { method: 'POST' });
      const importedGame = await importResponse.json();
      if (!importResponse.ok) throw new Error(importedGame?.error || 'No se pudo guardar el juego.');

      const saveResponse = await fetch('/api/library', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ gameId, status: 'WISHLIST' })
      });
      const saved = await saveResponse.json();
      if (!saveResponse.ok) throw new Error(saved?.error || 'No se pudo añadir a la wishlist.');

      setLibraryStatuses(previous => new Map(previous).set(gameId, 'WISHLIST'));
      setQuickActionMessage('Juego añadido a tu wishlist.');
      window.setTimeout(() => setQuickActionMessage(''), 3000);
    } catch (error) {
      setQuickActionMessage(`Error: ${error instanceof Error ? error.message : 'No se pudo añadir el juego.'}`);
    } finally {
      setSavingWishlistGameId(null);
    }
  };

  const renderGameCard = (game: Game) => (
    <TiltCard key={game.igdbId} className="rounded-xl">
      <GameCard
        game={game}
        onSelectGame={onSelectGame}
        userGameStatus={libraryStatuses.get(game.igdbId)}
        showDiscoverMeta
        onToggleWishlist={!libraryStatuses.has(game.igdbId) ? handleQuickWishlist : undefined}
        savingWishlistGameId={savingWishlistGameId}
      />
    </TiltCard>
  );

  const renderRail = (key: keyof DiscoverHome, title: string, description: string, gamesForRail: Game[] | undefined) => {
    const isExpanded = expandedRails.has(key);
    const visibleGames = isExpanded ? gamesForRail || [] : (gamesForRail || []).slice(0, 10);
    return (
      <section key={key} aria-labelledby={`discover-${key}`} className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h3 id={`discover-${key}`} className="text-lg font-bold text-white">{title}</h3>
            <p className="mt-1 text-xs text-slate-500">{description}</p>
          </div>
          {(gamesForRail?.length || 0) > 10 && (
            <button
              type="button"
              onClick={() => setExpandedRails(previous => {
                const next = new Set(previous);
                if (next.has(key)) next.delete(key);
                else next.add(key);
                return next;
              })}
              className="shrink-0 rounded-lg border border-slate-800 px-3 py-2 text-xs font-semibold text-blue-300 hover:border-blue-500/40"
            >
              {isExpanded ? 'Ver menos' : 'Ver más'}
            </button>
          )}
        </div>
        {loadingHome && !gamesForRail ? <GameSkeletons count={5} /> : null}
        {!loadingHome && visibleGames.length > 0 && (
          <div className="grid grid-flow-col auto-cols-[minmax(145px,1fr)] gap-3 overflow-x-auto pb-3 sm:auto-cols-[minmax(165px,1fr)]">
            {visibleGames.map(renderGameCard)}
          </div>
        )}
      </section>
    );
  };

  const showHome = !hasActiveFilters && !isUserSearch;
  const activeFilterNames = [
    filters.genreId ? { key: 'genreId', name: genreById.get(filters.genreId) || 'Género' } : null,
    filters.platformId ? { key: 'platformId', name: platformById.get(filters.platformId) || 'Plataforma' } : null,
    filters.yearFrom ? { key: 'yearFrom', name: `Desde ${filters.yearFrom}` } : null,
    filters.yearTo ? { key: 'yearTo', name: `Hasta ${filters.yearTo}` } : null,
    filters.minRating ? { key: 'minRating', name: `Valoración ${filters.minRating}+` } : null
  ].filter((entry): entry is { key: keyof DiscoverFilters; name: string } => entry !== null);

  return (
    <div className="space-y-6 pb-20 selection:bg-blue-600 selection:text-white">
      <SpotlightPanel className="relative space-y-5 overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-[#0f121d] via-[#111317] to-[#0b0c0e] p-5 md:p-7">
        <ParticleBackdrop className="opacity-60" count={14} />
        <div className="relative">
          <h2 className="text-2xl font-bold font-display tracking-tight text-white">
            Descubrir <ShimmerText>Videojuegos</ShimmerText>
          </h2>
          <p className="mt-2 max-w-2xl text-xs leading-relaxed text-slate-400">
            Explora lanzamientos, encuentra tu próximo juego y busca en el catálogo de IGDB.
          </p>
        </div>

        <form onSubmit={handleSearchSubmit} className="relative flex gap-2">
          <label htmlFor="discover-search" className="sr-only">Buscar videojuegos o usuarios</label>
          <div className="relative min-w-0 flex-1">
            <Search aria-hidden="true" className="absolute left-4 top-3.5 h-4 w-4 text-slate-500" />
            <input
              id="discover-search"
              type="search"
              placeholder="Busca juegos o @usuarios..."
              value={filters.query}
              onChange={event => updateFilters({ query: event.target.value })}
              className="w-full rounded-xl border border-slate-800 bg-[#0f121d] py-3 pl-11 pr-4 text-xs text-slate-200 outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <button type="submit" className="rounded-xl bg-blue-600 px-4 py-3 text-xs font-semibold text-white transition hover:bg-blue-500">
            Buscar
          </button>
          {!isUserSearch && (
            <button
              type="button"
              aria-label={showFilters ? 'Ocultar filtros' : 'Mostrar filtros'}
              aria-expanded={showFilters}
              onClick={() => setShowFilters(open => !open)}
              className={`rounded-xl border px-3.5 py-3 transition ${showFilters ? 'border-blue-500/30 bg-slate-800 text-blue-300' : 'border-slate-800 bg-[#0f121d] text-slate-400 hover:text-white'}`}
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>
          )}
        </form>

        {showFilters && !isUserSearch && (
          <div className="relative grid grid-cols-1 gap-4 rounded-xl border border-slate-800 bg-[#0b0e16] p-4 sm:grid-cols-2 xl:grid-cols-3">
            <label className="space-y-1.5 text-[11px] font-semibold text-slate-400">
              <span className="block">Género</span>
              <select value={filters.genreId} onChange={event => updateFilters({ genreId: event.target.value })} className="w-full rounded-lg border border-slate-800 bg-[#07090e] px-3 py-2.5 text-xs text-white">
                <option value="">Todos los géneros</option>
                {genres.map(genre => <option key={genre.id} value={genre.id}>{genre.name}</option>)}
              </select>
            </label>
            <label className="space-y-1.5 text-[11px] font-semibold text-slate-400">
              <span className="block">Plataforma</span>
              <select value={filters.platformId} onChange={event => updateFilters({ platformId: event.target.value })} className="w-full rounded-lg border border-slate-800 bg-[#07090e] px-3 py-2.5 text-xs text-white">
                <option value="">Todas las plataformas</option>
                {platforms.map(platform => <option key={platform.id} value={platform.id}>{platform.name}</option>)}
              </select>
            </label>
            <label className="space-y-1.5 text-[11px] font-semibold text-slate-400">
              <span className="block">Ordenar</span>
              <select value={filters.sort} onChange={event => updateFilters({ sort: event.target.value as DiscoverFilters['sort'] })} className="w-full rounded-lg border border-slate-800 bg-[#07090e] px-3 py-2.5 text-xs text-white">
                <option value="relevance">Relevancia</option>
                <option value="newest">Más recientes</option>
                <option value="rating">Mejor valorados</option>
                <option value="popularity">Más populares</option>
              </select>
            </label>
            <label className="space-y-1.5 text-[11px] font-semibold text-slate-400">
              <span className="block">Desde el año</span>
              <input type="number" min="1950" max="2100" value={filters.yearFrom} onChange={event => updateFilters({ yearFrom: event.target.value })} className="w-full rounded-lg border border-slate-800 bg-[#07090e] px-3 py-2.5 text-xs text-white" placeholder="p. ej. 2018" />
            </label>
            <label className="space-y-1.5 text-[11px] font-semibold text-slate-400">
              <span className="block">Hasta el año</span>
              <input type="number" min="1950" max="2100" value={filters.yearTo} onChange={event => updateFilters({ yearTo: event.target.value })} className="w-full rounded-lg border border-slate-800 bg-[#07090e] px-3 py-2.5 text-xs text-white" placeholder="p. ej. 2026" />
            </label>
            <label className="space-y-1.5 text-[11px] font-semibold text-slate-400">
              <span className="block">Valoración mínima (0–100)</span>
              <input type="number" min="0" max="100" value={filters.minRating} onChange={event => updateFilters({ minRating: event.target.value })} className="w-full rounded-lg border border-slate-800 bg-[#07090e] px-3 py-2.5 text-xs text-white" placeholder="Cualquier valoración" />
            </label>
          </div>
        )}
      </SpotlightPanel>

      {taxonomyError && <p role="status" className="text-xs text-amber-300">{taxonomyError}</p>}
      {quickActionMessage && (
        <div role="status" className={`rounded-xl border p-2.5 text-xs ${quickActionMessage.startsWith('Error') ? 'border-red-500/20 bg-red-950/40 text-red-300' : 'border-emerald-500/20 bg-emerald-950/40 text-emerald-300'}`}>
          {quickActionMessage}
        </div>
      )}

      {showHome && (
        <div className="space-y-8">
          {homeError ? (
            <div className="rounded-2xl border border-red-500/20 bg-[#0f121d] p-8 text-center">
              <p className="text-sm font-semibold text-red-300">No se pudo cargar el catálogo</p>
              <p className="mt-2 text-xs text-slate-400">{homeError}</p>
              <button type="button" onClick={() => void fetchHome()} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-xs text-white">
                <RefreshCw className="h-3.5 w-3.5" /> Reintentar
              </button>
            </div>
          ) : (
            <>
              {renderRail('newReleases', 'Nuevos lanzamientos relevantes', 'Novedades de los últimos 90 días seleccionadas por interés y valoración.', home?.newReleases)}
              {renderRail('upcoming', 'Próximamente', 'Juegos con lanzamiento previsto en los próximos cuatro meses.', home?.upcoming)}
              {renderRail('popular', 'Populares ahora', 'Juegos con mayor actividad y valoraciones en IGDB.', home?.popular)}
              {renderRail('topRated', 'Mejor valorados del último año', 'Lanzamientos recientes con buenas valoraciones de la comunidad.', home?.topRated)}
            </>
          )}
        </div>
      )}

      {hasActiveFilters && !isUserSearch && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-bold text-white">
              {filters.query.trim() ? `Resultados para “${filters.query.trim()}”` : 'Juegos que coinciden con tus filtros'}
            </h3>
            {(activeFilterNames.length > 0 || filters.query.trim()) && (
              <button type="button" onClick={clearFilters} className="text-xs font-semibold text-blue-300 hover:text-blue-200">
                Limpiar filtros
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {filters.query.trim() && <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-[11px] text-blue-200">Búsqueda: {filters.query.trim()}</span>}
            {activeFilterNames.map(filter => (
              <button
                type="button"
                key={filter.key}
                onClick={() => updateFilters({ [filter.key]: '' })}
                className="rounded-full border border-slate-700 bg-slate-800/70 px-2.5 py-1 text-[11px] text-slate-300 hover:text-white"
                aria-label={`Quitar filtro ${filter.name}`}
              >
                {filter.name} ×
              </button>
            ))}
          </div>

          {loading && games.length === 0 ? <GameSkeletons /> : null}
          {apiError ? (
            <div className="rounded-2xl border border-red-500/20 bg-[#0f121d] p-8 text-center">
              <p className="text-sm font-semibold text-red-300">Error buscando juegos</p>
              <p className="mt-2 text-xs text-slate-400">{apiError}</p>
              <button type="button" onClick={() => setFilters(current => ({ ...current }))} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-xs text-white">
                <RefreshCw className="h-3.5 w-3.5" /> Reintentar
              </button>
            </div>
          ) : games.length > 0 ? (
            <>
              <p aria-live="polite" className="text-xs text-slate-500">{games.length} resultados cargados</p>
              <div className={`grid grid-cols-2 gap-3 transition-opacity sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 ${loading ? 'opacity-60' : 'opacity-100'}`}>
                {games.map(renderGameCard)}
              </div>
              {hasMore && (
                <div className="flex justify-center">
                  <button type="button" disabled={loadingMore} onClick={() => updateFilters({ page: filters.page + 1 })} className="rounded-xl border border-blue-500/30 bg-blue-600/10 px-5 py-2.5 text-xs font-semibold text-blue-300 disabled:opacity-60">
                    {loadingMore ? 'Cargando...' : 'Cargar más'}
                  </button>
                </div>
              )}
            </>
          ) : !loading && !apiError && filters.query.trim().length === 1 && !shortSearchForced ? (
            <div className="rounded-2xl border border-slate-800 bg-[#0f121d] p-8 text-center">
              <Search className="mx-auto h-8 w-8 text-slate-600" />
              <p className="mt-3 text-sm font-semibold text-slate-300">Escribe al menos 2 caracteres</p>
              <p className="mt-1 text-xs text-slate-500">También puedes pulsar Buscar para forzar una consulta corta.</p>
            </div>
          ) : !loading ? (
            <div className="rounded-2xl border border-slate-800 bg-[#0f121d] p-8 text-center">
              <Gamepad2 className="mx-auto h-8 w-8 text-slate-600" />
              <p className="mt-3 text-sm font-semibold text-slate-300">No se encontraron juegos</p>
              <p className="mt-1 text-xs text-slate-500">Prueba con otro título o quita alguno de los filtros activos.</p>
              <button type="button" onClick={clearFilters} className="mt-4 rounded-lg bg-slate-800 px-4 py-2 text-xs font-semibold text-white">Quitar filtros</button>
            </div>
          ) : null}
        </div>
      )}

      {isUserSearch && (
        <section aria-live="polite" className="space-y-3">
          {loading ? <div className="h-24 animate-pulse rounded-xl bg-[#0f121d]" /> : apiError ? (
            <p className="rounded-xl border border-red-500/20 p-5 text-xs text-red-300">{apiError}</p>
          ) : filters.query.trim() === '@' ? (
            <p className="rounded-xl border border-slate-800 p-8 text-center text-xs text-slate-400">Escribe un nombre de usuario después de @.</p>
          ) : users.length ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {users.map(user => (
                <button key={user.id} type="button" onClick={() => onSelectUser(user.id)} className="flex items-center gap-3 rounded-xl border border-slate-800 bg-[#0f121d] p-4 text-left hover:border-blue-500/40">
                  <img src={user.avatar} alt="" loading="lazy" className="h-11 w-11 rounded-full border border-slate-800 object-cover" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-white">@{user.username}</span>
                    <span className="mt-1 block line-clamp-2 text-[11px] text-slate-500">{user.bio || 'Sin bio por ahora.'}</span>
                  </span>
                </button>
              ))}
            </div>
          ) : !loading && <p className="rounded-xl border border-slate-800 p-8 text-center text-xs text-slate-400">No se encontraron usuarios.</p>}
        </section>
      )}

    </div>
  );
};
