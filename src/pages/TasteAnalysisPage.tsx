import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import MainLayout from "../components/layout/MainLayout";
import { getMovie } from "../api/A2_movies";
import { getCurrentUserReviews } from "../api/A7_profile";
import { getTasteMap, type UserProfile } from "../api/ml";

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

const getPreferencePercent = (index: number, total: number) => {
  if (total <= 1) return 88;
  const start = 92;
  const end = 60;
  const step = (start - end) / Math.max(1, total - 1);
  return Math.round(start - step * index);
};

const getFillStyle = (percent: number): CSSProperties =>
  ({ ["--fill" as string]: `${percent}%` } as CSSProperties);

export default function TasteAnalysisPage() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentHighRated, setRecentHighRated] = useState<RecentMovie[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const isLoggedIn = useMemo(
    () => getLocalStorageItem("mw_logged_in") === "true",
    []
  );

  useEffect(() => {
    const loadTasteAnalysis = async () => {
      setLoading(true);
      try {
        const savedProfile = getLocalStorageItem("mw_user_profile");
        if (savedProfile) {
          const profile = JSON.parse(savedProfile) as UserProfile;
          setUserProfile(profile);
          await getTasteMap({
            user_text: profile.user_text,
            k: 8,
          });
        }
      } catch (err) {
        console.error("Failed to load taste analysis:", err);
      } finally {
        setLoading(false);
      }
    };

    loadTasteAnalysis();
  }, []);

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

  const savedKeywords = parseArrayFromStorage("mw_taste_keywords");
  const savedVibe = (getLocalStorageItem("mw_taste_vibe") || "").trim();
  const wordCloudItems = getWordCloudItems([savedVibe, ...savedKeywords]);
  const selectedGenres = parseArrayFromStorage("mw_taste_genres");
  const preferenceGenres = selectedGenres.slice(0, 5);
  const preferenceSlots = Array.from({ length: 5 }, (_, index) => {
    const genre = preferenceGenres[index] ?? "미설정";
    const percent = preferenceGenres[index]
      ? getPreferencePercent(index, preferenceGenres.length)
      : 0;
    return { genre, percent };
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
              <p>선택한 장르 요약</p>
            </div>
            <div className="taste-preview-body">
              {selectedGenres.length > 0 ? (
                <div className="tag-list">
                  {selectedGenres.map((genre) => (
                    <span key={genre} className="tag">
                      {genre}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="muted">설문 결과가 없습니다.</p>
              )}
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
                      <span className="popcorn-icon" aria-hidden="true" />
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
