import fs from 'fs';
import path from 'path';
import { User, Game, UserGame, Review, CustomList, CustomListItem, Follow, Activity, GameStatus } from '../src/types.ts';

interface DbSchema {
  users: User[];
  games: Game[];
  userGames: UserGame[];
  reviews: Review[];
  customLists: CustomList[];
  customListItems: CustomListItem[];
  follows: Follow[];
  activities: Activity[];
}

const DB_FILE = path.join(process.cwd(), 'appdata.json');

// Catalog now comes from IGDB at runtime (no local game seed).

const INITIAL_USERS: User[] = [
  {
    id: "user_alex",
    username: "alex_gamer",
    email: "alex@gametracker.com",
    avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=alex",
    bio: "RPG & Soulsborne fanatic. Playing games since 1998, always chasing the 100% completion.",
    createdAt: "2025-01-10T12:00:00Z"
  },
  {
    id: "user_sam",
    username: "vance_retro",
    email: "sam@gametracker.com",
    avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=sam",
    bio: "Retro gaming collector. Chrono Trigger is the undisputed GOAT. CRTs are mandatory.",
    createdAt: "2025-02-15T15:30:00Z"
  },
  {
    id: "user_lucia",
    username: "lucia_indie",
    email: "lucia@gametracker.com",
    avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=lucia",
    bio: "Indie games advocate. Pixel art, cozy farm simulators, and rogue-lites make my day.",
    createdAt: "2025-03-01T09:45:00Z"
  },
  {
    id: "user_marcos",
    username: "marcos_rpg",
    email: "marcos@gametracker.com",
    avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=marcos",
    bio: "JRPG player & completionist. Elden Ring was brilliant, but Chrono Trigger is art.",
    createdAt: "2025-03-12T18:20:00Z"
  }
];

const INITIAL_USER_GAMES: UserGame[] = [
  // Alex Games
  { userId: "user_alex", gameId: 119133, status: "COMPLETED", rating: 5, hoursPlayed: 145, startedAt: "2025-01-11", completedAt: "2025-02-28", notes: "Best boss designs in souls history. Malenia took 48 attempts but we got her!", updatedAt: "2025-02-28T22:00:00Z" },
  { userId: "user_alex", gameId: 119171, status: "PLAYING", rating: 5, hoursPlayed: 62, startedAt: "2025-03-01", completedAt: null, notes: "Tactical combat behaves so well! Playing as a chaotic good bard.", updatedAt: "2025-03-24T12:00:00Z" },
  { userId: "user_alex", gameId: 113112, status: "COMPLETED", rating: 4, hoursPlayed: 45, startedAt: "2025-01-20", completedAt: "2025-02-05", notes: "Incredibly tight controls and excellent voice acting. Zag is fantastic.", updatedAt: "2025-02-05T19:30:00Z" },
  { userId: "user_alex", gameId: 13177, status: "WISHLIST", rating: 0, hoursPlayed: 0, startedAt: null, completedAt: null, notes: "Need a cozy game to wind down after intensive raiding", updatedAt: "2025-03-10T14:15:00Z" },

  // Sam Games
  { userId: "user_sam", gameId: 1253, status: "COMPLETED", rating: 5, hoursPlayed: 85, startedAt: "2025-01-01", completedAt: "2025-01-25", notes: "The absolute standard of story pacing, music, and art synergy.", updatedAt: "2025-01-25T11:00:00Z" },
  { userId: "user_sam", gameId: 384, status: "COMPLETED", rating: 5, hoursPlayed: 14, startedAt: "2025-02-01", completedAt: "2025-02-05", notes: "Terrifying atmosphere. Unparalleled psychological horror elements.", updatedAt: "2025-02-05T23:30:00Z" },
  { userId: "user_sam", gameId: 1942, status: "PLAYED", rating: 4, hoursPlayed: 92, startedAt: "2025-01-15", completedAt: "2025-03-10", notes: "Amazing story, although combat feels a bit simplistic. Geralt is a legend.", updatedAt: "2025-03-10T18:00:00Z" },
  { userId: "user_sam", gameId: 215160, status: "PLAYING", rating: 4, hoursPlayed: 11, startedAt: "2025-03-15", completedAt: null, notes: "Loving the shift between daytime deep sea dive and night sushi tycoon!", updatedAt: "2025-03-20T21:00:00Z" },

  // Lucia Games
  { userId: "user_lucia", gameId: 19404, status: "COMPLETED", rating: 5, hoursPlayed: 56, startedAt: "2025-01-05", completedAt: "2025-02-12", notes: "Breathtaking soundtrack, beautiful and tragic world structure. Pantheon of Hallownest is brutal.", updatedAt: "2025-02-12T16:00:00Z" },
  { userId: "user_lucia", gameId: 26999, status: "COMPLETED", rating: 5, hoursPlayed: 28, startedAt: "2025-02-15", completedAt: "2025-02-28", notes: "Tightest controls in a 2D action platformer. Hit home emotionally in every chapter.", updatedAt: "2025-02-28T21:40:00Z" },
  { userId: "user_lucia", gameId: 113112, status: "PLAYING", rating: 5, hoursPlayed: 22, startedAt: "2025-03-01", completedAt: null, notes: "Fists of Talos are my absolute favorite build.", updatedAt: "2025-03-22T19:00:00Z" },
  { userId: "user_lucia", gameId: 215160, status: "COMPLETED", rating: 4, hoursPlayed: 29, startedAt: "2025-02-01", completedAt: "2025-02-20", notes: "Very charming and funny characters. Cozy fishing is great.", updatedAt: "2025-02-20T14:30:00Z" },
  { userId: "user_lucia", gameId: 119133, status: "PLAYING", rating: 3, hoursPlayed: 18, startedAt: "2025-03-10", completedAt: null, notes: "Beautiful views, but I am constantly getting crushed. Need to find more seeds.", updatedAt: "2025-03-18T10:00:00Z" },

  // Marcos Games
  { userId: "user_marcos", gameId: 119171, status: "COMPLETED", rating: 5, hoursPlayed: 148, startedAt: "2025-01-05", completedAt: "2025-02-20", notes: "Unbelievable depth of choice. Act 3 was a performance grind but outstanding narrative payoffs.", updatedAt: "2025-02-20T23:00:00Z" },
  { userId: "user_marcos", gameId: 1253, status: "COMPLETED", rating: 5, hoursPlayed: 78, startedAt: "2025-01-20", completedAt: "2025-02-10", notes: "Multi-character combo techniques are brilliant. Peak retro art style.", updatedAt: "2025-02-10T19:00:00Z" },
  { userId: "user_marcos", gameId: 1942, status: "PLAYING", rating: 4, hoursPlayed: 35, startedAt: "2025-03-01", completedAt: null, notes: "Novigrad quests are extremely detailed. Skellige soundtrack is fantastic.", updatedAt: "2025-03-23T22:30:00Z" }
];

