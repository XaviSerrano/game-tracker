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

interface GameRow {
  igdbId: number;
  name: string;
  slug: string | null;
  cover: string | null;
  summary: string | null;
  genres: string | null;
  platforms: string | null;
  releaseDate: string | null;
  rating: number | null;
  popularity: number | null;
}

interface UserGameRow {
  userId: string;
  gameId: number;
  status: GameStatus;
  rating: number | null;
  hoursPlayed: number | null;
  startedAt: string | null;
  completedAt: string | null;
  notes: string | null;
  updatedAt: string;
}

interface ReviewRow {
  id: string;
  userId: string;
  gameId: number;
  title: string | null;
  content: string;
  rating: number | null;
  likes: string | null;
  createdAt: string;
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

interface ListItemRow {
  gameId: number;
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
sqlite.pragma('busy_timeout = 5000');

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
    rating REAL NOT NULL DEFAULT 0,
    popularity REAL NOT NULL DEFAULT 0
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
    rating REAL NOT NULL DEFAULT 0,
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
      ON DELETE SET NULL,

    FOREIGN KEY (targetUserId)
      REFERENCES users(id)
      ON DELETE SET NULL
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

  CREATE INDEX IF NOT EXISTS idx_follows_followerId
    ON follows(followerId);

  CREATE INDEX IF NOT EXISTS idx_follows_followingId
    ON follows(followingId);
`);

function parseJson<T>(value: string | null | undefined, fallback: T): T {
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

function hydrateGame(row: GameRow): Game {
  return {
    igdbId: Number(row.igdbId),
    name: row.name,
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

function hydrateUserGame(row: UserGameRow): UserGame {
  return {
    userId: row.userId,
    gameId: Number(row.gameId),
    status: row.status,
    rating: Number(row.rating ?? 0),
    hoursPlayed: Number(row.hoursPlayed ?? 0),
    startedAt: row.startedAt,
    completedAt: row.completedAt,
    notes: row.notes ?? '',
    updatedAt: row.updatedAt
  };
}

function hydrateReview(row: ReviewRow): Review {
  return {
    id: row.id,
    userId: row.userId,
    gameId: Number(row.gameId),
    title: row.title ?? '',
    content: row.content,
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
        ORDER BY createdAt ASC
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
      .run(passwordHash, passwordSalt, userId);

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
      .run(tokenHash, expiresAt, userId);

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
      .get(token) as { userId: string } | undefined;

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
      .all() as GameRow[];

    return rows.map(hydrateGame);
  }

  getGame(igdbId: number): Game | null {
    const row = this.db
      .prepare(`
        SELECT *
        FROM games
        WHERE igdbId = ?
      `)
      .get(igdbId) as GameRow | undefined;

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
      .all(userId) as UserGameRow[];

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
      .get(userId, gameId) as UserGameRow | undefined;

    return row ? hydrateUserGame(row) : null;
  }

  saveUserGame(userGame: UserGame): UserGame {
    const updatedAt = new Date().toISOString();

    const updatedUserGame: UserGame = {
      ...userGame,
      rating: Number(userGame.rating ?? 0),
      hoursPlayed: Number(userGame.hoursPlayed ?? 0),
      startedAt: userGame.startedAt ?? null,
      completedAt: userGame.completedAt ?? null,
      notes: userGame.notes ?? '',
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
        updatedUserGame.rating,
        updatedUserGame.hoursPlayed,
        updatedUserGame.startedAt,
        updatedUserGame.completedAt,
        updatedUserGame.notes,
        updatedUserGame.updatedAt
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
      .run(userId, gameId);

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
          .all(gameId) as ReviewRow[]
      : this.db
          .prepare(`
            SELECT *
            FROM reviews
            ORDER BY datetime(createdAt) DESC
          `)
          .all() as ReviewRow[];

    return rows.map(hydrateReview);
  }

  getReview(id: string): Review | null {
    const row = this.db
      .prepare(`
        SELECT *
        FROM reviews
        WHERE id = ?
      `)
      .get(id) as ReviewRow | undefined;

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
      .all(userId) as ReviewRow[];

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
      .all(listId) as ListItemRow[];

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

      const insert = this.db
        .prepare(`
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
      .all(userId) as { followerId: string }[];

    return rows.map(row => row.followerId);
  }

  getFollowing(userId: string): string[] {
    const rows = this.db
      .prepare(`
        SELECT followingId
        FROM follows
        WHERE followerId = ?
      `)
      .all(userId) as { followingId: string }[];

    return rows.map(row => row.followingId);
  }

