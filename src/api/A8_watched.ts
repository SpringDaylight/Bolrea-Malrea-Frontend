/**
 * Watched Movies API
 */
import { del, get, post } from "./http";

export interface WatchedMovie {
  id: number;
  user_id: string;
  movie_id: number;
  movie_title?: string | null;
  poster_url?: string | null;
  created_at: string;
}

export interface WatchedMovieListResponse {
  watched_movies: WatchedMovie[];
  total: number;
}

export interface SaveWatchedMovieRequest {
  movie_id: number;
}

/**
 * Get current user's watched movies
 */
export function getCurrentUserWatchedMovies(
  userId: string,
  params?: {
    page?: number;
    page_size?: number;
  }
): Promise<WatchedMovieListResponse> {
  return get<WatchedMovieListResponse>("/api/users/me/watched", {
    user_id: userId,
    ...params,
  });
}

/**
 * Save watched movie for current user
 */
export function saveCurrentUserWatchedMovie(
  userId: string,
  data: SaveWatchedMovieRequest
): Promise<WatchedMovie> {
  return post<WatchedMovie>("/api/users/me/watched", data, { user_id: userId });
}

/**
 * Delete watched movie for current user
 */
export function deleteCurrentUserWatchedMovie(
  userId: string,
  movieId: number
): Promise<{ message: string }> {
  return del<{ message: string }>(
    `/api/users/me/watched/${movieId}?user_id=${encodeURIComponent(userId)}`
  );
}

