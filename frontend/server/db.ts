import { Pool } from 'pg';

import type {
  User,
  Game,
  UserGame,
  Review,
  CustomList,
  Activity,
  ActivityType,
  GameStatus
} from '../src/types.ts';

interface StoredUser extends User {
  passwordHash?: string | null;
  passwordSalt?: string | null;
  passwordResetTokenHash?: string | null;
  passwordResetExpiresAt?: string | null;
}

interface StatsGameSummary {
  igdbId: number;
  name: string;
  slug: string;
  cover: string;
  summary: string;
  genres: string[];
  platforms: string[];
  releaseDate: string;
  rating?: number;
  myRating: number;
  hoursPlayed: number;
}

interface UserStats {
  totalHours: number;
  totalGames: number;
  completedCount: number;
  playedCount: number;
  playingCount: number;
  abandonedCount: number;
  wishlistCount: number;
  averageRating: number;
  ratedGamesCount: number;
  averageHoursPerGame: number;
  completionRate: number;
  favoriteGenre: string;
  favoritePlatform: string;
  mostPlayedGame: StatsGameSummary | null;
  topRatedGames: StatsGameSummary[];
  mostPlayedGames: StatsGameSummary[];
  ratingsDistribution: {
    stars: number;
    count: number;
  }[];
  monthlyActivity: {
    monthKey: string;
    label: string;
    hours: number;
    completed: number;
    added: number;
  }[];
  platformsDistribution: {
    name: string;
    value: number;
  }[];
  genresDistribution: {
    name: string;
    value: number;
  }[];
}

interface ActivityRow {
  id: string;
  userId: string;
  type: ActivityType;
  gameId: number | null;
  targetUserId: string | null;
  details: string | null;
  createdAt: string;
}

// ── Conexión a PostgreSQL ───────────────────────────────────────────────────
//
// En Render, crea una base de datos PostgreSQL y copia su "Internal/External
// Connection String" en la variable de entorno DATABASE_URL del servicio web.
// En local, apunta DATABASE_URL a una instancia propia (ver .env.example).

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    'DATABASE_URL no está definida. Configura la cadena de conexión de PostgreSQL (ver .env.example).'
  );
}

// Render (y la mayoría de proveedores gestionados) requieren SSL para
// conexiones externas, pero una Postgres local no lo soporta por defecto.
const isLocalConnection = /localhost|127\.0\.0\.1/.test(connectionString);

const pool = new Pool({
  connectionString,
  ssl: isLocalConnection ? false : { rejectUnauthorized: false }
});

pool.on('error', (err) => {
  console.error('❌ Error inesperado en el pool de PostgreSQL:', err);
});

console.log(`📦 PostgreSQL: conectando (${isLocalConnection ? 'local' : 'remoto/SSL'})`);

// ── Esquema ──────────────────────────────────────────────────────────────────
//
// Se ejecuta una vez al arrancar el servidor (ver initDb(), llamado desde
// server.ts antes de app.listen). Los nombres de columna camelCase se citan
// entre comillas dobles para que PostgreSQL no los pliegue a minúsculas.

