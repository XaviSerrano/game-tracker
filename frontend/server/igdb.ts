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

function mapIgdbGame(item: any): Game {
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
               fields id, name, slug, summary, cover.url, genres.name, platforms.name, first_release_date, total_rating;
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

    const response = await fetch('https://api.igdb.com/v4/games', {
      method: 'POST',
      headers: {
        'Client-ID': clientId,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'text/plain'
      },
      body: `fields id, name, slug, summary, cover.url, genres.name, platforms.name, first_release_date, total_rating;
             where version_parent = null & total_rating_count > 30 & cover != null;
             sort total_rating desc;
             limit ${limit};`
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`IGDB popular request failed (${response.status}): ${errorText}`);
    }

    const apiData = await response.json();
    const mapped: Game[] = apiData.map((item: any) => mapIgdbGame(item));
    mapped.forEach(g => db.createGame(g));
    cacheSet(cacheKey, mapped);
    return mapped;
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
        body: `fields id, name, slug, summary, cover.url, genres.name, platforms.name, first_release_date, total_rating;
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
      throw new Error(`IGDB getGameDetails for ${id} failed: ${err}`);
    }
  }
}
