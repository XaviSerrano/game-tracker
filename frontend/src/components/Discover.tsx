import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Gamepad2, RefreshCw, Search, SlidersHorizontal, Users } from 'lucide-react';
import { Game, GameStatus, User, UserGame } from '../types.ts';
import { GameCard } from './GameCard.tsx';
import { GameStatusDialog } from './GameStatusDialog.tsx';
import { useLanguage } from '../i18n.tsx';

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
  sort: 'relevance' | 'newest' | 'rating';
  page: number;
}

interface CatalogOption {
  id: number;
  name: string;
  slug: string;
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
    sort: ['relevance', 'newest', 'rating'].includes(params.get('sort') || '')
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
  <div className="mx-auto grid w-full max-w-[16rem] grid-cols-1 gap-x-4 gap-y-6 sm:max-w-none sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
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
  const { t } = useLanguage();
  const [filters, setFilters] = useState<DiscoverFilters>(readFiltersFromUrl);
  const [games, setGames] = useState<Game[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [popularGames, setPopularGames] = useState<Game[]>([]);
  const [popularPage, setPopularPage] = useState(0);
  const [popularHasMore, setPopularHasMore] = useState(false);
  const [genres, setGenres] = useState<CatalogOption[]>([]);
  const [platforms, setPlatforms] = useState<CatalogOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingHome, setLoadingHome] = useState(true);
  const [loadingMorePopular, setLoadingMorePopular] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [homeError, setHomeError] = useState<string | null>(null);
  const [taxonomyError, setTaxonomyError] = useState<string | null>(null);
  const [loadingTaxonomies, setLoadingTaxonomies] = useState(true);
  const [taxonomyRetry, setTaxonomyRetry] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [libraryStatuses, setLibraryStatuses] = useState<Map<number, GameStatus>>(new Map());
  const [wishlistIds, setWishlistIds] = useState<Set<number>>(new Set());
  const [libraryReady, setLibraryReady] = useState(false);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [libraryRetry, setLibraryRetry] = useState(0);
  const [savingWishlistGameId, setSavingWishlistGameId] = useState<number | null>(null);
  const [quickActionMessage, setQuickActionMessage] = useState('');
  const [statusGame, setStatusGame] = useState<Game | null>(null);
  const [shortSearchForced, setShortSearchForced] = useState(() => filters.query.trim().length === 1);
  const skipUrlSync = useRef(false);
  const forceShortSearch = useRef(filters.query.trim().length === 1);
  const isUserSearch = filters.query.trim().startsWith('@');
  const hasActiveFilters = Boolean(
    filters.query.trim() || filters.genreId || filters.platformId || filters.yearFrom
      || filters.yearTo || filters.minRating || filters.sort !== 'relevance'
  );
  const genreById = useMemo(() => new Map(genres.map(option => [String(option.id), option.name])), [genres]);
  const platformById = useMemo(() => new Map(platforms.map(option => [String(option.id), option.name])), [platforms]);

