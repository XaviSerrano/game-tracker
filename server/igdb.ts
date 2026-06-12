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

async function getTwitchToken(): Promise<string | null> {
  const clientId = process.env.IGDB_CLIENT_ID;
  const clientSecret = process.env.IGDB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return null;
  }

  if (twitchAccessToken && Date.now() < twitchTokenExpiry) {
    return twitchAccessToken;
  }

  try {
    const response = await fetch(`https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`, {
      method: 'POST'
    });
    if (!response.ok) throw new Error('Failed to fetch Twitch premium token');
    const data = await response.json();
    twitchAccessToken = data.access_token;
    twitchTokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // Margin 1 min
    return twitchAccessToken;
  } catch (err) {
    console.error("IGDB: Error getting Twitch Access Token:", err);
    return null;
  }
}

export class IgdbService {
  /**
   * Search video games matching a query.
   * If Twitch app credentials are not supplied, searches on-disk seeded dataset.
   */
  static async searchGames(query: string): Promise<Game[]> {
    const trimmedQuery = query.trim().toLowerCase();
    if (!trimmedQuery) {
      return db.getGames().slice(0, 10);
    }

    const cacheKey = `search:${trimmedQuery}`;
    const cached = cacheGet<Game[]>(cacheKey);
    if (cached) return cached;

    const token = await getTwitchToken();
    const clientId = process.env.IGDB_CLIENT_ID;

    if (!token || !clientId) {
      // Graceful fallback to seeded local DB search
      const localMatches = db.getGames().filter(g =>
        g.name.toLowerCase().includes(trimmedQuery) ||
        g.summary.toLowerCase().includes(trimmedQuery) ||
        g.genres.some(gen => gen.toLowerCase().includes(trimmedQuery))
      );
      cacheSet(cacheKey, localMatches);
      return localMatches;
    }

    try {
      // Call official IGDB API
      const response = await fetch('https://api.igdb.com/v4/games', {
        method: 'POST',
        headers: {
          'Client-ID': clientId,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'text/plain'
        },
        body: `search "${query}";
               fields id, name, slug, summary, cover.url, genres.name, platforms.name, first_release_date, total_rating, popularity;
               limit 12;
               where cover != null;`
      });

      if (!response.ok) {
        throw new Error(`IGDB returned status: ${response.status}`);
      }

      const apiData = await response.json();
      const mapped: Game[] = apiData.map((item: any) => {
        // Map IGDB standard structures to our standard Game type
        return {
          igdbId: item.id,
          name: item.name,
          slug: item.slug || '',
          cover: item.cover ? `https:${item.cover.url.replace('t_thumb', 't_cover_big')}` : 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1u0f.jpg',
          summary: item.summary || 'No summary available.',
          genres: item.genres ? item.genres.map((g: any) => g.name) : ['Unknown'],
          platforms: item.platforms ? item.platforms.map((p: any) => p.name) : ['Unknown'],
          releaseDate: item.first_release_date ? new Date(item.first_release_date * 1000).toISOString().split('T')[0] : 'Unknown',
          rating: item.total_rating ? Math.round(item.total_rating) : undefined,
          popularity: item.popularity ? Math.round(item.popularity) : undefined
        };
      });

      // Synchronize newly discovered games into our local DB for future joins/recommendations
      mapped.forEach(g => db.createGame(g));

      cacheSet(cacheKey, mapped);
      return mapped;
    } catch (err) {
      console.error("IGDB Search Request failed. Falling back to local data:", err);
      // Fallback
      return db.getGames().filter(g => g.name.toLowerCase().includes(trimmedQuery)).slice(0, 10);
    }
  }

  /**
   * Fetch thorough game details by IGDB ID.
   */
  static async getGameDetails(id: number): Promise<Game | null> {
    const cached = cacheGet<Game>(`game:${id}`);
    if (cached) return cached;

    // Check if it already exists in our db
    const local = db.getGame(id);
    if (local) {
      return local;
    }

    const token = await getTwitchToken();
    const clientId = process.env.IGDB_CLIENT_ID;

    if (!token || !clientId) {
      return null;
    }

    try {
      const response = await fetch('https://api.igdb.com/v4/games', {
        method: 'POST',
        headers: {
          'Client-ID': clientId,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'text/plain'
        },
        body: `fields id, name, slug, summary, cover.url, genres.name, platforms.name, first_release_date, total_rating, popularity;
               where id = ${id};`
      });

      if (!response.ok) throw new Error('IGDB Details call failed');
      const apiData = await response.json();
      if (!apiData || apiData.length === 0) return null;

      const item = apiData[0];
      const mapped: Game = {
        igdbId: item.id,
        name: item.name,
        slug: item.slug || '',
        cover: item.cover ? `https:${item.cover.url.replace('t_thumb', 't_cover_big')}` : 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1u0f.jpg',
        summary: item.summary || 'No summary available.',
        genres: item.genres ? item.genres.map((g: any) => g.name) : ['Unknown'],
        platforms: item.platforms ? item.platforms.map((p: any) => p.name) : ['Unknown'],
        releaseDate: item.first_release_date ? new Date(item.first_release_date * 1000).toISOString().split('T')[0] : 'Unknown',
        rating: item.total_rating ? Math.round(item.total_rating) : undefined,
        popularity: item.popularity ? Math.round(item.popularity) : undefined
      };

      db.createGame(mapped);
      cacheSet(`game:${id}`, mapped);
      return mapped;
    } catch (err) {
      console.error(`IGDB getGameDetails for ${id} failed:`, err);
      return null;
    }
  }
}