const INITIAL_REVIEWS: Review[] = [
  {
    id: "rev1",
    userId: "user_alex",
    gameId: 119133,
    title: "Revolutionary Open World Masterpiece",
    content: "Elden Ring takes the tight, legendary combat design of souls-like games and spreads it across a breathtaking canvas. No map markers, no chore lists. Just raw curiosity prompting exploration. Exploring Siofra River for the first time is a sensory experience I will never forget. Challenging but undeniably a design pinnacle.",
    likes: ["user_sam", "user_lucia", "user_marcos"],
    createdAt: "2025-02-28T22:15:00Z"
  },
  {
    id: "rev2",
    userId: "user_sam",
    gameId: 1253,
    title: "Chrono Trigger: A Flawless Standard",
    content: "Even after three decades, Chrono Trigger remains completely flawless. Yasunori Mitsuda's score weaves melancholic beauty, Akira Toriyama's sprites have endless charisma, and the combat design features zero filler battles. The time travel mechanics are tidy, rewarding, and culminate in numerous clever endings. It isn't just an RPG; it is a masterpiece.",
    likes: ["user_marcos", "user_alex"],
    createdAt: "2025-01-25T11:30:00Z"
  },
  {
    id: "rev3",
    userId: "user_lucia",
    gameId: 26999,
    title: "Extremely Tight, Emotionally Heavy Platformer",
    content: "Celeste is a miracle of a platformer. The dash mechanics, wind physics, and level gimmicks are polished to an insane degree. But what makes it immortal is how Madeline's ascent mimics her mental health journey. The mountain isn't just a hurdle; it's a mirror. A spectacular, tough-as-nails tribute to self-acceptance.",
    likes: ["user_alex", "user_lucia"],
    createdAt: "2025-02-28T21:50:00Z"
  }
];

const INITIAL_CUSTOM_LISTS: CustomList[] = [
  {
    id: "list1",
    userId: "user_lucia",
    name: "Masterpieces of Pixel Art",
    description: "Games where pixel density and visual choreography tell half the story. Absolute standouts in modern indie history.",
    createdAt: "2025-02-20T15:00:00Z"
  },
  {
    id: "list2",
    userId: "user_sam",
    name: "Legends of the Golden Era",
    description: "The absolute pinnacles of RPG and atmospheric design that paved the road for contemporary mechanics.",
    createdAt: "2025-02-10T12:00:00Z"
  }
];

