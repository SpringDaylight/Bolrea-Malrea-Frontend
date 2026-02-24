import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import MainLayout from "../components/layout/MainLayout";
import TasteSurveyModal from "../components/TasteSurveyModal";
import { getMovie } from "../api/A2_movies";
import { getCurrentUser, getCurrentUserReviews } from "../api/A7_profile";
import { getCurrentUserWatchedMovies } from "../api/A8_watched";
import { getTasteMap, type UserProfile } from "../api/ml";
import { getUserPreference } from "../api/userPreferences";
import { API_BASE_URL, getAccessToken } from "../api/http";

type RecentMovie = {
  movieId: number;
  title: string;
  poster: string;
};

const POSTER_FALLBACK = "https://via.placeholder.com/500x750?text=No+Image";
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
  const [isSurveyOpen, setIsSurveyOpen] = useState(false);
  const [surveyRefreshKey, setSurveyRefreshKey] = useState(0);
  const [wordCloudUrl, setWordCloudUrl] = useState<string | null>(null);
  const [wordCloudLoading, setWordCloudLoading] = useState(false);
  const [wordCloudError, setWordCloudError] = useState<string | null>(null);
  const [wordCloudUserId, setWordCloudUserId] = useState<string | null>(null);
  const wordCloudUrlRef = useRef<string | null>(null);
  const isLoggedIn = useMemo(() => Boolean(getAccessToken()), []);

  const handleSurveyOpen = () => setIsSurveyOpen(true);
  const handleSurveyClose = () => setIsSurveyOpen(false);
  const handleSurveyComplete = () => {
    setIsSurveyOpen(false);
    setSurveyRefreshKey((prev) => prev + 1);
  };

  useEffect(() => {
    const loadTasteAnalysis = async () => {
      setLoading(true);
      try {
        if (isLoggedIn) {
          const currentUser = await getCurrentUser();
          setWordCloudUserId(currentUser.id);
          const preference = await getUserPreference(currentUser.id);
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
          setWordCloudUserId(null);
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
  }, [isLoggedIn, surveyRefreshKey]);

  useEffect(() => {
    if (!isLoggedIn || !wordCloudUserId) {
      setWordCloudError(null);
      setWordCloudLoading(false);
      if (wordCloudUrlRef.current) {
        URL.revokeObjectURL(wordCloudUrlRef.current);
        wordCloudUrlRef.current = null;
      }
      setWordCloudUrl(null);
      return;
    }

    let isCancelled = false;
    const controller = new AbortController();

    const fetchWordCloud = async () => {
      setWordCloudLoading(true);
      setWordCloudError(null);

      try {
        const token = getAccessToken();
        const response = await fetch(
          `${API_BASE_URL}/api/user-preferences/${wordCloudUserId}/wordcloud`,
          {
            method: "GET",
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            credentials: "include",
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || "워드 클라우드를 불러오지 못했습니다.");
        }

        const blob = await response.blob();
        const nextUrl = URL.createObjectURL(blob);
        if (isCancelled) {
          URL.revokeObjectURL(nextUrl);
          return;
        }

        if (wordCloudUrlRef.current) {
          URL.revokeObjectURL(wordCloudUrlRef.current);
        }
        wordCloudUrlRef.current = nextUrl;
        setWordCloudUrl(nextUrl);
      } catch (err) {
        if (isCancelled) return;
        console.error("Failed to fetch word cloud:", err);
        setWordCloudError("워드 클라우드 데이터를 불러오지 못했습니다.");
        if (wordCloudUrlRef.current) {
          URL.revokeObjectURL(wordCloudUrlRef.current);
          wordCloudUrlRef.current = null;
        }
        setWordCloudUrl(null);
      } finally {
        if (!isCancelled) setWordCloudLoading(false);
      }
    };

    fetchWordCloud();

    return () => {
      isCancelled = true;
      controller.abort();
    };
  }, [isLoggedIn, wordCloudUserId]);

  useEffect(() => {
    if (!isLoggedIn) {
      setRecentHighRated([]);
      return;
    }

    let isCancelled = false;

    const fetchHighRated = async () => {
      setReviewsLoading(true);
      try {
        const reviewResponse = await getCurrentUserReviews({
          page: 1,
          page_size: 100,
        });
        if (isCancelled) return;

        const reviews = Array.isArray(reviewResponse?.reviews)
          ? reviewResponse.reviews
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
                title: movie.title || `?곹솕 #${review.movie_id}`,
                poster: movie.poster_url || POSTER_FALLBACK,
              };
            } catch (movieErr) {
              console.error(
                `Failed to fetch movie detail for movie_id=${review.movie_id}:`,
                movieErr
              );
              return {
                movieId: review.movie_id,
                title: `?곹솕 #${review.movie_id}`,
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

    let isCancelled = false;

    const fetchWatchedGenreStats = async () => {
      let apiItems: Array<{
        movie_id: number;
        user_id?: string | null;
        genres?: string[] | null;
      }> = [];
      try {
        const response = await getCurrentUserWatchedMovies({
          page: 1,
          page_size: 100,
        });
        if (isCancelled) return;
        apiItems = response.items;
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
  const selectedGenres = parseArrayFromStorage("mw_taste_genres");
  const avoidedGenres = parseArrayFromStorage("mw_taste_avoid_genres");
  const tasteContext = (getLocalStorageItem("mw_taste_context") || "").trim();
  const tasteOrigin = (getLocalStorageItem("mw_taste_origin") || "").trim();
  const hasSurveyData =
    Boolean(userProfile) ||
    selectedGenres.length > 0 ||
    avoidedGenres.length > 0 ||
    savedKeywords.length > 0 ||
    Boolean(savedVibe) ||
    Boolean(tasteContext) ||
    Boolean(tasteOrigin);
  const preferenceSlots = Array.from({ length: 5 }, (_, index) => {
    const slot = watchedGenreStats[index];
    if (!slot) {
      return { genre: "미설정", percent: 0 };
    }
    return { genre: slot.genre, percent: slot.percent };
  });

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
          <p>나의 영화 취향을 확인해보세요!</p>
        </section>

        <section className="section card taste-preview-section">
          <article className="taste-preview">
            <div className="taste-preview-header with-cta">
              <div>
                <h2>나의 영화 취향 설문 결과</h2>
                <p>설문 답변 요약</p>
              </div>
              {hasSurveyData && (
                <button
                  className="secondary-btn taste-preview-top-cta"
                  type="button"
                  onClick={handleSurveyOpen}
                >
                  취향설문 다시하기
                </button>
              )}
            </div>
            <div className="taste-preview-body">
              {hasSurveyData ? (
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
              ) : (
                <div className="survey-summary-empty">
                  <p>취향분석 설문에 참여해주세요.</p>
                </div>
              )}
            </div>
          </article>
        </section>
        {!hasSurveyData && (
          <div className="survey-cta-row">
            <button
              className="icon-btn page-arrow-btn survey-cta-btn"
              type="button"
              onClick={handleSurveyOpen}
            >
              설문 참여하기
            </button>
          </div>
        )}

        <section className="section card taste-preview-section">
          <article className="taste-preview">
            <div className="taste-preview-header">
              <h2>취향 대시보드</h2>
              <p>워드 클라우드</p>
            </div>
            <div className="taste-preview-body">
              {wordCloudLoading ? (
                <p className="muted">불러오는 중...</p>
              ) : wordCloudUrl ? (
                <img
                  className="word-cloud-image"
                  src={wordCloudUrl}
                  alt="취향 워드 클라우드"
                />
              ) : (
                <p className="muted">
                  {wordCloudError || "워드 클라우드 데이터가 없습니다."}
                </p>
              )}
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
            <h2>최근 가장 만족했던 영화</h2>
            <p>최근 리뷰 중에서 4.5점 이상으로 평점을 저장했던 영화 4개를 보여줄게요</p>
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
      {isSurveyOpen && (
        <TasteSurveyModal
          onClose={handleSurveyClose}
          onComplete={handleSurveyComplete}
        />
      )}
    </MainLayout>
  );
}




