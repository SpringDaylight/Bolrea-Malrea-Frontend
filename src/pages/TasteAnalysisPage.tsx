import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import MainLayout from "../components/layout/MainLayout";
import { getMovie } from "../api/A2_movies";
import { getCurrentUserReviews } from "../api/A7_profile";
import { getCurrentUserWatchedMovies } from "../api/A8_watched";
import { getTasteMap, type UserProfile } from "../api/ml";
import { getUserPreference } from "../api/userPreferences";

type WordCloudItem = {
  word: string;
  size: "xl" | "lg" | "md" | "sm";
};

type RecentMovie = {
  movieId: number;
  title: string;
  poster: string;
};

const POSTER_FALLBACK = "https://via.placeholder.com/500x750?text=No+Image";
const WORD_CLOUD_LIMIT = 12;

const getLocalStorageItem = (key: string) => {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const parseArrayFromStorage = (key: string): string[] => {
  try {
    const raw = getLocalStorageItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is string =>
        typeof item === "string" && item.trim().length > 0
    );
  } catch {
    return [];
  }
};

const dedupe = (items: string[]) => {
  const seen = new Set<string>();
  return items.filter((item) => {
    const value = item.trim();
    if (!value) return false;
    const key = value.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const getTopEmotions = (
  scores: Record<string, number> | null,
  limit = 6
) => {
  if (!scores) return [];
  return Object.entries(scores)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([tag]) => tag);
};

const getWordCloudItems = (words: string[]): WordCloudItem[] => {
  const unique = dedupe(words).slice(0, WORD_CLOUD_LIMIT);
  const total = unique.length;
  return unique.map((word, index) => {
    const ratio = total <= 1 ? 0 : index / (total - 1);
    let size: WordCloudItem["size"] = "md";
    if (ratio < 0.2) size = "xl";
    else if (ratio < 0.45) size = "lg";
    else if (ratio < 0.75) size = "md";
    else size = "sm";
    return { word, size };
  });
};

const getFillStyle = (percent: number): CSSProperties =>
  ({ ["--fill" as string]: `${percent}%` } as CSSProperties);

export default function TasteAnalysisPage() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentHighRated, setRecentHighRated] = useState<RecentMovie[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [watchedGenreStats, setWatchedGenreStats] = useState<
    Array<{ genre: string; percent: number }>
  >([]);
  const isLoggedIn = useMemo(
    () => getLocalStorageItem("mw_logged_in") === "true",
    []
  );

  useEffect(() => {
    const loadTasteAnalysis = async () => {
      setLoading(true);
      try {
        const userId = getLocalStorageItem("mw_user_pk");
        if (isLoggedIn && userId) {
          const preference = await getUserPreference(userId);
          const topEmotions = Object.entries(preference.preference_vector_json.emotion_scores)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3)
            .map(([tag]) => tag);
          const topNarratives = Object.entries(
            preference.preference_vector_json.narrative_traits
          )
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3)
            .map(([tag]) => tag);

          const userText = [...topEmotions, ...topNarratives].join(", ");
          const profile: UserProfile = {
            user_text: userText,
            emotion_scores: preference.preference_vector_json.emotion_scores,
            narrative_traits: preference.preference_vector_json.narrative_traits,
            direction_mood: preference.preference_vector_json.direction_mood,
            character_relationship: preference.preference_vector_json.character_relationship,
            ending_preference: preference.preference_vector_json.ending_preference,
            dislike_tags: preference.penalty_tags ?? [],
            boost_tags: preference.boost_tags ?? [],
          };
          setUserProfile(profile);
          if (userText) {
            await getTasteMap({
              user_text: userText,
              k: 8,
            });
          }
        } else {
          const savedProfile = getLocalStorageItem("mw_user_profile");
          if (savedProfile) {
            const profile = JSON.parse(savedProfile) as UserProfile;
            setUserProfile(profile);
            if (profile.user_text) {
              await getTasteMap({
                user_text: profile.user_text,
                k: 8,
              });
            }
          }
        }
      } catch (err) {
        console.error("Failed to load taste analysis:", err);
      } finally {
        setLoading(false);
      }
    };

    loadTasteAnalysis();
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn) {
      setRecentHighRated([]);
      return;
    }

    const userId = getLocalStorageItem("mw_user_pk");
    if (!userId) {
      setRecentHighRated([]);
      return;
    }

    let isCancelled = false;

    const fetchHighRated = async () => {
      setReviewsLoading(true);
      try {
        const reviewResponse = await getCurrentUserReviews(userId, {
          page: 1,
          page_size: 100,
        });
        if (isCancelled) return;

        const reviews = Array.isArray(reviewResponse?.reviews)
          ? reviewResponse.reviews.filter(
              (review) => String(review.user_id) === String(userId)
            )
          : [];
        const sorted = [...reviews].sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        const filtered = sorted.filter((review) => Number(review.rating) >= 4.5);
        const uniqueByMovie = new Map<number, typeof filtered[number]>();
        filtered.forEach((review) => {
          if (!uniqueByMovie.has(review.movie_id)) {
            uniqueByMovie.set(review.movie_id, review);
          }
        });

        const selected = Array.from(uniqueByMovie.values()).slice(0, 4);
        const movies = await Promise.all(
          selected.map(async (review) => {
            try {
              const movie = await getMovie(review.movie_id);
              return {
                movieId: review.movie_id,
                title: movie.title || `영화 #${review.movie_id}`,
                poster: movie.poster_url || POSTER_FALLBACK,
              };
            } catch (movieErr) {
              console.error(
                `Failed to fetch movie detail for movie_id=${review.movie_id}:`,
                movieErr
              );
              return {
                movieId: review.movie_id,
                title: `영화 #${review.movie_id}`,
                poster: POSTER_FALLBACK,
              };
            }
          })
        );

        if (isCancelled) return;
        setRecentHighRated(movies);
      } catch (err) {
        if (isCancelled) return;
        console.error("Failed to fetch high rated reviews:", err);
        setRecentHighRated([]);
      } finally {
        if (!isCancelled) setReviewsLoading(false);
      }
    };

    fetchHighRated();

    return () => {
      isCancelled = true;
    };
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn) {
      setWatchedGenreStats([]);
      return;
    }

    const userId = getLocalStorageItem("mw_user_pk");
    if (!userId) {
      setWatchedGenreStats([]);
      return;
    }

    let isCancelled = false;

    const fetchWatchedGenreStats = async () => {
      let apiItems: Array<{
        movie_id: number;
        user_id?: string | null;
        genres?: string[] | null;
      }> = [];
      try {
        const response = await getCurrentUserWatchedMovies(userId, {
          page: 1,
          page_size: 500,
        });
        if (isCancelled) return;
        apiItems = response.items.filter(
          (item) => !item.user_id || String(item.user_id) === String(userId)
        );
      } catch (err) {
        console.error("Failed to fetch watched movies from API:", err);
      }

      if (isCancelled) return;

      const movieIds = Array.from(
        new Set(apiItems.map((item) => Number(item.movie_id)))
      ).filter((id) => Number.isFinite(id));

      if (movieIds.length === 0) {
        setWatchedGenreStats([]);
        return;
      }

      const genreCounts = new Map<string, number>();
      const needsFetch = new Set<number>();
      apiItems.forEach((item) => {
        const movieId = Number(item.movie_id);
        if (!Number.isFinite(movieId)) return;
        const genres = Array.isArray(item.genres) ? item.genres : [];
        if (genres.length === 0) {
          needsFetch.add(movieId);
          return;
        }
        genres.forEach((genre) => {
          if (typeof genre !== "string") return;
          const trimmed = genre.trim();
          if (!trimmed) return;
          genreCounts.set(trimmed, (genreCounts.get(trimmed) ?? 0) + 1);
        });
      });

      await Promise.all(
        Array.from(needsFetch).map(async (movieId) => {
          try {
            const movie = await getMovie(movieId);
            if (!movie?.genres) return;
            movie.genres.forEach((genre) => {
              if (typeof genre !== "string") return;
              const trimmed = genre.trim();
              if (!trimmed) return;
              genreCounts.set(trimmed, (genreCounts.get(trimmed) ?? 0) + 1);
            });
          } catch (err) {
            console.error(
              `Failed to fetch movie genres for movie_id=${movieId}:`,
              err
            );
          }
        })
      );

      if (isCancelled) return;

      if (genreCounts.size === 0) {
        setWatchedGenreStats([]);
        return;
      }

      const totalMovies = movieIds.length;
      const topGenres = Array.from(genreCounts.entries())
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ko-KR"))
        .slice(0, 5)
        .map(([genre, count]) => ({
          genre,
          percent: Math.round((count / totalMovies) * 100),
        }));

      setWatchedGenreStats(topGenres);
    };

    fetchWatchedGenreStats();

    return () => {
      isCancelled = true;
    };
  }, [isLoggedIn]);

  const savedKeywords = parseArrayFromStorage("mw_taste_keywords");
  const savedVibe = (getLocalStorageItem("mw_taste_vibe") || "").trim();
  const wordCloudItems = getWordCloudItems([savedVibe, ...savedKeywords]);
  const selectedGenres = parseArrayFromStorage("mw_taste_genres");
  const avoidedGenres = parseArrayFromStorage("mw_taste_avoid_genres");
  const tasteContext = (getLocalStorageItem("mw_taste_context") || "").trim();
  const tasteOrigin = (getLocalStorageItem("mw_taste_origin") || "").trim();
  const preferenceSlots = Array.from({ length: 5 }, (_, index) => {
    const slot = watchedGenreStats[index];
    if (!slot) {
      return { genre: "미설정", percent: 0 };
    }
    return { genre: slot.genre, percent: slot.percent };
  });
  const topEmotions = getTopEmotions(userProfile?.emotion_scores ?? null, 6);

  if (loading) {
    return (
      <MainLayout>
        <main className="container taste-analysis-page">
          <p>취향 분석 중...</p>
        </main>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <main className="container taste-analysis-page">
        <section className="page-title">
          <h1>취향 분석 상세</h1>
          <p>마이홈에서 연결되는 취향 대시보드입니다.</p>
          {!userProfile && (
            <Link to="/taste-survey" className="primary-btn">
              취향 설문 시작하기
            </Link>
          )}
        </section>

        <section className="section card taste-preview-section">
          <article className="taste-preview">
            <div className="taste-preview-header">
              <h2>나의 영화 취향 설문 결과</h2>
              <p>설문 답변 요약</p>
            </div>
            <div className="taste-preview-body">
              <div className="survey-summary-grid">
                <div className="survey-summary-card">
                  <h3 className="survey-summary-title">좋아하는 장르</h3>
                  {selectedGenres.length > 0 ? (
                    <div className="tag-list">
                      {selectedGenres.map((genre) => (
                        <span key={genre} className="tag">
                          {genre}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="survey-summary-value is-empty">미설정</p>
                  )}
                </div>
                <div className="survey-summary-card">
                  <h3 className="survey-summary-title">싫어하는 장르</h3>
                  {avoidedGenres.length > 0 ? (
                    <div className="tag-list">
                      {avoidedGenres.map((genre) => (
                        <span key={genre} className="tag">
                          {genre}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="survey-summary-value is-empty">미설정</p>
                  )}
                </div>
                <div className="survey-summary-card">
                  <h3 className="survey-summary-title">주로 영화를 볼 때에는?</h3>
                  <p
                    className={`survey-summary-value ${
                      tasteContext ? "" : "is-empty"
                    }`}
                  >
                    {tasteContext || "미설정"}
                  </p>
                </div>
                <div className="survey-summary-card">
                  <h3 className="survey-summary-title">좋아하는 분위기</h3>
                  <p
                    className={`survey-summary-value ${
                      savedVibe ? "" : "is-empty"
                    }`}
                  >
                    {savedVibe || "미설정"}
                  </p>
                </div>
                <div className="survey-summary-card">
                  <h3 className="survey-summary-title">좋아하는 소재</h3>
                  {savedKeywords.length > 0 ? (
                    <div className="tag-list">
                      {savedKeywords.map((keyword) => (
                        <span key={keyword} className="tag">
                          {keyword}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="survey-summary-value is-empty">미설정</p>
                  )}
                </div>
                <div className="survey-summary-card">
                  <h3 className="survey-summary-title">좋아하는 영화 나라</h3>
                  <p
                    className={`survey-summary-value ${
                      tasteOrigin ? "" : "is-empty"
                    }`}
                  >
                    {tasteOrigin || "미설정"}
                  </p>
                </div>
              </div>
            </div>
          </article>
        </section>

        <section className="section card taste-preview-section">
          <article className="taste-preview">
            <div className="taste-preview-header">
              <h2>취향 대시보드</h2>
              <p>정서 태그와 워드 클라우드</p>
            </div>
            <div className="taste-preview-body taste-preview-grid">
              <div className="taste-preview-main">
                <p className="muted">정서 태그</p>
                {topEmotions.length > 0 ? (
                  <div className="tag-list">
                    {topEmotions.map((tag) => (
                      <span key={tag} className="tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="muted">정서 태그 데이터가 없습니다.</p>
                )}
              </div>
              <div className="taste-preview-side">
                <p className="muted">워드 클라우드</p>
                {wordCloudItems.length > 0 ? (
                  <div className="word-cloud">
                    {wordCloudItems.map((item) => (
                      <span
                        key={`${item.word}-${item.size}`}
                        className={`word-cloud-item size-${item.size}`}
                      >
                        {item.word}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="muted">워드 클라우드 데이터가 없습니다.</p>
                )}
              </div>
            </div>
          </article>
        </section>

        <section className="section card taste-preview-section">
          <article className="taste-preview">
            <div className="taste-preview-header">
              <h2>장르 선호도</h2>
              <p>가장 선호하는 장르 5개</p>
            </div>
            <div className="taste-preview-body">
              <div className="genre-card-grid">
                {preferenceSlots.map((item, index) => (
                  <div
                    key={`${item.genre}-${index}`}
                    className={`genre-card ${item.percent === 0 ? "is-empty" : ""}`}
                  >
                    <span className="genre-card-title">{item.genre}</span>
                    <div
                      className="genre-card-meter"
                      role="img"
                      aria-label={`선호도 ${item.percent}%`}
                      style={getFillStyle(item.percent)}
                    >
                      <span className="genre-card-icon" aria-hidden="true" />
                    </div>
                    <span className="genre-card-percent">{item.percent}%</span>
                  </div>
                ))}
              </div>
            </div>
          </article>
        </section>

        <section className="section">
          <div className="section-header">
            <h2>최근 고평점 리뷰</h2>
            <p>평점 4.5점 이상</p>
          </div>
          {reviewsLoading ? (
            <p className="muted">불러오는 중...</p>
          ) : recentHighRated.length > 0 ? (
            <div className="movie-grid">
              {recentHighRated.map((movie) => (
                <Link
                  className="card-link"
                  to={`/movies/${movie.movieId}`}
                  key={movie.movieId}
                >
                  <article className="card movie-tile">
                    <img
                      className="poster"
                      src={movie.poster}
                      alt={`${movie.title} 포스터`}
                    />
                    <div className="movie-info">
                      <h3>{movie.title}</h3>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          ) : (
            <p className="muted">
              {isLoggedIn
                ? "조건에 맞는 최근 리뷰가 없습니다."
                : "로그인 후 확인할 수 있어요."}
            </p>
          )}
        </section>
      </main>
    </MainLayout>
  );
}
