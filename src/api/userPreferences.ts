/**
 * User Preferences API
 * API for saving and retrieving user taste preferences
 */
import { get, post, del } from './http';

// ============================================================
// Types
// ============================================================

export interface EmotionScores {
  [key: string]: number;
}

export interface EndingPreference {
  happy: number;
  open: number;
  bittersweet: number;
}

export interface PreferenceVector {
  emotion_scores: EmotionScores;
  narrative_traits: EmotionScores;
  direction_mood: EmotionScores;
  character_relationship: EmotionScores;
  ending_preference: EndingPreference;
}

export interface UserPreference {
  user_id: string;
  preference_vector_json: PreferenceVector;
  persona_code?: string;
  boost_tags: string[];
  penalty_tags: string[];
  updated_at: string;
}

export interface SaveUserPreferenceRequest {
  user_id: string;
  preference_vector_json: PreferenceVector;
  persona_code?: string;
  boost_tags?: string[];
  dislike_tags?: string[];
  penalty_tags?: string[];
}

export interface UserPreferenceExistsResponse {
  user_id: string;
  exists: boolean;
}

// ============================================================
// API Functions
// ============================================================

/**
 * Get user preference by user_id
 */
export function getUserPreference(userId: string): Promise<UserPreference> {
  return get<UserPreference>(`/api/user-preferences/${userId}`);
}

/**
 * Save or update user preference (upsert)
 */
export function saveUserPreference(data: SaveUserPreferenceRequest): Promise<UserPreference> {
  return post<UserPreference>('/api/user-preferences', data);
}

/**
 * Delete user preference by user_id
 */
export function deleteUserPreference(userId: string): Promise<{ message: string }> {
  return del<{ message: string }>(`/api/user-preferences/${userId}`);
}

/**
 * Check if user preference exists
 */
export function checkUserPreferenceExists(userId: string): Promise<UserPreferenceExistsResponse> {
  return get<UserPreferenceExistsResponse>(`/api/user-preferences/${userId}/exists`);
}