  toggleFollow(
    followerId: string,
    followingId: string
  ): boolean {
    const existing = this.db
      .prepare(`
        SELECT 1
        FROM follows
        WHERE followerId = ?
          AND followingId = ?
      `)
      .get(followerId, followingId);

    if (existing) {
      this.db
        .prepare(`
          DELETE FROM follows
          WHERE followerId = ?
            AND followingId = ?
        `)
        .run(followerId, followingId);

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
      .run(followerId, followingId);

    return true;
  }

  // ==================================================
  // ACTIVITIES
  // ==================================================

  getActivities(userIds?: string[]): Activity[] {
    if (userIds && userIds.length > 0) {
      const placeholders = userIds
        .map(() => '?')
        .join(', ');

      const rows = this.db
        .prepare(`
          SELECT *
          FROM activities
          WHERE userId IN (${placeholders})
          ORDER BY datetime(createdAt) DESC
        `)
        .all(...userIds) as ActivityRow[];

      return rows.map(hydrateActivity);
    }

    const rows = this.db
      .prepare(`
        SELECT *
        FROM activities
        ORDER BY datetime(createdAt) DESC
      `)
      .all() as ActivityRow[];

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

  // ==================================================
  // USER STATISTICS
  // ==================================================

  getUserStats(userId: string): UserStats {
    const userGames = this.getUserGames(userId);

    const completedGames = userGames.filter(
      userGame => userGame.status === 'COMPLETED'
    );

    const totalHours = userGames.reduce(
      (total, userGame) =>
        total + Number(userGame.hoursPlayed || 0),
      0
    );

    const gameIdsPlayed = userGames.map(
      userGame => userGame.gameId
    );

    const gamesDetails = gameIdsPlayed
      .map(gameId => this.getGame(gameId))
      .filter((game): game is Game => Boolean(game));

    const genreCounts: Record<string, number> = {};
    const platformCounts: Record<string, number> = {};

    gamesDetails.forEach(game => {
      game.genres.forEach(genre => {
        genreCounts[genre] =
          (genreCounts[genre] || 0) + 1;
      });

      game.platforms.forEach(platform => {
        platformCounts[platform] =
          (platformCounts[platform] || 0) + 1;
      });
    });

    const favoriteGenre =
      Object.entries(genreCounts)
        .sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'None';

    const favoritePlatform =
      Object.entries(platformCounts)
        .sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'None';

    const topRatedGames = userGames
      .filter(userGame => Number(userGame.rating) > 0)
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 5)
      .map(userGame => {
        const game = this.getGame(userGame.gameId);

        return {
          gameId: userGame.gameId,
          name: game?.name ?? `Game ${userGame.gameId}`,
          cover: game?.cover ?? '',
          myRating: userGame.rating,
          hoursPlayed: userGame.hoursPlayed
        };
      });

    const monthlyHistory: Record<
      string,
      {
        completed: number;
        hours: number;
      }
    > = {};

    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec'
    ];

    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const date = new Date(
        now.getFullYear(),
        now.getMonth() - i,
        1
      );

      const key =
        `${months[date.getMonth()]} ` +
        `${date.getFullYear() % 100}`;

      monthlyHistory[key] = {
        completed: 0,
        hours: 0
      };
    }

    userGames.forEach(userGame => {
      const date = new Date(userGame.updatedAt);

      if (Number.isNaN(date.getTime())) {
        return;
      }

      const key =
        `${months[date.getMonth()]} ` +
        `${date.getFullYear() % 100}`;

      if (!monthlyHistory[key]) {
        return;
      }

      monthlyHistory[key].hours +=
        Number(userGame.hoursPlayed || 0);

      if (userGame.status === 'COMPLETED') {
        monthlyHistory[key].completed += 1;
      }
    });

    const monthlyStats = Object.entries(
      monthlyHistory
    ).map(([month, data]) => ({
      month,
      completed: data.completed,
      hours: data.hours
    }));

