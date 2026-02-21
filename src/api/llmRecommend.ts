/**
 * LLM 기반 영화 추천 API
 */
import { post } from './http';

export interface RecommendRequest {
  user_input: string;
  top_k?: number;
  candidate_pool_size?: number;
  genres?: string[];
  year_from?: number;
  year_to?: number;
}

export interface Movie {
  movie_id: number;
  title: string;
  genres: string[];
  release_year: number;
  similarity_score: number;
  detail_url: string;
  poster_url?: string;
  rating?: number;
}

export interface RecommendResponse {
  recommendations: Movie[];
  explanation: string;
  candidates_count: number;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

/**
 * LLM 기반 영화 추천
 */
export async function recommendMovies(
  request: RecommendRequest
): Promise<RecommendResponse> {
  return post<RecommendResponse>('/api/llm/recommend', request);
}
