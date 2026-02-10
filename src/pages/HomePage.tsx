import { useEffect, useState } from "react";
import MainLayout from "../components/layout/MainLayout";
import { Link, useNavigate } from "react-router-dom";
import { getMovies, type Movie } from "../api/A2_movies";

export default function HomePage() {
  const navigate = useNavigate();
  const [recommendedMovies, setRecommendedMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchRecommendations = async () => {
      setLoading(true);
      try {
        const response = await getMovies({ sort: 'popular', page_size: 4 });
        setRecommendedMovies(response.movies);
      } catch (err) {
        console.error('Failed to fetch recommendations:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, []);

  const handleSearch = () => {
    const trimmedQuery = searchQuery.trim();
    
    if (!trimmedQuery) {
      navigate('/movies');
      return;
    }
    
    // Check if query matches any genre (case-insensitive, Korean or English)
    const genreMap: { [key: string]: string } = {
      '로맨스': '로맨스',
      '드라마': '드라마',
      '스릴러': '스릴러',
      '공포': '공포',
      '액션': '액션',
      '범죄': '범죄',
      'sf': 'SF',
      '판타지': '판타지',
      '코미디': '코미디',
      '애니메이션': '애니메이션',
      '역사': '역사',
      '다큐멘터리': '다큐멘터리',
      '모험': '모험',
      '가족': '가족',
      '미스터리': '미스터리',
      '전쟁': '전쟁',
      '서부': '서부',
      '음악': '음악',
      // English mappings
      'romance': '로맨스',
      'drama': '드라마',
      'thriller': '스릴러',
      'horror': '공포',
      'action': '액션',
      'crime': '범죄',
      'science fiction': 'SF',
      'fantasy': '판타지',
      'comedy': '코미디',
      'animation': '애니메이션',
      'history': '역사',
      'documentary': '다큐멘터리',
      'adventure': '모험',
      'family': '가족',
      'mystery': '미스터리',
      'war': '전쟁',
      'western': '서부',
      'music': '음악'
    };
    
    const lowerQuery = trimmedQuery.toLowerCase();
    const matchedGenre = genreMap[lowerQuery];
    
    if (matchedGenre) {
      // Search by genre
      navigate(`/movies?genres=${encodeURIComponent(matchedGenre)}`);
    } else {
      // Search by title/synopsis
      navigate(`/movies?query=${encodeURIComponent(trimmedQuery)}`);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const response = await getMovies({ sort: 'rating', page_size: 4 });
      setRecommendedMovies(response.movies);
    } catch (err) {
      console.error('Failed to refresh recommendations:', err);
    } finally {
      setLoading(false);
    }
  };
  return (
    <MainLayout>
      <main className="container">
        <section className="hero">
          <div>
            {/* <p className="eyebrow">Discover</p> */}
            <h1>지금 기분에 맞는 영화를 찾아보세요</h1>
            <p>
              취향 데이터와 상황 맥락을 결합해 만족 가능성까지 한 번에 알려드려요.
            </p>
            <div className="hero-actions">
              <input
                className="search-input"
                type="text"
                placeholder="장르, 분위기, 제목으로 검색"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <button className="primary-btn" onClick={handleSearch}>맞춤 추천 받기</button>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="section-header">
            <h2>나를 위한 추천</h2>
            <button className="primary-btn btn-animate" onClick={handleRefresh}>새로고침</button>
          </div>
          
          {loading && <p>로딩 중...</p>}
          
          {!loading && recommendedMovies.length > 0 && (
            <div className="movie-grid">
              {recommendedMovies.map((movie) => (
                <Link className="card-link" to={`/movies/${movie.id}`} key={movie.id}>
                  <article className="card movie-tile">
                    <img
                      className="poster"
                      src={movie.poster_url || 'https://via.placeholder.com/500x750?text=No+Image'}
                      alt={`${movie.title} 포스터`}
                    />
                    <div className="movie-info">
                      <h3>{movie.title}</h3>
                      <p className="muted">
                        {movie.synopsis 
                          ? movie.synopsis.substring(0, 60) + (movie.synopsis.length > 60 ? '...' : '')
                          : '줄거리 정보가 없습니다.'}
                      </p>
                      <span className="ghost-btn">자세히 보기</span>
                    </div>
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