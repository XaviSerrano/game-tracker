import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { User, Game, UserGame, Review, CustomList, CustomListItem, Follow, Activity, GameStatus } from '../src/types.ts';

interface StoredUser extends User {
  passwordHash?: string;
  passwordSalt?: string;
  passwordResetTokenHash?: string | null;
  passwordResetExpiresAt?: string | null;
}

interface AuthSession {
  token: string;
  userId: string;
  expiresAt: string;
  createdAt: string;
}

interface DbSchema {
  users: StoredUser[];
  games: Game[];
  userGames: UserGame[];
  reviews: Review[];
  customLists: CustomList[];
  customListItems: CustomListItem[];
  follows: Follow[];
  activities: Activity[];
  sessions: AuthSession[];
}

const DB_FILE = path.join(process.cwd(), 'appdata.json');

function hashPassword(password: string, salt = crypto.randomBytes(16).toString('hex')) {
  const passwordHash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { passwordHash, passwordSalt: salt };
}


class GameDatabase {
  private data: DbSchema;

  constructor() {
    this.data = {
      users: [],
      games: [],
      userGames: [],
      reviews: [],
      customLists: [],
      customListItems: [],
      follows: [],
      activities: [],
      sessions: []
    };
    this.load();
  }

  private load() {
    if (fs.existsSync(DB_FILE)) {
      try {
        const content = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(content);
        // Ensure standard keys exist
        this.data.users = (this.data.users || []).map(user => this.hydrateStoredUser(user));
        // Games are hydrated from IGDB at runtime; avoid seeding from persisted JSON.
        this.data.games = [];
        this.data.userGames = this.data.userGames || [];
        this.data.reviews = this.data.reviews || [];
        this.data.customLists = this.data.customLists || [];
        this.data.customListItems = this.data.customListItems || [];
        this.data.follows = this.data.follows || [];
        this.data.activities = this.data.activities || [];
        this.data.sessions = this.purgeExpiredSessions(this.data.sessions || []);
      } catch (error) {
        console.error("Failed to parse database file, rebuilding with seed data:", error);
        this.seed();
      }
    } else {
      this.seed();
    }
  }

