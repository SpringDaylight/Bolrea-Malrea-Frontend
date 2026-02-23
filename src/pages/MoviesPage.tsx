import { useEffect, useRef, useState } from "react";
import { useNavigate, useNavigationType, useSearchParams } from "react-router-dom";
import MainLayout from "../components/layout/MainLayout";
import { getMovies, type Movie } from "../api/A2_movies";
import {
  getCurrentUserWatchedMovies,
  saveCurrentUserWatchedMovie,
} from "../api/A8_watched";

const MOVIES_PAGE_SNAPSHOT_KEY = "mw_movies_page_snapshot";

type MoviesPageSnapshot = {
  searchQuery: string;
  selectedSorts: string[];
  selectedGenres: string[];
  selectedRuntime: string | null;
  appliedSorts: string[];
  appliedGenres: string[];
  appliedRuntime: string | null;
  appliedQuery: string;
  currentPage: number;
  scrollY: number;
  restoreOnReturn: boolean;
};

const sortFilters = [
  { value: "latest", label: "최신개봉순" },
  { value: "title", label: "가나다순" },
  { value: "popular", label: "리뷰많은순" },
  { value: "rating", label: "평점높은순" },
];

type GenreFilter = {
  value: string;
  label: string;
  queryGenres: string[];
};

const genreFilters = [
  { value: "로맨스/로코", label: "로맨스/로코", queryGenres: ["로맨스"] },
  { value: "드라마/휴먼", label: "드라마/휴먼", queryGenres: ["드라마"] },
  {
    value: "스릴러/미스터리",
    label: "스릴러/미스터리",
    queryGenres: ["스릴러", "미스터리"],
  },
  { value: "공포/호러", label: "공포/호러", queryGenres: ["공포"] },
  { value: "액션", label: "액션", queryGenres: ["액션"] },
  { value: "범죄/느와르", label: "범죄/느와르", queryGenres: ["범죄"] },
  { value: "SF", label: "SF", queryGenres: ["SF"] },
  { value: "판타지", label: "판타지", queryGenres: ["판타지"] },
  { value: "코미디", label: "코미디", queryGenres: ["코미디"] },
  { value: "애니메이션", label: "애니메이션", queryGenres: ["애니메이션"] },
  { value: "역사/다큐", label: "역사/다큐", queryGenres: ["역사", "다큐멘터리"] },
] as const satisfies GenreFilter[];

const runtimeFilters = [
  { value: "under-100", label: "100분 이내" },
  { value: "between-100-120", label: "100~120분 이내" },
  { value: "between-120-140", label: "120~140분 이내" },
  { value: "over-140", label: "140분 이상" },
] as const;

const resolveFilterToGenres = (values: string[]) => {
  return Array.from(
    new Set(
      values.flatMap((value) => {
        const matched = genreFilters.find((filter) => filter.value === value);
        return matched ? matched.queryGenres : [value];
      })
    )
  );
};

const resolveGenresToFilterValues = (genres: string[]) => {
  return genreFilters
    .filter((filter) => filter.queryGenres.some((genre) => genres.includes(genre)))
    .map((filter) => filter.value);
};

