export interface User {
  id: string;
  username: string;
  email: string;
  avatar: string;
  bio: string;
  createdAt: string;
}

export interface GameTimeToBeat {
  hastily?: number;
  normally?: number;
  completely?: number;
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
  rating?: number;
  popularity?: number;
  screenshots?: string[];
  timeToBeat?: GameTimeToBeat;
  averagePlaytimeHours?: number;
}

export type GameStatus = 'WISHLIST' | 'PLAYING' | 'PLAYED' | 'COMPLETED' | 'ABANDONED';

export interface UserGame {
  userId: string;
  gameId: number;
  status: GameStatus;
  rating: number;
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
  rating?: number;
  likes: string[];
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
  details?: string;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
}