  private save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (error) {
      console.error("Failed to write to database file:", error);
    }
  }

  private seed() {
    this.data = {
      users: [],
      games: [],
      userGames: [],
      reviews: [],
      customLists: [],
      customListItems: [],
      follows: [],
      activities: [],
      sessions: []
    };
    this.save();
    console.log("Database successfully seeded with mock data!");
  }


  private hydrateStoredUser(user: Partial<StoredUser> & User): StoredUser {
    const normalized: StoredUser = {
      ...user,
      passwordResetTokenHash: user.passwordResetTokenHash ?? null,
      passwordResetExpiresAt: user.passwordResetExpiresAt ?? null
    };

    if ((!normalized.passwordHash || !normalized.passwordSalt)) {
      return {
        ...normalized,
      };
    }

    return normalized;
  }

  private toPublicUser(user: StoredUser): User {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      bio: user.bio,
      createdAt: user.createdAt
    };
  }

  private purgeExpiredSessions(sessions: AuthSession[]): AuthSession[] {
    const now = Date.now();
    return sessions.filter((session) => new Date(session.expiresAt).getTime() > now);
  }

  // --- QUERY APIS ---

  // User methods
  getUsers(): User[] {
    return this.data.users.map((user) => this.toPublicUser(user));
  }

  getUser(userId: string): User | null {
    const user = this.data.users.find(u => u.id === userId);
    return user ? this.toPublicUser(user) : null;
  }

  getUserByEmail(email: string): User | null {
    const user = this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    return user ? this.toPublicUser(user) : null;
  }

  getUserByUsername(username: string): User | null {
    const user = this.data.users.find(u => u.username.toLowerCase() === username.toLowerCase());
    return user ? this.toPublicUser(user) : null;
  }

  getAuthUserByEmail(email: string): StoredUser | null {
    return this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
  }

  getAuthUserById(userId: string): StoredUser | null {
    return this.data.users.find(u => u.id === userId) || null;
  }

  getUserBySessionToken(token: string): User | null {
    this.data.sessions = this.purgeExpiredSessions(this.data.sessions);
    const session = this.data.sessions.find((entry) => entry.token === token);
    if (!session) {
      this.save();
      return null;
    }

    const user = this.getAuthUserById(session.userId);
    return user ? this.toPublicUser(user) : null;
  }

  createSession(userId: string, token: string, expiresAt: string): string {
    this.data.sessions = this.purgeExpiredSessions(this.data.sessions).filter((session) => session.token !== token);
    this.data.sessions.push({
      token,
      userId,
      expiresAt,
      createdAt: new Date().toISOString()
    });
    this.save();
    return token;
  }

  revokeSession(token: string): boolean {
    const initialLength = this.data.sessions.length;
    this.data.sessions = this.data.sessions.filter((session) => session.token !== token);
    if (this.data.sessions.length !== initialLength) {
      this.save();
      return true;
    }
    return false;
  }

  revokeSessionsForUser(userId: string): void {
    this.data.sessions = this.data.sessions.filter((session) => session.userId !== userId);
    this.save();
  }

  createUser(user: User, auth?: { passwordHash: string; passwordSalt: string }): User {
    if (this.getAuthUserById(user.id)) return this.getUser(user.id)!;

    this.data.users.push({
      ...user,
      passwordHash: auth?.passwordHash,
      passwordSalt: auth?.passwordSalt,
      passwordResetTokenHash: null,
      passwordResetExpiresAt: null
    });
    this.save();
    return user;
  }

  updateUser(userId: string, updates: Partial<User>): User | null {
    const idx = this.data.users.findIndex(u => u.id === userId);
    if (idx === -1) return null;
    this.data.users[idx] = { ...this.data.users[idx], ...updates };
    this.save();
    return this.toPublicUser(this.data.users[idx]);
  }

  setUserPassword(userId: string, passwordHash: string, passwordSalt: string): User | null {
    const user = this.getAuthUserById(userId);
    if (!user) return null;

    user.passwordHash = passwordHash;
    user.passwordSalt = passwordSalt;
    user.passwordResetTokenHash = null;
    user.passwordResetExpiresAt = null;
    this.save();
    return this.toPublicUser(user);
  }

  savePasswordResetToken(userId: string, tokenHash: string, expiresAt: string): User | null {
    const user = this.getAuthUserById(userId);
    if (!user) return null;

    user.passwordResetTokenHash = tokenHash;
    user.passwordResetExpiresAt = expiresAt;
    this.save();
    return this.toPublicUser(user);
  }

  clearPasswordResetToken(userId: string): void {
    const user = this.getAuthUserById(userId);
    if (!user) return;

    user.passwordResetTokenHash = null;
    user.passwordResetExpiresAt = null;
    this.save();
  }

  getAuthUserByPasswordResetTokenHash(tokenHash: string): StoredUser | null {
    const now = Date.now();
    return this.data.users.find((user) => (
      user.passwordResetTokenHash === tokenHash
      && !!user.passwordResetExpiresAt
      && new Date(user.passwordResetExpiresAt).getTime() > now
    )) || null;
  }

  // Game methods
  getGames(): Game[] {
    return this.data.games;
  }

  getGame(igdbId: number): Game | null {
    return this.data.games.find(g => g.igdbId === igdbId) || null;
  }

  createGame(game: Game): Game {
    const existing = this.getGame(game.igdbId);
    if (existing) return existing;
    this.data.games.push(game);
    this.save();
    return game;
  }

  // UserGame methods
  getUserGames(userId: string): UserGame[] {
    return this.data.userGames.filter(ug => ug.userId === userId);
  }

  getUserGame(userId: string, gameId: number): UserGame | null {
    return this.data.userGames.find(ug => ug.userId === userId && ug.gameId === gameId) || null;
  }
  
  saveGame(game: Game): Game {
    const idx = this.data.games.findIndex(
      g => g.igdbId === game.igdbId
    );

    if (idx >= 0) {
      this.data.games[idx] = game;
    } else {
      this.data.games.push(game);
    }

    this.save();

    return game;
  }

  saveUserGame(userGame: UserGame): UserGame {
    const idx = this.data.userGames.findIndex(ug => ug.userId === userGame.userId && ug.gameId === userGame.gameId);
    const now = new Date().toISOString();
    const updatedUserGame = { ...userGame, updatedAt: now };

    if (idx !== -1) {
      this.data.userGames[idx] = updatedUserGame;
    } else {
      this.data.userGames.push(updatedUserGame);
    }
    this.save();
    return updatedUserGame;
  }

  deleteUserGame(userId: string, gameId: number): boolean {
    const originalLen = this.data.userGames.length;
    this.data.userGames = this.data.userGames.filter(ug => !(ug.userId === userId && ug.gameId === gameId));
    if (this.data.userGames.length !== originalLen) {
      this.save();
      return true;
    }
    return false;
  }

  // Review methods
  getReviews(gameId?: number): Review[] {
    if (gameId !== undefined) {
      return this.data.reviews.filter(r => r.gameId === gameId);
    }
    return this.data.reviews;
  }

  getReview(id: string): Review | null {
    return this.data.reviews.find(r => r.id === id) || null;
  }

  getUserReviews(userId: string): Review[] {
    return this.data.reviews.filter(r => r.userId === userId);
  }

  saveReview(review: Review): Review {
    const idx = this.data.reviews.findIndex(r => r.id === review.id);
    if (idx !== -1) {
      this.data.reviews[idx] = review;
    } else {
      this.data.reviews.push(review);
    }
    this.save();
    return review;
  }

  toggleLikeReview(reviewId: string, userId: string): Review | null {
    const review = this.getReview(reviewId);
    if (!review) return null;
    const likesSet = new Set(review.likes || []);
    if (likesSet.has(userId)) {
      likesSet.delete(userId);
    } else {
      likesSet.add(userId);
    }
    review.likes = Array.from(likesSet);
    this.saveReview(review);
    return review;
  }

  // CustomList methods
  getLists(userId?: string): CustomList[] {
    if (userId) {
      return this.data.customLists.filter(l => l.userId === userId);
    }
    return this.data.customLists;
  }

  getList(id: string): CustomList | null {
    return this.data.customLists.find(l => l.id === id) || null;
  }

  createList(list: CustomList): CustomList {
    this.data.customLists.push(list);
    this.save();
    return list;
  }

  deleteList(id: string): boolean {
    const len = this.data.customLists.length;
    this.data.customLists = this.data.customLists.filter(l => l.id !== id);
    this.data.customListItems = this.data.customListItems.filter(item => item.listId !== id);
    if (this.data.customLists.length !== len) {
      this.save();
      return true;
    }
    return false;
  }

  getListItems(listId: string): number[] {
    return this.data.customListItems.filter(item => item.listId === listId).map(item => item.gameId);
  }

  saveListItems(listId: string, gameIds: number[]) {
    // Clear existing
    this.data.customListItems = this.data.customListItems.filter(item => item.listId !== listId);
    // Add new
    gameIds.forEach(gameId => {
      this.data.customListItems.push({ listId, gameId });
    });
    this.save();
  }

  // Follow methods
  getFollowers(userId: string): string[] {
    return this.data.follows.filter(f => f.followingId === userId).map(f => f.followerId);
  }

  getFollowing(userId: string): string[] {
    return this.data.follows.filter(f => f.followerId === userId).map(f => f.followingId);
  }

  toggleFollow(followerId: string, followingId: string): boolean {
    const idx = this.data.follows.findIndex(f => f.followerId === followerId && f.followingId === followingId);
    let isFollowing = false;
    if (idx !== -1) {
      this.data.follows.splice(idx, 1);
    } else {
      this.data.follows.push({ followerId, followingId });
      isFollowing = true;
    }
    this.save();
    return isFollowing;
  }

  // Activity methods
  getActivities(userIds?: string[]): Activity[] {
    if (userIds && userIds.length > 0) {
      const allowed = new Set(userIds);
      return this.data.activities
        .filter(act => allowed.has(act.userId))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return this.data.activities
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  addActivity(activity: Activity) {
    this.data.activities.push(activity);
    // limit to last 200 items for scaling
    if (this.data.activities.length > 200) {
      this.data.activities = this.data.activities
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 200);
    }
    this.save();
  }

  // --- STATISTICS DASHBOARD ---
  getUserStats(userId: string) {
    const userGames = this.getUserGames(userId);
    const completedGames = userGames.filter(ug => ug.status === 'COMPLETED');
    const totalHours = userGames.reduce((acc, curr) => acc + curr.hoursPlayed, 0);

    // Calculate favorite genre and platform
    const gameIdsPlayed = userGames.map(ug => ug.gameId);
    const gamesDetails = this.data.games.filter(g => gameIdsPlayed.includes(g.igdbId));

    const genreCounts: Record<string, number> = {};
    const platformCounts: Record<string, number> = {};

    gamesDetails.forEach(game => {
      game.genres.forEach(g => {
        genreCounts[g] = (genreCounts[g] || 0) + 1;
      });
      game.platforms.forEach(p => {
        platformCounts[p] = (platformCounts[p] || 0) + 1;
      });
    });

    let favoriteGenre = "None";
    let maxGenre = 0;
    Object.entries(genreCounts).forEach(([genre, count]) => {
      if (count > maxGenre) {
        maxGenre = count;
        favoriteGenre = genre;
      }
    });

    let favoritePlatform = "None";
    let maxPlatform = 0;
    Object.entries(platformCounts).forEach(([platform, count]) => {
      if (count > maxPlatform) {
        maxPlatform = count;
        favoritePlatform = platform;
      }
    });

    // Top rated game by user
    const ratedGames = userGames.filter(ug => ug.rating > 0).sort((a, b) => b.rating - a.rating);
    const topRatedGames = ratedGames.slice(0, 5).map(ug => {
      const g = this.getGame(ug.gameId);
      return {
        gameId: ug.gameId,
        name: g ? g.name : `Game ${ug.gameId}`,
        cover: g ? g.cover : '',
        myRating: ug.rating,
        hoursPlayed: ug.hoursPlayed
      };
    });

    // Monthly gaming activity (fake or based on updatedAt month for completed/started games)
    const monthlyHistory: Record<string, { completed: number, hours: number }> = {};
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Initialize last 6 months
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${months[d.getMonth()]} ${d.getFullYear() % 100}`;
      monthlyHistory[key] = { completed: 0, hours: 0 };
    }

    userGames.forEach(ug => {
      const d = new Date(ug.updatedAt);
      const key = `${months[d.getMonth()]} ${d.getFullYear() % 100}`;
      if (monthlyHistory[key]) {
        monthlyHistory[key].hours += ug.hoursPlayed;
        if (ug.status === 'COMPLETED') {
          monthlyHistory[key].completed += 1;
        }
      }
    });

    const monthlyStats = Object.entries(monthlyHistory).map(([month, data]) => ({
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
      platformsDistribution: Object.entries(platformCounts).map(([name, value]) => ({ name, value })),
      genresDistribution: Object.entries(genreCounts).map(([name, value]) => ({ name, value }))
    };
  }

  // --- HYBRID RECOMMENDATION ENGINE ---
  // Formula:
  // 40% User Similarity
  // 35% Social Relations (What people they follow rate highly)
  // 25% Content Similarity (Based on genres & platforms of completed/played games)
  getRecommendations(userId: string): { game: Game, score: number }[] {
    const userGames = this.getUserGames(userId);
    const userGameIdSet = new Set(userGames.map(ug => ug.gameId));

    // Games that are currently not in user's library (eligible for recommendation)
    const eligibleGames = this.data.games.filter(g => !userGameIdSet.has(g.igdbId));

    if (eligibleGames.length === 0) return [];

    // 1. Calculate Cosine User Similarity
    const userSimilarities: Record<string, number> = {};
    const mainUserRatings = userGames.filter(ug => ug.rating > 0);

    this.data.users.forEach(otherUser => {
      if (otherUser.id === userId) return;

      const otherUserGames = this.getUserGames(otherUser.id);
      const otherUserRatings = otherUserGames.filter(ug => ug.rating > 0);

      const commonGames = mainUserRatings.filter(ur => otherUserRatings.some(our => our.gameId === ur.gameId));

      if (commonGames.length === 0) {
        userSimilarities[otherUser.id] = 0;
        return;
      }

      // DOT Product of Ratings
      let dotProduct = 0;
      let mainSumSq = 0;
      let otherSumSq = 0;

      commonGames.forEach(ur => {
        const otherUr = otherUserRatings.find(our => our.gameId === ur.gameId)!;
        dotProduct += ur.rating * otherUr.rating;
        mainSumSq += ur.rating * ur.rating;
        otherSumSq += otherUr.rating * otherUr.rating;
      });

      const similarity = dotProduct / (Math.sqrt(mainSumSq) * Math.sqrt(otherSumSq));
      userSimilarities[otherUser.id] = isNaN(similarity) ? 0 : similarity;
    });

    // 2. Identify top genres/platforms for the current user (for Content Similarity)
    const favoriteGenres = new Set<string>();
    const favoritePlatforms = new Set<string>();
    const playedGamesDetails = this.data.games.filter(g => userGameIdSet.has(g.igdbId));

    playedGamesDetails.forEach(g => {
      g.genres.forEach(genre => favoriteGenres.add(genre));
      g.platforms.forEach(platform => favoritePlatforms.add(platform));
    });

    // 3. Social connections
    const following = this.getFollowing(userId);
    const followingSet = new Set(following);

    // 4. Score each eligible game
    const recommendations = eligibleGames.map(game => {
      // A. User Similarity Score Component: Weighted average of ratings given by modern similar users
      let weightedRatingsSum = 0;
      let similaritySum = 0;

      this.data.users.forEach(otherUser => {
        if (otherUser.id === userId) return;
        const otherUg = this.getUserGame(otherUser.id, game.igdbId);
        const sim = userSimilarities[otherUser.id] || 0;

        if (otherUg && otherUg.rating > 0 && sim > 0) {
          weightedRatingsSum += otherUg.rating * sim;
          similaritySum += sim;
        }
      });

      // Normalize user similarity score out of 5 stars, scale to 0-100
      const userSimScore = similaritySum > 0 ? (weightedRatingsSum / similaritySum) * 20 : 0;

      // B. Social Relations Score Component
      // Highly rated (4+ stars) or completed by people they follow
      let socialLikes = 0;
      let totalFollowedWithGame = 0;
      following.forEach(fId => {
        const followedUg = this.getUserGame(fId, game.igdbId);
        if (followedUg) {
          totalFollowedWithGame++;
          if (followedUg.status === 'COMPLETED' || followedUg.rating >= 4) {
            socialLikes++;
          }
        }
      });
      const socialScore = totalFollowedWithGame > 0 ? (socialLikes / totalFollowedWithGame) * 100 : 0;

      // C. Content Similarity Score Component
      // Ratio of genres and platforms overlap
      let genreOverlap = 0;
      game.genres.forEach(genre => {
        if (favoriteGenres.has(genre)) genreOverlap++;
      });
      const genreRatio = game.genres.length > 0 ? genreOverlap / game.genres.length : 0;

      let platformOverlap = 0;
      game.platforms.forEach(plat => {
        if (favoritePlatforms.has(plat)) platformOverlap++;
      });
      const platformRatio = game.platforms.length > 0 ? platformOverlap / game.platforms.length : 0;

      const contentScore = (genreRatio * 0.7 + platformRatio * 0.3) * 100;

      // D. Final Weighted Score: Weighted sum of all three scores
      // 40% User Similarity | 35% Social Relations | 25% Content Similarity
      // If user has no ratings or followed users, use default popularity scaling as baseline
      const defaultScore = game.rating ? game.rating : 50;
      
      let finalScore = 0;
      if (mainUserRatings.length === 0 && following.length === 0) {
        finalScore = defaultScore;
      } else {
        const uSimWeight = 0.40;
        const socialWeight = 0.35;
        const contentWeight = 0.25;

        // Fallbacks for missing profiles
        const safeUserSim = similaritySum > 0 ? userSimScore : defaultScore;
        const safeSocial = totalFollowedWithGame > 0 ? socialScore : defaultScore;
        const safeContent = playedGamesDetails.length > 0 ? contentScore : defaultScore;

        finalScore = (safeUserSim * uSimWeight) + (safeSocial * socialWeight) + (safeContent * contentWeight);
      }

      return {
        game,
        score: Math.round(finalScore)
      };
    });

    // Return top sorted recommendations
    return recommendations.sort((a, b) => b.score - a.score);
  }
}

export const db = new GameDatabase();