export default function MoviesPage() {
  const navigate = useNavigate();
  const navigationType = useNavigationType();
  const [searchParams] = useSearchParams();
  const isLoggedIn = localStorage.getItem("mw_logged_in") === "true";
  const currentUserPk = localStorage.getItem("mw_user_pk");
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSorts, setSelectedSorts] = useState<string[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedRuntime, setSelectedRuntime] = useState<string | null>(null);
  const [appliedSorts, setAppliedSorts] = useState<string[]>([]);
  const [appliedGenres, setAppliedGenres] = useState<string[]>([]);
  const [appliedRuntime, setAppliedRuntime] = useState<string | null>(null);
  const [appliedQuery, setAppliedQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pendingScrollRestore, setPendingScrollRestore] = useState<number | null>(
    null
  );
  const [watchedMovieIds, setWatchedMovieIds] = useState<Set<number>>(
    () => new Set()
  );
  const shouldSkipSearchParamInitRef = useRef(false);

  useEffect(() => {
    if (!isLoggedIn || !currentUserPk) {
      setWatchedMovieIds(new Set());
      return;
    }

    let isCancelled = false;

    const fetchWatchedMovies = async () => {
      try {
        const response = await getCurrentUserWatchedMovies(currentUserPk, {
          page: 1,
          page_size: 100,
        });
        if (isCancelled) return;
        const scopedWatched = response.items.filter(
          (item) => !item.user_id || String(item.user_id) === String(currentUserPk)
        );

        setWatchedMovieIds(
          new Set(
            scopedWatched.map((item) => Number(item.movie_id)).filter(
              (id) => Number.isFinite(id)
            )
          )
        );
      } catch (err) {
        if (isCancelled) return;
        console.error("Failed to fetch watched movies:", err);
        setWatchedMovieIds(new Set());
      }
    };

    fetchWatchedMovies();
    return () => {
      isCancelled = true;
    };
  }, [isLoggedIn, currentUserPk]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(MOVIES_PAGE_SNAPSHOT_KEY);
      if (!raw) return;
      if (navigationType !== "POP") {
        sessionStorage.removeItem(MOVIES_PAGE_SNAPSHOT_KEY);
        return;
      }
      const parsed = JSON.parse(raw) as MoviesPageSnapshot;

      if (!parsed || parsed.restoreOnReturn !== true) return;

      const toStringArray = (value: unknown) =>
        Array.isArray(value)
          ? value.filter((item): item is string => typeof item === "string")
          : [];

      setSearchQuery(typeof parsed.searchQuery === "string" ? parsed.searchQuery : "");
      setSelectedSorts(toStringArray(parsed.selectedSorts));
      setSelectedGenres(toStringArray(parsed.selectedGenres));
      setSelectedRuntime(
        typeof parsed.selectedRuntime === "string" ? parsed.selectedRuntime : null
      );
      setAppliedSorts(toStringArray(parsed.appliedSorts));
      setAppliedGenres(toStringArray(parsed.appliedGenres));
      setAppliedRuntime(
        typeof parsed.appliedRuntime === "string" ? parsed.appliedRuntime : null
      );
      setAppliedQuery(typeof parsed.appliedQuery === "string" ? parsed.appliedQuery : "");
      setCurrentPage(
        Number.isFinite(parsed.currentPage) && parsed.currentPage > 0
          ? Math.floor(parsed.currentPage)
          : 1
      );
      setPendingScrollRestore(
        Number.isFinite(parsed.scrollY) && parsed.scrollY >= 0
          ? parsed.scrollY
          : 0
      );
      shouldSkipSearchParamInitRef.current = true;
    } catch (err) {
      console.error("Failed to restore movies page state:", err);
    }
  }, [navigationType]);

  useEffect(() => {
    if (shouldSkipSearchParamInitRef.current) {
      shouldSkipSearchParamInitRef.current = false;
      return;
    }

    const queryFromUrl = searchParams.get("query");
    const genresFromUrl = searchParams.get("genres");

    if (queryFromUrl) {
      setSearchQuery(queryFromUrl);
      setAppliedQuery(queryFromUrl);
    }

    if (genresFromUrl) {
      const genreList = genresFromUrl.split(",").map((genre) => genre.trim());
      const selectedFilterValues = resolveGenresToFilterValues(genreList);
      setSelectedGenres(selectedFilterValues.length > 0 ? selectedFilterValues : genreList);
      setAppliedGenres(genreList);
    }

    if (queryFromUrl || genresFromUrl) {
      setCurrentPage(1);
    }
  }, [searchParams]);

  useEffect(() => {
    if (pendingScrollRestore === null) return;
    if (loading) return;

    const frame = window.requestAnimationFrame(() => {
      window.scrollTo({
        top: pendingScrollRestore,
        behavior: "auto",
      });
      setPendingScrollRestore(null);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [loading, pendingScrollRestore, movies.length]);

  useEffect(() => {
    let isCancelled = false;

    const fetchMovies = async () => {
      setLoading(true);
      setError(null);
      try {
        const sortKey = appliedSorts.length > 0 ? appliedSorts[0] : undefined;
        const sort =
          sortKey && sortKey !== "title"
            ? (sortKey as "latest" | "popular" | "rating")
            : undefined;
        const genres = appliedGenres.length > 0 ? appliedGenres.join(",") : undefined;

        const response = await getMovies({
          query: appliedQuery || undefined,
          genres,
          sort,
          page: currentPage,
          page_size: 20,
        });

        if (isCancelled) return;
        const normalizedQuery = appliedQuery.trim().toLowerCase();
        const filteredByTitle =
          normalizedQuery.length > 0
            ? response.movies.filter((movie) =>
                (movie.title ?? "").toLowerCase().includes(normalizedQuery)
              )
            : response.movies;
        const filteredByRuntime =
          appliedRuntime === "under-100"
            ? filteredByTitle.filter(
                (movie) => typeof movie.runtime === "number" && movie.runtime <= 100
              )
            : appliedRuntime === "between-100-120"
              ? filteredByTitle.filter(
                  (movie) =>
                    typeof movie.runtime === "number" &&
                    movie.runtime >= 100 &&
                    movie.runtime <= 120
                )
              : appliedRuntime === "between-120-140"
                ? filteredByTitle.filter(
                    (movie) =>
                      typeof movie.runtime === "number" &&
                      movie.runtime >= 120 &&
                      movie.runtime <= 140
                  )
                : appliedRuntime === "over-140"
                  ? filteredByTitle.filter(
                      (movie) => typeof movie.runtime === "number" && movie.runtime > 140
                    )
                  : filteredByTitle;
        const nextMovies =
          sortKey === "title"
            ? [...filteredByRuntime].sort((a, b) =>
                (a.title ?? "").localeCompare(b.title ?? "", "ko")
              )
            : filteredByRuntime;
        setMovies(nextMovies);
        const totalSource =
          normalizedQuery.length > 0 || appliedRuntime
            ? filteredByRuntime.length
            : response.total;
        const nextTotalPages = Math.max(
          1,
          Math.ceil(totalSource / response.page_size)
        );
        setTotalPages(nextTotalPages);
      } catch (err) {
        if (isCancelled) return;
        setError("영화 목록을 불러오는데 실패했습니다.");
        console.error("Failed to fetch movies:", err);
      } finally {
        if (isCancelled) return;
        setLoading(false);
      }
    };

    fetchMovies();
    return () => {
      isCancelled = true;
    };
  }, [appliedSorts, appliedGenres, appliedQuery, appliedRuntime, currentPage]);

  const handleSortSelect = (value: string) => {
    setSelectedSorts((prev) => {
      const nextSorts = prev[0] === value ? [] : [value];
      setAppliedSorts(nextSorts);
      setCurrentPage(1);
      return nextSorts;
    });
  };

  const handleGenreToggle = (value: string) => {
    setSelectedGenres((prev) => {
      const nextSelected = prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value];
      setAppliedGenres(resolveFilterToGenres(nextSelected));
      setCurrentPage(1);
      return nextSelected;
    });
  };

  const handleRuntimeToggle = (value: string) => {
    setSelectedRuntime((prev) => {
      const nextSelected = prev === value ? null : value;
      setAppliedRuntime(nextSelected);
      setCurrentPage(1);
      return nextSelected;
    });
  };

  const handleApplyFilters = () => {
    setAppliedQuery(searchQuery);
    setCurrentPage(1);
  };

  const handleMarkWatched = async (movie: Movie) => {
    if (!isLoggedIn) {
      navigate("/login");
      return;
    }
    if (!currentUserPk) return;

    try {
      await saveCurrentUserWatchedMovie(currentUserPk, { movie_id: movie.id });
      setWatchedMovieIds((prev) => {
        const next = new Set(prev);
        next.add(movie.id);
        return next;
      });
    } catch (err) {
      console.error("Failed to save watched movie:", err);
    }
  };

  const saveSnapshot = (restoreOnReturn: boolean) => {
    const snapshot: MoviesPageSnapshot = {
      searchQuery,
      selectedSorts,
      selectedGenres,
      selectedRuntime,
      appliedSorts,
      appliedGenres,
      appliedRuntime,
      appliedQuery,
      currentPage,
      scrollY: window.scrollY,
      restoreOnReturn,
    };
    sessionStorage.setItem(MOVIES_PAGE_SNAPSHOT_KEY, JSON.stringify(snapshot));
  };

  const handleOpenMovieDetail = (movieId: number) => {
    saveSnapshot(true);
    navigate(`/movies/${movieId}`);
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
        {/* <section className="page-title">
          <h1>영화 검색하기</h1>
        </section> */}

        <section className="section card">
          {/* <div className="section-header">
            <p>장르와 분위기에 따라 원하는 기준으로 골라보세요</p>
          </div> */}
          <div className="section-search">
            <div className="hero-actions">
              <input
                className="search-input"
                type="text"
                placeholder="영화 제목을 검색해보세요"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
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

          <div className="filter-group movie-filter-group">
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
                    onClick={() => handleGenreToggle(filter.value)}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="filter-title">상영시간</p>
              <div className="tag-list">
                {runtimeFilters.map((filter) => (
                  <button
                    key={filter.value}
                    className={`filter-chip ${
                      selectedRuntime === filter.value ? "active" : ""
                    }`}
                    type="button"
                    onClick={() => handleRuntimeToggle(filter.value)}
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
            <h2>검색결과</h2>
            {/* <p>선택한 기준으로 추천된 영화가 표시됩니다</p> */}
          </div>
          <div className="movie-sort-links">
            {sortFilters.map((filter) => (
              <button
                key={filter.value}
                className={`movie-sort-link ${
                  selectedSorts.includes(filter.value) ? "active" : ""
                }`}
                type="button"
                onClick={() => handleSortSelect(filter.value)}
                aria-pressed={selectedSorts.includes(filter.value)}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {loading && <p>로딩 중...</p>}
          {error && <p className="error">{error}</p>}

          {!loading && !error && movies.length === 0 && (
            <p>검색결과가 없습니다.</p>
          )}

          {!loading && !error && movies.length > 0 && (
            <div className="movie-grid">
              {movies.map((movie) => (
                <article
                  className="card movie-tile movie-card-clickable"
                  key={movie.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleOpenMovieDetail(movie.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      handleOpenMovieDetail(movie.id);
                    }
                  }}
                >
                  <img
                    className="poster"
                    src={
                      movie.poster_url ||
                      "https://via.placeholder.com/500x750?text=No+Image"
                    }
                    alt={`${movie.title} 포스터`}
                  />
                  <div className="movie-info">
                    <div className="movie-card-title-row">
                      <h3>{movie.title}</h3>
                      <button
                        className={`ghost-btn movie-detail-watch-btn ${
                          watchedMovieIds.has(movie.id) ? "is-active" : ""
                        }`}
                        type="button"
                        aria-pressed={watchedMovieIds.has(movie.id)}
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          handleMarkWatched(movie);
                        }}
                      >
                        시청함
                      </button>
                    </div>
                    <p className="movie-rating">
                      평점{" "}
                      {typeof movie.avg_rating === "number"
                        ? movie.avg_rating.toFixed(1)
                        : "정보 없음"}{" "}
                      ({movie.reviews_count ?? movie.review_count ?? 0})
                    </p>
                    <p className="muted synopsis-clamp">
                      {movie.synopsis || "줄거리 정보가 없습니다."}
                    </p>
                    {/* <div className="meta-list">
                      {movie.genres.slice(0, 3).map((genre) => (
                        <span key={genre}>{genre}</span>
                      ))}
                      {movie.runtime && <span>{movie.runtime}분</span>}
                    </div> */}
                  </div>
                </article>
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
