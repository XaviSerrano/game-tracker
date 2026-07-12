export interface User {
  id: string;
  username: string;
  email: string;
  avatar: string;
  bio: string;
  createdAt: string;
}

export interface Game {
  igdbId: number;
  name: string;
  slug: string;
  cover: string;
  summary: string;
  genres: string[];
  platforms: string[];
  releaseDate: string;
  rating?: number; // IGDB rating
  popularity?: number;
}

export type GameStatus = 'WISHLIST' | 'PLAYING' | 'PLAYED' | 'COMPLETED' | 'ABANDONED';

export interface UserGame {
  userId: string;
  gameId: number;
  status: GameStatus;
  rating: number; // 1-5 stars. 0 means unrated
  hoursPlayed: number;
  startedAt: string | null;
  completedAt: string | null;
  notes: string;
  updatedAt: string;
}

export interface Review {
  id: string;
  userId: string;
  gameId: number;
  title: string;
  content: string;
  rating?: number; // normalized from user's library rating (1-5, 0 unrated)
  likes: string[]; // array of user IDs who liked this review
  createdAt: string;
}

export interface CustomList {
  id: string;
  userId: string;
  name: string;
  description: string;
  createdAt: string;
}

export interface CustomListItem {
  listId: string;
  gameId: number;
}

export interface Follow {
  followerId: string;
  followingId: string;
}

export type ActivityType = 'COMPLETED' | 'WISHLIST' | 'PLAYING' | 'REVIEWED' | 'LIST_CREATED' | 'FOLLOWED';

export interface Activity {
  id: string;
  userId: string;
  type: ActivityType;
  gameId?: number;
  targetUserId?: string;
  details?: string; // Additional short text (e.g. list name, star rating)
  createdAt: string;
}

// User simulation state helper interface
export interface AuthState {
  user: User | null;
  token: string | null;
}
