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
  use_orchestrator?: boolean; // 오케스트레이터 사용 여부
}

export interface Movie {
  movie_id: number;
  title: string;
  genres: string[];
  release_year: number;
  similarity_score: number;  // 프론트 호환성 (final_score와 동일)
  final_score?: number;  // 최종 점수 (가중치 + 보너스)
  weighted_score?: number;  // 가중치 적용 점수
  keyword_score?: number;  // 키워드 점수
  emotion_score?: number;  // 감성 점수
  sources?: string[];  // 검색 소스 (keyword, vector)
  detail_url: string;
  poster_url?: string;
  rating?: number;
  reason?: string; // 개별 추천 이유 (오케스트레이터 모드)
}

export interface RecommendResponse {
  recommendations: Movie[];
  explanation: string;
  candidates_count: number;
  method?: string; // 'basic' or 'orchestrator'
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
