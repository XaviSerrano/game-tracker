import { Game } from '../src/types.ts';
import { db } from './db.ts';

// Simple Cache implementation for 1 hour TTL
interface CacheEntry<T> {
  data: T;
  expiry: number;
}

const cacheStore = new Map<string, CacheEntry<any>>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

function cacheGet<T>(key: string): T | null {
  const entry = cacheStore.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiry) {
    cacheStore.delete(key);
    return null;
  }
  return entry.data;
}

function cacheSet<T>(key: string, data: T) {
  cacheStore.set(key, {
    data,
    expiry: Date.now() + CACHE_TTL_MS
  });
}

// Client credentials cache for Twitch
let twitchAccessToken: string | null = null;
let twitchTokenExpiry: number = 0;

function getIgdbCredentials() {
  const clientId = process.env.IGDB_CLIENT_ID || process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.IGDB_CLIENT_SECRET || process.env.TWITCH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Faltan credenciales de IGDB/Twitch (IGDB_CLIENT_ID + IGDB_CLIENT_SECRET o TWITCH_CLIENT_ID + TWITCH_CLIENT_SECRET).');
  }

  return { clientId, clientSecret };
}

interface RankedIgdbGame {
  game: Game;
  rating: number;
  ratingCount: number;
  popularity: number;
  releaseTimestamp: number | null;
}

function toFiniteNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function mapIgdbGame(item: any): Game {
  const releaseTimestamp = typeof item.first_release_date === 'number'
    ? item.first_release_date * 1000
    : null;

  return {
    igdbId: item.id,
    name: item.name,
    slug: item.slug || '',
    cover: item.cover ? `https:${item.cover.url.replace('t_thumb', 't_cover_big')}` : 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1u0f.jpg',
    summary: item.summary || 'No summary available.',
    genres: item.genres ? item.genres.map((g: any) => g.name) : ['Unknown'],
    platforms: item.platforms ? item.platforms.map((p: any) => p.name) : ['Unknown'],
    releaseDate: releaseTimestamp ? new Date(releaseTimestamp).toISOString().split('T')[0] : 'Unknown',
    rating: item.total_rating ? Math.round(item.total_rating) : undefined,
    popularity: typeof item.popularity === 'number'
      ? Math.round(item.popularity)
      : (typeof item.total_rating_count === 'number' ? Math.round(item.total_rating_count) : undefined)
  };
}

function mapRankedIgdbGame(item: any): RankedIgdbGame {
  const popularityValue = typeof item.popularity === 'number'
    ? item.popularity
    : item.total_rating_count;

  return {
    game: mapIgdbGame(item),
    rating: toFiniteNumber(item.total_rating),
    ratingCount: toFiniteNumber(item.total_rating_count),
    popularity: toFiniteNumber(popularityValue),
    releaseTimestamp: typeof item.first_release_date === 'number' ? item.first_release_date * 1000 : null
  };
}

