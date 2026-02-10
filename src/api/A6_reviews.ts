/**
 * Reviews API
 */
import { get, post, put, del } from './http';

// Types
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

export interface Comment {
  id: number;
  review_id: number;
  user_id: string;
  content: string;
  created_at: string;
}

export interface UpdateReviewRequest {
  rating?: number;
  content?: string;
}

export interface CreateCommentRequest {
  content: string;
}

export interface MessageResponse {
  message: string;
}

// API Functions

/**
 * Get review detail by ID
 * MW-API-006
 */
export function getReview(reviewId: number): Promise<Review> {
  return get<Review>(`/api/reviews/${reviewId}`);
}

/**
 * Update a review
 * MW-API-005
 */
export function updateReview(
  reviewId: number,
  data: UpdateReviewRequest
): Promise<Review> {
  return put<Review>(`/api/reviews/${reviewId}`, data);
}

/**
 * Delete a review
 */
export function deleteReview(reviewId: number): Promise<MessageResponse> {
  return del<MessageResponse>(`/api/reviews/${reviewId}`);
}

/**
 * Toggle like on a review
 * MW-API-007
 */
export function toggleReviewLike(
  reviewId: number,
  userId: string,
  isLike = true
): Promise<MessageResponse> {
  return post<MessageResponse>(
    `/api/reviews/${reviewId}/likes`,
    undefined,
    { user_id: userId, is_like: isLike }
  );
}

/**
 * Get comments for a review
 * MW-API-008
 */
export function getReviewComments(
  reviewId: number,
  params?: {
    skip?: number;
    limit?: number;
  }
): Promise<Comment[]> {
  return get<Comment[]>(`/api/reviews/${reviewId}/comments`, params);
}

/**
 * Create a comment on a review
 * MW-API-008
 */
export function createReviewComment(
  reviewId: number,
  userId: string,
  data: CreateCommentRequest
): Promise<Comment> {
  return post<Comment>(
    `/api/reviews/${reviewId}/comments`,
    data,
    { user_id: userId }
  );
}

/**
 * Like a review (shorthand)
 */
export function likeReview(reviewId: number, userId: string): Promise<MessageResponse> {
  return toggleReviewLike(reviewId, userId, true);
}

/**
 * Dislike a review (shorthand)
 */
export function dislikeReview(reviewId: number, userId: string): Promise<MessageResponse> {
  return toggleReviewLike(reviewId, userId, false);
}
