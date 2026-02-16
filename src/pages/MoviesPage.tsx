import { useEffect, useRef, useState } from "react";
import { useNavigate, useNavigationType, useSearchParams } from "react-router-dom";
import MainLayout from "../components/layout/MainLayout";
import { getMovies, type Movie } from "../api/A2_movies";
import {
  getCurrentUserWatchedMovies,
  saveCurrentUserWatchedMovie,
<<<<<<< HEAD
  getLocalWatchedMovies,
  upsertLocalWatchedMovie,
=======
>>>>>>> origin/develop
} from "../api/A8_watched";

const MOVIES_PAGE_SNAPSHOT_KEY = "mw_movies_page_snapshot";

type MoviesPageSnapshot = {
  searchQuery: string;
  selectedSorts: string[];
  selectedGenres: string[];
  appliedSorts: string[];
  appliedGenres: string[];
  appliedQuery: string;
  currentPage: number;
  scrollY: number;
  restoreOnReturn: boolean;
};

const sortFilters = [
  { value: "latest", label: "최신 개봉순" },
  { value: "popular", label: "리뷰 많은순" },
  { value: "rating", label: "평점 높은순" },
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
  const [appliedSorts, setAppliedSorts] = useState<string[]>([]);
  const [appliedGenres, setAppliedGenres] = useState<string[]>([]);
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
<<<<<<< HEAD
        const localWatched = getLocalWatchedMovies(currentUserPk);
=======
>>>>>>> origin/develop
        const response = await getCurrentUserWatchedMovies(currentUserPk, {
          page: 1,
          page_size: 500,
        });
        if (isCancelled) return;
<<<<<<< HEAD
        const scopedWatched = response.items.filter(
          (item) => !item.user_id || String(item.user_id) === String(currentUserPk)
        );
        const localIds = localWatched
          .map((item) => Number(item.movie_id))
          .filter((id) => Number.isFinite(id));

        setWatchedMovieIds(
          new Set(
            [...scopedWatched.map((item) => Number(item.movie_id)), ...localIds].filter(
              (id) => Number.isFinite(id)
            )
=======

        setWatchedMovieIds(
          new Set(
            response.watched_movies
              .map((item) => Number(item.movie_id))
              .filter((id) => Number.isFinite(id))
>>>>>>> origin/develop
          )
        );
      } catch (err) {
        if (isCancelled) return;
        console.error("Failed to fetch watched movies:", err);
<<<<<<< HEAD
        const localWatched = getLocalWatchedMovies(currentUserPk);
        const localIds = localWatched
          .map((item) => Number(item.movie_id))
          .filter((id) => Number.isFinite(id));
        setWatchedMovieIds(new Set(localIds));
=======
        setWatchedMovieIds(new Set());
>>>>>>> origin/develop
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
      setAppliedSorts(toStringArray(parsed.appliedSorts));
      setAppliedGenres(toStringArray(parsed.appliedGenres));
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

        if (isCancelled) return;
        setMovies(response.movies);
        const nextTotalPages = Math.max(
          1,
          Math.ceil(response.total / response.page_size)
        );
        setTotalPages(nextTotalPages);
      } catch (err) {
        if (isCancelled) return;
        setError("?곹솕 紐⑸줉??遺덈윭?ㅻ뒗???ㅽ뙣?덉뒿?덈떎.");
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
  }, [appliedSorts, appliedGenres, appliedQuery, currentPage]);

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
<<<<<<< HEAD
    } catch (err) {
      console.error("Failed to save watched movie:", err);
    } finally {
      upsertLocalWatchedMovie(currentUserPk, {
        movie_id: movie.id,
        title: movie.title,
        poster_url: movie.poster_url,
        genres: movie.genres,
      });
=======
>>>>>>> origin/develop
      setWatchedMovieIds((prev) => {
        const next = new Set(prev);
        next.add(movie.id);
        return next;
      });
    }
  };

  const saveSnapshot = (restoreOnReturn: boolean) => {
    const snapshot: MoviesPageSnapshot = {
      searchQuery,
      selectedSorts,
      selectedGenres,
      appliedSorts,
      appliedGenres,
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
        <section className="page-title">
          <h1>?곹솕 紐⑸줉</h1>
        </section>

        <section className="section card">
          <div className="section-header">
            <p>?λⅤ? 遺꾩쐞湲곗뿉 ?곕씪 ?먰븯??湲곗??쇰줈 怨⑤씪蹂댁꽭??</p>
          </div>
          <div className="section-search">
            <div className="hero-actions">
              <input
                className="search-input"
                type="text"
<<<<<<< HEAD
                placeholder="영화 제목을 검색해보세요"
=======
                placeholder="?곹솕 ?쒕ぉ??寃?됲븯?몄슂"
>>>>>>> origin/develop
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && handleApplyFilters()}
              />
              <button
                className="primary-btn"
                type="button"
                onClick={handleApplyFilters}
              >
                寃??
              </button>
            </div>
          </div>

<<<<<<< HEAD
          <div className="filter-card">
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
                      onClick={() => handleGenreToggle(filter.value)}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
=======
          <div className="filter-group">
            <div>
              <p className="filter-title">?뺣젹</p>
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
              <p className="filter-title">?λⅤ</p>
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
>>>>>>> origin/develop
              </div>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="section-header">
            <h2>寃??寃곌낵</h2>
            <p>?좏깮??湲곗??쇰줈 異붿쿇???곹솕媛 ?쒖떆?⑸땲??</p>
          </div>

          {loading && <p>濡쒕뵫 以?..</p>}
          {error && <p className="error">{error}</p>}

          {!loading && !error && movies.length === 0 && (
            <p>寃??寃곌낵媛 ?놁뒿?덈떎.</p>
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
                    <h3>{movie.title}</h3>
                    <p className="movie-rating">
                      ?됱젏{" "}
                      {typeof movie.avg_rating === "number"
                        ? movie.avg_rating.toFixed(1)
                        : "?뺣낫 ?놁쓬"}
                    </p>
                    <p className="muted">
                      {movie.synopsis
                        ? movie.synopsis.substring(0, 60) +
                          (movie.synopsis.length > 60 ? "..." : "")
                        : "以꾧굅由??뺣낫媛 ?놁뒿?덈떎."}
                    </p>
                    <div className="meta-list">
                      {movie.genres.slice(0, 3).map((genre) => (
                        <span key={genre}>{genre}</span>
                      ))}
                      {movie.runtime && <span>{movie.runtime}분</span>}
                    </div>
                    <button
                      className={`secondary-btn movie-watch-btn movie-detail-btn ${
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
                      ?쒖껌??
                    </button>
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
