import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import { apiFetch } from '../api.ts';
import { useLanguage } from '../i18n.tsx';

// --- Ajustes de "relevancia" (cámbialos a tu gusto) ---
const HERO_LIMIT = 10;          // máximo de juegos en el carrusel
const AUTOPLAY_MS = 3000;       // cada cuántos ms pasa al siguiente juego
const MIN_SLIDES = 4;           // si salen menos, se rellena con populares
const RECENT_DAYS = 120;        // "recién lanzado" = salió en los últimos N días
const MIN_RATING = 55;          // valoración mínima (0–100), solo si el juego tiene valoración
const MIN_VOTES = 5;            // votos mínimos, solo si el backend los envía

const POPULAR_ENDPOINT = '/api/discover/popular?page=0';

interface HeroGame {
  id: number;
  name: string;
  cover: string;
  background: string;
  hasWideImage: boolean;
  releasedAt: number | null; // ms
  year: number | null;
  summary: string;
  rating: number | null;     // 0–100
  votes: number | null;
}

interface HeroCarouselProps {
  onSelectGame: (gameId: number) => void;
}

// --- Normalización tolerante: acepta varios nombres de campo del backend ---

function toStringList(value: unknown): string[] {
  let source = value;
  if (typeof source === 'string' && source.trim().startsWith('[')) {
    try {
      source = JSON.parse(source);
    } catch {
      return [];
    }
  }
  if (typeof source === 'string') return source.trim() ? [source] : [];
  if (!Array.isArray(source)) return [];
  return source
    .map(item => (typeof item === 'string' ? item : (item as { url?: unknown })?.url))
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

function firstImage(...values: unknown[]): string {
  for (const value of values) {
    const [first] = toStringList(value);
    if (first) return first;
  }
  return '';
}

function firstNumber(...values: unknown[]): number | null {
  for (const value of values) {
    const n = typeof value === 'string' ? Number(value) : value;
    if (typeof n === 'number' && Number.isFinite(n)) return n;
  }
  return null;
}

function firstText(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

// Acepta ISO, segundos Unix o milisegundos. Un año suelto (2026) no sirve para filtrar por días.
function toTimestamp(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value >= 1900 && value <= 2200) return null;
    return value < 1e11 ? value * 1000 : value;
  }
  if (typeof value === 'string' && value.trim()) {
    const trimmed = value.trim();
    if (/^\d+$/.test(trimmed)) return toTimestamp(Number(trimmed));
    const parsed = Date.parse(trimmed);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

// Las URLs de IGDB vienen como //images.igdb.com/.../t_thumb/xxx.jpg
function igdbSize(url: string, size: string): string {
  if (!url) return '';
  const full = url.startsWith('//') ? `https:${url}` : url;
  return full.replace(/\/t_[a-z0-9_]+\//, `/${size}/`);
}

function normalizeGames(payload: unknown): HeroGame[] {
  const list: unknown[] = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as { items?: unknown[] })?.items)
      ? (payload as { items: unknown[] }).items
      : [];

  const games: HeroGame[] = [];
  for (const raw of list) {
    const g = raw as Record<string, unknown>;
    const id = Number(g.igdbId ?? g.id ?? g.gameId);
    const name = typeof g.name === 'string' ? g.name : typeof g.title === 'string' ? g.title : '';
    const coverRaw = firstImage(g.coverUrl, g.cover, g.cover_url, g.image);
    const wideRaw = firstImage(g.artworks, g.screenshots, g.background, g.backgroundUrl, g.banner);
    if (!Number.isInteger(id) || id <= 0 || !name || !coverRaw) continue;

    const releasedAt = toTimestamp(g.releaseDate ?? g.firstReleaseDate ?? g.first_release_date ?? g.releasedAt ?? g.released);
    const yearCandidate = releasedAt !== null
      ? new Date(releasedAt).getUTCFullYear()
      : firstNumber(g.releaseYear, g.release_year, g.year, g.releaseDate);
    const year = yearCandidate !== null && yearCandidate >= 1950 && yearCandidate <= 2200 ? yearCandidate : null;

    games.push({
      id,
      name,
      cover: igdbSize(coverRaw, 't_cover_big'),
      background: igdbSize(wideRaw || coverRaw, 't_1080p'),
      hasWideImage: Boolean(wideRaw),
      releasedAt,
      year,
      summary: firstText(g.summary, g.description, g.storyline),
      rating: firstNumber(g.rating, g.totalRating, g.total_rating, g.aggregatedRating, g.aggregated_rating),
      votes: firstNumber(g.ratingCount, g.totalRatingCount, g.total_rating_count, g.votes, g.hypes, g.follows)
    });
  }
  return games;
}

// Primero los que tienen imagen panorámica real; el resto (fondo = portada) al final.
function wideFirst(games: HeroGame[]): HeroGame[] {
  return [...games.filter(game => game.hasWideImage), ...games.filter(game => !game.hasWideImage)];
}

// Filtra "basura": sin imagen panorámica, aún sin salir, demasiado antiguos o mal valorados.
function pickRecentRelevant(games: HeroGame[]): HeroGame[] {
  const now = Date.now();
  const oldest = now - RECENT_DAYS * 24 * 60 * 60 * 1000;
  // Si el backend no envía fecha de lanzamiento, no se puede filtrar por fecha.
  const canFilterByDate = games.some(game => game.releasedAt !== null);

  return games
    .filter(game => game.hasWideImage)
    .filter(game => !canFilterByDate || (game.releasedAt !== null && game.releasedAt <= now && game.releasedAt >= oldest))
    .filter(game => game.rating === null || game.rating >= MIN_RATING)
    .filter(game => game.votes === null || game.votes >= MIN_VOTES)
    .sort((a, b) => {
      // Más votos/popularidad primero; a igualdad, mejor valoración; luego más reciente.
      const votes = (b.votes ?? 0) - (a.votes ?? 0);
      if (votes !== 0) return votes;
      const rating = (b.rating ?? 0) - (a.rating ?? 0);
      if (rating !== 0) return rating;
      return (b.releasedAt ?? 0) - (a.releasedAt ?? 0);
    });
}

async function fetchItems(endpoint: string, signal: AbortSignal): Promise<HeroGame[]> {
  const res = await apiFetch(endpoint, { signal });
  if (!res.ok) return [];
  return normalizeGames(await res.json());
}

const HERO_HEIGHT = 'h-[24rem] sm:h-[27rem] lg:h-[30rem]';

export function HeroCarousel({ onSelectGame }: HeroCarouselProps) {
  const { t } = useLanguage();
  const [games, setGames] = useState<HeroGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const reducedMotion = useReducedMotion();
  // El avance automático se pausa con el ratón encima, con foco de teclado o con la pestaña oculta
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pageHidden, setPageHidden] = useState(() => typeof document !== 'undefined' && document.hidden);
  // Descripciones cargadas bajo demanda cuando la lista no las trae ('' = no disponible)
  const [fetchedSummaries, setFetchedSummaries] = useState<Record<number, string>>({});

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        // 1) Lanzamientos recientes (mismo endpoint de búsqueda que usa Discover, orden "newest")
        const currentYear = new Date().getFullYear();
        const params = new URLSearchParams({
          sort: 'newest',
          yearFrom: String(currentYear - 1),
          yearTo: String(currentYear),
          limit: '40'
        });
        let selected: HeroGame[] = [];
        try {
          selected = pickRecentRelevant(await fetchItems(`/api/games/search?${params}`, controller.signal)).slice(0, HERO_LIMIT);
        } catch (err) {
          if (err instanceof DOMException && err.name === 'AbortError') return;
          console.error('Hero recent releases failed:', err);
        }

        // 2) Si hay pocos, se completa con populares (sin duplicados)
        if (selected.length < MIN_SLIDES) {
          const popular = wideFirst(await fetchItems(POPULAR_ENDPOINT, controller.signal));
          const seen = new Set(selected.map(game => game.id));
          selected = [...selected, ...popular.filter(game => !seen.has(game.id))].slice(0, HERO_LIMIT);
        }

        if (!controller.signal.aborted) setGames(selected);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        console.error('Hero carousel failed to load:', err);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, []);

  // Si el juego activo no trae descripción en la lista, se pide su ficha (misma ruta que usa el feed).
  useEffect(() => {
    const game = games[index];
    if (!game || game.summary || fetchedSummaries[game.id] !== undefined) return;

    const controller = new AbortController();
    (async () => {
      let summary = '';
      try {
        const res = await apiFetch(`/api/games/${game.id}`, { signal: controller.signal });
        if (res.ok) {
          const data = await res.json();
          summary = firstText(data?.summary, data?.description, data?.storyline);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        console.error('Hero game details failed:', err);
      }
      if (!controller.signal.aborted) {
        setFetchedSummaries(previous => ({ ...previous, [game.id]: summary }));
      }
    })();
    return () => controller.abort();
  }, [games, index, fetchedSummaries]);

  useEffect(() => {
    const handleVisibility = () => setPageHidden(document.hidden);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Avance automático. Al depender de `index`, el contador se reinicia con cada cambio (también los manuales).
  const autoplayActive = games.length > 1 && !hovered && !focused && !pageHidden && !reducedMotion;
  useEffect(() => {
    if (!autoplayActive) return;
    const timer = window.setTimeout(() => {
      setIndex(current => (current + 1) % games.length);
    }, AUTOPLAY_MS);
    return () => window.clearTimeout(timer);
  }, [autoplayActive, games.length, index]);

  // Reserva el hueco mientras carga para no provocar saltos de layout.
  if (loading) {
    return <div aria-hidden="true" className={`w-full ${HERO_HEIGHT}`} />;
  }
  if (games.length === 0) return null;

  const total = games.length;
  const goPrev = () => setIndex(current => (current - 1 + total) % total);
  const goNext = () => setIndex(current => (current + 1) % total);
  const active = games[index];
  const activeSummary = active.summary || fetchedSummaries[active.id] || '';

  const arrowClass =
    'inline-flex size-8 items-center justify-center rounded-full bg-white/10 text-slate-200 backdrop-blur-sm transition hover:bg-white/20 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e5b974]';

  return (
    <section
      aria-roledescription="carousel"
      aria-label={t('Juegos destacados')}
      className={`relative isolate w-full overflow-hidden ${HERO_HEIGHT}`}
      onPointerEnter={event => { if (event.pointerType === 'mouse') setHovered(true); }}
      onPointerLeave={() => setHovered(false)}
      onFocus={event => { if (event.target.matches(':focus-visible')) setFocused(true); }}
      onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false); }}
    >
      {/* Fondos: solo se montan el actual y sus vecinos para no cargar todas las imágenes */}
      {games.map((game, i) => {
        const isNeighbour = i === index || i === (index + 1) % total || i === (index - 1 + total) % total;
        if (!isNeighbour) return null;
        return (
          <img
            key={game.id}
            src={game.background}
            alt=""
            aria-hidden="true"
            referrerPolicy="no-referrer"
            loading={i === 0 ? 'eager' : 'lazy'}
            className={`absolute inset-0 -z-20 h-full w-full object-cover transition-opacity duration-700 motion-reduce:transition-none ${
              i === index ? 'opacity-100' : 'opacity-0'
            }`}
          />
        );
      })}

      {/* Degradados para fundir con el resto de la página y dar contraste al texto */}
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-[#0b0d12] via-[#0b0d12]/30 to-transparent" />
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-r from-[#0b0d12]/85 via-[#0b0d12]/35 to-transparent" />

      <div className="absolute inset-x-0 bottom-0">
        <div className="mx-auto w-full max-w-[86rem] px-5 pb-8 sm:px-8 lg:px-12">
          <div className="flex items-end gap-4 sm:gap-6">
            <button
              type="button"
              onClick={() => onSelectGame(active.id)}
              aria-label={active.name}
              className="block shrink-0 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#e5b974]"
            >
              <img
                key={active.id}
                src={active.cover}
                alt=""
                referrerPolicy="no-referrer"
                className="aspect-[3/4] w-28 rounded-xl border border-white/10 object-cover shadow-2xl shadow-black/50 sm:w-36"
              />
            </button>

            <div className="min-w-0 max-w-2xl pb-1">
              <h2 className="font-display text-2xl font-bold leading-tight tracking-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)] line-clamp-2 sm:text-4xl lg:text-5xl">
                {active.name}
              </h2>
              {active.year !== null && (
                <p className="mt-2 text-sm font-medium text-slate-300 sm:mt-3">{active.year}</p>
              )}
              {activeSummary && (
                <p className="mt-2 text-xs leading-relaxed text-slate-100 line-clamp-3 sm:text-sm sm:line-clamp-2 lg:text-base">
                  {activeSummary}
                </p>
              )}
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button type="button" onClick={goPrev} aria-label={t('Anterior')} className={arrowClass}>
              <ChevronLeft className="size-4" aria-hidden="true" />
            </button>

            <div className="flex items-center gap-1.5" role="group" aria-label={t('Seleccionar juego')}>
              {games.map((game, i) => (
                <button
                  key={game.id}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={game.name}
                  aria-current={i === index ? 'true' : undefined}
                  className={`size-1.5 rounded-full transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e5b974] ${
                    i === index ? 'bg-white' : 'bg-white/35 hover:bg-white/60'
                  }`}
                />
              ))}
            </div>

            <button type="button" onClick={goNext} aria-label={t('Siguiente')} className={arrowClass}>
              <ChevronRight className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}