import { useEffect, useState } from "react";
import MainLayout from "../components/layout/MainLayout";
import { useLocation, useParams } from "react-router-dom";
import { getMovie, getMovieReviews, type Movie, type Review } from "../api/A2_movies";
import { 
  analyzePreference, 
  vectorizeMovie, 
  predictSatisfaction, 
  explainPrediction,
  type SatisfactionPrediction,
  type PredictionExplanation 
} from "../api/ml";

const REVIEW_STORAGE_KEY = "mw_my_reviews";

type StoredReviewItem = {
  id: number;
  movieId: number;
  title: string;
  poster?: string | null;
  dateLabel?: string;
  genre?: string;
  rating?: number;
  content?: string;
  createdAt?: string;
};

export default function MovieDetailPage() {
  const { movieId } = useParams<{ movieId: string }>();
  const location = useLocation();
  const [movie, setMovie] = useState<Movie | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reactions, setReactions] = useState<
    Record<number, { likes: number; dislikes: number }>
  >({});
  const [myReviewOpen, setMyReviewOpen] = useState(false);
  const [myReviewContent, setMyReviewContent] = useState("");
  const [myReviewRating, setMyReviewRating] = useState(5);
  const [myReviewVisibility, setMyReviewVisibility] = useState<
    "public" | "private"
  >("public");
  const [localPersonalReview, setLocalPersonalReview] = useState<Review | null>(
    null
  );
  const [replyDrafts, setReplyDrafts] = useState<Record<number, string>>({});
  const [replyOpen, setReplyOpen] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<SatisfactionPrediction | null>(null);
  const [explanation, setExplanation] = useState<PredictionExplanation | null>(null);
  const [mlLoading, setMlLoading] = useState(false);
  const locationState = location.state as {
    newReview?: Review;
    userReview?: Review;
  } | null;
  const personalReview =
    localPersonalReview ?? locationState?.userReview ?? locationState?.newReview;
  const personalReviewDate = personalReview?.created_at
    ? new Date(personalReview.created_at).toLocaleDateString("ko-KR")
    : "오늘";

  useEffect(() => {
    if (!movieId) return;
    if (locationState?.userReview || locationState?.newReview) return;
    const raw = localStorage.getItem(REVIEW_STORAGE_KEY);
    if (!raw) return;
    try {
      const stored = JSON.parse(raw) as StoredReviewItem[];
      if (!Array.isArray(stored)) return;
      const match = stored.find((item) => String(item.movieId) === String(movieId));
      if (!match) return;
      setLocalPersonalReview({
        id: match.id ?? Date.now(),
        user_id: localStorage.getItem("mw_profile_id") || "me",
        movie_id: Number(movieId),
        rating: typeof match.rating === "number" ? match.rating : 5,
        content: match.content ?? null,
        created_at: match.createdAt ?? new Date().toISOString(),
        likes_count: 0,
        comments_count: 0,
      });
    } catch (err) {
      console.error("Failed to parse stored reviews:", err);
    }
  }, [movieId, locationState?.userReview, locationState?.newReview]);

  useEffect(() => {
    const fetchMovieData = async () => {
      if (!movieId) return;
      
      setLoading(true);
      setError(null);
      try {
        const movieData = await getMovie(Number(movieId));
        setMovie(movieData);
        
        const reviewsData = await getMovieReviews(Number(movieId), { page_size: 10 });
        if (personalReview && personalReview.movie_id === movieData.id) {
          setReviews(
            reviewsData.reviews.filter((review) => review.id !== personalReview.id)
          );
        } else {
          setReviews(reviewsData.reviews);
        }

        // ML API: 사용자 취향 기반 영화 적합도 계산
        fetchMovieRecommendation(movieData);
      } catch (err) {
        setError("영화 정보를 불러오는데 실패했습니다.");
        console.error("Failed to fetch movie data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMovieData();
  }, [movieId, personalReview?.id, personalReview?.movie_id]);

  useEffect(() => {
    if (location.hash !== "#my-review") return;
    const target = document.getElementById("my-review");
    if (!target) return;
    const timeout = window.setTimeout(() => {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [location.hash, movie?.id]);

  useEffect(() => {
    setReactions((prev) => {
      const next: Record<number, { likes: number; dislikes: number }> = {};
      reviews.forEach((review) => {
        const existing = prev[review.id];
        next[review.id] = {
          likes: existing?.likes ?? review.likes_count ?? 0,
          dislikes: existing?.dislikes ?? 0,
        };
      });
      return next;
    });
  }, [reviews]);

  const incrementReaction = (reviewId: number, type: "likes" | "dislikes") => {
    setReactions((prev) => {
      const current = prev[reviewId] ?? { likes: 0, dislikes: 0 };
      return {
        ...prev,
        [reviewId]: {
          ...current,
          [type]: current[type] + 1,
        },
      };
    });
  };

  const handleMyReviewSave = () => {
    if (!movie) return;
    const content = myReviewContent.trim();
    const userId = localStorage.getItem("mw_profile_id") || "me";
    const nextReview: Review = {
      id: Date.now(),
      user_id: userId,
      movie_id: movie.id,
      rating: myReviewRating,
      content: content.length ? content : null,
      created_at: new Date().toISOString(),
      likes_count: 0,
      comments_count: 0,
    };
    try {
      const raw = localStorage.getItem(REVIEW_STORAGE_KEY);
      const stored = raw ? (JSON.parse(raw) as StoredReviewItem[]) : [];
      const nextEntry: StoredReviewItem = {
        id: nextReview.id,
        movieId: movie.id,
        title: movie.title,
        poster:
          movie.poster_url ||
          "https://via.placeholder.com/500x750?text=No+Image",
        dateLabel: new Date(nextReview.created_at).toLocaleDateString("ko-KR"),
        genre: movie.genres?.[0] ?? "장르",
        rating: nextReview.rating,
        content: nextReview.content ?? "",
        createdAt: nextReview.created_at,
      };
      const normalizedStored = Array.isArray(stored) ? stored : [];
      const nextStored = [
        nextEntry,
        ...normalizedStored.filter((item) => item.movieId !== movie.id),
      ];
      localStorage.setItem(REVIEW_STORAGE_KEY, JSON.stringify(nextStored));
    } catch (err) {
      console.error("Failed to save review to storage:", err);
    }
    setLocalPersonalReview(nextReview);
    setMyReviewOpen(false);
  };

  const toggleReplyOpen = (reviewId: number) => {
    setReplyOpen((prev) => ({
      ...prev,
      [reviewId]: !prev[reviewId],
    }));
  };

  const handleReplyChange = (reviewId: number, value: string) => {
    setReplyDrafts((prev) => ({
      ...prev,
      [reviewId]: value,
    }));
  };

  const handleReplySubmit = (reviewId: number) => {
    const nextValue = (replyDrafts[reviewId] || "").trim();
    if (!nextValue) return;
    setReplyDrafts((prev) => ({ ...prev, [reviewId]: "" }));
    setReplyOpen((prev) => ({ ...prev, [reviewId]: false }));
  };

  const fetchMovieRecommendation = async (movieData: Movie) => {
    setMlLoading(true);
    try {
      // localStorage에서 사용자 취향 정보 가져오기
      const userTasteText = localStorage.getItem('mw_taste_vibe') || '';
      const userKeywords = JSON.parse(localStorage.getItem('mw_taste_keywords') || '[]');
      const userAvoidGenres = JSON.parse(localStorage.getItem('mw_taste_avoid_genres') || '[]');
      
      if (!userTasteText) {
        // 취향 정보가 없으면 ML API 호출 안 함
        return;
      }

      const userText = `${userTasteText} ${userKeywords.join(', ')}`;
      const userDislikes = userAvoidGenres.join(', ');

      // 1. 사용자 취향 분석
      const userProfile = await analyzePreference({
        text: userText,
        dislikes: userDislikes || undefined,
      });

      // 2. 영화 벡터화
      const movieProfile = await vectorizeMovie({
        movie_id: movieData.id,
        title: movieData.title,
        overview: movieData.synopsis || undefined,
        genres: movieData.genres,
        keywords: movieData.tags,
      });

      // 3. 만족 확률 계산
      const predictionResult = await predictSatisfaction({
        user_profile: userProfile,
        movie_profile: movieProfile,
        dislike_tags: userProfile.dislike_tags,
        boost_tags: userProfile.boost_tags,
      });
      setPrediction(predictionResult);

      // 4. 설명 생성
      const explanationResult = await explainPrediction({
        movie_title: movieData.title,
        match_rate: predictionResult.match_rate,
        probability: predictionResult.probability,
        breakdown: predictionResult.breakdown,
        user_liked_tags: userProfile.boost_tags,
        user_disliked_tags: userProfile.dislike_tags,
      });
      setExplanation(explanationResult);
    } catch (err) {
      console.error('Failed to fetch ML recommendation:', err);
      // ML API 실패는 치명적이지 않으므로 에러 표시 안 함
    } finally {
      setMlLoading(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <main className="container">
          <p>로딩 중...</p>
        </main>
      </MainLayout>
    );
  }

  if (error || !movie) {
    return (
      <MainLayout>
        <main className="container">
          <p className="error">{error || "영화를 찾을 수 없습니다."}</p>
        </main>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <main className="container">
        <section className="page-title">
          <h1>영화 상세</h1>
          <p>영화를 선택하면 상세 정보와 취향 적합도를 확인할 수 있어요.</p>
        </section>

        <section className="section">
          <article className="card">
            <div className="movie-tile">
              <img
                className="poster"
                src={
                  movie.poster_url ||
                  "https://via.placeholder.com/500x750?text=No+Image"
                }
                alt={`${movie.title} 포스터`}
              />
              <div className="movie-info">
                <h3>{movie.title}</h3>
                <p className="muted">
                  {movie.release
                    ? new Date(movie.release).getFullYear()
                    : "미정"}{" "}
                  · {movie.genres.slice(0, 2).join("/")} ·{" "}
                  {movie.runtime ? `${movie.runtime}분` : "정보 없음"}
                </p>
                <div className="tag-list" style={{ marginTop: 10 }}>
                  {movie.tags.slice(0, 5).map((tag) => (
                    <span key={tag} className="tag">{tag}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="section" style={{ marginTop: 18 }}>
              <h3>시놉시스</h3>
              <p className="muted">
                {movie.synopsis || "줄거리 정보가 없습니다."}
              </p>
            </div>

            <div className="section" style={{ marginTop: 18 }}>
              <h3>나와의 적합도</h3>
              {mlLoading ? (
                <p className="muted">분석 중...</p>
              ) : prediction && explanation ? (
                <>
                  <p className="probability">적합 확률 {Math.round(prediction.match_rate)}%</p>
                  <p className="muted" style={{ marginTop: 8, marginBottom: 12 }}>
                    {explanation.explanation}
                  </p>
                  <ul className="list">
                    {explanation.key_factors.slice(0, 3).map((factor, idx) => (
                      <li key={idx}>
                        {factor.label}: {Math.round(factor.score * 100)}% 일치
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <>
                  <p className="probability">적합 확률 83%</p>
                  <ul className="list">
                    <li>거대한 세계관과 몰입도 높은 전개를 선호하셨어요.</li>
                    <li>가족 서사가 중심인 작품을 좋아하셨어요.</li>
                    <li>유사 취향 사용자 반응이 긍정적이었어요.</li>
                  </ul>
                </>
              )}
            </div>

            {prediction && prediction.breakdown.dislike_penalty > 0 && (
              <div className="section" style={{ marginTop: 18 }}>
                <h3>주의할 점</h3>
                <p className="muted">
                  선호하지 않는 요소가 일부 포함되어 있을 수 있습니다.
                </p>
              </div>
            )}

            {/* <div className="hero-actions" style={{ marginTop: 18 }}>
              <button className="primary-btn">바로 감상하기</button>
            </div> */}
          </article>
        </section>

        <section className="section" id="my-review">
          <div className="section-header">
            <h2>내 리뷰</h2>
          </div>
          {personalReview && personalReview.movie_id === movie.id ? (
            <article className="card review-card">
              <div className="review-header">
                <div className="review-user">
                  <div className="review-avatar">
                    {personalReview.user_id.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="review-name">{personalReview.user_id}</p>
                    <p className="muted">
                      {personalReviewDate} · 평점 {personalReview.rating}
                    </p>
                  </div>
                </div>
              </div>
              <p className="review-text">
                {personalReview.content || "리뷰 코멘트가 없습니다."}
              </p>
              <div className="review-link-row">
                <button className="ghost-btn review-link-btn" type="button">
                  리뷰 수정
                </button>
                <button className="ghost-btn review-link-btn" type="button">
                  리뷰 삭제
                </button>
              </div>
            </article>
          ) : (
            <article className="card review-card review-empty review-empty-stack">
              <div className="review-empty-row">
                <p className="muted">아직 이 영화에는 리뷰가 없어요.</p>
                <button
                  className="primary-btn"
                  type="button"
                  onClick={() => setMyReviewOpen((prev) => !prev)}
                >
                  리뷰 남기기
                </button>
              </div>
              {myReviewOpen && (
                <div className="review-form form-grid">
                  <div className="review-form-row">
                    <label htmlFor="my-review-rating">별점</label>
                    <select
                      id="my-review-rating"
                      value={myReviewRating}
                      onChange={(event) =>
                        setMyReviewRating(Number(event.target.value))
                      }
                    >
                      {[5, 4, 3, 2, 1].map((value) => (
                        <option key={value} value={value}>
                          {value}점
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="review-form-row">
                    <label htmlFor="my-review-visibility">공개 여부</label>
                    <select
                      id="my-review-visibility"
                      value={myReviewVisibility}
                      onChange={(event) =>
                        setMyReviewVisibility(
                          event.target.value === "private" ? "private" : "public"
                        )
                      }
                    >
                      <option value="public">공개</option>
                      <option value="private">비공개</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="my-review-content">리뷰</label>
                    <textarea
                      id="my-review-content"
                      className="review-reply-input"
                      placeholder="리뷰를 입력하세요"
                      value={myReviewContent}
                      onChange={(event) => setMyReviewContent(event.target.value)}
                    />
                  </div>
                  <div className="review-reply-actions">
                    <button
                      className="primary-btn review-reply-submit"
                      type="button"
                      onClick={handleMyReviewSave}
                    >
                      저장하기
                    </button>
                  </div>
                </div>
              )}
            </article>
          )}
        </section>

        <section className="section">
          <div className="section-header">
            <h2>다른 사람들의 리뷰</h2>
            <p>이 영화에 대한 다양한 반응</p>
          </div>
          {reviews.length === 0 ? (
            <article className="card review-card review-empty">
              <p className="muted">아직 이 영화에는 리뷰가 없어요.</p>
            </article>
          ) : (
            <div className="review-list">
              {reviews.map((review) => (
                  <article className="card review-card" key={review.id}>
                    <div className="review-header">
                      <div className="review-user">
                        <div className="review-avatar">
                          {review.user_id.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="review-name">{review.user_id}</p>
                          <p className="muted">
                            {new Date(review.created_at).toLocaleDateString("ko-KR")} · 평점 {review.rating}
                          </p>
                        </div>
                      </div>
                      <div className="review-actions">
                        <button
                          className="ghost-btn"
                          type="button"
                          onClick={() => incrementReaction(review.id, "likes")}
                        >
                          좋아요 {reactions[review.id]?.likes ?? review.likes_count ?? 0}
                        </button>
                        {/* <span className="muted">|</span> */}
                        <button
                          className="ghost-btn"
                          type="button"
                          onClick={() => incrementReaction(review.id, "dislikes")}
                        >
                          싫어요 {reactions[review.id]?.dislikes ?? 0}
                        </button>
                      </div>
                    </div>
                    {review.content && (
                      <p className="review-text">
                        {review.content.length > 100 
                          ? review.content.substring(0, 100) + '...' 
                          : review.content}
                      </p>
                    )}
                    <div className="review-link-row">
                      <button
                        className="ghost-btn review-link-btn"
                        type="button"
                        onClick={() => toggleReplyOpen(review.id)}
                      >
                        댓글 달기
                      </button>
                      <button className="ghost-btn review-link-btn" type="button">
                        댓글 보기
                      </button>
                    </div>
                    {replyOpen[review.id] && (
                      <div className="review-reply-form">
                        <textarea
                          className="review-reply-input"
                          placeholder="댓글을 입력하세요"
                          value={replyDrafts[review.id] || ""}
                          onChange={(event) =>
                            handleReplyChange(review.id, event.target.value)
                          }
                        />
                        <div className="review-reply-actions">
                          <button
                            className="primary-btn review-reply-submit"
                            type="button"
                            onClick={() => handleReplySubmit(review.id)}
                          >
                            저장하기
                          </button>
                        </div>
                      </div>
                    )}
                  </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </MainLayout>
  );
}