    return {
      totalHours,
      completedCount: completedGames.length,
      favoriteGenre,
      favoritePlatform,
      topRatedGames,
      monthlyStats,
      platformsDistribution: Object.entries(
        platformCounts
      ).map(([name, value]) => ({
        name,
        value
      })),
      genresDistribution: Object.entries(
        genreCounts
      ).map(([name, value]) => ({
        name,
        value
      }))
    };
  }

  // ==================================================
  // RECOMMENDATIONS
  // ==================================================

  getRecommendations(
    userId: string
  ): Recommendation[] {
    const userGames = this.getUserGames(userId);

    const userGameIdSet = new Set(
      userGames.map(userGame => userGame.gameId)
    );

    const eligibleGames = this
      .getGames()
      .filter(game =>
        !userGameIdSet.has(game.igdbId)
      );

    if (eligibleGames.length === 0) {
      return [];
    }

    const mainUserRatings = userGames.filter(
      userGame => Number(userGame.rating) > 0
    );

    const userSimilarities: Record<
      string,
      number
    > = {};

    const allUsers = this.getUsers();

    for (const otherUser of allUsers) {
      if (otherUser.id === userId) {
        continue;
      }

      const otherUserGames =
        this.getUserGames(otherUser.id);

      const otherUserRatings =
        otherUserGames.filter(
          userGame => Number(userGame.rating) > 0
        );

      const commonGames =
        mainUserRatings.filter(
          userGame =>
            otherUserRatings.some(
              otherGame =>
                otherGame.gameId === userGame.gameId
            )
        );

      if (commonGames.length === 0) {
        userSimilarities[otherUser.id] = 0;
        continue;
      }

      let dotProduct = 0;
      let mainSumSq = 0;
      let otherSumSq = 0;

      commonGames.forEach(userGame => {
        const otherUserGame =
          otherUserRatings.find(
            otherGame =>
              otherGame.gameId === userGame.gameId
          );

        if (!otherUserGame) {
          return;
        }

        dotProduct +=
          userGame.rating *
          otherUserGame.rating;

        mainSumSq +=
          userGame.rating *
          userGame.rating;

        otherSumSq +=
          otherUserGame.rating *
          otherUserGame.rating;
      });

      const denominator =
        Math.sqrt(mainSumSq) *
        Math.sqrt(otherSumSq);

      const similarity =
        denominator > 0
          ? dotProduct / denominator
          : 0;

      userSimilarities[otherUser.id] =
        Number.isNaN(similarity)
          ? 0
          : similarity;
    }

    const favoriteGenres = new Set<string>();
    const favoritePlatforms = new Set<string>();

    const playedGamesDetails =
      this.getGames().filter(game =>
        userGameIdSet.has(game.igdbId)
      );

    playedGamesDetails.forEach(game => {
      game.genres.forEach(genre => {
        favoriteGenres.add(genre);
      });

      game.platforms.forEach(platform => {
        favoritePlatforms.add(platform);
      });
    });

    const following =
      this.getFollowing(userId);

    const recommendations =
      eligibleGames.map(game => {
        let weightedRatingsSum = 0;
        let similaritySum = 0;

        for (const otherUser of allUsers) {
          if (otherUser.id === userId) {
            continue;
          }

          const otherUserGame =
            this.getUserGame(
              otherUser.id,
              game.igdbId
            );

          const similarity =
            userSimilarities[otherUser.id] || 0;

          if (
            otherUserGame &&
            otherUserGame.rating > 0 &&
            similarity > 0
          ) {
            weightedRatingsSum +=
              otherUserGame.rating *
              similarity;

            similaritySum += similarity;
          }
        }

        const userSimilarityScore =
          similaritySum > 0
            ? (
                weightedRatingsSum /
                similaritySum
              ) * 20
            : 0;

        let socialLikes = 0;
        let totalFollowedWithGame = 0;

        following.forEach(followedUserId => {
          const followedUserGame =
            this.getUserGame(
              followedUserId,
              game.igdbId
            );

          if (!followedUserGame) {
            return;
          }

          totalFollowedWithGame++;

          if (
            followedUserGame.status === 'COMPLETED' ||
            followedUserGame.rating >= 4
          ) {
            socialLikes++;
          }
        });

        const socialScore =
          totalFollowedWithGame > 0
            ? (
                socialLikes /
                totalFollowedWithGame
              ) * 100
            : 0;

        const genreOverlap =
          game.genres.filter(genre =>
            favoriteGenres.has(genre)
          ).length;

        const genreRatio =
          game.genres.length > 0
            ? genreOverlap /
              game.genres.length
            : 0;

        const platformOverlap =
          game.platforms.filter(platform =>
            favoritePlatforms.has(platform)
          ).length;

        const platformRatio =
          game.platforms.length > 0
            ? platformOverlap /
              game.platforms.length
            : 0;

        const contentScore =
          (
            genreRatio * 0.7 +
            platformRatio * 0.3
          ) * 100;

        const defaultScore =
          game.rating && game.rating > 0
            ? game.rating
            : 50;

        let finalScore = 0;

        if (
          mainUserRatings.length === 0 &&
          following.length === 0
        ) {
          finalScore = defaultScore;
        } else {
          const safeUserSimilarity =
            similaritySum > 0
              ? userSimilarityScore
              : defaultScore;

          const safeSocial =
            totalFollowedWithGame > 0
              ? socialScore
              : defaultScore;

          const safeContent =
            playedGamesDetails.length > 0
              ? contentScore
              : defaultScore;

          finalScore =
            safeUserSimilarity * 0.40 +
            safeSocial * 0.35 +
            safeContent * 0.25;
        }

        return {
          game,
          score: Math.round(finalScore)
        };
      });

    return recommendations.sort(
      (a, b) => b.score - a.score
    );
  }
}

export const db = new GameDatabase(sqlite);