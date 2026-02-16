/**
 * 영화 적합도 계산 유틸리티
 * HomePage와 MovieDetailPage에서 동일한 로직 사용
 */
import { analyzePreference, predictSatisfaction, vectorizeMovie } from "../api/ml";
import type { Movie } from "../api/A2_movies";
import type { SatisfactionPrediction } from "../api/ml";

const CACHE_KEY_PREFIX = "mw_match_rate_cache_";
const CACHE_DURATION = 1000 * 60 * 30; // 30분

/**
 * 캐시 키 생성
 */
const getCacheKey = (movieId: number, userTasteText: string): string => {
  // 사용자 취향 텍스트의 해시를 포함하여 취향이 바뀌면 캐시 무효화
  const hash = userTasteText.substring(0, 50);
  return `${CACHE_KEY_PREFIX}${movieId}_${hash}`;
};

/**
 * 캐시에서 가져오기
 */
const getFromCache = (cacheKey: string): SatisfactionPrediction | null => {
  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (!cached) return null;
    
    const parsed = JSON.parse(cached);
    if (!parsed.data || !parsed.timestamp) return null;
    
    // 캐시 만료 확인
    if (Date.now() - parsed.timestamp > CACHE_DURATION) {
      sessionStorage.removeItem(cacheKey);
      return null;
    }
    
    return parsed.data;
  } catch {
    return null;
  }
};

/**
 * 캐시에 저장
 */
const saveToCache = (cacheKey: string, data: SatisfactionPrediction): void => {
  try {
    sessionStorage.setItem(cacheKey, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
  } catch (error) {
    console.warn("Failed to save to cache:", error);
  }
};

/**
 * 사용자 취향 정보 가져오기
 */
export const getUserTasteData = () => {
  const userTasteText = localStorage.getItem("mw_taste_vibe") || "";
  const userKeywords = (() => {
    try {
      const parsed = JSON.parse(localStorage.getItem("mw_taste_keywords") || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  })();
  const userAvoidGenres = (() => {
    try {
      const parsed = JSON.parse(localStorage.getItem("mw_taste_avoid_genres") || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  })();

  return {
    userTasteText,
    userKeywords,
    userAvoidGenres,
  };
};

/**
 * 단일 영화의 적합도 계산 (캐싱 포함)
 */
export const calculateMovieMatchRate = async (
  movie: Movie
): Promise<SatisfactionPrediction | null> => {
  try {
    const { userTasteText, userKeywords, userAvoidGenres } = getUserTasteData();

    if (!userTasteText.trim()) {
      return null;
    }

    const fullUserText = `${userTasteText} ${userKeywords.join(", ")}`.trim();
    const cacheKey = getCacheKey(movie.id, fullUserText);
    
    // 캐시 확인
    const cached = getFromCache(cacheKey);
    if (cached) {
      console.log(`Cache hit for movie ${movie.id}`);
      return cached;
    }

    console.log(`Cache miss for movie ${movie.id}, calculating...`);

    // 1. 사용자 취향 분석
    const userProfile = await analyzePreference({
      text: fullUserText,
      dislikes: userAvoidGenres.length ? userAvoidGenres.join(", ") : undefined,
    });

    // 2. 영화 벡터화
    const movieProfile = await vectorizeMovie({
      movie_id: movie.id,
      title: movie.title,
      overview: movie.synopsis || undefined,
      genres: movie.genres,
      keywords: movie.tags,
    });

    // 3. 만족도 예측
    const prediction = await predictSatisfaction({
      user_profile: userProfile,
      movie_profile: movieProfile,
      dislike_tags: userProfile.dislike_tags,
      boost_tags: userProfile.boost_tags,
    });

    // 캐시에 저장
    saveToCache(cacheKey, prediction);

    return prediction;
  } catch (error) {
    console.error(`Failed to calculate match rate for movie ${movie.id}:`, error);
    return null;
  }
};

/**
 * 여러 영화의 적합도 계산 (배치)
 */
export const calculateMoviesMatchRates = async (
  movies: Movie[]
): Promise<Record<number, number>> => {
  if (movies.length === 0) {
    return {};
  }

  const { userTasteText } = getUserTasteData();
  if (!userTasteText.trim()) {
    return {};
  }

  const results = await Promise.all(
    movies.map(async (movie) => {
      const result = await calculateMovieMatchRate(movie);
      return [movie.id, result ? Math.round(result.match_rate) : 83] as const;
    })
  );

  return Object.fromEntries(results);
};
