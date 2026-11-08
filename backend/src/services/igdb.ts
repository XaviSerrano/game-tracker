import type { Game } from '../../../shared/types.ts';
import { db } from '../db.ts';

// ==================================================
// CACHE
// ==================================================

interface CacheEntry<T> {
  data: T;
  expiry: number;
}

export interface IgdbCatalogOption {
  id: number;
  name: string;
  slug: string;
}

export interface GameSearchOptions {
  query: string;
  genreIds: number[];
  platformIds: number[];
  yearFrom?: number;
  yearTo?: number;
  minRating?: number;
  sort: 'relevance' | 'newest' | 'rating' | 'popularity' | 'name';
  page: number;
  limit: number;
}

export interface GameSearchResult {
  items: Game[];
  page: number;
  hasMore: boolean;
}

export interface DiscoverHome {
  newReleases: Game[];
  upcoming: Game[];
  popular: Game[];
  topRated: Game[];
}

const cacheStore = new Map<string, CacheEntry<any>>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hora
const SEARCH_CACHE_TTL_MS = 5 * 60 * 1000;
const TAXONOMY_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CORE_GAME_TYPES = '(0,4,8,9,10)';
const IGDB_REQUEST_INTERVAL_MS = 250;
const igdbInFlight = new Map<string, Promise<Response>>();
let igdbRequestQueue: Promise<void> = Promise.resolve();
let lastIgdbRequestAt = 0;

function cacheGet<T>(key: string): T | null {
  const entry = cacheStore.get(key);

  if (!entry) {
    return null;
  }

  if (Date.now() > entry.expiry) {
    cacheStore.delete(key);
    return null;
  }

  return entry.data;
}

function cacheSet<T>(key: string, data: T, ttl = CACHE_TTL_MS): void {
  cacheStore.set(key, {
    data,
    expiry: Date.now() + ttl
  });
}

function fetchIgdb(url: string, init: RequestInit): Promise<Response> {
  const body = typeof init.body === 'string' ? init.body : '';
  const key = `${url}:${body}`;
  const existing = igdbInFlight.get(key);
  // Cada llamante recibe un clon: un Response solo puede leerse una vez.
  if (existing) return existing.then(response => response.clone());

  const request = igdbRequestQueue.then(async () => {
    const wait = IGDB_REQUEST_INTERVAL_MS - (Date.now() - lastIgdbRequestAt);
    if (wait > 0) {
      await new Promise(resolve => setTimeout(resolve, wait));
    }

    lastIgdbRequestAt = Date.now();
    return fetch(url, {
      ...init,
      signal: AbortSignal.timeout(20_000)
    });
  });

  igdbRequestQueue = request.then(() => undefined, () => undefined);
  igdbInFlight.set(key, request);
  request.finally(() => igdbInFlight.delete(key)).catch(() => undefined);
  return request.then(response => response.clone());
}

function escapeIgdbString(value: string): string {
  return value
    .replace(/[;\r\n]/g, ' ')
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .trim();
}

function normalizeSearchText(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function makeSlug(value: string): string {
  return normalizeSearchText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// ==================================================
// TWITCH / IGDB AUTH
// ==================================================

let twitchAccessToken: string | null = null;
let twitchTokenExpiry = 0;
let twitchTokenRequest: Promise<string> | null = null;

function getIgdbCredentials() {
  const clientId =
    process.env.IGDB_CLIENT_ID ||
    process.env.TWITCH_CLIENT_ID;

  const clientSecret =
    process.env.IGDB_CLIENT_SECRET ||
    process.env.TWITCH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      'Faltan credenciales de IGDB/Twitch. Configura IGDB_CLIENT_ID + IGDB_CLIENT_SECRET o TWITCH_CLIENT_ID + TWITCH_CLIENT_SECRET.'
    );
  }

  return {
    clientId,
    clientSecret
  };
}

// ==================================================
// HELPERS
// ==================================================

interface RankedIgdbGame {
  game: Game;
  rating: number;
  ratingCount: number;
  popularity: number;
  releaseTimestamp: number | null;
}

function toFiniteNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : 0;
}

function screenshotUrl(item: any): string[] {
  if (!Array.isArray(item?.screenshots)) {
    return [];
  }

  return item.screenshots
    .filter((s: any) => s?.url)
    .map((s: any) =>
      `https:${s.url.replace('t_thumb', 't_1080p')}`
    );
}

function mapIgdbGame(item: any): Game {
  const releaseTimestamp =
    typeof item?.first_release_date === 'number'
      ? item.first_release_date * 1000
      : null;

  return {
    igdbId: item.id,
    name: item.name,
    slug: item.slug || '',
    cover: item.cover
      ? `https:${item.cover.url.replace('t_thumb', 't_cover_big')}`
      : 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1u0f.jpg',
    summary: item.summary || 'No summary available.',
    genres: Array.isArray(item.genres)
      ? item.genres
          .map((genre: any) => genre?.name)
          .filter(Boolean)
      : ['Unknown'],
    platforms: Array.isArray(item.platforms)
      ? item.platforms
          .map((platform: any) => platform?.name)
          .filter(Boolean)
      : ['Unknown'],
    releaseDate: releaseTimestamp
      ? new Date(releaseTimestamp).toISOString().split('T')[0]
      : 'Unknown',
    rating:
      typeof item.total_rating === 'number' &&
      item.total_rating > 0
        ? Math.round(item.total_rating)
        : undefined,
    popularity:
      typeof item.popularity === 'number'
        ? Math.round(item.popularity)
        : typeof item.total_rating_count === 'number'
          ? Math.round(item.total_rating_count)
          : undefined,
    screenshots: screenshotUrl(item)
  };
}

