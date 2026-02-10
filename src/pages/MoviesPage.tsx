import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import MainLayout from "../components/layout/MainLayout";
import { getMovies, type Movie } from "../api/A2_movies";

const sortFilters = [
  { value: "latest", label: "최신개봉작" },
  { value: "popular", label: "박스오피스 순위" },
  { value: "rating", label: "평점 높은 순" },
];

const genreFilters = [
  { value: "로맨스", label: "로맨스" },
  { value: "드라마", label: "드라마" },
  { value: "스릴러", label: "스릴러" },
  { value: "공포", label: "공포" },
  { value: "액션", label: "액션" },
  { value: "범죄", label: "범죄" },
  { value: "SF", label: "SF" },
  { value: "판타지", label: "판타지" },
  { value: "코미디", label: "코미디" },
  { value: "애니메이션", label: "애니메이션" },
  { value: "역사", label: "역사" },
  { value: "다큐멘터리", label: "다큐멘터리" },
];

export default function MoviesPage() {
  const [searchParams] = useSearchParams();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSorts, setSelectedSorts] = useState<string[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [appliedSorts, setAppliedSorts] = useState<string[]>([]);
  const [appliedGenres, setAppliedGenres] = useState<string[]>([]);
  const [appliedQuery, setAppliedQuery] = useState("");

  // Initialize from URL query params
  useEffect(() => {
    const queryFromUrl = searchParams.get('query');
    const genresFromUrl = searchParams.get('genres');
    
    if (queryFromUrl) {
      setSearchQuery(queryFromUrl);
      setAppliedQuery(queryFromUrl);
    }
    
    if (genresFromUrl) {
      const genreList = genresFromUrl.split(',').map(g => g.trim());
      setSelectedGenres(genreList);
      setAppliedGenres(genreList);
    }
  }, [searchParams]);

  // Fetch movies from API
  useEffect(() => {
    const fetchMovies = async () => {
      setLoading(true);
      setError(null);
      try {
        const sort = appliedSorts.length > 0 ? appliedSorts[0] as 'latest' | 'popular' | 'rating' : undefined;
        const genres = appliedGenres.length > 0 ? appliedGenres.join(',') : undefined;
        
        const response = await getMovies({
          query: appliedQuery || undefined,
          genres,
          sort,
          page_size: 50,
        });
        
        setMovies(response.movies);
      } catch (err) {
        setError('영화 목록을 불러오는데 실패했습니다.');
        console.error('Failed to fetch movies:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMovies();
  }, [appliedSorts, appliedGenres, appliedQuery]);

  const toggleValue = (
    value: string,
    list: string[],
    setList: (next: string[]) => void
  ) => {
    if (list.includes(value)) {
      setList(list.filter((item) => item !== value));
      return;
    }
    setList([...list, value]);
  };

  const handleApplyFilters = () => {
    setAppliedSorts(selectedSorts);
    setAppliedGenres(selectedGenres);
    setAppliedQuery(searchQuery);
  };

  return (
    <MainLayout>
      <main className="container">
        <section className="page-title">
          <h1>영화 목록</h1>
          <p>장르와 분위기에 따라 원하는 기준으로 골라보세요.</p>
        </section>

        <section className="section card">
          <div className="section-search">
            <div className="hero-actions">
              <input
                className="search-input"
                type="text"
                placeholder="영화 제목 검색"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleApplyFilters()}
              />
              <button
                className="primary-btn"
                type="button"
                onClick={handleApplyFilters}
              >
                검색 버튼
              </button>
            </div>
          </div>

          {/* <div className="section-header">
            <h2>필터</h2>
            <p>선택한 분류만 보기</p>
          </div> */}

          <div className="filter-group">
            <div>
              <p className="filter-title">분류</p>
              <div className="tag-list">
                {sortFilters.map((filter) => (
                  <button
                    key={filter.value}
                    className={`filter-chip ${
                      selectedSorts.includes(filter.value) ? "active" : ""
                    }`}
                    type="button"
                    onClick={() =>
                      toggleValue(filter.value, selectedSorts, setSelectedSorts)
                    }
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="filter-title">장르</p>
              <div className="tag-list">
                {genreFilters.map((filter) => (
                  <button
                    key={filter.value}
                    className={`filter-chip ${
                      selectedGenres.includes(filter.value) ? "active" : ""
                    }`}
                    type="button"
                    onClick={() =>
                      toggleValue(
                        filter.value,
                        selectedGenres,
                        setSelectedGenres
                      )
                    }
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="section-header">
            <h2>선택된 결과</h2>
            <p>선택한 기준으로 추천 영화가 표시됩니다.</p>
          </div>
          
          {loading && <p>로딩 중...</p>}
          {error && <p className="error">{error}</p>}
          
          {!loading && !error && movies.length === 0 && (
            <p>검색 결과가 없습니다.</p>
          )}
          
          {!loading && !error && movies.length > 0 && (
            <div className="movie-grid">
              {movies.map((movie) => (
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
                      <span className="ghost-btn">상세 보기</span>
                      <div className="meta-list">
                        {movie.genres.slice(0, 3).map((genre) => (
                          <span key={genre}>{genre}</span>
                        ))}
                        {movie.runtime && <span>{movie.runtime}분</span>}
                      </div>
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
