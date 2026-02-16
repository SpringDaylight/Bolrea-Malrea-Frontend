/**
 * 사용자 선호도 동기화 유틸리티
 * 백엔드 UserPreference와 프론트엔드 localStorage 동기화
 */
import { get } from "../api/http";

interface UserPreferenceResponse {
  user_id: string;
  preference_vector: {
    emotion_scores: Record<string, number>;
    narrative_traits: Record<string, number>;
    direction_mood: Record<string, number>;
    character_relationship: Record<string, number>;
    ending_preference: {
      happy: number;
      open: number;
      bittersweet: number;
    };
  };
  persona_code: string | null;
  boost_tags: string[];
  dislike_tags: string[];
  penalty_tags: string[];
  updated_at: string;
}

/**
 * 백엔드에서 최신 사용자 선호도 가져오기
 */
export const fetchUserPreference = async (userId: string): Promise<UserPreferenceResponse | null> => {
  try {
    const response = await get<UserPreferenceResponse>(`/users/${userId}/preference`);
    return response;
  } catch (error) {
    console.error("Failed to fetch user preference:", error);
    return null;
  }
};

/**
 * 백엔드 선호도를 localStorage에 동기화
 */
export const syncUserPreferenceToLocal = async (userId: string): Promise<boolean> => {
  try {
    const preference = await fetchUserPreference(userId);
    
    if (!preference) {
      return false;
    }

    // localStorage에 저장 (기존 키 유지)
    const { preference_vector, dislike_tags } = preference;
    
    // 감정 태그를 텍스트로 변환 (상위 3개)
    const topEmotions = Object.entries(preference_vector.emotion_scores)
      .sort(([_, a], [__, b]) => b - a)
      .slice(0, 3)
      .map(([tag, _]) => tag);
    
    const topNarratives = Object.entries(preference_vector.narrative_traits)
      .sort(([_, a], [__, b]) => b - a)
      .slice(0, 3)
      .map(([tag, _]) => tag);
    
    // mw_taste_vibe: 주요 감정 태그
    localStorage.setItem("mw_taste_vibe", topEmotions.join(", "));
    
    // mw_taste_keywords: 서사 특성 태그
    localStorage.setItem("mw_taste_keywords", JSON.stringify(topNarratives));
    
    // mw_taste_avoid_genres: 싫어하는 태그
    localStorage.setItem("mw_taste_avoid_genres", JSON.stringify(dislike_tags));
    
    // 전체 프로필 저장
    localStorage.setItem("mw_user_profile", JSON.stringify(preference_vector));
    
    console.log("User preference synced to localStorage");
    return true;
  } catch (error) {
    console.error("Failed to sync user preference:", error);
    return false;
  }
};

/**
 * 리뷰 작성 후 선호도 동기화 및 캐시 무효화
 */
export const syncAfterReview = async (userId: string): Promise<void> => {
  // 1. 백엔드에서 최신 선호도 가져오기
  await syncUserPreferenceToLocal(userId);
  
  // 2. 적합도 캐시 무효화
  clearMatchRateCache();
};

/**
 * 적합도 캐시 전체 무효화
 */
export const clearMatchRateCache = (): void => {
  try {
    const keys = Object.keys(sessionStorage);
    const cacheKeys = keys.filter(key => key.startsWith("mw_match_rate_cache_"));
    
    cacheKeys.forEach(key => {
      sessionStorage.removeItem(key);
    });
    
    console.log(`Cleared ${cacheKeys.length} match rate cache entries`);
  } catch (error) {
    console.error("Failed to clear match rate cache:", error);
  }
};