function calculateDiscoverRelevanceScore(game: RankedIgdbGame, averageRating: number): number {
  const minimumVotes = 70;
  const weightedRating = game.ratingCount > 0
    ? ((game.ratingCount / (game.ratingCount + minimumVotes)) * game.rating)
      + ((minimumVotes / (game.ratingCount + minimumVotes)) * averageRating)
    : averageRating * 0.7;

  const popularityBoost = Math.log10(game.popularity + 1) * 10;
  const voteConfidenceBoost = Math.log10(game.ratingCount + 1) * 5;

  let recencyBoost = 0;
  if (game.releaseTimestamp) {
    const ageInYears = (Date.now() - game.releaseTimestamp) / (1000 * 60 * 60 * 24 * 365.25);
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

  return weightedRating + popularityBoost + voteConfidenceBoost + recencyBoost;
}

function rankGamesForDiscover(items: any[], limit: number): Game[] {
  const rankedGames = items.map(mapRankedIgdbGame);
  const ratedGames = rankedGames.filter((game) => game.rating > 0);
  const averageRating = ratedGames.length > 0
    ? ratedGames.reduce((sum, game) => sum + game.rating, 0) / ratedGames.length
    : 70;

  return rankedGames
    .sort((a, b) => {
      const scoreDifference = calculateDiscoverRelevanceScore(b, averageRating) - calculateDiscoverRelevanceScore(a, averageRating);
      if (scoreDifference !== 0) return scoreDifference;

      const popularityDifference = b.popularity - a.popularity;
      if (popularityDifference !== 0) return popularityDifference;

      return b.ratingCount - a.ratingCount;
    })
    .slice(0, limit)
    .map((entry) => entry.game);
}

async function getTwitchToken(): Promise<string> {
  const { clientId, clientSecret } = getIgdbCredentials();

  if (twitchAccessToken && Date.now() < twitchTokenExpiry) {
    return twitchAccessToken;
  }

  try {
    const response = await fetch(`https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`, {
      method: 'POST'
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Twitch OAuth error (${response.status}): ${errorText}`);
    }
    const data = await response.json();
    twitchAccessToken = data.access_token;
    twitchTokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // Margin 1 min
    return twitchAccessToken;
  } catch (err) {
    throw new Error(`IGDB: error obteniendo token de Twitch: ${err}`);
  }
}

export class IgdbService {
  static async searchGames(query: string, limit = 20): Promise<Game[]> {
    const trimmedQuery = query.trim().toLowerCase();
    if (!trimmedQuery) {
      return this.getPopularGames(limit);
    }

    const cacheKey = `search:${trimmedQuery}`;
    const cached = cacheGet<Game[]>(cacheKey);
    if (cached) return cached;

    const token = await getTwitchToken();
    const { clientId } = getIgdbCredentials();

    try {
      const response = await fetch('https://api.igdb.com/v4/games', {
        method: 'POST',
        headers: {
          'Client-ID': clientId,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'text/plain'
        },
        body: `search "${query}";
               fields id, name, slug, summary, cover.url, genres.name, platforms.name, first_release_date, total_rating, total_rating_count;
               limit ${limit};
               where cover != null;`
      });

      if (!response.ok) {
        const errorText = await response.text();      
        throw new Error(`IGDB returned status ${response.status}: ${errorText}`);
      }

      const apiData = await response.json();
      const mapped: Game[] = apiData.map((item: any) => mapIgdbGame(item));

      mapped.forEach(g => db.createGame(g));

      cacheSet(cacheKey, mapped);
      return mapped;
    } catch (err) {
      throw new Error(`IGDB search request failed: ${err}`);
    }
  }

  static async getPopularGames(limit = 30): Promise<Game[]> {
    const cacheKey = `popular:${limit}`;
    const cached = cacheGet<Game[]>(cacheKey);
    if (cached) return cached;

    const token = await getTwitchToken();
    const { clientId } = getIgdbCredentials();
    const candidateQueries = [
      `fields id, name, slug, summary, cover.url, genres.name, platforms.name, first_release_date, total_rating, total_rating_count;
       where total_rating != null & total_rating_count > 25 & cover != null;
       sort total_rating_count desc;
       limit ${Math.max(limit * 2, 120)};`,
      `fields id, name, slug, summary, cover.url, genres.name, platforms.name, first_release_date, total_rating, total_rating_count;
       where cover != null;
       sort first_release_date desc;
       limit ${Math.max(limit * 2, 120)};`
    ];

    let apiData: any[] = [];
    let lastError = '';

    for (const query of candidateQueries) {
      const response = await fetch('https://api.igdb.com/v4/games', {
        method: 'POST',
        headers: {
          'Client-ID': clientId,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'text/plain'
        },
        body: query
      });

      if (!response.ok) {
        const errorText = await response.text();
        lastError = `IGDB popular request failed (${response.status}): ${errorText}`;
        continue;
      }

      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        apiData = data;
        break;
      }
    }

    if (apiData.length === 0) {
      if (lastError) {
        throw new Error(lastError);
      }

      const localFallback = db.getGames()
        .sort((a, b) => (b.popularity || b.rating || 0) - (a.popularity || a.rating || 0))
        .slice(0, limit);
      if (localFallback.length > 0) {
        cacheSet(cacheKey, localFallback);
        return localFallback;
      }

      const fallbackSearchQueries = ['a', 'the', 'of'];
      const merged = new Map<number, any>();

      for (const term of fallbackSearchQueries) {
        const response = await fetch('https://api.igdb.com/v4/games', {
          method: 'POST',
          headers: {
            'Client-ID': clientId,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'text/plain'
          },
          body: `search "${term}";
                 fields id, name, slug, summary, cover.url, genres.name, platforms.name, first_release_date, total_rating, total_rating_count;
                 where cover != null;
                 sort first_release_date desc;
               limit ${Math.max(limit, 50)};`
        });

        if (!response.ok) {
          continue;
        }

        const data = await response.json();
        if (!Array.isArray(data)) {
          continue;
        }

        for (const item of data) {
          if (typeof item?.id === 'number') {
            merged.set(item.id, item);
          }
        }

        if (merged.size >= limit * 2) {
          break;
        }
      }

      if (merged.size === 0) {
        cacheSet(cacheKey, []);
        return [];
      }

      const fallbackMapped = rankGamesForDiscover(Array.from(merged.values()), limit);
      fallbackMapped.forEach(g => db.createGame(g));
      cacheSet(cacheKey, fallbackMapped);
      return fallbackMapped;
    }

    const mapped = rankGamesForDiscover(apiData, limit);
    mapped.forEach(g => db.createGame(g));
    cacheSet(cacheKey, mapped);
    return mapped;
  }

  static async getRecentGames(limit = 30): Promise<Game[]> {
    const cacheKey = `recent:${limit}`;
    const cached = cacheGet<Game[]>(cacheKey);
    if (cached) return cached;

    const token = await getTwitchToken();
    const { clientId } = getIgdbCredentials();
    const nowUnix = Math.floor(Date.now() / 1000);
    const recentWindowUnix = nowUnix - (60 * 60 * 24 * 365 * 4);
    const dlcPattern = /\b(dlc|expansion|season pass|soundtrack|bundle|pack)\b/i;
    const slugDlcPattern = /(dlc|expansion|season-pass|soundtrack|bundle|pack)/i;
    const candidateQueries = [
      `fields id, name, slug, summary, cover.url, genres.name, platforms.name, first_release_date, total_rating, total_rating_count;
       where first_release_date != null & first_release_date >= ${recentWindowUnix} & first_release_date <= ${nowUnix} & total_rating != null & cover != null;
       sort first_release_date desc;
       limit ${Math.max(limit * 2, 120)};`,
      `fields id, name, slug, summary, cover.url, genres.name, platforms.name, first_release_date, total_rating, total_rating_count;
       where first_release_date != null & first_release_date >= ${recentWindowUnix} & first_release_date <= ${nowUnix} & total_rating != null & total_rating > 0 & cover != null;
       sort first_release_date desc;
       limit ${Math.max(limit * 2, 120)};`
    ];

    const normalizeRecentResults = (items: any[]): Game[] => items
      .map((item: any) => mapIgdbGame(item))
      .filter((game) => game.releaseDate !== 'Unknown' && typeof game.rating === 'number' && game.rating > 0)
      .filter((game) => !dlcPattern.test(game.name) && !slugDlcPattern.test(game.slug))
      .sort((a, b) => {
        const bTime = Date.parse(b.releaseDate);
        const aTime = Date.parse(a.releaseDate);
        const timeDifference = (Number.isNaN(bTime) ? 0 : bTime) - (Number.isNaN(aTime) ? 0 : aTime);
        if (timeDifference !== 0) return timeDifference;

        const popularityDifference = (b.popularity || 0) - (a.popularity || a.rating || 0);
        if (popularityDifference !== 0) return popularityDifference;

        return (b.rating || 0) - (a.rating || 0);
      })
      .slice(0, limit);

    for (const query of candidateQueries) {
      const response = await fetch('https://api.igdb.com/v4/games', {
        method: 'POST',
        headers: {
          'Client-ID': clientId,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'text/plain'
        },
        body: query
      });

      if (!response.ok) {
        continue;
      }

      const apiData = await response.json();
      if (Array.isArray(apiData) && apiData.length > 0) {
        const mapped = normalizeRecentResults(apiData);
        if (mapped.length > 0) {
          mapped.forEach(g => db.createGame(g));
          cacheSet(cacheKey, mapped);
          return mapped;
        }
      }
    }

    const fallbackSearchQueries = ['a', 'the', 'of'];
    const merged = new Map<number, any>();

    for (const term of fallbackSearchQueries) {
      const response = await fetch('https://api.igdb.com/v4/games', {
        method: 'POST',
        headers: {
          'Client-ID': clientId,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'text/plain'
        },
        body: `search "${term}";
               fields id, name, slug, summary, cover.url, genres.name, platforms.name, first_release_date, total_rating, total_rating_count;
               where first_release_date != null & first_release_date >= ${recentWindowUnix} & first_release_date <= ${nowUnix} & total_rating != null & total_rating > 0 & cover != null;
               sort first_release_date desc;
               limit ${Math.max(limit, 50)};`
      });

      if (!response.ok) {
        continue;
      }

      const data = await response.json();
      if (!Array.isArray(data)) {
        continue;
      }

      for (const item of data) {
        if (typeof item?.id === 'number') {
          merged.set(item.id, item);
        }
      }

      if (merged.size >= limit * 2) {
        break;
      }
    }

    const fallback = normalizeRecentResults(Array.from(merged.values()));
    cacheSet(cacheKey, fallback);
    return fallback;
  }

  static async getGameDetails(id: number): Promise<Game | null> {
    const cached = cacheGet<Game>(`game:${id}`);
    if (cached) return cached;

    // Check if it already exists in our db
    const local = db.getGame(id);
    if (local) {
      return local;
    }

    const token = await getTwitchToken();
    const { clientId } = getIgdbCredentials();

    try {
      const response = await fetch('https://api.igdb.com/v4/games', {
        method: 'POST',
        headers: {
          'Client-ID': clientId,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'text/plain'
        },
        body: `fields id, name, slug, summary, cover.url, genres.name, platforms.name, first_release_date, total_rating, total_rating_count;
               where id = ${id};`
      });

      if (!response.ok) throw new Error('IGDB Details call failed');
      const apiData = await response.json();
      if (!apiData || apiData.length === 0) return null;

      const mapped: Game = mapIgdbGame(apiData[0]);

      db.createGame(mapped);
      cacheSet(`game:${id}`, mapped);
      return mapped;
    } catch (err) {
      console.error(`IGDB getGameDetails for ${id} failed:`, err);
      return null;
    }
  }
}