export async function initDb(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      avatar TEXT NOT NULL DEFAULT '',
      bio TEXT NOT NULL DEFAULT '',
      "createdAt" TEXT NOT NULL,
      "passwordHash" TEXT,
      "passwordSalt" TEXT,
      "passwordResetTokenHash" TEXT,
      "passwordResetExpiresAt" TEXT
    );

    CREATE TABLE IF NOT EXISTS games (
      "igdbId" INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL DEFAULT '',
      cover TEXT NOT NULL DEFAULT '',
      summary TEXT NOT NULL DEFAULT '',
      genres TEXT NOT NULL DEFAULT '[]',
      platforms TEXT NOT NULL DEFAULT '[]',
      "releaseDate" TEXT NOT NULL DEFAULT '',
      rating DOUBLE PRECISION DEFAULT 0,
      popularity DOUBLE PRECISION DEFAULT 0,
      "averagePlaytimeHours" DOUBLE PRECISION,
      "timeToBeat" TEXT NOT NULL DEFAULT '{}',
      screenshots TEXT NOT NULL DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS "userGames" (
      "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      "gameId" INTEGER NOT NULL REFERENCES games("igdbId") ON DELETE CASCADE,
      status TEXT NOT NULL,
      rating DOUBLE PRECISION NOT NULL DEFAULT 0,
      "hoursPlayed" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "startedAt" TEXT,
      "completedAt" TEXT,
      notes TEXT NOT NULL DEFAULT '',
      "updatedAt" TEXT NOT NULL,
      "addedAt" TEXT,
      PRIMARY KEY ("userId", "gameId")
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      "gameId" INTEGER NOT NULL REFERENCES games("igdbId") ON DELETE CASCADE,
      title TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL,
      rating DOUBLE PRECISION DEFAULT 0,
      likes TEXT NOT NULL DEFAULT '[]',
      "createdAt" TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "customLists" (
      id TEXT PRIMARY KEY,
      "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      "createdAt" TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "customListItems" (
      "listId" TEXT NOT NULL REFERENCES "customLists"(id) ON DELETE CASCADE,
      "gameId" INTEGER NOT NULL REFERENCES games("igdbId") ON DELETE CASCADE,
      position SERIAL,
      PRIMARY KEY ("listId", "gameId")
    );

    CREATE TABLE IF NOT EXISTS follows (
      "followerId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      "followingId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      PRIMARY KEY ("followerId", "followingId"),
      CHECK ("followerId" != "followingId")
    );

    CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY,
      "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      "gameId" INTEGER REFERENCES games("igdbId") ON DELETE CASCADE,
      "targetUserId" TEXT REFERENCES users(id) ON DELETE CASCADE,
      details TEXT,
      "createdAt" TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      "expiresAt" TEXT NOT NULL,
      "createdAt" TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "securityEvents" (
      id TEXT PRIMARY KEY,
      "userId" TEXT REFERENCES users(id) ON DELETE SET NULL,
      "eventType" TEXT NOT NULL,
      "ipAddress" TEXT,
      "userAgent" TEXT,
      details TEXT,
      "createdAt" TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_userGames_userId ON "userGames"("userId");
    CREATE INDEX IF NOT EXISTS idx_userGames_gameId ON "userGames"("gameId");
    CREATE INDEX IF NOT EXISTS idx_reviews_gameId ON reviews("gameId");
    CREATE INDEX IF NOT EXISTS idx_reviews_userId ON reviews("userId");
    CREATE INDEX IF NOT EXISTS idx_activities_createdAt ON activities("createdAt");
    CREATE INDEX IF NOT EXISTS idx_sessions_expiresAt ON sessions("expiresAt");
    CREATE INDEX IF NOT EXISTS idx_securityEvents_createdAt ON "securityEvents"("createdAt");
  `);

  // Migraciones idempotentes para despliegues previos a estas columnas.
  await pool.query(`ALTER TABLE games ADD COLUMN IF NOT EXISTS screenshots TEXT NOT NULL DEFAULT '[]'`);
  await pool.query(`ALTER TABLE games ADD COLUMN IF NOT EXISTS "averagePlaytimeHours" DOUBLE PRECISION`);
  await pool.query(`ALTER TABLE games ADD COLUMN IF NOT EXISTS "timeToBeat" TEXT NOT NULL DEFAULT '{}'`);
  await pool.query(`ALTER TABLE "userGames" ADD COLUMN IF NOT EXISTS "addedAt" TEXT`);
  await pool.query(`UPDATE "userGames" SET "addedAt" = "updatedAt" WHERE "addedAt" IS NULL`);

  console.log('📦 PostgreSQL: esquema verificado/creado correctamente');
}

function parseJson<T>(
  value: string | null | undefined,
  fallback: T
): T {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function serializeJson(value: unknown): string {
  return JSON.stringify(value ?? []);
}

function nowIso(): string {
  return new Date().toISOString();
}

function hydrateGame(row: any): Game {
  return {
    igdbId: Number(row.igdbId),
    name: row.name ?? '',
    slug: row.slug ?? '',
    cover: row.cover ?? '',
    summary: row.summary ?? '',
    genres: parseJson<string[]>(row.genres, []),
    platforms: parseJson<string[]>(row.platforms, []),
    releaseDate: row.releaseDate ?? '',
    rating: Number(row.rating ?? 0),
    popularity: Number(row.popularity ?? 0),
    averagePlaytimeHours: row.averagePlaytimeHours == null ? undefined : Number(row.averagePlaytimeHours),
    timeToBeat: parseJson<Game['timeToBeat']>(row.timeToBeat, undefined),
    screenshots: parseJson<string[]>(row.screenshots, [])
  };
}

function hydrateUserGame(row: any): UserGame {
  return {
    userId: row.userId,
    gameId: Number(row.gameId),
    status: row.status as GameStatus,
    rating: Number(row.rating ?? 0),
    hoursPlayed: Number(row.hoursPlayed ?? 0),
    startedAt: row.startedAt ?? null,
    completedAt: row.completedAt ?? null,
    notes: row.notes ?? '',
    updatedAt: row.updatedAt
  };
}

function hydrateReview(row: any): Review {
  return {
    id: row.id,
    userId: row.userId,
    gameId: Number(row.gameId),
    title: row.title ?? '',
    content: row.content ?? '',
    rating: Number(row.rating ?? 0),
    likes: parseJson<string[]>(row.likes, []),
    createdAt: row.createdAt
  };
}

function hydrateActivity(row: ActivityRow): Activity {
  return {
    id: row.id,
    userId: row.userId,
    type: row.type,
    gameId: row.gameId ?? undefined,
    targetUserId: row.targetUserId ?? undefined,
    details: row.details ?? undefined,
    createdAt: row.createdAt
  };
}

class GameDatabase {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  // ==================================================
  // USERS
  // ==================================================

  private toPublicUser(user: StoredUser): User {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      avatar: user.avatar ?? '',
      bio: user.bio ?? '',
      createdAt: user.createdAt
    };
  }

  async getUsers(): Promise<User[]> {
    const { rows } = await this.pool.query(`
      SELECT id, username, email, avatar, bio, "createdAt"
      FROM users
      ORDER BY "createdAt" ASC
    `);

    return rows as User[];
  }

  async searchUsersByUsername(query: string): Promise<User[]> {
    const { rows } = await this.pool.query(
      `
        SELECT id, username, email, avatar, bio, "createdAt"
        FROM users
        WHERE LOWER(username) LIKE LOWER($1)
        ORDER BY username ASC
        LIMIT 20
      `,
      [`%${query.trim()}%`]
    );

    return rows as User[];
  }

  async getUser(userId: string): Promise<User | null> {
    const { rows } = await this.pool.query(
      `
        SELECT id, username, email, avatar, bio, "createdAt"
        FROM users
        WHERE id = $1
      `,
      [userId]
    );

    return (rows[0] as User) ?? null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const { rows } = await this.pool.query(
      `
        SELECT id, username, email, avatar, bio, "createdAt"
        FROM users
        WHERE LOWER(email) = LOWER($1)
      `,
      [email]
    );

    return (rows[0] as User) ?? null;
  }

  async getUserByUsername(username: string): Promise<User | null> {
    const { rows } = await this.pool.query(
      `
        SELECT id, username, email, avatar, bio, "createdAt"
        FROM users
        WHERE LOWER(username) = LOWER($1)
      `,
      [username]
    );

    return (rows[0] as User) ?? null;
  }

  async getAuthUserByEmail(email: string): Promise<StoredUser | null> {
    const { rows } = await this.pool.query(
      `SELECT * FROM users WHERE LOWER(email) = LOWER($1)`,
      [email]
    );

    return (rows[0] as StoredUser) ?? null;
  }

  async getAuthUserById(userId: string): Promise<StoredUser | null> {
    const { rows } = await this.pool.query(
      `SELECT * FROM users WHERE id = $1`,
      [userId]
    );

    return (rows[0] as StoredUser) ?? null;
  }

  async createUser(
    user: User,
    auth?: {
      passwordHash: string;
      passwordSalt: string;
    }
  ): Promise<User> {
    const existing = await this.getAuthUserById(user.id);

    if (existing) {
      return this.toPublicUser(existing);
    }

    await this.pool.query(
      `
        INSERT INTO users (
          id, username, email, avatar, bio, "createdAt",
          "passwordHash", "passwordSalt", "passwordResetTokenHash", "passwordResetExpiresAt"
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NULL, NULL)
      `,
      [
        user.id,
        user.username,
        user.email,
        user.avatar ?? '',
        user.bio ?? '',
        user.createdAt,
        auth?.passwordHash ?? null,
        auth?.passwordSalt ?? null
      ]
    );

    return user;
  }

  async updateUser(
    userId: string,
    updates: Partial<User>
  ): Promise<User | null> {
    const existing = await this.getAuthUserById(userId);

    if (!existing) {
      return null;
    }

    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (updates.username !== undefined) {
      fields.push(`username = $${idx++}`);
      values.push(updates.username);
    }

    if (updates.email !== undefined) {
      fields.push(`email = $${idx++}`);
      values.push(updates.email);
    }

    if (updates.avatar !== undefined) {
      fields.push(`avatar = $${idx++}`);
      values.push(updates.avatar);
    }

    if (updates.bio !== undefined) {
      fields.push(`bio = $${idx++}`);
      values.push(updates.bio);
    }

    if (fields.length === 0) {
      return this.toPublicUser(existing);
    }

    values.push(userId);

    await this.pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx}`,
      values
    );

    return this.getUser(userId);
  }

  async setUserPassword(
    userId: string,
    passwordHash: string,
    passwordSalt: string
  ): Promise<User | null> {
    const result = await this.pool.query(
      `
        UPDATE users
        SET
          "passwordHash" = $1,
          "passwordSalt" = $2,
          "passwordResetTokenHash" = NULL,
          "passwordResetExpiresAt" = NULL
        WHERE id = $3
      `,
      [passwordHash, passwordSalt, userId]
    );

    if (result.rowCount === 0) {
      return null;
    }

    return this.getUser(userId);
  }

  async savePasswordResetToken(
    userId: string,
    tokenHash: string,
    expiresAt: string
  ): Promise<User | null> {
    const result = await this.pool.query(
      `
        UPDATE users
        SET
          "passwordResetTokenHash" = $1,
          "passwordResetExpiresAt" = $2
        WHERE id = $3
      `,
      [tokenHash, expiresAt, userId]
    );

    if (result.rowCount === 0) {
      return null;
    }

    return this.getUser(userId);
  }

  async clearPasswordResetToken(userId: string): Promise<void> {
    await this.pool.query(
      `
        UPDATE users
        SET
          "passwordResetTokenHash" = NULL,
          "passwordResetExpiresAt" = NULL
        WHERE id = $1
      `,
      [userId]
    );
  }

  async getAuthUserByPasswordResetTokenHash(
    tokenHash: string
  ): Promise<StoredUser | null> {
    const { rows } = await this.pool.query(
      `
        SELECT *
        FROM users
        WHERE "passwordResetTokenHash" = $1
          AND "passwordResetExpiresAt" IS NOT NULL
          AND "passwordResetExpiresAt" > $2
      `,
      [tokenHash, nowIso()]
    );

    return (rows[0] as StoredUser) ?? null;
  }

  // ==================================================
  // SESSIONS
  // ==================================================

  private async purgeExpiredSessions(): Promise<void> {
    await this.pool.query(
      `DELETE FROM sessions WHERE "expiresAt" <= $1`,
      [nowIso()]
    );
  }

  async getUserBySessionToken(token: string): Promise<User | null> {
    await this.purgeExpiredSessions();

    const { rows } = await this.pool.query(
      `SELECT "userId" FROM sessions WHERE token = $1`,
      [token]
    );

    const session = rows[0] as { userId: string } | undefined;

    if (!session) {
      return null;
    }

    return this.getUser(session.userId);
  }

  async createSession(
    userId: string,
    token: string,
    expiresAt: string
  ): Promise<string> {
    await this.purgeExpiredSessions();

    await this.pool.query(
      `
        INSERT INTO sessions (token, "userId", "expiresAt", "createdAt")
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (token)
        DO UPDATE SET
          "userId" = excluded."userId",
          "expiresAt" = excluded."expiresAt",
          "createdAt" = excluded."createdAt"
      `,
      [token, userId, expiresAt, nowIso()]
    );

    return token;
  }

  async revokeSession(token: string): Promise<boolean> {
    const result = await this.pool.query(
      `DELETE FROM sessions WHERE token = $1`,
      [token]
    );

    return (result.rowCount ?? 0) > 0;
  }

  async revokeSessionsForUser(userId: string): Promise<void> {
    await this.pool.query(
      `DELETE FROM sessions WHERE "userId" = $1`,
      [userId]
    );
  }

  async revokeOldestSessionsForUser(userId: string, maxSessions: number): Promise<void> {
    await this.pool.query(
      `
        DELETE FROM sessions
        WHERE token IN (
          SELECT token
          FROM sessions
          WHERE "userId" = $1
          ORDER BY "createdAt" DESC
          OFFSET $2
        )
      `,
      [userId, maxSessions]
    );
  }

  async addSecurityEvent(event: {
    id?: string;
    userId?: string | null;
    eventType: string;
    ipAddress?: string | null;
    userAgent?: string | null;
    details?: string | null;
    createdAt?: string;
  }): Promise<void> {
    await this.pool.query(
      `
        INSERT INTO "securityEvents" (
          id, "userId", "eventType", "ipAddress", "userAgent", details, "createdAt"
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [
        event.id ?? `sec_${Date.now()}_${Math.random().toString(16).slice(2)}`,
        event.userId ?? null,
        event.eventType,
        event.ipAddress ?? null,
        event.userAgent ?? null,
        event.details ?? null,
        event.createdAt ?? nowIso()
      ]
    );

    await this.pool.query(`
      DELETE FROM "securityEvents"
      WHERE id NOT IN (
        SELECT id FROM "securityEvents" ORDER BY "createdAt" DESC LIMIT 500
      )
    `);
  }

  // ==================================================
  // GAMES
  // ==================================================

  async getGames(): Promise<Game[]> {
    const { rows } = await this.pool.query(`SELECT * FROM games ORDER BY name ASC`);
    return rows.map(hydrateGame);
  }

  async getGame(igdbId: number): Promise<Game | null> {
    const { rows } = await this.pool.query(
      `SELECT * FROM games WHERE "igdbId" = $1`,
      [igdbId]
    );

    return rows[0] ? hydrateGame(rows[0]) : null;
  }

  async createGame(game: Game): Promise<Game> {
    return this.saveGame(game);
  }

  async saveGame(game: Game): Promise<Game> {
    await this.pool.query(
      `
        INSERT INTO games (
          "igdbId", name, slug, cover, summary, genres, platforms,
          "releaseDate", rating, popularity, "averagePlaytimeHours", "timeToBeat", screenshots
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT ("igdbId")
        DO UPDATE SET
          name = excluded.name,
          slug = excluded.slug,
          cover = excluded.cover,
          summary = excluded.summary,
          genres = excluded.genres,
          platforms = excluded.platforms,
          "releaseDate" = excluded."releaseDate",
          rating = excluded.rating,
          popularity = excluded.popularity,
          "averagePlaytimeHours" = excluded."averagePlaytimeHours",
          "timeToBeat" = excluded."timeToBeat",
          screenshots = excluded.screenshots
      `,
      [
        game.igdbId,
        game.name,
        game.slug ?? '',
        game.cover ?? '',
        game.summary ?? '',
        serializeJson(game.genres),
        serializeJson(game.platforms),
        game.releaseDate ?? '',
        game.rating ?? 0,
        game.popularity ?? 0,
        game.averagePlaytimeHours ?? null,
        serializeJson(game.timeToBeat),
        serializeJson(game.screenshots)
      ]
    );

    return game;
  }

  // ==================================================
  // USER GAMES
  // ==================================================

  async getUserGames(userId: string): Promise<UserGame[]> {
    const { rows } = await this.pool.query(
      `
        SELECT * FROM "userGames"
        WHERE "userId" = $1
        ORDER BY "updatedAt" DESC
      `,
      [userId]
    );

    return rows.map(hydrateUserGame);
  }

  async getUserGame(
    userId: string,
    gameId: number
  ): Promise<UserGame | null> {
    const { rows } = await this.pool.query(
      `SELECT * FROM "userGames" WHERE "userId" = $1 AND "gameId" = $2`,
      [userId, gameId]
    );

    return rows[0] ? hydrateUserGame(rows[0]) : null;
  }

  async saveUserGame(userGame: UserGame): Promise<UserGame> {
    const updatedAt = nowIso();

    const updatedUserGame: UserGame = {
      ...userGame,
      updatedAt
    };

    await this.pool.query(
      `
        INSERT INTO "userGames" (
          "userId", "gameId", status, rating, "hoursPlayed",
          "startedAt", "completedAt", notes, "updatedAt", "addedAt"
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT ("userId", "gameId")
        DO UPDATE SET
          status = excluded.status,
          rating = excluded.rating,
          "hoursPlayed" = excluded."hoursPlayed",
          "startedAt" = excluded."startedAt",
          "completedAt" = excluded."completedAt",
          notes = excluded.notes,
          "updatedAt" = excluded."updatedAt"
      `,
      [
        updatedUserGame.userId,
        updatedUserGame.gameId,
        updatedUserGame.status,
        updatedUserGame.rating ?? 0,
        updatedUserGame.hoursPlayed ?? 0,
        updatedUserGame.startedAt ?? null,
        updatedUserGame.completedAt ?? null,
        updatedUserGame.notes ?? '',
        updatedAt,
        updatedAt
      ]
    );

    return updatedUserGame;
  }

  async deleteUserGame(
    userId: string,
    gameId: number
  ): Promise<boolean> {
    const result = await this.pool.query(
      `DELETE FROM "userGames" WHERE "userId" = $1 AND "gameId" = $2`,
      [userId, gameId]
    );

    return (result.rowCount ?? 0) > 0;
  }

  // ==================================================
  // REVIEWS
  // ==================================================

  async getReviews(gameId?: number): Promise<Review[]> {
    const { rows } = gameId !== undefined
      ? await this.pool.query(
          `SELECT * FROM reviews WHERE "gameId" = $1 ORDER BY "createdAt" DESC`,
          [gameId]
        )
      : await this.pool.query(`SELECT * FROM reviews ORDER BY "createdAt" DESC`);

    return rows.map(hydrateReview);
  }

  async getReview(id: string): Promise<Review | null> {
    const { rows } = await this.pool.query(
      `SELECT * FROM reviews WHERE id = $1`,
      [id]
    );

    return rows[0] ? hydrateReview(rows[0]) : null;
  }

  async getUserReviews(userId: string): Promise<Review[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM reviews WHERE "userId" = $1 ORDER BY "createdAt" DESC`,
      [userId]
    );

    return rows.map(hydrateReview);
  }

  async saveReview(review: Review): Promise<Review> {
    await this.pool.query(
      `
        INSERT INTO reviews (
          id, "userId", "gameId", title, content, rating, likes, "createdAt"
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id)
        DO UPDATE SET
          title = excluded.title,
          content = excluded.content,
          rating = excluded.rating,
          likes = excluded.likes
      `,
      [
        review.id,
        review.userId,
        review.gameId,
        review.title ?? '',
        review.content,
        review.rating ?? 0,
        serializeJson(review.likes),
        review.createdAt
      ]
    );

    return review;
  }

  async toggleLikeReview(
    reviewId: string,
    userId: string
  ): Promise<Review | null> {
    const review = await this.getReview(reviewId);

    if (!review) {
      return null;
    }

    const likes = new Set(review.likes ?? []);

    if (likes.has(userId)) {
      likes.delete(userId);
    } else {
      likes.add(userId);
    }

    const updatedReview: Review = {
      ...review,
      likes: Array.from(likes)
    };

    await this.saveReview(updatedReview);

    return updatedReview;
  }

  // ==================================================
  // CUSTOM LISTS
  // ==================================================

  async getLists(userId?: string): Promise<CustomList[]> {
    const { rows } = userId
      ? await this.pool.query(
          `SELECT * FROM "customLists" WHERE "userId" = $1 ORDER BY "createdAt" DESC`,
          [userId]
        )
      : await this.pool.query(`SELECT * FROM "customLists" ORDER BY "createdAt" DESC`);

    return rows as CustomList[];
  }

  async getList(id: string): Promise<CustomList | null> {
    const { rows } = await this.pool.query(
      `SELECT * FROM "customLists" WHERE id = $1`,
      [id]
    );

    return (rows[0] as CustomList) ?? null;
  }

  async createList(list: CustomList): Promise<CustomList> {
    await this.pool.query(
      `
        INSERT INTO "customLists" (id, "userId", name, description, "createdAt")
        VALUES ($1, $2, $3, $4, $5)
      `,
      [list.id, list.userId, list.name, list.description ?? '', list.createdAt]
    );

    return list;
  }

  async updateList(
    id: string,
    updates: {
      name?: string;
      description?: string;
    }
  ): Promise<CustomList | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (updates.name !== undefined) {
      fields.push(`name = $${idx++}`);
      values.push(updates.name);
    }

    if (updates.description !== undefined) {
      fields.push(`description = $${idx++}`);
      values.push(updates.description);
    }

    if (fields.length === 0) {
      return this.getList(id);
    }

    values.push(id);

    const result = await this.pool.query(
      `UPDATE "customLists" SET ${fields.join(', ')} WHERE id = $${idx}`,
      values
    );

    if (result.rowCount === 0) {
      return null;
    }

    return this.getList(id);
  }

  async deleteList(id: string): Promise<boolean> {
    const result = await this.pool.query(
      `DELETE FROM "customLists" WHERE id = $1`,
      [id]
    );

    return (result.rowCount ?? 0) > 0;
  }

  async getListItems(listId: string): Promise<number[]> {
    const { rows } = await this.pool.query(
      `
        SELECT "gameId" FROM "customListItems"
        WHERE "listId" = $1
        ORDER BY position ASC
      `,
      [listId]
    );

    return rows.map((row: any) => Number(row.gameId));
  }

  async saveListItems(
    listId: string,
    gameIds: number[]
  ): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      await client.query(
        `DELETE FROM "customListItems" WHERE "listId" = $1`,
        [listId]
      );

      for (const gameId of gameIds) {
        await client.query(
          `INSERT INTO "customListItems" ("listId", "gameId") VALUES ($1, $2)`,
          [listId, gameId]
        );
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // ==================================================
  // FOLLOWS
  // ==================================================

  async getFollowers(userId: string): Promise<string[]> {
    const { rows } = await this.pool.query(
      `SELECT "followerId" FROM follows WHERE "followingId" = $1`,
      [userId]
    );

    return rows.map((row: any) => row.followerId);
  }

  async getFollowing(userId: string): Promise<string[]> {
    const { rows } = await this.pool.query(
      `SELECT "followingId" FROM follows WHERE "followerId" = $1`,
      [userId]
    );

    return rows.map((row: any) => row.followingId);
  }

  async toggleFollow(
    followerId: string,
    followingId: string
  ): Promise<boolean> {
    if (followerId === followingId) {
      return false;
    }

    const { rows } = await this.pool.query(
      `SELECT 1 FROM follows WHERE "followerId" = $1 AND "followingId" = $2`,
      [followerId, followingId]
    );

    if (rows.length > 0) {
      await this.pool.query(
        `DELETE FROM follows WHERE "followerId" = $1 AND "followingId" = $2`,
        [followerId, followingId]
      );

      return false;
    }

    await this.pool.query(
      `INSERT INTO follows ("followerId", "followingId") VALUES ($1, $2)`,
      [followerId, followingId]
    );

    return true;
  }

  // ==================================================
  // STATISTICS
  // ==================================================

  async getUserStats(userId: string): Promise<UserStats> {
    const userGames = await this.getUserGames(userId);

    // addedAt no forma parte del tipo UserGame público (solo se usa para
    // analítica interna), así que se consulta aparte.
    const { rows: addedAtRows } = await this.pool.query(
      `SELECT "gameId", "addedAt" FROM "userGames" WHERE "userId" = $1`,
      [userId]
    );

    const addedAtByGameId = new Map<number, string>();
    addedAtRows.forEach((row: any) => {
      if (row.addedAt) {
        addedAtByGameId.set(Number(row.gameId), row.addedAt);
      }
    });

    const completedCount = userGames.filter(ug => ug.status === 'COMPLETED').length;
    const playedCount = userGames.filter(ug => ug.status === 'PLAYED').length;
    const playingCount = userGames.filter(ug => ug.status === 'PLAYING').length;
    const abandonedCount = userGames.filter(ug => ug.status === 'ABANDONED').length;
    const wishlistCount = userGames.filter(ug => ug.status === 'WISHLIST').length;

    const totalHours = userGames.reduce(
      (total, ug) => total + (ug.hoursPlayed || 0),
      0
    );

    const gamesWithHours = userGames.filter(ug => ug.hoursPlayed > 0);
    const averageHoursPerGame = gamesWithHours.length > 0
      ? Math.round((totalHours / gamesWithHours.length) * 10) / 10
      : 0;

    // Juegos "empezados" = todo lo que no es solo wishlist. Sirve de base
    // para calcular qué proporción se termina.
    const startedCount = userGames.length - wishlistCount;
    const completionRate = startedCount > 0
      ? Math.round((completedCount / startedCount) * 100)
      : 0;

    const ratedGames = userGames.filter(ug => ug.rating > 0);
    const averageRating = ratedGames.length > 0
      ? Math.round(
          (ratedGames.reduce((total, ug) => total + ug.rating, 0) / ratedGames.length) * 10
        ) / 10
      : 0;

    const ratingsDistribution = [1, 2, 3, 4, 5].map(stars => ({
      stars,
      count: ratedGames.filter(ug => Math.round(ug.rating) === stars).length
    }));

    // Obtener los juegos de la biblioteca del usuario
    const gamesDetails = (
      await Promise.all(userGames.map(ug => this.getGame(ug.gameId)))
    ).filter((game): game is Game => game !== null);

    const toSummary = (ug: UserGame, game: Game): StatsGameSummary => ({
      igdbId: game.igdbId,
      name: game.name,
      slug: game.slug,
      cover: game.cover,
      summary: game.summary,
      genres: game.genres,
      platforms: game.platforms,
      releaseDate: game.releaseDate,
      rating: game.rating,
      myRating: ug.rating,
      hoursPlayed: ug.hoursPlayed
    });

    // ================================
    // GÉNEROS
    // ================================

    const genreCounts: Record<string, number> = {};

    gamesDetails.forEach(game => {
      game.genres.forEach(genre => {
        genreCounts[genre] =
          (genreCounts[genre] || 0) + 1;
      });
    });

    // ================================
    // PLATAFORMAS
    // ================================

    const platformCounts: Record<string, number> = {};

    gamesDetails.forEach(game => {
      game.platforms.forEach(platform => {
        platformCounts[platform] =
          (platformCounts[platform] || 0) + 1;
      });
    });

    // ================================
    // GÉNERO FAVORITO
    // ================================

    let favoriteGenre = 'Ninguno';
    let maxGenreCount = 0;

    Object.entries(genreCounts).forEach(
      ([genre, count]) => {
        if (count > maxGenreCount) {
          maxGenreCount = count;
          favoriteGenre = genre;
        }
      }
    );

    // ================================
    // PLATAFORMA FAVORITA
    // ================================

    let favoritePlatform = 'Ninguna';
    let maxPlatformCount = 0;

    Object.entries(platformCounts).forEach(
      ([platform, count]) => {
        if (count > maxPlatformCount) {
          maxPlatformCount = count;
          favoritePlatform = platform;
        }
      }
    );

    // ================================
    // JUEGOS MEJOR VALORADOS
    // ================================

    const topRatedGamesEntries = userGames
      .filter(ug => ug.rating > 0)
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 5);

    const topRatedGames = (
      await Promise.all(
        topRatedGamesEntries.map(async ug => {
          const game = await this.getGame(ug.gameId);
          return game ? toSummary(ug, game) : null;
        })
      )
    ).filter((g): g is StatsGameSummary => g !== null);

    // ================================
    // JUEGOS MÁS JUGADOS
    // ================================

    const mostPlayedGamesEntries = userGames
      .filter(ug => ug.hoursPlayed > 0)
      .sort((a, b) => b.hoursPlayed - a.hoursPlayed)
      .slice(0, 5);

    const mostPlayedGames = (
      await Promise.all(
        mostPlayedGamesEntries.map(async ug => {
          const game = await this.getGame(ug.gameId);
          return game ? toSummary(ug, game) : null;
        })
      )
    ).filter((g): g is StatsGameSummary => g !== null);

    const mostPlayedGame = mostPlayedGames[0] ?? null;

    // ================================
    // ESTADÍSTICAS MENSUALES
    // ================================

    const months = [
      'Ene',
      'Feb',
      'Mar',
      'Abr',
      'May',
      'Jun',
      'Jul',
      'Ago',
      'Sep',
      'Oct',
      'Nov',
      'Dic'
    ];

    const monthlyHistory: Record<
      string,
      {
        label: string;
        completed: number;
        hours: number;
        added: number;
      }
    > = {};

    const now = new Date();

    // Últimos 13 meses (incluye el actual)
    for (let i = 12; i >= 0; i--) {
      const date = new Date(
        now.getFullYear(),
        now.getMonth() - i,
        1
      );

      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      monthlyHistory[monthKey] = {
        label: `${months[date.getMonth()]} ${date.getFullYear() % 100}`,
        completed: 0,
        hours: 0,
        added: 0
      };
    }

    const monthKeyFromDate = (value: string | null): string | null => {
      if (!value) return null;
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return null;
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    };

    userGames.forEach(ug => {
      const updatedKey = monthKeyFromDate(ug.updatedAt);

      if (updatedKey && monthlyHistory[updatedKey]) {
        monthlyHistory[updatedKey].hours += ug.hoursPlayed || 0;

        if (ug.status === 'COMPLETED') {
          monthlyHistory[updatedKey].completed += 1;
        }
      }

      const addedKey = monthKeyFromDate(addedAtByGameId.get(ug.gameId) ?? null);

      if (addedKey && monthlyHistory[addedKey]) {
        monthlyHistory[addedKey].added += 1;
      }
    });

    const monthlyActivity = Object.entries(monthlyHistory).map(([monthKey, data]) => ({
      monthKey,
      label: data.label,
      completed: data.completed,
      hours: Math.round(data.hours * 10) / 10,
      added: data.added
    }));

    return {
      totalHours: Math.round(totalHours * 10) / 10,
      totalGames: userGames.length,
      completedCount,
      playedCount,
      playingCount,
      abandonedCount,
      wishlistCount,
      averageRating,
      ratedGamesCount: ratedGames.length,
      averageHoursPerGame,
      completionRate,
      favoriteGenre,
      favoritePlatform,
      mostPlayedGame,
      topRatedGames,
      mostPlayedGames,
      ratingsDistribution,
      monthlyActivity,

      platformsDistribution:
        Object.entries(platformCounts)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value),

      genresDistribution:
        Object.entries(genreCounts)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
    };
  }

  // ==================================================
  // ACTIVITIES
  // ==================================================

  async getActivities(userIds?: string[]): Promise<Activity[]> {
    let rows: ActivityRow[];

    if (userIds && userIds.length > 0) {
      const placeholders = userIds.map((_, i) => `$${i + 1}`).join(', ');

      const result = await this.pool.query(
        `
          SELECT id, "userId", type, "gameId", "targetUserId", details, "createdAt"
          FROM activities
          WHERE "userId" IN (${placeholders})
          ORDER BY "createdAt" DESC
        `,
        userIds
      );

      rows = result.rows as ActivityRow[];
    } else {
      const result = await this.pool.query(`
        SELECT id, "userId", type, "gameId", "targetUserId", details, "createdAt"
        FROM activities
        ORDER BY "createdAt" DESC
      `);

      rows = result.rows as ActivityRow[];
    }

    return rows.map(hydrateActivity);
  }

  async addActivity(activity: Activity): Promise<void> {
    await this.pool.query(
      `
        INSERT INTO activities (
          id, "userId", type, "gameId", "targetUserId", details, "createdAt"
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [
        activity.id,
        activity.userId,
        activity.type,
        activity.gameId ?? null,
        activity.targetUserId ?? null,
        activity.details ?? null,
        activity.createdAt
      ]
    );

    await this.pool.query(`
      DELETE FROM activities
      WHERE id NOT IN (
        SELECT id FROM activities ORDER BY "createdAt" DESC LIMIT 200
      )
    `);
  }
}

export const db = new GameDatabase(pool);
