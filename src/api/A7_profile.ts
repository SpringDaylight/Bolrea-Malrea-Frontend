/**
 * User Profile API
 */
import { get, post, put } from './http';

// Types
export interface User {
  id: string;
  name: string;
  avatar_text: string | null;
  created_at: string;
}

export interface Review {
  id: number;
  user_id: string;
  movie_id: number;
  rating: number;
  content: string | null;
  created_at: string;
  likes_count: number;
  comments_count: number;
}

export interface ReviewListResponse {
  reviews: Review[];
  total: number;
}

export interface TasteAnalysis {
  user_id: string;
  summary_text: string | null;
  updated_at: string;
}

export interface CreateUserRequest {
  id: string;
  name: string;
  avatar_text?: string;
}

export interface UpdateUserRequest {
  name?: string;
  avatar_text?: string;
}

// API Functions

/**
 * Get current user info
 * MW-API-009
 */
export function getCurrentUser(userId: string): Promise<User> {
  return get<User>('/api/users/me', { user_id: userId });
}

/**
 * Create a new user
 */
export function createUser(data: CreateUserRequest): Promise<User> {
  return post<User>('/api/users', data);
}

/**
 * Update current user
 */
export function updateCurrentUser(
  userId: string,
  data: UpdateUserRequest
): Promise<User> {
  return put<User>(`/api/users/me?user_id=${encodeURIComponent(userId)}`, data);
}

/**
 * Get current user's reviews
 * MW-API-010
 */
export function getCurrentUserReviews(
  userId: string,
  params?: {
    page?: number;
    page_size?: number;
  }
): Promise<ReviewListResponse> {
  return get<ReviewListResponse>('/api/users/me/reviews', {
    user_id: userId,
    ...params,
  });
}

/**
 * Get user's taste analysis
 * MW-API-011
 */
export function getUserTasteAnalysis(userId: string): Promise<TasteAnalysis> {
  return get<TasteAnalysis>('/api/users/me/taste-analysis', { user_id: userId });
}

/**
 * Get user by ID
 */
export function getUser(userId: string): Promise<User> {
  return get<User>(`/api/users/${userId}`);
}
