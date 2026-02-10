import { useEffect, useState } from "react";
import MainLayout from "../components/layout/MainLayout";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getMovie, getMovieReviews, type Movie, type Review } from "../api/A2_movies";

export default function MovieDetailPage() {
  const navigate = useNavigate();
  const { movieId } = useParams<{ movieId: string }>();
  const [movie, setMovie] = useState<Movie | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMovieData = async () => {
      if (!movieId) return;
      
      setLoading(true);
      setError(null);
      try {
        const movieData = await getMovie(Number(movieId));
        setMovie(movieData);
        
        const reviewsData = await getMovieReviews(Number(movieId), { page_size: 10 });
        setReviews(reviewsData.reviews);
      } catch (err) {
        setError('영화 정보를 불러오는데 실패했습니다.');
        console.error('Failed to fetch movie data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMovieData();
  }, [movieId]);

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
          <p className="error">{error || '영화를 찾을 수 없습니다.'}</p>
        </main>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <main className="container">
        <section className="page-title">
          <h1>영화 상세</h1>
          <p>영화를 선택하면 상세 정보와 나와의 적합도를 함께 볼 수 있어요.</p>
        </section>

        <section className="section">
          <article className="card">
            <div className="movie-tile">
              <img
                className="poster"
                src={movie.poster_url || 'https://via.placeholder.com/500x750?text=No+Image'}
                alt={`${movie.title} 포스터`}
              />
              <div className="movie-info">
                <h3>{movie.title}</h3>
                <p className="muted">
                  {movie.release ? new Date(movie.release).getFullYear() : '미정'} · 
                  {movie.genres.slice(0, 2).join('/')} · 
                  {movie.runtime ? `${movie.runtime}분` : '정보 없음'}
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
                {movie.synopsis || '줄거리 정보가 없습니다.'}
              </p>
            </div>

            <div className="section" style={{ marginTop: 18 }}>
              <h3>나와의 적합도</h3>
              <p className="probability">적합 확률 83%</p>
              <ul className="list">
                <li>거대한 세계관과 몰입도 높은 전개를 선호하셨어요.</li>
                <li>가족 서사가 중심인 작품을 좋아하셨어요.</li>
                <li>유사 취향 사용자 반응이 긍정적이었어요.</li>
              </ul>
            </div>

            <div className="section" style={{ marginTop: 18 }}>
              <h3>주의할 점</h3>
              <p className="muted">후반부 과학 설정이 어렵게 느껴질 수 있어요.</p>
            </div>

            {/* <div className="hero-actions" style={{ marginTop: 18 }}>
              <button className="primary-btn">바로 감상하기</button>
            </div> */}
          </article>
        </section>

        <section className="section">
          <div className="section-header">
            <h2>내 리뷰</h2>
            <p>내가 남긴 코멘트</p>
          </div>
          <article className="card review-card review-empty">
            <p className="muted">아직 이 영화에 대한 내 리뷰가 없어요.</p>
            <button
              className="primary-btn"
              type="button"
              onClick={() => navigate("/log")}
            >
              리뷰 남기기
            </button>
          </article>
        </section>

        <section className="section">
          <div className="section-header">
            <h2>다른 사람들의 리뷰</h2>
            <p>이 영화에 대한 다양한 반응</p>
          </div>
          {reviews.length === 0 ? (
            <article className="card review-card review-empty">
              <p className="muted">아직 이 영화에 대한 리뷰가 없어요.</p>
            </article>
          ) : (
            <div className="review-list">
              {reviews.map((review) => (
                <Link className="card-link" to={`/reviews/${review.id}`} key={review.id}>
                  <article className="card review-card">
                    <div className="review-header">
                      <div className="review-user">
                        <div className="review-avatar">
                          {review.user_id.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="review-name">{review.user_id}</p>
                          <p className="muted">
                            {new Date(review.created_at).toLocaleDateString('ko-KR')} · 평점 {review.rating}
                          </p>
                        </div>
                      </div>
                      <button className="ghost-btn">좋아요 {review.likes_count}</button>
                    </div>
                    {review.content && (
                      <p className="review-text">
                        {review.content.length > 100 
                          ? review.content.substring(0, 100) + '...' 
                          : review.content}
                      </p>
                    )}
                  </article>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </MainLayout>
  );
}
