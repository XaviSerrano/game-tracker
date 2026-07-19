import Database from 'better-sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

interface AuthSession {
  token: string;
  userId: string;
  expiresAt: string;
  createdAt: string;
}

interface UserStats {
  totalHours: number;
  completedCount: number;
  favoriteGenre: string;
  favoritePlatform: string;
  topRatedGames: {
    gameId: number;
    name: string;
    cover: string;
    myRating: number;
    hoursPlayed: number;
  }[];
  monthlyStats: {
    month: string;
    completed: number;
    hours: number;
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

interface Recommendation {
  game: Game;
  score: number;
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(
  __dirname,
  '../../data/gametracker.db'
);

console.log(`📦 SQLite: ${dbPath}`);

const sqlite = new Database(dbPath);

sqlite.pragma('foreign_keys = ON');
sqlite.pragma('journal_mode = WAL');

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    avatar TEXT NOT NULL DEFAULT '',
    bio TEXT NOT NULL DEFAULT '',
    createdAt TEXT NOT NULL,
    passwordHash TEXT,
    passwordSalt TEXT,
    passwordResetTokenHash TEXT,
    passwordResetExpiresAt TEXT
  );

  CREATE TABLE IF NOT EXISTS games (
    igdbId INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL DEFAULT '',
    cover TEXT NOT NULL DEFAULT '',
    summary TEXT NOT NULL DEFAULT '',
    genres TEXT NOT NULL DEFAULT '[]',
    platforms TEXT NOT NULL DEFAULT '[]',
    releaseDate TEXT NOT NULL DEFAULT '',
    rating REAL DEFAULT 0,
    popularity REAL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS userGames (
    userId TEXT NOT NULL,
    gameId INTEGER NOT NULL,
    status TEXT NOT NULL,
    rating REAL NOT NULL DEFAULT 0,
    hoursPlayed REAL NOT NULL DEFAULT 0,
    startedAt TEXT,
    completedAt TEXT,
    notes TEXT NOT NULL DEFAULT '',
    updatedAt TEXT NOT NULL,

    PRIMARY KEY (userId, gameId),

    FOREIGN KEY (userId)
      REFERENCES users(id)
      ON DELETE CASCADE,

    FOREIGN KEY (gameId)
      REFERENCES games(igdbId)
      ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    gameId INTEGER NOT NULL,
    title TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL,
    rating REAL DEFAULT 0,
    likes TEXT NOT NULL DEFAULT '[]',
    createdAt TEXT NOT NULL,

    FOREIGN KEY (userId)
      REFERENCES users(id)
      ON DELETE CASCADE,

    FOREIGN KEY (gameId)
      REFERENCES games(igdbId)
      ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS customLists (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    createdAt TEXT NOT NULL,

    FOREIGN KEY (userId)
      REFERENCES users(id)
      ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS customListItems (
    listId TEXT NOT NULL,
    gameId INTEGER NOT NULL,

    PRIMARY KEY (listId, gameId),

    FOREIGN KEY (listId)
      REFERENCES customLists(id)
      ON DELETE CASCADE,

    FOREIGN KEY (gameId)
      REFERENCES games(igdbId)
      ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS follows (
    followerId TEXT NOT NULL,
    followingId TEXT NOT NULL,

    PRIMARY KEY (followerId, followingId),

    FOREIGN KEY (followerId)
      REFERENCES users(id)
      ON DELETE CASCADE,

    FOREIGN KEY (followingId)
      REFERENCES users(id)
      ON DELETE CASCADE,

    CHECK (followerId != followingId)
  );

  CREATE TABLE IF NOT EXISTS activities (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    type TEXT NOT NULL,
    gameId INTEGER,
    targetUserId TEXT,
    details TEXT,
    createdAt TEXT NOT NULL,

    FOREIGN KEY (userId)
      REFERENCES users(id)
      ON DELETE CASCADE,

    FOREIGN KEY (gameId)
      REFERENCES games(igdbId)
      ON DELETE CASCADE,

    FOREIGN KEY (targetUserId)
      REFERENCES users(id)
      ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    expiresAt TEXT NOT NULL,
    createdAt TEXT NOT NULL,

    FOREIGN KEY (userId)
      REFERENCES users(id)
      ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_userGames_userId
    ON userGames(userId);

  CREATE INDEX IF NOT EXISTS idx_userGames_gameId
    ON userGames(gameId);

  CREATE INDEX IF NOT EXISTS idx_reviews_gameId
    ON reviews(gameId);

  CREATE INDEX IF NOT EXISTS idx_reviews_userId
    ON reviews(userId);

  CREATE INDEX IF NOT EXISTS idx_activities_createdAt
    ON activities(createdAt);

  CREATE INDEX IF NOT EXISTS idx_sessions_expiresAt
    ON sessions(expiresAt);
`);

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
    popularity: Number(row.popularity ?? 0)
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
  private db: Database.Database;

  constructor(database: Database.Database) {
    this.db = database;
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

  getUsers(): User[] {
    return this.db
      .prepare(`
        SELECT
          id,
          username,
          email,
          avatar,
          bio,
          createdAt
        FROM users
        ORDER BY datetime(createdAt) ASC
      `)
      .all() as User[];
  }

  getUser(userId: string): User | null {
    const user = this.db
      .prepare(`
        SELECT
          id,
          username,
          email,
          avatar,
          bio,
          createdAt
        FROM users
        WHERE id = ?
      `)
      .get(userId) as User | undefined;

    return user ?? null;
  }

  getUserByEmail(email: string): User | null {
    const user = this.db
      .prepare(`
        SELECT
          id,
          username,
          email,
          avatar,
          bio,
          createdAt
        FROM users
        WHERE LOWER(email) = LOWER(?)
      `)
      .get(email) as User | undefined;

    return user ?? null;
  }

  getUserByUsername(username: string): User | null {
    const user = this.db
      .prepare(`
        SELECT
          id,
          username,
          email,
          avatar,
          bio,
          createdAt
        FROM users
        WHERE LOWER(username) = LOWER(?)
      `)
      .get(username) as User | undefined;

    return user ?? null;
  }

  getAuthUserByEmail(email: string): StoredUser | null {
    const user = this.db
      .prepare(`
        SELECT *
        FROM users
        WHERE LOWER(email) = LOWER(?)
      `)
      .get(email) as StoredUser | undefined;

    return user ?? null;
  }

  getAuthUserById(userId: string): StoredUser | null {
    const user = this.db
      .prepare(`
        SELECT *
        FROM users
        WHERE id = ?
      `)
      .get(userId) as StoredUser | undefined;

    return user ?? null;
  }

  createUser(
    user: User,
    auth?: {
      passwordHash: string;
      passwordSalt: string;
    }
  ): User {
    const existing = this.getAuthUserById(user.id);

    if (existing) {
      return this.toPublicUser(existing);
    }

    this.db
      .prepare(`
        INSERT INTO users (
          id,
          username,
          email,
          avatar,
          bio,
          createdAt,
          passwordHash,
          passwordSalt,
          passwordResetTokenHash,
          passwordResetExpiresAt
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL)
      `)
      .run(
        user.id,
        user.username,
        user.email,
        user.avatar ?? '',
        user.bio ?? '',
        user.createdAt,
        auth?.passwordHash ?? null,
        auth?.passwordSalt ?? null
      );

    return user;
  }

  updateUser(
    userId: string,
    updates: Partial<User>
  ): User | null {
    const existing = this.getAuthUserById(userId);

    if (!existing) {
      return null;
    }

    const fields: string[] = [];
    const values: unknown[] = [];

    if (updates.username !== undefined) {
      fields.push('username = ?');
      values.push(updates.username);
    }

    if (updates.email !== undefined) {
      fields.push('email = ?');
      values.push(updates.email);
    }

    if (updates.avatar !== undefined) {
      fields.push('avatar = ?');
      values.push(updates.avatar);
    }

    if (updates.bio !== undefined) {
      fields.push('bio = ?');
      values.push(updates.bio);
    }

    if (fields.length === 0) {
      return this.toPublicUser(existing);
    }

    values.push(userId);

    this.db
      .prepare(`
        UPDATE users
        SET ${fields.join(', ')}
        WHERE id = ?
      `)
      .run(...values);

    return this.getUser(userId);
  }

  setUserPassword(
    userId: string,
    passwordHash: string,
    passwordSalt: string
  ): User | null {
    const result = this.db
      .prepare(`
        UPDATE users
        SET
          passwordHash = ?,
          passwordSalt = ?,
          passwordResetTokenHash = NULL,
          passwordResetExpiresAt = NULL
        WHERE id = ?
      `)
      .run(
        passwordHash,
        passwordSalt,
        userId
      );

    if (result.changes === 0) {
      return null;
    }

    return this.getUser(userId);
  }

  savePasswordResetToken(
    userId: string,
    tokenHash: string,
    expiresAt: string
  ): User | null {
    const result = this.db
      .prepare(`
        UPDATE users
        SET
          passwordResetTokenHash = ?,
          passwordResetExpiresAt = ?
        WHERE id = ?
      `)
      .run(
        tokenHash,
        expiresAt,
        userId
      );

    if (result.changes === 0) {
      return null;
    }

    return this.getUser(userId);
  }

  clearPasswordResetToken(userId: string): void {
    this.db
      .prepare(`
        UPDATE users
        SET
          passwordResetTokenHash = NULL,
          passwordResetExpiresAt = NULL
        WHERE id = ?
      `)
      .run(userId);
  }

  getAuthUserByPasswordResetTokenHash(
    tokenHash: string
  ): StoredUser | null {
    const user = this.db
      .prepare(`
        SELECT *
        FROM users
        WHERE passwordResetTokenHash = ?
          AND passwordResetExpiresAt IS NOT NULL
          AND datetime(passwordResetExpiresAt) > datetime('now')
      `)
      .get(tokenHash) as StoredUser | undefined;

    return user ?? null;
  }

  // ==================================================
  // SESSIONS
  // ==================================================

  private purgeExpiredSessions(): void {
    this.db
      .prepare(`
        DELETE FROM sessions
        WHERE datetime(expiresAt) <= datetime('now')
      `)
      .run();
  }

  getUserBySessionToken(token: string): User | null {
    this.purgeExpiredSessions();

    const session = this.db
      .prepare(`
        SELECT userId
        FROM sessions
        WHERE token = ?
      `)
      .get(token) as {
        userId: string;
      } | undefined;

    if (!session) {
      return null;
    }

    return this.getUser(session.userId);
  }

  createSession(
    userId: string,
    token: string,
    expiresAt: string
  ): string {
    this.purgeExpiredSessions();

    this.db
      .prepare(`
        INSERT OR REPLACE INTO sessions (
          token,
          userId,
          expiresAt,
          createdAt
        )
        VALUES (?, ?, ?, ?)
      `)
      .run(
        token,
        userId,
        expiresAt,
        new Date().toISOString()
      );

    return token;
  }

  revokeSession(token: string): boolean {
    const result = this.db
      .prepare(`
        DELETE FROM sessions
        WHERE token = ?
      `)
      .run(token);

    return result.changes > 0;
  }

  revokeSessionsForUser(userId: string): void {
    this.db
      .prepare(`
        DELETE FROM sessions
        WHERE userId = ?
      `)
      .run(userId);
  }

  // ==================================================
  // GAMES
  // ==================================================

  getGames(): Game[] {
    const rows = this.db
      .prepare(`
        SELECT *
        FROM games
        ORDER BY name ASC
      `)
      .all();

    return rows.map(hydrateGame);
  }

  getGame(igdbId: number): Game | null {
    const row = this.db
      .prepare(`
        SELECT *
        FROM games
        WHERE igdbId = ?
      `)
      .get(igdbId);

    return row ? hydrateGame(row) : null;
  }

  createGame(game: Game): Game {
    const existing = this.getGame(game.igdbId);

    if (existing) {
      return existing;
    }

    return this.saveGame(game);
  }

  saveGame(game: Game): Game {
    this.db
      .prepare(`
        INSERT INTO games (
          igdbId,
          name,
          slug,
          cover,
          summary,
          genres,
          platforms,
          releaseDate,
          rating,
          popularity
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(igdbId)
        DO UPDATE SET
          name = excluded.name,
          slug = excluded.slug,
          cover = excluded.cover,
          summary = excluded.summary,
          genres = excluded.genres,
          platforms = excluded.platforms,
          releaseDate = excluded.releaseDate,
          rating = excluded.rating,
          popularity = excluded.popularity
      `)
      .run(
        game.igdbId,
        game.name,
        game.slug ?? '',
        game.cover ?? '',
        game.summary ?? '',
        serializeJson(game.genres),
        serializeJson(game.platforms),
        game.releaseDate ?? '',
        game.rating ?? 0,
        game.popularity ?? 0
      );

    return game;
  }

  // ==================================================
  // USER GAMES
  // ==================================================

  getUserGames(userId: string): UserGame[] {
    const rows = this.db
      .prepare(`
        SELECT *
        FROM userGames
        WHERE userId = ?
        ORDER BY datetime(updatedAt) DESC
      `)
      .all(userId);

    return rows.map(hydrateUserGame);
  }

  getUserGame(
    userId: string,
    gameId: number
  ): UserGame | null {
    const row = this.db
      .prepare(`
        SELECT *
        FROM userGames
        WHERE userId = ?
          AND gameId = ?
      `)
      .get(
        userId,
        gameId
      );

    return row ? hydrateUserGame(row) : null;
  }

  saveUserGame(userGame: UserGame): UserGame {
    const updatedAt = new Date().toISOString();

    const updatedUserGame: UserGame = {
      ...userGame,
      updatedAt
    };

    this.db
      .prepare(`
        INSERT INTO userGames (
          userId,
          gameId,
          status,
          rating,
          hoursPlayed,
          startedAt,
          completedAt,
          notes,
          updatedAt
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(userId, gameId)
        DO UPDATE SET
          status = excluded.status,
          rating = excluded.rating,
          hoursPlayed = excluded.hoursPlayed,
          startedAt = excluded.startedAt,
          completedAt = excluded.completedAt,
          notes = excluded.notes,
          updatedAt = excluded.updatedAt
      `)
      .run(
        updatedUserGame.userId,
        updatedUserGame.gameId,
        updatedUserGame.status,
        updatedUserGame.rating ?? 0,
        updatedUserGame.hoursPlayed ?? 0,
        updatedUserGame.startedAt ?? null,
        updatedUserGame.completedAt ?? null,
        updatedUserGame.notes ?? '',
        updatedAt
      );

    return updatedUserGame;
  }

  deleteUserGame(
    userId: string,
    gameId: number
  ): boolean {
    const result = this.db
      .prepare(`
        DELETE FROM userGames
        WHERE userId = ?
          AND gameId = ?
      `)
      .run(
        userId,
        gameId
      );

    return result.changes > 0;
  }

  // ==================================================
  // REVIEWS
  // ==================================================

  getReviews(gameId?: number): Review[] {
    const rows = gameId !== undefined
      ? this.db
          .prepare(`
            SELECT *
            FROM reviews
            WHERE gameId = ?
            ORDER BY datetime(createdAt) DESC
          `)
          .all(gameId)
      : this.db
          .prepare(`
            SELECT *
            FROM reviews
            ORDER BY datetime(createdAt) DESC
          `)
          .all();

    return rows.map(hydrateReview);
  }

  getReview(id: string): Review | null {
    const row = this.db
      .prepare(`
        SELECT *
        FROM reviews
        WHERE id = ?
      `)
      .get(id);

    return row ? hydrateReview(row) : null;
  }

  getUserReviews(userId: string): Review[] {
    const rows = this.db
      .prepare(`
        SELECT *
        FROM reviews
        WHERE userId = ?
        ORDER BY datetime(createdAt) DESC
      `)
      .all(userId);

    return rows.map(hydrateReview);
  }

  saveReview(review: Review): Review {
    this.db
      .prepare(`
        INSERT INTO reviews (
          id,
          userId,
          gameId,
          title,
          content,
          rating,
          likes,
          createdAt
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id)
        DO UPDATE SET
          title = excluded.title,
          content = excluded.content,
          rating = excluded.rating,
          likes = excluded.likes
      `)
      .run(
        review.id,
        review.userId,
        review.gameId,
        review.title ?? '',
        review.content,
        review.rating ?? 0,
        serializeJson(review.likes),
        review.createdAt
      );

    return review;
  }

  toggleLikeReview(
    reviewId: string,
    userId: string
  ): Review | null {
    const review = this.getReview(reviewId);

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

    this.saveReview(updatedReview);

    return updatedReview;
  }

  // ==================================================
  // CUSTOM LISTS
  // ==================================================

  getLists(userId?: string): CustomList[] {
    if (userId) {
      return this.db
        .prepare(`
          SELECT *
          FROM customLists
          WHERE userId = ?
          ORDER BY datetime(createdAt) DESC
        `)
        .all(userId) as CustomList[];
    }

    return this.db
      .prepare(`
        SELECT *
        FROM customLists
        ORDER BY datetime(createdAt) DESC
      `)
      .all() as CustomList[];
  }

  getList(id: string): CustomList | null {
    const list = this.db
      .prepare(`
        SELECT *
        FROM customLists
        WHERE id = ?
      `)
      .get(id) as CustomList | undefined;

    return list ?? null;
  }

  createList(list: CustomList): CustomList {
    this.db
      .prepare(`
        INSERT INTO customLists (
          id,
          userId,
          name,
          description,
          createdAt
        )
        VALUES (?, ?, ?, ?, ?)
      `)
      .run(
        list.id,
        list.userId,
        list.name,
        list.description ?? '',
        list.createdAt
      );

    return list;
  }

  deleteList(id: string): boolean {
    const result = this.db
      .prepare(`
        DELETE FROM customLists
        WHERE id = ?
      `)
      .run(id);

    return result.changes > 0;
  }

  getListItems(listId: string): number[] {
    const rows = this.db
      .prepare(`
        SELECT gameId
        FROM customListItems
        WHERE listId = ?
        ORDER BY rowid ASC
      `)
      .all(listId) as {
        gameId: number;
      }[];

    return rows.map(row => Number(row.gameId));
  }

  saveListItems(
    listId: string,
    gameIds: number[]
  ): void {
    const transaction = this.db.transaction(() => {
      this.db
        .prepare(`
          DELETE FROM customListItems
          WHERE listId = ?
        `)
        .run(listId);

      const insert = this.db.prepare(`
        INSERT INTO customListItems (
          listId,
          gameId
        )
        VALUES (?, ?)
      `);

      for (const gameId of gameIds) {
        insert.run(listId, gameId);
      }
    });

    transaction();
  }

  // ==================================================
  // FOLLOWS
  // ==================================================

  getFollowers(userId: string): string[] {
    const rows = this.db
      .prepare(`
        SELECT followerId
        FROM follows
        WHERE followingId = ?
      `)
      .all(userId) as {
        followerId: string;
      }[];

    return rows.map(row => row.followerId);
  }

  getFollowing(userId: string): string[] {
    const rows = this.db
      .prepare(`
        SELECT followingId
        FROM follows
        WHERE followerId = ?
      `)
      .all(userId) as {
        followingId: string;
      }[];

    return rows.map(row => row.followingId);
  }

  toggleFollow(
    followerId: string,
    followingId: string
  ): boolean {
    if (followerId === followingId) {
      return false;
    }

    const existing = this.db
      .prepare(`
        SELECT 1
        FROM follows
        WHERE followerId = ?
          AND followingId = ?
      `)
      .get(
        followerId,
        followingId
      );

    if (existing) {
      this.db
        .prepare(`
          DELETE FROM follows
          WHERE followerId = ?
            AND followingId = ?
        `)
        .run(
          followerId,
          followingId
        );

      return false;
    }

    this.db
      .prepare(`
        INSERT INTO follows (
          followerId,
          followingId
        )
        VALUES (?, ?)
      `)
      .run(
        followerId,
        followingId
      );

    return true;
  }

  // ==================================================
  // ACTIVITIES
  // ==================================================

  getActivities(userIds?: string[]): Activity[] {
    let rows: ActivityRow[];

    if (userIds && userIds.length > 0) {
      const placeholders = userIds
        .map(() => '?')
        .join(', ');

      rows = this.db
        .prepare(`
          SELECT
            id,
            userId,
            type,
            gameId,
            targetUserId,
            details,
            createdAt
          FROM activities
          WHERE userId IN (${placeholders})
          ORDER BY datetime(createdAt) DESC
        `)
        .all(...userIds) as ActivityRow[];
    } else {
      rows = this.db
        .prepare(`
          SELECT
            id,
            userId,
            type,
            gameId,
            targetUserId,
            details,
            createdAt
          FROM activities
          ORDER BY datetime(createdAt) DESC
        `)
        .all() as ActivityRow[];
    }

    return rows.map(hydrateActivity);
  }

  addActivity(activity: Activity): void {
    this.db
      .prepare(`
        INSERT INTO activities (
          id,
          userId,
          type,
          gameId,
          targetUserId,
          details,
          createdAt
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        activity.id,
        activity.userId,
        activity.type,
        activity.gameId ?? null,
        activity.targetUserId ?? null,
        activity.details ?? null,
        activity.createdAt
      );

    this.db
      .prepare(`
        DELETE FROM activities
        WHERE id NOT IN (
          SELECT id
          FROM activities
          ORDER BY datetime(createdAt) DESC
          LIMIT 200
        )
      `)
      .run();
  }
}

export const db = new GameDatabase(sqlite)