const INITIAL_CUSTOM_LIST_ITEMS: CustomListItem[] = [
  { listId: "list1", gameId: 19404 }, // Hollow Knight
  { listId: "list1", gameId: 26999 }, // Celeste
  { listId: "list1", gameId: 113112 }, // Hades
  { listId: "list1", gameId: 215160 }, // Dave the Diver
  { listId: "list2", gameId: 1253 }, // Chrono Trigger
  { listId: "list2", gameId: 384 }  // Silent Hill 2
];

const INITIAL_FOLLOWS: Follow[] = [
  { followerId: "user_alex", followingId: "user_sam" },
  { followerId: "user_alex", followingId: "user_lucia" },
  { followerId: "user_sam", followingId: "user_marcos" },
  { followerId: "user_sam", followingId: "user_alex" },
  { followerId: "user_lucia", followingId: "user_alex" },
  { followerId: "user_lucia", followingId: "user_sam" },
  { followerId: "user_marcos", followingId: "user_alex" },
  { followerId: "user_marcos", followingId: "user_sam" }
];

const INITIAL_ACTIVITIES: Activity[] = [
  { id: "act1", userId: "user_alex", type: "COMPLETED", gameId: 119133, details: "with a rating of 5/5 ⭐", createdAt: "2025-02-28T22:00:00Z" },
  { id: "act2", userId: "user_sam", type: "COMPLETED", gameId: 1253, details: "with a rating of 5/5 ⭐ and 85 hours played!", createdAt: "2025-01-25T11:00:00Z" },
  { id: "act3", userId: "user_lucia", type: "REVIEWED", gameId: 26999, details: "written review 'Extremely Tight, Emotionally Heavy'", createdAt: "2025-02-28T21:50:00Z" },
  { id: "act4", userId: "user_alex", type: "PLAYING", gameId: 119171, details: "just started playing!", createdAt: "2025-03-01T12:00:00Z" },
  { id: "act5", userId: "user_lucia", type: "LIST_CREATED", details: "created 'Masterpieces of Pixel Art'", createdAt: "2025-02-20T15:00:00Z" },
  { id: "act6", userId: "user_marcos", type: "FOLLOWED", targetUserId: "user_alex", details: "started following alex_gamer", createdAt: "2025-03-15T18:00:00Z" }
];

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
      activities: []
    };
    this.load();
  }

  private load() {
    if (fs.existsSync(DB_FILE)) {
      try {
        const content = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(content);
        // Ensure standard keys exist
        this.data.users = this.data.users || [];
        // Games are hydrated from IGDB at runtime; avoid seeding from persisted JSON.
        this.data.games = [];
        this.data.userGames = this.data.userGames || [];
        this.data.reviews = this.data.reviews || [];
        this.data.customLists = this.data.customLists || [];
        this.data.customListItems = this.data.customListItems || [];
        this.data.follows = this.data.follows || [];
        this.data.activities = this.data.activities || [];
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
      users: [...INITIAL_USERS],
      games: [],
      userGames: [...INITIAL_USER_GAMES],
      reviews: [...INITIAL_REVIEWS],
      customLists: [...INITIAL_CUSTOM_LISTS],
      customListItems: [...INITIAL_CUSTOM_LIST_ITEMS],
      follows: [...INITIAL_FOLLOWS],
      activities: [...INITIAL_ACTIVITIES]
    };
    this.save();
    console.log("Database successfully seeded with mock data!");
  }

  // --- QUERY APIS ---

  // User methods
  getUsers(): User[] {
    return this.data.users;
  }

  getUser(userId: string): User | null {
    return this.data.users.find(u => u.id === userId) || null;
  }

  getUserByEmail(email: string): User | null {
    return this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
  }

  getUserByUsername(username: string): User | null {
    return this.data.users.find(u => u.username.toLowerCase() === username.toLowerCase()) || null;
  }

  createUser(user: User): User {
    // Check conflicts
    if (this.getUser(user.id)) return this.getUser(user.id)!;
    
    this.data.users.push(user);
    this.save();
    return user;
  }

  updateUser(userId: string, updates: Partial<User>): User | null {
    const idx = this.data.users.findIndex(u => u.id === userId);
    if (idx === -1) return null;
    this.data.users[idx] = { ...this.data.users[idx], ...updates };
    this.save();
    return this.data.users[idx];
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
