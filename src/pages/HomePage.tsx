import { useEffect, useState } from "react";
import MainLayout from "../components/layout/MainLayout";
import { Link } from "react-router-dom";
import { getMovies, type Movie } from "../api/A2_movies";
import { emotionalSearch } from "../api/A5_emotional_search";
import { calculateMoviesMatchRates } from "../utils/matchRateCalculator";

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
  const [isEmotionalSearch, setIsEmotionalSearch] = useState(false);
  const [emotionTags, setEmotionTags] = useState<string[]>([]);
  const [recommendedPage, setRecommendedPage] = useState(1);
  
  const isLoggedIn = localStorage.getItem("mw_logged_in") === "true";

  const RECOMMENDED_PAGE_SIZE = 4;
  const RECOMMENDED_TOTAL = 12;

  const computeMovieMatchRates = async (movies: Movie[]) => {
    return calculateMoviesMatchRates(movies);
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
      setIsEmotionalSearch(false);
      setEmotionTags([]);
      await fetchRecommendations({ sort: "popular" });
      return;
    }
    
    // 자연어 검색 감지 (한글 문장 형태)
    const isNaturalLanguage = /[가-힣]{2,}/.test(trimmedQuery) && 
                              (trimmedQuery.includes("영화") || 
                               trimmedQuery.includes("추천") ||
                               trimmedQuery.includes("보고싶") ||
                               trimmedQuery.includes("찾") ||
                               /감동|슬픈|무서운|웃긴|로맨틱|힐링|우울|밝은|어두운|따뜻|잔잔|설레|통쾌/.test(trimmedQuery));
    
    setSearchLoading(true);
    setSearchError(null);
    
    // 자연어 검색 시도
    if (isNaturalLanguage && trimmedQuery.length > 3) {
      try {
        // A-5 감성 검색 호출
        const emotionResult = await emotionalSearch({
          text: trimmedQuery,
        });
        
        // 상위 감정 태그 추출
        const emotionScores = emotionResult.expanded_query.emotion_scores;
        const topTags = Object.entries(emotionScores)
          .filter(([_, score]) => score > 0.5)
          .sort(([_, a], [__, b]) => b - a)
          .slice(0, 3)
          .map(([tag, _]) => tag);
        
        if (topTags.length > 0) {
          setIsEmotionalSearch(true);
          setEmotionTags(topTags);
          setActiveSearchLabel(`${trimmedQuery} (감성 검색)`);
          
          // 감정 태그를 장르로 매핑
          const emotionToGenreMap: { [key: string]: string[] } = {
            "감동적이에요": ["드라마"],
            "따뜻해요": ["드라마", "가족"],
            "슬퍼요": ["드라마"],
            "무서워요": ["공포", "스릴러"],
            "긴장돼요": ["스릴러", "액션"],
            "웃겨요": ["코미디"],
            "로맨틱해요": ["로맨스"],
            "설레요": ["로맨스"],
            "통쾌해요": ["액션"],
            "잔잔해요": ["드라마"],
            "힐링돼요": ["드라마", "가족"],
            "밝은 분위기예요": ["코미디", "가족"],
            "어두운 분위기예요": ["스릴러", "범죄"],
          };
          
          // 감정 태그에서 장르 추출
          const suggestedGenres = new Set<string>();
          topTags.forEach(tag => {
            const genres = emotionToGenreMap[tag];
            if (genres) {
              genres.forEach(g => suggestedGenres.add(g));
            }
          });
          
          // 장르가 있으면 장르로 검색, 없으면 인기순으로 검색
          let response;
          if (suggestedGenres.size > 0) {
            const genreList = Array.from(suggestedGenres);
            response = await getMovies({ 
              genres: genreList.join(","),
              page_size: 8,
              sort: "popular"
            });
          } else {
            // 장르 매핑이 없으면 인기 영화 반환
            response = await getMovies({ 
              page_size: 8,
              sort: "popular"
            });
          }
          
          const rateMap = await computeMovieMatchRates(response.movies);
          setSearchResults(response.movies);
          setSearchMatchRates(rateMap);
          setSearchLoading(false);
          return;
        }
      } catch (err) {
        console.error("감성 검색 실패, 일반 검색으로 진행:", err);
        setIsEmotionalSearch(false);
        setEmotionTags([]);
      }
    }
    
    // 일반 검색 (장르 또는 제목)
    setIsEmotionalSearch(false);
    setEmotionTags([]);
    
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
                placeholder="'감동적인 영화 추천해줘' 같은 자연어로 검색해보세요"
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
              {isEmotionalSearch && emotionTags.length > 0 && (
                <div style={{ marginTop: "0.5rem" }}>
                  <p style={{ fontSize: "0.9rem", color: "#666" }}>
                    🎭 감성 태그: {emotionTags.join(", ")}
                  </p>
                </div>
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
            {isLoggedIn && (
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
            )}
          </div>
          
          {!isLoggedIn ? (
            <div style={{ 
              textAlign: "center", 
              padding: "3rem 1rem",
              backgroundColor: "#f8f9fa",
              borderRadius: "8px",
              margin: "1rem 0"
            }}>
              <p style={{ 
                fontSize: "1.2rem", 
                marginBottom: "1.5rem",
                color: "#495057"
              }}>
                로그인하고 나만을 위한 맞춤 추천을 받아보세요!
              </p>
              <Link to="/login">
                <button className="primary-btn">로그인하기</button>
              </Link>
            </div>
          ) : (
            <>
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
            </>
          )}
        </section>
      </main>
    </MainLayout>
  );
}