function mapRankedIgdbGame(item: any): RankedIgdbGame {
  const popularityValue =
    typeof item?.popularity === 'number'
      ? item.popularity
      : item?.total_rating_count;

  return {
    game: mapIgdbGame(item),
    rating: toFiniteNumber(item?.total_rating),
    ratingCount: toFiniteNumber(item?.total_rating_count),
    popularity: toFiniteNumber(popularityValue),
    releaseTimestamp:
      typeof item?.first_release_date === 'number'
        ? item.first_release_date * 1000
        : null
  };
}

// ==================================================
// DISCOVER RANKING
// ==================================================

function calculateDiscoverRelevanceScore(
  game: RankedIgdbGame,
  averageRating: number
): number {
  const minimumVotes = 70;

  const weightedRating =
    game.ratingCount > 0
      ? (
          (game.ratingCount /
            (game.ratingCount + minimumVotes)) *
          game.rating
        ) +
        (
          (minimumVotes /
            (game.ratingCount + minimumVotes)) *
          averageRating
        )
      : averageRating * 0.7;

  const popularityBoost =
    Math.log10(
      (game.popularity || game.ratingCount || 1) + 1
    ) * 10;

  const voteConfidenceBoost =
    Math.log10(game.ratingCount + 1) * 5;

  let recencyBoost = 0;

  if (game.releaseTimestamp) {
    const ageInYears =
      (Date.now() - game.releaseTimestamp) /
      (1000 * 60 * 60 * 24 * 365.25);

    if (ageInYears <= 1.5) {
      recencyBoost = 16;
    } else if (ageInYears <= 3) {
      recencyBoost = 12;
    } else if (ageInYears <= 5) {
      recencyBoost = 8;
    } else if (ageInYears <= 8) {
      recencyBoost = 4;
    } else if (ageInYears <= 12) {
      recencyBoost = 1.5;
    }
  }

  return (
    weightedRating +
    popularityBoost +
    voteConfidenceBoost +
    recencyBoost
  );
}

function rankGamesForDiscover(
  items: any[],
  limit: number
): Game[] {
  const rankedGames = items
    .map(mapRankedIgdbGame)
    .filter((entry) => {
      const hasMeaningfulRating = entry.rating >= 65;
      const hasEnoughVotes = entry.ratingCount >= 25;

      return hasMeaningfulRating && hasEnoughVotes;
    });

  const sourceGames =
    rankedGames.length > 0
      ? rankedGames
      : items.map(mapRankedIgdbGame);

  const ratedGames = sourceGames.filter(
    (entry) => entry.rating > 0
  );

  const averageRating =
    ratedGames.length > 0
      ? ratedGames.reduce(
          (sum, entry) => sum + entry.rating,
          0
        ) / ratedGames.length
      : 70;

  return sourceGames
    .sort((a, b) => {
      const scoreDifference =
        calculateDiscoverRelevanceScore(
          b,
          averageRating
        ) -
        calculateDiscoverRelevanceScore(
          a,
          averageRating
        );

      if (scoreDifference !== 0) {
        return scoreDifference;
      }

      const popularityDifference =
        (b.popularity || b.ratingCount || 0) -
        (a.popularity || a.ratingCount || 0);

      if (popularityDifference !== 0) {
        return popularityDifference;
      }

      return b.ratingCount - a.ratingCount;
    })
    .slice(0, limit)
    .map((entry) => entry.game);
}

// ==================================================
// LOCAL FALLBACK
// ==================================================

async function getLocalPopularFallback(limit: number): Promise<Game[]> {
  const allGames = await db.getGames();
  const localGames = allGames
    .filter(
      (game) =>
        Boolean(game?.name) &&
        Boolean(game?.cover)
    )
    .sort((a, b) => {
      const popularityDifference =
        (b.popularity || b.rating || 0) -
        (a.popularity || a.rating || 0);

      if (popularityDifference !== 0) {
        return popularityDifference;
      }

      return (b.rating || 0) - (a.rating || 0);
    })
    .slice(0, limit);

  if (localGames.length > 0) {
    return localGames;
  }

  return [
    {
      igdbId: 119133,
      name: 'Elden Ring',
      slug: 'elden-ring',
      cover:
        'https://images.igdb.com/igdb/image/upload/t_cover_big/co5fnm.jpg',
      summary:
        'Juego popular de acción y rol con gran reconocimiento.',
      genres: ['RPG', 'Action'],
      platforms: [
        'PC',
        'PlayStation 5',
        'Xbox Series X/S'
      ],
      releaseDate: '2022-02-25',
      rating: 95,
      popularity: 2224,
      screenshots: []
    },
    {
      igdbId: 25076,
      name: 'Red Dead Redemption 2',
      slug: 'red-dead-redemption-2',
      cover:
        'https://images.igdb.com/igdb/image/upload/t_cover_big/co1q1f.jpg',
      summary:
        'Aventura western con enorme popularidad y valoración alta.',
      genres: ['Action', 'Adventure'],
      platforms: [
        'PC',
        'PlayStation 4',
        'Xbox One'
      ],
      releaseDate: '2018-10-26',
      rating: 94,
      popularity: 3756,
      screenshots: []
    },
    {
      igdbId: 7346,
      name: 'The Legend of Zelda: Breath of the Wild',
      slug: 'the-legend-of-zelda-breath-of-the-wild',
      cover:
        'https://images.igdb.com/igdb/image/upload/t_cover_big/co1r5d.jpg',
      summary:
        'Título muy reconocido por crítica y comunidad.',
      genres: ['Adventure', 'Action'],
      platforms: [
        'Nintendo Switch',
        'Wii U'
      ],
      releaseDate: '2017-03-03',
      rating: 95,
      popularity: 2952,
      screenshots: []
    },
    {
      igdbId: 119171,
      name: "Baldur's Gate III",
      slug: 'baldurs-gate-3',
      cover:
        'https://images.igdb.com/igdb/image/upload/t_cover_big/co1ikn.jpg',
      summary:
        'RPG épico muy valorado por la comunidad.',
      genres: ['RPG', 'Strategy'],
      platforms: [
        'PC',
        'PlayStation 5',
        'Xbox Series X/S'
      ],
      releaseDate: '2023-08-03',
      rating: 95,
      popularity: 1556,
      screenshots: []
    },
    {
      igdbId: 19560,
      name: 'The Witcher 3: Wild Hunt',
      slug: 'the-witcher-3-wild-hunt',
      cover:
        'https://images.igdb.com/igdb/image/upload/t_cover_big/co1r6u.jpg',
      summary:
        'Uno de los RPG más populares y queridos del panorama moderno.',
      genres: ['RPG', 'Action'],
      platforms: [
        'PC',
        'PlayStation 4',
        'Xbox One'
      ],
      releaseDate: '2015-05-19',
      rating: 93,
      popularity: 4200,
      screenshots: []
    }
  ].slice(0, limit);
}

