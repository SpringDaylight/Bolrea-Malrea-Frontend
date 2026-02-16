import { useEffect, useState } from "react";
import MainLayout from "../components/layout/MainLayout";
import { Link } from "react-router-dom";
import { getMovies, type Movie } from "../api/A2_movies";
import { analyzePreference, predictSatisfaction, vectorizeMovie } from "../api/ml";

export default function HomePage() {
  const [recommendedMovies, setRecommendedMovies] = useState<Movie[]>([]);
  const [searchResults, setSearchResults] = useState<Movie[] | null>(null);
  const [recommendedMatchRates, setRecommendedMatchRates] = useState<Record<number, number>>(
    {}
  );
  const [searchMatchRates, setSearchMatchRates] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSearchLabel, setActiveSearchLabel] = useState("");
  const [recommendedPage, setRecommendedPage] = useState(1);

  const RECOMMENDED_PAGE_SIZE = 4;
  const RECOMMENDED_TOTAL = 12;

  const parseArrayFromStorage = (key: string) => {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const computeMovieMatchRates = async (movies: Movie[]) => {
    if (movies.length === 0) {
      return {};
    }

    try {
      const userTasteText = localStorage.getItem("mw_taste_vibe") || "";
      const userKeywords = parseArrayFromStorage("mw_taste_keywords") as string[];
      const userAvoidGenres = parseArrayFromStorage("mw_taste_avoid_genres") as string[];

      if (!userTasteText.trim()) {
        return {};
      }

      const userProfile = await analyzePreference({
        text: `${userTasteText} ${userKeywords.join(", ")}`.trim(),
        dislikes: userAvoidGenres.length ? userAvoidGenres.join(", ") : undefined,
      });

      const pairs = await Promise.all(
        movies.map(async (movie) => {
          try {
            const movieProfile = await vectorizeMovie({
              movie_id: movie.id,
              title: movie.title,
              overview: movie.synopsis || undefined,
              genres: movie.genres,
              keywords: movie.tags,
            });
            const prediction = await predictSatisfaction({
              user_profile: userProfile,
              movie_profile: movieProfile,
              dislike_tags: userProfile.dislike_tags,
              boost_tags: userProfile.boost_tags,
            });
            return [movie.id, Math.round(prediction.match_rate)] as const;
          } catch (error) {
            console.error(`Failed to calculate match rate for movie ${movie.id}:`, error);
            return [movie.id, 83] as const;
          }
        })
      );

      return Object.fromEntries(pairs);
    } catch (error) {
      console.error("Failed to calculate home match rates:", error);
      return {};
    }
  };

  const fetchRecommendations = async (
    params?: {
      query?: string;
      genres?: string;
      category?: string;
      sort?: "latest" | "popular" | "rating";
      page?: number;
      page_size?: number;
    }
  ) => {
    setLoading(true);
    try {
      const response = await getMovies({
        page_size: params?.page_size ?? RECOMMENDED_TOTAL,
        ...params,
      });
      const rateMap = await computeMovieMatchRates(response.movies);
      setRecommendedMatchRates(rateMap);

      const ordered = Object.keys(rateMap).length
        ? [...response.movies].sort(
            (a, b) => (rateMap[b.id] ?? 0) - (rateMap[a.id] ?? 0)
          )
        : response.movies;

      setRecommendedMovies(ordered.slice(0, RECOMMENDED_TOTAL));
    } catch (err) {
      console.error("Failed to fetch recommendations:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchRecommendations({ sort: "popular" });
  }, []);

  useEffect(() => {
    setRecommendedPage(1);
  }, [recommendedMovies.length]);

  const handleSearch = async () => {
    const trimmedQuery = searchQuery.trim();
    
    if (!trimmedQuery) {
      setSearchResults(null);
      setSearchError(null);
      setActiveSearchLabel("");
      setSearchMatchRates({});
      await fetchRecommendations({ sort: "popular" });
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
    
    setSearchLoading(true);
    setSearchError(null);
    setActiveSearchLabel(matchedGenre ?? trimmedQuery);

    try {
      if (matchedGenre) {
        const response = await getMovies({
          genres: matchedGenre,
          sort: "popular",
          page_size: 8,
        });
        const rateMap = await computeMovieMatchRates(response.movies);
        setSearchResults(response.movies);
        setSearchMatchRates(rateMap);
        return;
      }

      const response = await getMovies({ query: trimmedQuery, page_size: 8 });
      const rateMap = await computeMovieMatchRates(response.movies);
      setSearchResults(response.movies);
      setSearchMatchRates(rateMap);
    } catch (err) {
      console.error("Failed to fetch search results:", err);
      setSearchResults([]);
      setSearchError("검색 결과를 불러오는데 실패했습니다.");
      setSearchMatchRates({});
    } finally {
      setSearchLoading(false);
    }
  };


  const recommendedTotalPages = Math.max(
    1,
    Math.ceil(recommendedMovies.length / RECOMMENDED_PAGE_SIZE)
  );
  const safeRecommendedPage = Math.min(recommendedPage, recommendedTotalPages);
  const recommendedSliceStart = (safeRecommendedPage - 1) * RECOMMENDED_PAGE_SIZE;
  const visibleRecommended = recommendedMovies.slice(
    recommendedSliceStart,
    recommendedSliceStart + RECOMMENDED_PAGE_SIZE
  );
  return (
    <MainLayout>
      <main className="container home-page">
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

        {(searchLoading || searchResults !== null || searchError) && (
          <section className="section">
            <div className="section-header">
              <h2>검색 결과</h2>
              {activeSearchLabel && (
                <p className="muted">"{activeSearchLabel}"</p>
              )}
            </div>

            {searchLoading && <p>로딩 중...</p>}

            {!searchLoading && searchError && (
              <p className="muted">{searchError}</p>
            )}

            {!searchLoading &&
              !searchError &&
              searchResults &&
              searchResults.length === 0 && (
                <p className="muted">검색 결과가 없습니다.</p>
              )}

            {!searchLoading &&
              !searchError &&
              searchResults &&
              searchResults.length > 0 && (
                <div className="movie-grid">
                  {searchResults.map((movie) => (
                    <Link className="card-link" to={`/movies/${movie.id}`} key={movie.id}>
                      <article className="card movie-tile">
                        <img
                          className="poster"
                          src={movie.poster_url || "https://via.placeholder.com/500x750?text=No+Image"}
                          alt={`${movie.title} 포스터`}
                        />
                        <div className="movie-info">
                          <h3>{movie.title}</h3>
                          <p className="probability home-match-probability">
                            종합 매칭 {searchMatchRates[movie.id] ?? 83}%
                          </p>
                          <p className="muted">
                            {movie.synopsis
                              ? movie.synopsis.substring(0, 60) +
                                (movie.synopsis.length > 60 ? "..." : "")
                              : "줄거리 정보가 없습니다."}
                          </p>
                          <span className="ghost-btn movie-detail-btn">자세히 보기</span>
                        </div>
                      </article>
                    </Link>
                  ))}
                </div>
              )}
          </section>
        )}

        <section className="section">
          <div className="section-header">
            <h2>나를 위한 추천</h2>
            <div className="home-recommend-controls">
              <button
                className="icon-btn page-arrow-btn"
                type="button"
                aria-label="이전 페이지"
                onClick={() => setRecommendedPage((prev) => Math.max(1, prev - 1))}
                disabled={safeRecommendedPage === 1}
              >
                {"◀"}
              </button>
              <span className="page-number-text" aria-live="polite">
                {safeRecommendedPage}/{recommendedTotalPages}
              </span>
              <button
                className="icon-btn page-arrow-btn"
                type="button"
                aria-label="다음 페이지"
                onClick={() =>
                  setRecommendedPage((prev) => Math.min(recommendedTotalPages, prev + 1))
                }
                disabled={safeRecommendedPage >= recommendedTotalPages}
              >
                {"▶"}
              </button>
            </div>
          </div>
          
          {loading && <p>로딩 중...</p>}
          
          {!loading && recommendedMovies.length > 0 && (
            <div className="movie-grid">
              {visibleRecommended.map((movie) => (
                <Link className="card-link" to={`/movies/${movie.id}`} key={movie.id}>
                  <article className="card movie-tile">
                    <img
                      className="poster"
                      src={movie.poster_url || 'https://via.placeholder.com/500x750?text=No+Image'}
                      alt={`${movie.title} 포스터`}
                    />
                    <div className="movie-info">
                      <h3>{movie.title}</h3>
                      <p className="probability home-match-probability">
                        적합 확률 {recommendedMatchRates[movie.id] ?? 83}%
                      </p>
                      <p className="muted">
                        {movie.synopsis 
                          ? movie.synopsis.substring(0, 60) + (movie.synopsis.length > 60 ? '...' : '')
                          : '줄거리 정보가 없습니다.'}
                      </p>
                      <span className="ghost-btn movie-detail-btn">자세히 보기</span>
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

