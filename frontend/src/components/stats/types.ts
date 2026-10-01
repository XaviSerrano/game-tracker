import { Activity, Game, User } from '../../types.ts';

/** Resumen de un juego de la biblioteca, tal y como lo sirve /api/users/:id/stats. */
export interface StatsGameSummary extends Pick<
  Game,
  'igdbId' | 'name' | 'slug' | 'cover' | 'summary' | 'genres' | 'platforms' | 'releaseDate' | 'rating'
> {
  myRating: number;
  hoursPlayed: number;
}

export interface MonthlyActivityPoint {
  monthKey: string;
  label: string;
  hours: number;
  completed: number;
  added: number;
}

export interface DistributionItem {
  name: string;
  value: number;
}

export interface RatingBucket {
  stars: number;
  count: number;
}

export interface StatsData {
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
  ratingsDistribution: RatingBucket[];
  monthlyActivity: MonthlyActivityPoint[];
  platformsDistribution: DistributionItem[];
  genresDistribution: DistributionItem[];
}

export type TimeRange = 'all' | 'year' | '6m';

export type ActivityMetric = 'hours' | 'completed' | 'added';

export interface RecentActivityItem extends Activity {
  author?: User;
  targetUser?: User | null;
}