  const fetchPopular = useCallback(async (page: number, signal?: AbortSignal) => {
    if (page === 0) setLoadingHome(true);
    else setLoadingMorePopular(true);
    setHomeError(null);
    try {
      const response = await fetch(`/api/discover/popular?page=${page}`, { signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'No se pudieron cargar los juegos populares.');
      if (!Array.isArray(data?.items) || typeof data?.hasMore !== 'boolean') {
        throw new Error('La respuesta de juegos populares no es válida.');
      }
      const items: Game[] = data.items;
      setPopularGames(previous => {
        if (page === 0) return items;
        const merged = new Map(previous.map(game => [game.igdbId, game]));
        items.forEach(game => merged.set(game.igdbId, game));
        return [...merged.values()];
      });
      setPopularPage(page);
      setPopularHasMore(data.hasMore);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setHomeError(error instanceof Error ? error.message : 'Error inesperado al cargar el catálogo.');
    } finally {
      if (!signal?.aborted) {
        setLoadingHome(false);
        setLoadingMorePopular(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void fetchPopular(0, controller.signal);
    return () => controller.abort();
  }, [fetchPopular]);

  useEffect(() => {
    const controller = new AbortController();
    const loadTaxonomies = async () => {
      setLoadingTaxonomies(true);
      setTaxonomyError(null);
      const loadOptions = async (kind: 'genres' | 'platforms', label: string): Promise<CatalogOption[]> => {
        const response = await fetch(`/api/igdb/${kind}`, { signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || `No se pudieron cargar ${label}.`);
        if (!Array.isArray(data) || data.length === 0 || !data.every(option =>
          Number.isSafeInteger(option?.id) && typeof option?.name === 'string'
        )) throw new Error(`No se recibió una lista válida de ${label}.`);
        return data;
      };

      const [genreResult, platformResult] = await Promise.allSettled([
        loadOptions('genres', 'géneros'),
        loadOptions('platforms', 'plataformas')
      ]);
      if (controller.signal.aborted) return;
      const errors: string[] = [];
      if (genreResult.status === 'fulfilled') setGenres(genreResult.value);
      else {
        console.error('Error loading genres:', genreResult.reason);
        errors.push(genreResult.reason instanceof Error ? genreResult.reason.message : 'No se pudieron cargar los géneros.');
      }
      if (platformResult.status === 'fulfilled') setPlatforms(platformResult.value);
      else {
        console.error('Error loading platforms:', platformResult.reason);
        errors.push(platformResult.reason instanceof Error ? platformResult.reason.message : 'No se pudieron cargar las plataformas.');
      }
      setTaxonomyError(errors.length ? errors.join(' ') : null);
      setLoadingTaxonomies(false);
    };
    void loadTaxonomies();
    return () => controller.abort();
  }, [taxonomyRetry]);

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
          const response = await fetch(`/api/users?search=${encodeURIComponent(username)}`, {
            signal: controller.signal,
            headers: token ? { Authorization: `Bearer ${token}` } : undefined
          });
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
    const controller = new AbortController();
    const loadLibrary = async () => {
      setLibraryReady(false);
      setLibraryStatuses(new Map());
      setWishlistIds(new Set());
      if (!token) {
        setLoadingLibrary(false);
        return;
      }
      setLoadingLibrary(true);
      try {
        const meResponse = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal
        });
        if (!meResponse.ok) throw new Error('No se pudo comprobar la sesión.');
        const me = await meResponse.json();
        const libraryResponse = await fetch(`/api/users/${me.id}/library`, { signal: controller.signal });
        if (!libraryResponse.ok) throw new Error('No se pudo cargar tu biblioteca.');
        const data = await libraryResponse.json();
        if (!Array.isArray(data)) throw new Error('La respuesta de la biblioteca no es válida.');
        if (controller.signal.aborted) return;
        setLibraryStatuses(new Map(
          data
            .filter((entry: any) => Number.isSafeInteger(entry?.gameId) && typeof entry?.status === 'string')
            .map((entry: any) => [entry.gameId, entry.status as GameStatus])
        ));
        setWishlistIds(new Set((data as UserGame[]).filter(entry => entry.isInWishlist).map(entry => entry.gameId)));
        setLibraryReady(true);
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error('Error loading library statuses for Discover:', error);
        setQuickActionMessage(`Error: ${error instanceof Error ? error.message : 'No se pudo cargar tu biblioteca.'}`);
      } finally {
        if (!controller.signal.aborted) setLoadingLibrary(false);
      }
    };
    void loadLibrary();
    return () => controller.abort();
  }, [token, libraryRetry]);

  useEffect(() => {
    if (!quickActionMessage || quickActionMessage.startsWith('Error')) return;
    const timeout = window.setTimeout(() => setQuickActionMessage(''), 3000);
    return () => window.clearTimeout(timeout);
  }, [quickActionMessage]);

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
    if (!libraryReady) {
      setQuickActionMessage(loadingLibrary
        ? 'Cargando tu biblioteca. Inténtalo de nuevo en un momento.'
        : 'Error: No se ha podido comprobar tu biblioteca. Vuelve a intentarlo.');
      return;
    }
    if (savingWishlistGameId !== null) return;

    setSavingWishlistGameId(gameId);
    setQuickActionMessage('');
    try {
      const enabled = !wishlistIds.has(gameId);
      if (enabled && !libraryStatuses.has(gameId)) {
        const importResponse = await fetch(`/api/games/import/${gameId}`, { method: 'POST' });
        const importedGame = await importResponse.json();
        if (!importResponse.ok) throw new Error(importedGame?.error || 'No se pudo guardar el juego.');
      }
      const saveResponse = await fetch(`/api/library/${gameId}/wishlist`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ enabled })
      });
      const saved = await saveResponse.json();
      if (!saveResponse.ok) throw new Error(saved?.error || 'No se pudo añadir a la wishlist.');

      setLibraryStatuses(previous => {
        const next = new Map(previous);
        if (saved.userGame) next.set(gameId, saved.userGame.status);
        else next.delete(gameId);
        return next;
      });
      setWishlistIds(previous => {
        const next = new Set(previous);
        if (enabled) next.add(gameId); else next.delete(gameId);
        return next;
      });
      setQuickActionMessage(enabled ? 'Juego añadido a tu wishlist.' : 'Juego quitado de tu wishlist.');
    } catch (error) {
      setQuickActionMessage(`Error: ${error instanceof Error ? error.message : 'No se pudo añadir el juego.'}`);
    } finally {
      setSavingWishlistGameId(null);
    }
  };

  const renderGameCard = (game: Game) => (
      <GameCard
        key={game.igdbId}
        game={game}
        onSelectGame={onSelectGame}
        onManageStatus={() => {
          if (!token) {
            onAuthRequired?.();
          } else if (!libraryReady) {
            setQuickActionMessage(loadingLibrary
              ? 'Cargando tu biblioteca. Inténtalo de nuevo en un momento.'
              : 'Error: No se ha podido comprobar tu biblioteca. Vuelve a intentarlo.');
          } else if (savingWishlistGameId === null) {
            setStatusGame(game);
          }
        }}
        statusActionDisabled={savingWishlistGameId !== null}
        userGameStatus={libraryStatuses.get(game.igdbId)}
        isInWishlist={wishlistIds.has(game.igdbId)}
        showDiscoverMeta
        onToggleWishlist={handleQuickWishlist}
        savingWishlistGameId={savingWishlistGameId}
      />
  );

  const showHome = !hasActiveFilters && !isUserSearch;
  const activeFilterNames = [
    filters.genreId ? { key: 'genreId', name: genreById.get(filters.genreId) || t('Género') } : null,
    filters.platformId ? { key: 'platformId', name: platformById.get(filters.platformId) || t('Plataforma') } : null,
    filters.yearFrom ? { key: 'yearFrom', name: `${t('Desde')} ${filters.yearFrom}` } : null,
    filters.yearTo ? { key: 'yearTo', name: `${t('Hasta')} ${filters.yearTo}` } : null,
    filters.minRating ? { key: 'minRating', name: `${t('Valoración')} ${filters.minRating}+` } : null
  ].filter((entry): entry is { key: keyof DiscoverFilters; name: string } => entry !== null);
  const localizedQuickActionMessage = quickActionMessage.startsWith('Error: ')
    ? `Error: ${t(quickActionMessage.slice('Error: '.length))}`
    : t(quickActionMessage);

  return (
    <div className="space-y-6 pb-20 selection:bg-blue-600 selection:text-white">
      <section className="space-y-5 border-b border-slate-800 pb-6">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-white md:text-3xl">
            {t('Descubrir')} {t('Videojuegos')}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
            {t('Explora lanzamientos, encuentra tu próximo juego y busca en el catálogo de IGDB.')}
          </p>
        </div>

        <form onSubmit={handleSearchSubmit} className="flex max-w-3xl flex-wrap gap-2 sm:flex-nowrap">
          <label htmlFor="discover-search" className="sr-only">{t('Buscar videojuegos o usuarios')}</label>
          <div className="relative min-w-0 basis-full sm:flex-1">
            <Search aria-hidden="true" className="absolute left-4 top-3.5 h-4 w-4 text-slate-500" />
            <input
              id="discover-search"
              type="search"
              placeholder={t('Busca juegos o @usuarios...')}
              value={filters.query}
              onChange={event => updateFilters({ query: event.target.value })}
              className="w-full rounded-xl border border-slate-700 bg-[#111317] py-3 pl-11 pr-4 text-sm text-slate-200 outline-none placeholder:text-slate-400 focus:border-[#d9a352]"
            />
          </div>
          <button type="submit" className="rounded-xl bg-blue-600 px-4 py-3 text-xs font-semibold text-white transition hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e5b974]">
            {t('Buscar')}
          </button>
          {!isUserSearch && (
            <button
              type="button"
              aria-label={showFilters ? t('Ocultar filtros') : t('Mostrar filtros')}
              aria-expanded={showFilters}
              onClick={() => setShowFilters(open => !open)}
              className={`rounded-xl border px-3.5 py-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e5b974] ${showFilters ? 'border-[#d9a352]/50 bg-slate-800 text-[#e5b974]' : 'border-slate-700 bg-[#111317] text-slate-300 hover:text-white'}`}
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>
          )}
        </form>

        {showFilters && !isUserSearch && (
          <div className="relative grid grid-cols-1 gap-4 rounded-xl border border-slate-800 bg-[#0b0e16] p-4 sm:grid-cols-2 xl:grid-cols-3">
            <label className="space-y-1.5 text-[11px] font-semibold text-slate-400">
              <span className="block">{t('Género')}</span>
              <select value={filters.genreId} onChange={event => updateFilters({ genreId: event.target.value })} className="w-full rounded-lg border border-slate-800 bg-[#07090e] px-3 py-2.5 text-xs text-white [color-scheme:dark] [&>option]:bg-[#07090e] [&>option]:text-white">
                <option value="">{t('Todos los géneros')}</option>
                {loadingTaxonomies && genres.length === 0 && <option disabled>{t('Cargando géneros...')}</option>}
                {genres.map(genre => <option key={genre.id} value={genre.id}>{genre.name}</option>)}
              </select>
            </label>
            <label className="space-y-1.5 text-[11px] font-semibold text-slate-400">
              <span className="block">{t('Plataforma')}</span>
              <select value={filters.platformId} onChange={event => updateFilters({ platformId: event.target.value })} className="w-full rounded-lg border border-slate-800 bg-[#07090e] px-3 py-2.5 text-xs text-white [color-scheme:dark] [&>option]:bg-[#07090e] [&>option]:text-white">
                <option value="">{t('Todas las plataformas')}</option>
                {loadingTaxonomies && platforms.length === 0 && <option disabled>{t('Cargando plataformas...')}</option>}
                {platforms.map(platform => <option key={platform.id} value={platform.id}>{platform.name}</option>)}
              </select>
            </label>
            <label className="space-y-1.5 text-[11px] font-semibold text-slate-400">
              <span className="block">{t('Ordenar')}</span>
              <select value={filters.sort} onChange={event => updateFilters({ sort: event.target.value as DiscoverFilters['sort'] })} className="w-full rounded-lg border border-slate-800 bg-[#07090e] px-3 py-2.5 text-xs text-white">
                <option value="relevance">{t('Relevancia')}</option>
                <option value="newest">{t('Más recientes')}</option>
                <option value="rating">{t('Mejor valorados')}</option>
              </select>
            </label>
            <label className="space-y-1.5 text-[11px] font-semibold text-slate-400">
              <span className="block">{t('Desde el año')}</span>
              <input type="number" min="1950" max="2100" value={filters.yearFrom} onChange={event => updateFilters({ yearFrom: event.target.value })} className="w-full rounded-lg border border-slate-800 bg-[#07090e] px-3 py-2.5 text-xs text-white" placeholder={t('p. ej. 2018')} />
            </label>
            <label className="space-y-1.5 text-[11px] font-semibold text-slate-400">
              <span className="block">{t('Hasta el año')}</span>
              <input type="number" min="1950" max="2100" value={filters.yearTo} onChange={event => updateFilters({ yearTo: event.target.value })} className="w-full rounded-lg border border-slate-800 bg-[#07090e] px-3 py-2.5 text-xs text-white" placeholder={t('p. ej. 2026')} />
            </label>
            <label className="space-y-1.5 text-[11px] font-semibold text-slate-400">
              <span className="block">{t('Valoración mínima (0–100)')}</span>
              <input type="number" min="0" max="100" value={filters.minRating} onChange={event => updateFilters({ minRating: event.target.value })} className="w-full rounded-lg border border-slate-800 bg-[#07090e] px-3 py-2.5 text-xs text-white" placeholder={t('Cualquier valoración')} />
            </label>
          </div>
        )}
      </section>

      {taxonomyError && (
        <div role="status" className="flex flex-wrap items-center gap-2 text-xs text-amber-300">
          <span>{t(taxonomyError)}</span>
          <button type="button" onClick={() => setTaxonomyRetry(value => value + 1)} className="font-semibold underline">{t('Reintentar')}</button>
        </div>
      )}
      {quickActionMessage && (
        <div role="status" className={`rounded-xl border p-2.5 text-xs ${quickActionMessage.startsWith('Error') ? 'border-red-500/20 bg-red-950/40 text-red-300' : 'border-emerald-500/20 bg-emerald-950/40 text-emerald-300'}`}>
          {localizedQuickActionMessage}
          {token && !libraryReady && !loadingLibrary && (
            <button type="button" onClick={() => { setQuickActionMessage(''); setLibraryRetry(value => value + 1); }} className="ml-2 font-semibold underline">{t('Reintentar')}</button>
          )}
        </div>
      )}

      {showHome && (
        <section aria-labelledby="discover-popular" className="space-y-3">
          <div>
            <h3 id="discover-popular" className="text-lg font-bold text-white">{t('Populares ahora')}</h3>
            <p className="mt-1 text-xs text-slate-500">{t('Juegos con mayor actividad y valoraciones en IGDB.')}</p>
          </div>
          {loadingHome && <GameSkeletons count={18} />}
          {popularGames.length > 0 && (
            <div className="mx-auto grid w-full max-w-[16rem] grid-cols-1 gap-x-4 gap-y-6 sm:max-w-none sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
              {popularGames.map(renderGameCard)}
            </div>
          )}
          {homeError && (
            <div className="rounded-2xl border border-red-500/20 bg-[#0f121d] p-8 text-center">
              <p className="text-sm font-semibold text-red-300">{t('No se pudo cargar el catálogo')}</p>
              <p className="mt-2 text-xs text-slate-400">{t(homeError)}</p>
              <button type="button" onClick={() => void fetchPopular(popularGames.length ? popularPage + 1 : 0)} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-xs text-white">
                <RefreshCw className="h-3.5 w-3.5" /> {t('Reintentar')}
              </button>
            </div>
          )}
          {!loadingHome && !homeError && popularGames.length === 0 && (
            <p className="rounded-xl border border-slate-800 p-8 text-center text-xs text-slate-400">{t('No hay juegos populares disponibles en este momento.')}</p>
          )}
          {popularHasMore && !homeError && (
            <div className="flex justify-center">
              <button type="button" disabled={loadingMorePopular} onClick={() => void fetchPopular(popularPage + 1)} className="rounded-xl border border-blue-500/30 bg-blue-600/10 px-5 py-2.5 text-xs font-semibold text-blue-300 disabled:opacity-60">
                {loadingMorePopular ? t('Cargando...') : t('Cargar más')}
              </button>
            </div>
          )}
        </section>
      )}

      {hasActiveFilters && !isUserSearch && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-bold text-white">
              {filters.query.trim() ? `${t('resultados para')} “${filters.query.trim()}”` : t('Juegos que coinciden con tus filtros')}
            </h3>
            {(activeFilterNames.length > 0 || filters.query.trim()) && (
              <button type="button" onClick={clearFilters} className="text-xs font-semibold text-blue-300 hover:text-blue-200">
                {t('Limpiar filtros')}
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {filters.query.trim() && <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-[11px] text-blue-200">{t('Búsqueda:')} {filters.query.trim()}</span>}
            {activeFilterNames.map(filter => (
              <button
                type="button"
                key={filter.key}
                onClick={() => updateFilters({ [filter.key]: '' })}
                className="rounded-full border border-slate-700 bg-slate-800/70 px-2.5 py-1 text-[11px] text-slate-300 hover:text-white"
                aria-label={`${t('Quitar filtro')} ${filter.name}`}
              >
                {filter.name} ×
              </button>
            ))}
          </div>

          {loading && games.length === 0 ? <GameSkeletons /> : null}
          {apiError ? (
            <div className="rounded-2xl border border-red-500/20 bg-[#0f121d] p-8 text-center">
              <p className="text-sm font-semibold text-red-300">{t('Error buscando juegos')}</p>
              <p className="mt-2 text-xs text-slate-400">{t(apiError)}</p>
              <button type="button" onClick={() => setFilters(current => ({ ...current }))} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-xs text-white">
                <RefreshCw className="h-3.5 w-3.5" /> {t('Reintentar')}
              </button>
            </div>
          ) : games.length > 0 ? (
            <>
              <p aria-live="polite" className="text-xs text-slate-500">{games.length} {t('resultados cargados')}</p>
              <div className={`mx-auto grid w-full max-w-[16rem] grid-cols-1 gap-x-4 gap-y-6 transition-opacity sm:max-w-none sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 ${loading ? 'opacity-60' : 'opacity-100'}`}>
                {games.map(renderGameCard)}
              </div>
              {hasMore && (
                <div className="flex justify-center">
                  <button type="button" disabled={loadingMore} onClick={() => updateFilters({ page: filters.page + 1 })} className="rounded-xl border border-blue-500/30 bg-blue-600/10 px-5 py-2.5 text-xs font-semibold text-blue-300 disabled:opacity-60">
                    {loadingMore ? t('Cargando...') : t('Cargar más')}
                  </button>
                </div>
              )}
            </>
          ) : !loading && !apiError && filters.query.trim().length === 1 && !shortSearchForced ? (
            <div className="rounded-2xl border border-slate-800 bg-[#0f121d] p-8 text-center">
              <Search className="mx-auto h-8 w-8 text-slate-600" />
              <p className="mt-3 text-sm font-semibold text-slate-300">{t('Escribe al menos 2 caracteres')}</p>
              <p className="mt-1 text-xs text-slate-500">{t('También puedes pulsar Buscar para forzar una consulta corta.')}</p>
            </div>
          ) : !loading ? (
            <div className="rounded-2xl border border-slate-800 bg-[#0f121d] p-8 text-center">
              <Gamepad2 className="mx-auto h-8 w-8 text-slate-600" />
              <p className="mt-3 text-sm font-semibold text-slate-300">{t('No se encontraron juegos')}</p>
              <p className="mt-1 text-xs text-slate-500">{t('Prueba con otro título o quita alguno de los filtros activos.')}</p>
              <button type="button" onClick={clearFilters} className="mt-4 rounded-lg bg-slate-800 px-4 py-2 text-xs font-semibold text-white">{t('Quitar filtros')}</button>
            </div>
          ) : null}
        </div>
      )}

      {isUserSearch && (
        <section aria-live="polite" className="space-y-3">
          {loading ? <div className="h-24 animate-pulse rounded-xl bg-[#0f121d]" /> : apiError ? (
            <p className="rounded-xl border border-red-500/20 p-5 text-xs text-red-300">{apiError}</p>
          ) : filters.query.trim() === '@' ? (
            <p className="rounded-xl border border-slate-800 p-8 text-center text-xs text-slate-400">{t('Escribe un nombre de usuario después de @.')}</p>
          ) : users.length ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {users.map(user => (
                <button key={user.id} type="button" onClick={() => onSelectUser(user.id)} className="flex items-center gap-3 rounded-xl border border-slate-800 bg-[#0f121d] p-4 text-left hover:border-blue-500/40">
                  <img src={user.avatar} alt="" loading="lazy" className="h-11 w-11 rounded-full border border-slate-800 object-cover" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-white">@{user.username}</span>
                    <span className="mt-1 block line-clamp-2 text-[11px] text-slate-500">{user.bio || t('Sin bio por ahora.')}</span>
                  </span>
                </button>
              ))}
            </div>
          ) : !loading && <p className="rounded-xl border border-slate-800 p-8 text-center text-xs text-slate-400">{t('No se encontraron usuarios.')}</p>}
        </section>
      )}

      {statusGame && token && (
        <GameStatusDialog
          game={statusGame}
          status={libraryStatuses.get(statusGame.igdbId)}
          token={token}
          onClose={() => setStatusGame(null)}
          onSaved={saved => {
            setLibraryStatuses(previous => new Map(previous).set(saved.gameId, saved.status));
            setWishlistIds(previous => {
              const next = new Set(previous);
              if (saved.isInWishlist) next.add(saved.gameId); else next.delete(saved.gameId);
              return next;
            });
          }}
          onRemoved={gameId => {
            setLibraryStatuses(previous => {
              const next = new Map(previous);
              next.delete(gameId);
              return next;
            });
            setWishlistIds(previous => {
              const next = new Set(previous);
              next.delete(gameId);
              return next;
            });
          }}
        />
      )}
    </div>
  );
};
