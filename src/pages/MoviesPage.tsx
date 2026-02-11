import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import MainLayout from "../components/layout/MainLayout";
import { getMovies, type Movie } from "../api/A2_movies";

const sortFilters = [
  { value: "latest", label: "최신 개봉순" },
  { value: "popular", label: "인기순" },
  { value: "rating", label: "평점 높은순" },
];

const genreFilters = [
  { value: "로맨스/로코", label: "로맨스/로코" },
  { value: "드라마/휴먼", label: "드라마/휴먼" },
  { value: "스릴러/미스터리", label: "스릴러/미스터리" },
  { value: "공포/호러", label: "공포/호러" },
  { value: "액션", label: "액션" },
  { value: "범죄/느와르", label: "범죄/느와르" },
  { value: "SF", label: "SF" },
  { value: "판타지", label: "판타지" },
  { value: "코미디", label: "코미디" },
  { value: "애니메이션", label: "애니메이션" },
  { value: "역사/다큐", label: "역사/다큐" },
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
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const queryFromUrl = searchParams.get("query");
    const genresFromUrl = searchParams.get("genres");

    if (queryFromUrl) {
      setSearchQuery(queryFromUrl);
      setAppliedQuery(queryFromUrl);
    }

    if (genresFromUrl) {
      const genreList = genresFromUrl.split(",").map((genre) => genre.trim());
      setSelectedGenres(genreList);
      setAppliedGenres(genreList);
    }

    if (queryFromUrl || genresFromUrl) {
      setCurrentPage(1);
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchMovies = async () => {
      setLoading(true);
      setError(null);
      try {
        const sort =
          appliedSorts.length > 0
            ? (appliedSorts[0] as "latest" | "popular" | "rating")
            : undefined;
        const genres = appliedGenres.length > 0 ? appliedGenres.join(",") : undefined;

        const response = await getMovies({
          query: appliedQuery || undefined,
          genres,
          sort,
          page: currentPage,
          page_size: 20,
        });

        setMovies(response.movies);
        const nextTotalPages = Math.max(
          1,
          Math.ceil(response.total / response.page_size)
        );
        setTotalPages(nextTotalPages);
      } catch (err) {
        setError("영화 목록을 불러오는데 실패했습니다.");
        console.error("Failed to fetch movies:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMovies();
  }, [appliedSorts, appliedGenres, appliedQuery, currentPage]);

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

  const handleSortSelect = (value: string) => {
    setSelectedSorts((prev) => (prev[0] === value ? [] : [value]));
  };

  const handleApplyFilters = () => {
    setAppliedSorts(selectedSorts);
    setAppliedGenres(selectedGenres);
    setAppliedQuery(searchQuery);
    setCurrentPage(1);
  };

  const pageWindow = (() => {
    const windowSize = 5;
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, currentPage + 2);

    if (currentPage <= 3) {
      end = Math.min(totalPages, windowSize);
    }

    if (currentPage >= totalPages - 2) {
      start = Math.max(1, totalPages - (windowSize - 1));
    }

    return { start, end };
  })();

  return (
    <MainLayout>
      <main className="container movies-page">
        <section className="page-title">
          <h1>영화 목록</h1>
        </section>

        <section className="section card">
          <div className="section-header">
            <p>장르와 분위기에 따라 원하는 기준으로 골라보세요.</p>
          </div>
          <div className="section-search">
            <div className="hero-actions">
              <input
                className="search-input"
                type="text"
                placeholder="영화 제목을 검색하세요"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && handleApplyFilters()}
              />
              <button
                className="primary-btn"
                type="button"
                onClick={handleApplyFilters}
              >
                검색
              </button>
            </div>
          </div>

          <div className="filter-group">
            <div>
              <p className="filter-title">정렬</p>
              <div className="tag-list">
                {sortFilters.map((filter) => (
                  <button
                    key={filter.value}
                    className={`filter-chip ${
                      selectedSorts.includes(filter.value) ? "active" : ""
                    }`}
                    type="button"
                    onClick={() => handleSortSelect(filter.value)}
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
                      toggleValue(filter.value, selectedGenres, setSelectedGenres)
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
            <h2>검색 결과</h2>
            <p>선택한 기준으로 추천된 영화가 표시됩니다.</p>
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
                      src={
                        movie.poster_url ||
                        "https://via.placeholder.com/500x750?text=No+Image"
                      }
                      alt={`${movie.title} 포스터`}
                    />
                    <div className="movie-info">
                      <h3>{movie.title}</h3>
                      <p className="movie-rating">
                        평점{" "}
                        {typeof movie.avg_rating === "number"
                          ? movie.avg_rating.toFixed(1)
                          : "정보 없음"}
                      </p>
                      <p className="muted">
                        {movie.synopsis
                          ? movie.synopsis.substring(0, 60) +
                            (movie.synopsis.length > 60 ? "..." : "")
                          : "줄거리 정보가 없습니다."}
                      </p>
                      <div className="meta-list">
                        {movie.genres.slice(0, 3).map((genre) => (
                          <span key={genre}>{genre}</span>
                        ))}
                        {movie.runtime && <span>{movie.runtime}분</span>}
                      </div>
                      <span className="ghost-btn movie-detail-btn">상세보기</span>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          )}

          {!loading && !error && totalPages > 1 && (
            <div className="pagination">
              <button
                className="page-btn"
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPage === 1}
              >
                Prev
              </button>

              {pageWindow.start > 1 && (
                <>
                  <button
                    className="page-btn"
                    type="button"
                    onClick={() => setCurrentPage(1)}
                  >
                    1
                  </button>
                  <span className="pagination-ellipsis">...</span>
                </>
              )}

              {Array.from(
                { length: pageWindow.end - pageWindow.start + 1 },
                (_, index) => pageWindow.start + index
              ).map((page) => (
                <button
                  key={page}
                  className={`page-btn ${page === currentPage ? "active" : ""}`}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </button>
              ))}

              {pageWindow.end < totalPages && (
                <>
                  <span className="pagination-ellipsis">...</span>
                  <button
                    className="page-btn"
                    type="button"
                    onClick={() => setCurrentPage(totalPages)}
                  >
                    {totalPages}
                  </button>
                </>
              )}

              <button
                className="page-btn"
                type="button"
                onClick={() =>
                  setCurrentPage((page) => Math.min(totalPages, page + 1))
                }
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </div>
          )}
        </section>
      </main>
    </MainLayout>
  );
}
