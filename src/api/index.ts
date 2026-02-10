/**
 * API Index - Export all API modules
 */

// HTTP Client
export * from './http';

// Movies API
export {
  getMovies,
  getMovie,
  getMovieReviews,
  createMovieReview,
  searchMovies,
  getMoviesByGenre,
  getPopularMovies,
  getLatestMovies,
} from './A2_movies';
export type {
  Movie,
  MovieListResponse,
  Review as MovieReview,
  ReviewListResponse as MovieReviewListResponse,
  CreateReviewRequest,
} from './A2_movies';

// Reviews API
export {
  getReview,
  updateReview,
  deleteReview,
  toggleReviewLike,
  getReviewComments,
  createReviewComment,
  likeReview,
  dislikeReview,
} from './A6_reviews';
export type {
  Review as ReviewDetail,
  Comment,
  UpdateReviewRequest,
  CreateCommentRequest,
  MessageResponse,
} from './A6_reviews';

// Profile/User API
export {
  getCurrentUser,
  createUser,
  updateCurrentUser,
  getCurrentUserReviews,
  getUserTasteAnalysis,
  getUser,
} from './A7_profile';
export type {
  User,
  Review as UserReview,
  ReviewListResponse as UserReviewListResponse,
  TasteAnalysis,
  CreateUserRequest,
  UpdateUserRequest,
} from './A7_profile';

// Auth API
export * from './auth';

// Re-export for convenience
import * as moviesApi from './A2_movies';
import * as reviewsApi from './A6_reviews';
import * as profileApi from './A7_profile';
import * as authApi from './auth';

export const api = {
  movies: moviesApi,
  reviews: reviewsApi,
  profile: profileApi,
  auth: authApi,
};

export default api;