// ==================================================
// TWITCH TOKEN
// ==================================================

async function getTwitchToken(): Promise<string> {
  const {
    clientId,
    clientSecret
  } = getIgdbCredentials();

  if (
    twitchAccessToken &&
    Date.now() < twitchTokenExpiry
  ) {
    return twitchAccessToken;
  }

  if (twitchTokenRequest) return twitchTokenRequest;

  twitchTokenRequest = (async () => {
    try {
      const response = await fetch(
        `https://id.twitch.tv/oauth2/token?client_id=${encodeURIComponent(
          clientId
        )}&client_secret=${encodeURIComponent(
          clientSecret
        )}&grant_type=client_credentials`,
        {
          method: 'POST',
          signal: AbortSignal.timeout(20_000)
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Twitch OAuth error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      if (typeof data.access_token !== 'string' || typeof data.expires_in !== 'number') {
        throw new Error('Twitch OAuth returned an invalid token response.');
      }

      twitchAccessToken = data.access_token;
      twitchTokenExpiry = Date.now() + data.expires_in * 1000 - 60_000;
      return twitchAccessToken;
    } catch (error) {
      throw new Error(`IGDB: error obteniendo token de Twitch: ${error}`);
    } finally {
      twitchTokenRequest = null;
    }
  })();

  try {
    return await twitchTokenRequest;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('IGDB:')) throw error;
    throw new Error(`IGDB: error obteniendo token de Twitch: ${error}`);
  }
}

// ==================================================
// IGDB SERVICE
// ==================================================

export class IgdbService {
  // ==================================================
  // SEARCH
  // ==================================================

  static async searchGames(
    query: string,
    limit = 20
  ): Promise<Game[]> {
    const result = await this.searchCatalog({
      query,
      genreIds: [],
      platformIds: [],
      sort: 'relevance',
      page: 0,
      limit: Math.max(1, Math.min(limit, 500))
    });
    return result.items;
  }

  static async searchCatalog(options: GameSearchOptions): Promise<GameSearchResult> {
    const query = options.query.trim();
    const page = Math.max(0, Math.floor(options.page));
    const limit = Math.max(1, Math.min(options.limit, 60));
    const candidateLimit = Math.min(500, 150 + page * limit);
    const normalizedQuery = normalizeSearchText(query).toLowerCase();
    const cacheKey = `catalog:${JSON.stringify({
      ...options,
      query: normalizedQuery,
      page,
      limit
    })}`;
    const cached = cacheGet<GameSearchResult>(cacheKey);
    if (cached) return cached;

    const filters = [
      `game_type = ${CORE_GAME_TYPES}`,
      'version_parent = null',
      'cover != null'
    ];

    const genreIds = [...new Set(options.genreIds.filter(id => Number.isSafeInteger(id) && id > 0))];
    const platformIds = [...new Set(options.platformIds.filter(id => Number.isSafeInteger(id) && id > 0))];
    if (genreIds.length) filters.push(`genres = (${genreIds.join(',')})`);
    if (platformIds.length) filters.push(`platforms = (${platformIds.join(',')})`);

    if (options.yearFrom && Number.isInteger(options.yearFrom)) {
      filters.push(`first_release_date >= ${Date.UTC(options.yearFrom, 0, 1) / 1000}`);
    }
    if (options.yearTo && Number.isInteger(options.yearTo)) {
      filters.push(`first_release_date < ${Date.UTC(options.yearTo + 1, 0, 1) / 1000}`);
    }
    if (typeof options.minRating === 'number' && options.minRating > 0) {
      filters.push(`total_rating >= ${Math.min(100, Math.max(0, options.minRating))}`);
    }

    const where = `where ${filters.join(' & ')};`;
    const fields = `
      fields
        id,
        name,
        slug,
        summary,
        cover.url,
        genres.name,
        platforms.name,
        first_release_date,
        total_rating,
        total_rating_count,
        hypes,
        follows,
        game_type,
        version_parent,
        screenshots.url;
    `;

    const token = await getTwitchToken();
    const { clientId } = getIgdbCredentials();
    const headers = {
      'Client-ID': clientId,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'text/plain'
    };
    const escapedQuery = escapeIgdbString(query);
    const primaryBody = `${query ? `search "${escapedQuery}";` : ''}${fields}${where}limit ${candidateLimit};`;
    const primaryResponse = await fetchIgdb('https://api.igdb.com/v4/games', {
      method: 'POST',
      headers,
      body: primaryBody
    });

    if (!primaryResponse.ok) {
      throw new Error(`IGDB search failed (${primaryResponse.status}): ${await primaryResponse.text()}`);
    }

    const primaryData: unknown = await primaryResponse.json();
    const candidates = new Map<number, any>();
    if (Array.isArray(primaryData)) {
      for (const item of primaryData) {
        if (typeof item?.id === 'number') candidates.set(item.id, item);
      }
    }

    if (query && candidates.size < 30) {
      const fallbackTerms = [...new Set([query, normalizeSearchText(query)])];
      for (const term of fallbackTerms) {
        const partialQuery = escapeIgdbString(term);
        const fallbackBody = `${fields}where ${filters.join(' & ')} & name ~ *"${partialQuery}"*;limit ${candidateLimit};`;
        const fallbackResponse = await fetchIgdb('https://api.igdb.com/v4/games', {
          method: 'POST',
          headers,
          body: fallbackBody
        });

        if (!fallbackResponse.ok) {
          throw new Error(`IGDB partial search failed (${fallbackResponse.status}): ${await fallbackResponse.text()}`);
        }

        const fallbackData: unknown = await fallbackResponse.json();
        if (Array.isArray(fallbackData)) {
          for (const item of fallbackData) {
            if (typeof item?.id === 'number') candidates.set(item.id, item);
          }
        }
      }
    }

    let games = [...candidates.values()].map((item) => mapIgdbGame(item));
    if (options.sort === 'newest') {
      games.sort((a, b) => Date.parse(b.releaseDate || '') - Date.parse(a.releaseDate || ''));
    } else if (options.sort === 'rating') {
      games.sort((a, b) => (b.rating || 0) - (a.rating || 0) || (b.popularity || 0) - (a.popularity || 0));
    } else if (options.sort === 'popularity') {
      games.sort((a, b) => (b.popularity || 0) - (a.popularity || 0) || (b.rating || 0) - (a.rating || 0));
    } else if (options.sort === 'name') {
      games.sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
    } else if (!query) {
      games.sort((a, b) => (b.popularity || b.rating || 0) - (a.popularity || a.rating || 0));
    }

    const start = page * limit;
    const result: GameSearchResult = {
      items: games.slice(start, start + limit),
      page,
      hasMore: games.length > start + limit || (candidateLimit < 500 && candidates.size >= candidateLimit)
    };
    cacheSet(cacheKey, result, SEARCH_CACHE_TTL_MS);
    return result;
  }

  // ==================================================
  // POPULAR GAMES
  // ==================================================

  static async getPopularGames(
    limit = 30
  ): Promise<Game[]> {
    const normalizedLimit = Math.max(
      1,
      Math.min(limit, 500)
    );

    const cacheKey =
      `popular:${normalizedLimit}`;

    const cached =
      cacheGet<Game[]>(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      const token =
        await getTwitchToken();

      const { clientId } =
        getIgdbCredentials();

      const igdbLimit = Math.min(
        Math.max(normalizedLimit * 2, 120),
        500
      );

      const candidateQueries = [
        `
          fields
            id,
            name,
            slug,
            summary,
            cover.url,
            genres.name,
            platforms.name,
            first_release_date,
            total_rating,
            total_rating_count,
            screenshots.url;
          where
            game_type = ${CORE_GAME_TYPES} &
            version_parent = null &
            total_rating != null &
            total_rating_count > 25 &
            total_rating >= 65 &
            cover != null;
          sort total_rating_count desc;
          limit ${igdbLimit};
        `,
        `
          fields
            id,
            name,
            slug,
            summary,
            cover.url,
            genres.name,
            platforms.name,
            first_release_date,
            total_rating,
            total_rating_count,
            screenshots.url;
          where
            game_type = ${CORE_GAME_TYPES} &
            version_parent = null &
            total_rating != null &
            total_rating_count > 25 &
            cover != null;
          sort total_rating desc;
          limit ${igdbLimit};
        `,
        `
          fields
            id,
            name,
            slug,
            summary,
            cover.url,
            genres.name,
            platforms.name,
            first_release_date,
            total_rating,
            total_rating_count,
            screenshots.url;
          where
            game_type = ${CORE_GAME_TYPES} &
            version_parent = null &
            total_rating != null &
            total_rating_count > 25 &
            cover != null;
          sort first_release_date desc;
          limit ${igdbLimit};
        `
      ];

      let apiData: any[] = [];
      let lastError = '';

      for (const query of candidateQueries) {
        const response = await fetchIgdb(
          'https://api.igdb.com/v4/games',
          {
            method: 'POST',
            headers: {
              'Client-ID': clientId,
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'text/plain'
            },
            body: query
          }
        );

        if (!response.ok) {
          const errorText =
            await response.text();

          lastError =
            `IGDB popular request failed (${response.status}): ${errorText}`;

          continue;
        }

        const data =
          await response.json();

        if (
          Array.isArray(data) &&
          data.length > 0
        ) {
          apiData = data;
          break;
        }
      }

      // IGDB ha funcionado
      if (apiData.length > 0) {
        const mapped =
          rankGamesForDiscover(
            apiData,
            normalizedLimit
          );

        cacheSet(
          cacheKey,
          mapped
        );

        return mapped;
      }

      if (lastError) {
        console.error(lastError);
      }

      // Segundo intento utilizando búsquedas
      const fallbackSearchQueries = [
        'a',
        'the',
        'of'
      ];

      const merged =
        new Map<number, any>();

      for (const term of fallbackSearchQueries) {
        const response = await fetchIgdb(
          'https://api.igdb.com/v4/games',
          {
            method: 'POST',
            headers: {
              'Client-ID': clientId,
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'text/plain'
            },
            body: `
              search "${term}";
              fields
                id,
                name,
                slug,
                summary,
                cover.url,
                genres.name,
                platforms.name,
                first_release_date,
                total_rating,
                total_rating_count;
              where
                game_type = ${CORE_GAME_TYPES} &
                version_parent = null &
                total_rating != null &
                total_rating_count > 25 &
                cover != null;
              sort total_rating_count desc;
              limit ${Math.min(
                Math.max(normalizedLimit, 50),
                500
              )};
            `
          }
        );

        if (!response.ok) {
          continue;
        }

        const data =
          await response.json();

        if (!Array.isArray(data)) {
          continue;
        }

        for (const item of data) {
          if (
            typeof item?.id === 'number'
          ) {
            merged.set(
              item.id,
              item
            );
          }
        }

        if (
          merged.size >=
          normalizedLimit * 2
        ) {
          break;
        }
      }

      if (merged.size > 0) {
        const fallbackMapped =
          rankGamesForDiscover(
            Array.from(
              merged.values()
            ),
            normalizedLimit
          );

        cacheSet(
          cacheKey,
          fallbackMapped
        );

        return fallbackMapped;
      }
    } catch (error) {
      console.error(
        '❌ Error consultando IGDB para juegos populares:',
        error
      );
    }

    // IGDB falla → usar Postgres / fallback absoluto.
    // Importante: NO cacheamos este resultado para
    // poder recuperar IGDB en la siguiente petición.
    return await getLocalPopularFallback(
      normalizedLimit
    );
  }

  // ==================================================
  // RECENT GAMES
  // ==================================================

  static async getRecentGames(
    limit = 30
  ): Promise<Game[]> {
    const normalizedLimit = Math.max(
      1,
      Math.min(limit, 500)
    );

    const cacheKey =
      `recent:${normalizedLimit}`;

    const cached =
      cacheGet<Game[]>(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      const token =
        await getTwitchToken();

      const { clientId } =
        getIgdbCredentials();

      const nowUnix =
        Math.floor(Date.now() / 1000);

      const recentWindowUnix =
        nowUnix -
        60 * 60 * 24 * 365 * 4;

      const dlcPattern =
        /\b(dlc|expansion|season pass|soundtrack|bundle|pack)\b/i;

      const slugDlcPattern =
        /(dlc|expansion|season-pass|soundtrack|bundle|pack)/i;

      const igdbLimit = Math.min(
        Math.max(normalizedLimit * 2, 120),
        500
      );

      const candidateQueries = [
        `
          fields
            id,
            name,
            slug,
            summary,
            cover.url,
            genres.name,
            platforms.name,
            first_release_date,
            total_rating,
            total_rating_count,
            screenshots.url;
          where
            game_type = ${CORE_GAME_TYPES} &
            version_parent = null &
            first_release_date != null &
            first_release_date >= ${recentWindowUnix} &
            first_release_date <= ${nowUnix} &
            cover != null;
          sort first_release_date desc;
          limit ${igdbLimit};
        `,
        `
          fields
            id,
            name,
            slug,
            summary,
            cover.url,
            genres.name,
            platforms.name,
            first_release_date,
            total_rating,
            total_rating_count,
            screenshots.url;
          where
            game_type = ${CORE_GAME_TYPES} &
            version_parent = null &
            first_release_date != null &
            first_release_date >= ${recentWindowUnix} &
            first_release_date <= ${nowUnix} &
            total_rating != null &
            total_rating > 0 &
            cover != null;
          sort first_release_date desc;
          limit ${igdbLimit};
        `
      ];

      const normalizeRecentResults = (
        items: any[]
      ): Game[] => {
        return items
          .map((item: any) =>
            mapIgdbGame(item)
          )
          .filter(
            (game) =>
              game.releaseDate !== 'Unknown' &&
              typeof game.rating === 'number' &&
              game.rating > 0
          )
          .filter(
            (game) =>
              !dlcPattern.test(game.name) &&
              !slugDlcPattern.test(game.slug)
          )
          .sort((a, b) => {
            const bTime =
              Date.parse(b.releaseDate);

            const aTime =
              Date.parse(a.releaseDate);

            const timeDifference =
              (Number.isNaN(bTime) ? 0 : bTime) -
              (Number.isNaN(aTime) ? 0 : aTime);

            if (timeDifference !== 0) {
              return timeDifference;
            }

            const popularityDifference =
              (b.popularity || 0) -
              (a.popularity || a.rating || 0);

            if (
              popularityDifference !== 0
            ) {
              return popularityDifference;
            }

            return (
              (b.rating || 0) -
              (a.rating || 0)
            );
          })
          .slice(0, normalizedLimit);
      };

      for (const query of candidateQueries) {
        const response = await fetchIgdb(
          'https://api.igdb.com/v4/games',
          {
            method: 'POST',
            headers: {
              'Client-ID': clientId,
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'text/plain'
            },
            body: query
          }
        );

        if (!response.ok) {
          continue;
        }

        const data =
          await response.json();

        if (
          Array.isArray(data) &&
          data.length > 0
        ) {
          const mapped =
            normalizeRecentResults(data);

          if (mapped.length > 0) {
            cacheSet(
              cacheKey,
              mapped
            );

            return mapped;
          }
        }
      }

      return [];
    } catch (error) {
      console.error(
        '❌ Error consultando IGDB para juegos recientes:',
        error
      );

      return await getLocalPopularFallback(
        normalizedLimit
      );
    }
  }

  static async getPopularNow(limit = 30): Promise<Game[]> {
    const cacheKey = `popular-now:${limit}`;
    const cached = cacheGet<Game[]>(cacheKey);
    if (cached) return cached;

    try {
      const token = await getTwitchToken();
      const { clientId } = getIgdbCredentials();
      const headers = {
        'Client-ID': clientId,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'text/plain'
      };

      let popularityTypes = cacheGet<IgdbCatalogOption[]>('igdb:popularity-types');
      if (!popularityTypes) {
        const typeResponse = await fetchIgdb('https://api.igdb.com/v4/popularity_types', {
          method: 'POST',
          headers,
          body: 'fields id,name; limit 100;'
        });
        if (!typeResponse.ok) {
          throw new Error(`IGDB popularity types failed (${typeResponse.status}): ${await typeResponse.text()}`);
        }
        const typeData: unknown = await typeResponse.json();
        if (!Array.isArray(typeData)) throw new Error('IGDB popularity types response was not a list.');
        popularityTypes = typeData
          .filter(item => Number.isSafeInteger(item?.id) && typeof item?.name === 'string')
          .map(item => ({ id: item.id as number, name: item.name, slug: makeSlug(item.name) }));
        cacheSet('igdb:popularity-types', popularityTypes, TAXONOMY_CACHE_TTL_MS);
      }

      const relevantTypes = popularityTypes.filter(type =>
        ['visits', 'want-to-play', 'playing'].includes(type.slug)
      );
      if (!relevantTypes.length) return this.getPopularGames(limit);

      const since = Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60;
      const primitiveResponse = await fetchIgdb('https://api.igdb.com/v4/popularity_primitives', {
        method: 'POST',
        headers,
        body: `
          fields game_id, popularity_type, value, calculated_at;
          where popularity_type = (${relevantTypes.map(type => type.id).join(',')})
            & calculated_at >= ${since};
          sort value desc;
          limit 500;
        `
      });
      if (!primitiveResponse.ok) {
        throw new Error(`IGDB popularity primitives failed (${primitiveResponse.status}): ${await primitiveResponse.text()}`);
      }

      const primitiveData: unknown = await primitiveResponse.json();
      if (!Array.isArray(primitiveData)) throw new Error('IGDB popularity response was not a list.');
      const scores = new Map<number, Map<number, number>>();
      for (const primitive of primitiveData) {
        if (!Number.isSafeInteger(primitive?.game_id) || !Number.isSafeInteger(primitive?.popularity_type)
          || typeof primitive?.value !== 'number') continue;
        const gameTypes = scores.get(primitive.game_id) || new Map<number, number>();
        gameTypes.set(
          primitive.popularity_type,
          Math.max(gameTypes.get(primitive.popularity_type) || 0, primitive.value)
        );
        scores.set(primitive.game_id, gameTypes);
      }

      const gameIds = [...scores.keys()];
      if (!gameIds.length) return this.getPopularGames(limit);
      const gamesResponse = await fetchIgdb('https://api.igdb.com/v4/games', {
        method: 'POST',
        headers,
        body: `
          fields
            id, name, slug, summary, cover.url, genres.name, platforms.name,
            first_release_date, total_rating, total_rating_count, game_type,
            version_parent, screenshots.url;
          where id = (${gameIds.join(',')})
            & game_type = ${CORE_GAME_TYPES}
            & version_parent = null
            & cover != null;
          limit 500;
        `
      });
      if (!gamesResponse.ok) {
        throw new Error(`IGDB popular games failed (${gamesResponse.status}): ${await gamesResponse.text()}`);
      }

      const gamesData: unknown = await gamesResponse.json();
      if (!Array.isArray(gamesData)) throw new Error('IGDB popular games response was not a list.');
      const games = gamesData
        .map((item) => ({
          game: mapIgdbGame(item),
          score: [...(scores.get(item.id)?.values() || [])].reduce((total, value) => total + value, 0)
        }))
        .sort((a, b) => b.score - a.score || (b.game.rating || 0) - (a.game.rating || 0))
        .slice(0, limit)
        .map(({ game }) => game);

      cacheSet(cacheKey, games, 2 * 60 * 60 * 1000);
      return games.length ? games : this.getPopularGames(limit);
    } catch (error) {
      if (error instanceof Error && error.message.includes('(429)')) throw error;
      console.error('IGDB popularity primitives unavailable; using rating-count ranking:', error);
      return this.getPopularGames(limit);
    }
  }

  static async getDiscoverHome(): Promise<DiscoverHome> {
    const cacheKey = 'discover:home';
    const cached = cacheGet<DiscoverHome>(cacheKey);
    if (cached) return cached;

    const token = await getTwitchToken();
    const { clientId } = getIgdbCredentials();
    const headers = {
      'Client-ID': clientId,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'text/plain'
    };
    const now = Math.floor(Date.now() / 1000);
    const day = 60 * 60 * 24;
    const commonFields = `
      fields
        id,
        name,
        slug,
        summary,
        cover.url,
        genres.name,
        platforms.name,
        first_release_date,
        total_rating,
        total_rating_count,
        hypes,
        follows,
        game_type,
        version_parent,
        screenshots.url;
    `;
    const commonWhere = `game_type = ${CORE_GAME_TYPES} & version_parent = null & cover != null`;

    const requestGames = async (key: string, body: string): Promise<any[]> => {
      const requestCacheKey = `discover:${key}`;
      const requestCached = cacheGet<any[]>(requestCacheKey);
      if (requestCached) return requestCached;

      const response = await fetchIgdb('https://api.igdb.com/v4/games', {
        method: 'POST',
        headers,
        body
      });
      if (!response.ok) {
        throw new Error(`IGDB ${key} request failed (${response.status}): ${await response.text()}`);
      }

      const data: unknown = await response.json();
      if (!Array.isArray(data)) {
        throw new Error(`IGDB ${key} response was not a list.`);
      }
      cacheSet(requestCacheKey, data, 2 * 60 * 60 * 1000);
      return data;
    };

    const [releaseData, upcomingData, popular, topRatedData] = await Promise.all([
      requestGames('releases', `
        ${commonFields}
        where ${commonWhere}
          & first_release_date >= ${now - 90 * day}
          & first_release_date <= ${now};
        sort first_release_date desc;
        limit 120;
      `),
      requestGames('upcoming', `
        ${commonFields}
        where ${commonWhere}
          & first_release_date > ${now}
          & first_release_date <= ${now + 120 * day};
        sort first_release_date asc;
        limit 120;
      `),
      this.getPopularNow(30),
      requestGames('top-rated', `
        ${commonFields}
        where ${commonWhere}
          & first_release_date >= ${now - 365 * day}
          & first_release_date <= ${now}
          & total_rating >= 70
          & total_rating_count >= 10;
        sort total_rating desc;
        limit 120;
      `)
    ]);

    const scoreInterest = (item: any, upcoming: boolean): number => {
      const ratingCount = toFiniteNumber(item.total_rating_count);
      const hypes = toFiniteNumber(item.hypes);
      const follows = toFiniteNumber(item.follows);
      const rating = toFiniteNumber(item.total_rating);
      const releaseDate = toFiniteNumber(item.first_release_date);
      const daysFromNow = (releaseDate - now) / day;
      const recency = upcoming
        ? Math.max(0, 1 - daysFromNow / 120)
        : Math.max(0, 1 - Math.abs(daysFromNow) / 90);

      return Math.log1p(ratingCount) * 2
        + Math.log1p(hypes + follows) * 4
        + rating / 25
        + recency * 5;
    };
    const rank = (items: any[], upcoming: boolean): Game[] => items
      .filter(item => toFiniteNumber(item.total_rating_count) >= 5
        || toFiniteNumber(item.hypes) > 0
        || toFiniteNumber(item.follows) > 0)
      .sort((a, b) => scoreInterest(b, upcoming) - scoreInterest(a, upcoming))
      .slice(0, 24)
      .map(mapIgdbGame);

    const home: DiscoverHome = {
      newReleases: rank(releaseData, false),
      upcoming: rank(upcomingData, true),
      popular,
      topRated: topRatedData.map(mapIgdbGame).slice(0, 24)
    };
    cacheSet(cacheKey, home, 2 * 60 * 60 * 1000);
    return home;
  }

  static async getGenreOptions(): Promise<IgdbCatalogOption[]> {
    return this.getCatalogOptions('genres');
  }

  static async getPlatformOptions(): Promise<IgdbCatalogOption[]> {
    return this.getCatalogOptions('platforms');
  }

  private static async getCatalogOptions(kind: 'genres' | 'platforms'): Promise<IgdbCatalogOption[]> {
    const cacheKey = `igdb:${kind}`;
    const cached = cacheGet<IgdbCatalogOption[]>(cacheKey);
    if (cached) return cached;

    const token = await getTwitchToken();
    const { clientId } = getIgdbCredentials();
    const options: IgdbCatalogOption[] = [];
    const limit = 500;
    let offset = 0;
    let count: number;
    do {
      const response = await fetchIgdb(`https://api.igdb.com/v4/${kind}`, {
        method: 'POST',
        headers: {
          'Client-ID': clientId,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'text/plain'
        },
        body: `fields id,name,slug; sort id asc; limit ${limit}; offset ${offset};`
      });
      if (!response.ok) {
        throw new Error(`IGDB ${kind} request failed (${response.status}): ${await response.text()}`);
      }

      const data: unknown = await response.json();
      if (!Array.isArray(data)) throw new Error(`IGDB ${kind} response was not a list.`);
      count = data.length;
      options.push(...data
        .filter(item => Number.isSafeInteger(item?.id) && typeof item?.name === 'string' && item.name.trim())
        .map(item => ({ id: item.id as number, name: item.name.trim(), slug: typeof item.slug === 'string' ? item.slug : makeSlug(item.name) })));
      offset += limit;
    } while (count === limit);

    options.sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
    cacheSet(cacheKey, options, TAXONOMY_CACHE_TTL_MS);
    return options;
  }

  // ==================================================
  // GENRES
  // ==================================================

  static async getGenres(
    limit = 500
  ): Promise<string[]> {
    const normalizedLimit = Math.max(
      1,
      Math.min(limit, 500)
    );

    const cacheKey =
      `genres:${normalizedLimit}`;

    const cached =
      cacheGet<string[]>(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      const token =
        await getTwitchToken();

      const { clientId } =
        getIgdbCredentials();

      const response = await fetchIgdb(
        'https://api.igdb.com/v4/genres',
        {
          method: 'POST',
          headers: {
            'Client-ID': clientId,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'text/plain'
          },
          body: `
            fields id, name;
            sort name asc;
            limit ${normalizedLimit};
          `
        }
      );

      if (!response.ok) {
        const errorText =
          await response.text();

        throw new Error(
          `IGDB genres request failed (${response.status}): ${errorText}`
        );
      }

      const data =
        await response.json();

      const genreSet =
        new Set<string>();

      if (Array.isArray(data)) {
        for (const item of data) {
          if (
            typeof item?.name === 'string'
          ) {
            const name =
              item.name.trim();

            if (name) {
              genreSet.add(name);
            }
          }
        }
      }

      const genres =
        Array.from(genreSet).sort(
          (a, b) =>
            a.localeCompare(
              b,
              'es',
              {
                sensitivity: 'base'
              }
            )
        );

      if (genres.length > 0) {
        cacheSet(
          cacheKey,
          genres
        );

        return genres;
      }

      throw new Error(
        'IGDB no devolvió ningún género.'
      );
    } catch (error) {
      console.error(
        '❌ Error obteniendo géneros de IGDB:',
        error
      );

      // Fallback local
      const genreSet =
        new Set<string>();

      for (const game of await db.getGames()) {
        if (!Array.isArray(game.genres)) {
          continue;
        }

        for (const genre of game.genres) {
          if (
            typeof genre === 'string' &&
            genre.trim() &&
            genre !== 'Unknown'
          ) {
            genreSet.add(
              genre.trim()
            );
          }
        }
      }

      const localGenres =
        Array.from(genreSet).sort(
          (a, b) =>
            a.localeCompare(
              b,
              'es',
              {
                sensitivity: 'base'
              }
            )
        );

      // No cacheamos un fallback vacío.
      if (localGenres.length > 0) {
        cacheSet(
          cacheKey,
          localGenres
        );
      }

      return localGenres;
    }
  }

  // ==================================================
  // GAME DETAILS
  // ==================================================

  static async getGameDetails(
    id: number
  ): Promise<Game | null> {
    const cacheKey =
      `game:${id}`;

    const cached =
      cacheGet<Game>(cacheKey);

    if (cached) {
      return cached;
    }

    const local =
      await db.getGame(id);

    if (
      local &&
      local.screenshots.length > 0 &&
      local.timeToBeat !== undefined
    ) {
      return local;
    }

    try {
      const token =
        await getTwitchToken();

      const { clientId } =
        getIgdbCredentials();

      const response = await fetchIgdb(
        'https://api.igdb.com/v4/games',
        {
          method: 'POST',
          headers: {
            'Client-ID': clientId,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'text/plain'
          },
          body: `
            fields
              id,
              name,
              slug,
              summary,
              cover.url,
              genres.name,
              platforms.name,
              first_release_date,
              total_rating,
              total_rating_count,
              screenshots.url;
            where id = ${id};
          `
        }
      );

      if (!response.ok) {
        const errorText =
          await response.text();

        throw new Error(
          `IGDB details failed (${response.status}): ${errorText}`
        );
      }

      const data =
        await response.json();

      if (
        !Array.isArray(data) ||
        data.length === 0
      ) {
        return local;
      }

      const mapped =
        mapIgdbGame(data[0]);

      mapped.timeToBeat =
        await getGameTimeToBeat(
          id,
          token,
          clientId
        );

      mapped.averagePlaytimeHours =
        mapped.timeToBeat?.normally;

      await db.createGame(mapped);

      cacheSet(
        cacheKey,
        mapped
      );

      return mapped;
    } catch (error) {
      console.error(
        `IGDB getGameDetails(${id}) failed:`,
        error
      );

      return local;
    }
  }
}

// ==================================================
// TIME TO BEAT
// ==================================================

function secondsToHours(
  seconds: unknown
): number | undefined {
  if (
    typeof seconds !== 'number' ||
    seconds <= 0
  ) {
    return undefined;
  }

  return Math.round(
    (seconds / 3600) * 10
  ) / 10;
}

async function getGameTimeToBeat(
  gameId: number,
  token: string,
  clientId: string
): Promise<Game['timeToBeat']> {
  try {
    const response = await fetchIgdb(
      'https://api.igdb.com/v4/game_time_to_beats',
      {
        method: 'POST',
        headers: {
          'Client-ID': clientId,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'text/plain'
        },
        body: `
          fields hastily, normally, completely;
          where game_id = ${gameId};
        `
      }
    );

    if (!response.ok) {
      return undefined;
    }

    const data =
      await response.json();

    const entry =
      data?.[0];

    if (!entry) {
      return undefined;
    }

    const timeToBeat = {
      hastily: secondsToHours(
        entry.hastily
      ),
      normally: secondsToHours(
        entry.normally
      ),
      completely: secondsToHours(
        entry.completely
      )
    };

    const hasValue =
      Object.values(timeToBeat).some(
        (value) =>
          typeof value === 'number'
      );

    return hasValue
      ? timeToBeat
      : undefined;
  } catch {
    return undefined;
  }
}