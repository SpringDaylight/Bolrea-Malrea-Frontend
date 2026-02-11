import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import MainLayout from "../components/layout/MainLayout";
import {
  createMovieReview,
  getMovie,
  type Movie,
  type Review,
} from "../api/A2_movies";

const ratingOptions = [
  "0.5",
  "1.0",
  "1.5",
  "2.0",
  "2.5",
  "3.0",
  "3.5",
  "4.0",
  "4.5",
  "5.0",
];

export default function ReviewDetailPage() {
  const navigate = useNavigate();
  const { reviewId } = useParams<{ reviewId: string }>();
  const [searchParams] = useSearchParams();
  const isCreate = reviewId === "new";

  const movieIdParam = searchParams.get("movieId");
  const movieId = movieIdParam ? Number(movieIdParam) : NaN;

  const [movie, setMovie] = useState<Movie | null>(null);
  const [rating, setRating] = useState("4.5");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isCreate) return;

    if (!movieIdParam || Number.isNaN(movieId)) {
      setError("영화 정보를 찾을 수 없습니다.");
      return;
    }

    const fetchMovie = async () => {
      setLoading(true);
      setError(null);
      try {
        const movieData = await getMovie(movieId);
        setMovie(movieData);
      } catch (err) {
        setError("영화 정보를 불러오는데 실패했습니다.");
        console.error("Failed to fetch movie data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMovie();
  }, [isCreate, movieId, movieIdParam]);

  const handleSave = async () => {
    if (!movie) return;

    setSaving(true);
    setError(null);
    try {
      const userId =
        localStorage.getItem("mw_user_id") ||
        localStorage.getItem("mw_profile_id") ||
        "guest";

      const createdReview: Review = await createMovieReview(movie.id, userId, {
        rating: Number(rating),
        content: content.trim() || undefined,
      });

      navigate(`/movies/${movie.id}`, {
        replace: true,
        state: { newReview: createdReview },
      });
    } catch (err) {
      setError("리뷰 저장에 실패했습니다.");
      console.error("Failed to create review:", err);
    } finally {
      setSaving(false);
    }
  };

  if (isCreate) {
    if (loading) {
      return (
        <MainLayout>
          <main className="container">
            <p>로딩 중...</p>
          </main>
        </MainLayout>
      );
    }

    if (!movie) {
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
            <h1>리뷰 남기기</h1>
            <p>영화에 대한 짧은 코멘트와 평점을 남겨주세요.</p>
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
                </div>
              </div>

              <div className="section" style={{ marginTop: 16 }}>
                <div className="form-grid">
                  <label>평점</label>
                  <select
                    value={rating}
                    onChange={(event) => setRating(event.target.value)}
                  >
                    {ratingOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <label>코멘트</label>
                  <textarea
                    placeholder="영화에 대한 생각을 남겨주세요"
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                  />
                </div>
                {error && <p className="error">{error}</p>}
                <button
                  className="primary-btn"
                  style={{ marginTop: 12 }}
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? "저장 중..." : "리뷰 저장"}
                </button>
              </div>
            </article>
          </section>
        </main>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <main className="container">
        <section className="page-title">
          <h1>리뷰 상세</h1>
          <p>한 줄 코멘트와 반응을 모아보세요.</p>
        </section>

        <section className="section">
          <article className="card review-detail">
            <div className="review-header">
              <div className="review-user">
                <div className="review-avatar">HJ</div>
                <div>
                  <p className="review-name">해진</p>
                  <p className="muted">인터스텔라 · 2026.01.30 · 평점 4.0</p>
                </div>
              </div>
              <button className="ghost-btn">팔로우</button>
            </div>

            <p className="review-text review-body">
              "과학보다 감정이 더 선명하게 남는 작품. 가족 서사가 깊게 와닿았다."
            </p>

            <div className="review-actions">
              <button className="like-btn">좋아요 24</button>
              <button className="ghost-btn">댓글 6</button>
              <span className="tag">가족</span>
              <span className="tag">감정선</span>
            </div>
          </article>
        </section>

        <section className="section">
          <div className="section-header">
            <h2>댓글</h2>
            <p>이 리뷰에 대한 대화</p>
          </div>

          <article className="card comment-form">
            <div className="comment-input">
              <div className="review-avatar">DS</div>
              <textarea placeholder="댓글을 남겨보세요" />
            </div>
            <div className="comment-actions">
              <button className="secondary-btn">댓글 남기기</button>
            </div>
          </article>

          <div className="comment-list">
            <article className="card comment-card">
              <div className="review-user">
                <div className="review-avatar">MK</div>
                <div>
                  <p className="review-name">민규</p>
                  <p className="muted">2026.02.01</p>
                </div>
              </div>
              <p className="muted">
                저도 가족 서사가 핵심이라고 느꼈어요. 음악이 진짜 좋아요.
              </p>
              <div className="comment-meta">
                <button className="ghost-btn">좋아요 3</button>
                <button className="ghost-btn">답글</button>
              </div>
            </article>

            <article className="card comment-card">
              <div className="review-user">
                <div className="review-avatar">SY</div>
                <div>
                  <p className="review-name">소영</p>
                  <p className="muted">2026.01.31</p>
                </div>
              </div>
              <p className="muted">극장 사운드가 정말 큰 역할을 하는 영화였죠.</p>
              <div className="comment-meta">
                <button className="ghost-btn">좋아요 8</button>
                <button className="ghost-btn">답글</button>
              </div>
            </article>

            <article className="card comment-card">
              <div className="review-user">
                <div className="review-avatar">JH</div>
                <div>
                  <p className="review-name">지훈</p>
                  <p className="muted">2026.01.30</p>
                </div>
              </div>
              <p className="muted">
                저는 후반부가 조금 어려웠는데, 그래도 감정은 남았어요.
              </p>
              <div className="comment-meta">
                <button className="ghost-btn">좋아요 2</button>
                <button className="ghost-btn">답글</button>
              </div>
            </article>
          </div>
        </section>
      </main>
    </MainLayout>
  );
}
