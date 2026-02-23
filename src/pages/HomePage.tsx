import { useEffect, useState } from "react";
import MainLayout from "../components/layout/MainLayout";
import { Link } from "react-router-dom";
import { getMovies, type Movie } from "../api/A2_movies";
import { emotionalSearch } from "../api/A5_emotional_search";
import { calculateMoviesMatchRates } from "../utils/matchRateCalculator";
import TasteSurveyModal from "../components/TasteSurveyModal";

const RECOMMENDED_PAGE_SIZE = 4;
const RECOMMENDED_TOTAL = 12;

export default function HomePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
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
  const [needsTasteSetup, setNeedsTasteSetup] = useState(false);
  const [showTasteSurveyModal, setShowTasteSurveyModal] = useState(false);

  const isLoggedIn = localStorage.getItem("mw_logged_in") === "true";

  const computeMovieMatchRates = async (movies: Movie[]) => {
    try {
      return await calculateMoviesMatchRates(movies);
    } catch (error: any) {
      if (isLoggedIn && (error?.message?.includes("404") || error?.message?.includes("not found"))) {
        setNeedsTasteSetup(true);
        return {};
      }
      throw error;
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
        ? [...response.movies].sort((a, b) => (rateMap[b.id] ?? 0) - (rateMap[a.id] ?? 0))
        : response.movies;

      setRecommendedMovies(ordered.slice(0, RECOMMENDED_TOTAL));
    } catch (err) {
      console.error("Failed to fetch recommendations:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoggedIn) return;
    void fetchRecommendations({ sort: "popular" });
  }, [isLoggedIn]);

  useEffect(() => {
    setRecommendedPage(1);
  }, [recommendedMovies.length]);

  const handleSearch = async () => {
    if (!isLoggedIn) return;
    const trimmedQuery = searchQuery.trim();

    if (!trimmedQuery) {
      setSearchResults([]);
      setSearchError("검색어를 입력해주세요");
      setActiveSearchLabel("");
      setSearchMatchRates({});
      setIsEmotionalSearch(false);
      setEmotionTags([]);
      setSearchLoading(false);
      return;
    }

    const isNaturalLanguage =
      /[가-힣]{2,}/.test(trimmedQuery) &&
      (trimmedQuery.includes("영화") ||
        trimmedQuery.includes("추천") ||
        trimmedQuery.includes("보고싶") ||
        trimmedQuery.includes("찾") ||
        /감동|슬픈|무서운|웃긴|로맨틱|힐링|우울|밝은|어두운|따뜻|잔잔|설레|통쾌/.test(
          trimmedQuery
        ));

    setSearchLoading(true);
    setSearchError(null);
    setSearchResults(null);

    if (isNaturalLanguage && trimmedQuery.length > 3) {
      try {
        const emotionResult = await emotionalSearch({
          text: trimmedQuery,
        });

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

          const emotionToGenreMap: { [key: string]: string[] } = {
            감동적이에요: ["드라마"],
            따뜻해요: ["드라마", "가족"],
            슬퍼요: ["드라마"],
            무서워요: ["공포", "스릴러"],
            긴장돼요: ["스릴러", "액션"],
            웃겨요: ["코미디"],
            로맨틱해요: ["로맨스"],
            설레요: ["로맨스"],
            통쾌해요: ["액션"],
            잔잔해요: ["드라마"],
            힐링돼요: ["드라마", "가족"],
            "밝은 분위기예요": ["코미디", "가족"],
            "어두운 분위기예요": ["스릴러", "범죄"],
          };

          const suggestedGenres = new Set<string>();
          topTags.forEach((tag) => {
            const genres = emotionToGenreMap[tag];
            if (genres) {
              genres.forEach((g) => suggestedGenres.add(g));
            }
          });

          let response;
          if (suggestedGenres.size > 0) {
            const genreList = Array.from(suggestedGenres);
            response = await getMovies({
              genres: genreList.join(","),
              page_size: 8,
              sort: "popular",
            });
          } else {
            response = await getMovies({
              page_size: 8,
              sort: "popular",
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

    setIsEmotionalSearch(false);
    setEmotionTags([]);

    const genreMap: { [key: string]: string } = {
      로맨스: "로맨스",
      드라마: "드라마",
      스릴러: "스릴러",
      공포: "공포",
      액션: "액션",
      범죄: "범죄",
      sf: "SF",
      판타지: "판타지",
      코미디: "코미디",
      애니메이션: "애니메이션",
      역사: "역사",
      다큐멘터리: "다큐멘터리",
      모험: "모험",
      가족: "가족",
      미스터리: "미스터리",
      전쟁: "전쟁",
      서부: "서부",
      음악: "음악",
      romance: "로맨스",
      drama: "드라마",
      thriller: "스릴러",
      horror: "공포",
      action: "액션",
      crime: "범죄",
      "science fiction": "SF",
      fantasy: "판타지",
      comedy: "코미디",
      animation: "애니메이션",
      history: "역사",
      documentary: "다큐멘터리",
      adventure: "모험",
      family: "가족",
      mystery: "미스터리",
      war: "전쟁",
      western: "서부",
      music: "음악",
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
      <main className={`container ${isLoggedIn ? "home-page" : "landing-page"}`}>
        {!isLoggedIn ? (
          <>
            <section className="landing-hero">
              <div className="landing-hero-text">
                <span className="landing-badge">Movie Match</span>
                <h1>오늘의 취향, 한 번에 찾아보기</h1>
                <p>
                  대화로 추천 받고, 마음에 들면 바로 탐색하세요. 간단하지만 확실한 추천
                  흐름을 제공합니다.
                </p>
                <div className="landing-actions">
                  <Link className="primary-btn" to="/chat">
                    대화 시작하기
                  </Link>
                  <Link className="secondary-btn" to="/movies">
                    영화 둘러보기
                  </Link>
                  <Link className="secondary-btn" to="/group">
                    다함께 추천받기
                  </Link>
                </div>
              </div>
              <div className="landing-hero-panel">
                <div className="panel-card">
                  <p className="panel-title">간편한 추천 루틴</p>
                  <p className="panel-desc">대화 → 후보 선택 → 바로 감상</p>
                </div>
                <div className="panel-card">
                  <p className="panel-title">취향 조합</p>
                  <p className="panel-desc">장르, 길이, 분위기까지 조합해서 추천</p>
                </div>
              </div>
            </section>

            <section className="landing-grid">
              <article className="landing-card">
                <h2>대화형 추천</h2>
                <p>지금 기분이나 보고 싶은 분위기를 말해보세요.</p>
              </article>
              <article className="landing-card">
                <h2>취향 기반 탐색</h2>
                <p>선호 장르, 길이, 분위기를 쉽게 조합할 수 있어요.</p>
              </article>
              <article className="landing-card">
                <h2>다함께 추천</h2>
                <p>모임 멤버들의 취향을 모아 모두 만족하는 영화를 찾습니다.</p>
              </article>
            </section>

            <section className="landing-strip">
              <div className="strip-head">
                <h2>이런 흐름으로 추천돼요</h2>
                <p>복잡하지 않고 직관적인 단계로 구성했어요.</p>
              </div>
              <div className="strip-steps">
                <div className="strip-step">
                  <span>01</span>
                  <p>간단한 대화로 취향 파악</p>
                </div>
                <div className="strip-step">
                  <span>02</span>
                  <p>조건을 합쳐 추천 후보 생성</p>
                </div>
                <div className="strip-step">
                  <span>03</span>
                  <p>바로 감상할 영화 선택</p>
                </div>
              </div>
            </section>

            <section className="landing-faq">
              <div className="landing-faq-inner">
                <div className="landing-faq-header">
                  <h2>자주 묻는 질문</h2>
                  <p>가장 많이 찾는 질문들을 모아두었어요.</p>
                </div>
                <div className="landing-faq-list">
                  {[
                    {
                      q: "볼래! 말래?는 어떤 서비스인가요?",
                      a: "취향 데이터를 바탕으로 영화 추천과 탐색을 쉽게 도와주는 서비스입니다.",
                    },
                    {
                      q: "대화 추천은 어떤 기준으로 나오나요?",
                      a: "대화에 포함된 키워드와 감성 태그를 분석해 유사한 분위기의 작품을 추천해요.",
                    },
                    {
                      q: "다함께 추천은 어떻게 이용하나요?",
                      a: "멤버를 선택하면 모두의 취향을 고려해 만족도가 높은 영화를 보여줘요.",
                    },
                    {
                      q: "취향 설정은 언제 필요한가요?",
                      a: "개인화 추천과 매칭 점수를 정확히 보려면 취향 설정이 필요합니다.",
                    },
                    {
                      q: "영화 데이터는 어떻게 업데이트되나요?",
                      a: "최신 인기작과 평점 데이터를 기준으로 정기 업데이트하고 있어요.",
                    },
                  ].map((item, index) => {
                    const isOpen = openFaq === index;
                    return (
                      <div
                        className={`landing-faq-item ${isOpen ? "is-open" : ""}`}
                        key={item.q}
                      >
                        <button
                          type="button"
                          className="landing-faq-question"
                          onClick={() => setOpenFaq(isOpen ? null : index)}
                          aria-expanded={isOpen}
                        >
                          <span>{item.q}</span>
                          <span className="faq-plus">{isOpen ? "−" : "+"}</span>
                        </button>
                        {isOpen && <div className="landing-faq-answer">{item.a}</div>}
                      </div>
                    );
                  })}
                </div>
                <Link className="ghost-btn landing-faq-link" to="/support">
                  고객센터 바로가기
                </Link>
              </div>
            </section>
          </>
        ) : (
          <>
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

              {needsTasteSetup ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "3rem 1rem",
                    backgroundColor: "#fff3cd",
                    borderRadius: "8px",
                    margin: "1rem 0",
                    border: "1px solid #ffc107",
                  }}
                >
                  <p
                    style={{
                      fontSize: "1.2rem",
                      marginBottom: "1rem",
                      color: "#4A4C6A",
                    }}
                  >
                    취향 설정이 필요합니다
                  </p>
                  <p
                    style={{
                      fontSize: "1rem",
                      marginBottom: "1.5rem",
                      color: "#4A4C6A",
                    }}
                  >
                    나만의 맞춤 추천을 받으려면 취향을 설정해주세요.
                  </p>
                  <button className="primary-btn" onClick={() => setShowTasteSurveyModal(true)}>
                    취향 설정하기
                  </button>
                </div>
              ) : (
                <>
                  {loading && <p>로딩 중...</p>}

                  {!loading && recommendedMovies.length > 0 && (
                    <div className="movie-grid">
                      {visibleRecommended.map((movie) => (
                        <article className="card movie-tile" key={movie.id}>
                          <img
                            className="poster"
                            src={
                              movie.poster_url || "https://via.placeholder.com/500x750?text=No+Image"
                            }
                            alt={`${movie.title} 포스터`}
                          />
                          <div className="movie-info">
                            <h3>{movie.title}</h3>
                            <p className="probability home-match-probability">
                              적합 확률 {recommendedMatchRates[movie.id] ?? 83}%
                            </p>
                            <p className="muted synopsis-clamp">
                              {movie.synopsis
                                ? movie.synopsis.substring(0, 60) +
                                  (movie.synopsis.length > 60 ? "..." : "")
                                : "줄거리 정보가 없습니다."}
                            </p>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </>
              )}
            </section>

            <section className="hero">
              <div>
                <h1>지금 기분에 맞는 영화를 찾아보세요</h1>
                <p>취향 데이터와 상황 맥락을 결합해 만족 가능성까지 알려드려요.</p>
                <div className="hero-actions">
                  <input
                    className="search-input"
                    type="text"
                    placeholder="'감동적인 영화 추천해줘' 같은 자연어로 검색해보세요"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  />
                  <button className="primary-btn" type="button" onClick={handleSearch}>
                    맞춤 추천 받기
                  </button>
                </div>
              </div>
            </section>

            {(searchLoading || searchResults !== null || searchError) && (
              <section className="section">
                <div className="section-header">
                  <h2>검색 결과</h2>
                  {activeSearchLabel && <p className="muted">"{activeSearchLabel}"</p>}
                  {isEmotionalSearch && emotionTags.length > 0 && (
                    <div style={{ marginTop: "0.5rem" }}>
                      <p style={{ fontSize: "0.9rem", color: "#4A4C6A" }}>
                        🎭 감성 태그: {emotionTags.join(", ")}
                      </p>
                    </div>
                  )}
                </div>

                {searchLoading && <p>로딩 중...</p>}

                {!searchLoading && searchError && <p className="muted">{searchError}</p>}

                {!searchLoading && !searchError && searchResults && searchResults.length === 0 && (
                  <p className="muted">검색 결과가 없습니다.</p>
                )}

                {!searchLoading && !searchError && searchResults && searchResults.length > 0 && (
                  <div className="movie-grid">
                    {searchResults.map((movie) => (
                      <article className="card movie-tile" key={movie.id}>
                        <img
                          className="poster"
                          src={
                            movie.poster_url || "https://via.placeholder.com/500x750?text=No+Image"
                          }
                          alt={`${movie.title} 포스터`}
                        />
                        <div className="movie-info">
                          <h3>{movie.title}</h3>
                          <p className="probability home-match-probability">
                            종합 매칭 {searchMatchRates[movie.id] ?? 83}%
                          </p>
                          <p className="muted synopsis-clamp">
                            {movie.synopsis
                              ? movie.synopsis.substring(0, 60) +
                                (movie.synopsis.length > 60 ? "..." : "")
                              : "줄거리 정보가 없습니다."}
                          </p>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            )}
          </>
        )}
        {showTasteSurveyModal && (
          <TasteSurveyModal
            isOpen={showTasteSurveyModal}
            onClose={() => setShowTasteSurveyModal(false)}
            onComplete={() => {
              setShowTasteSurveyModal(false);
              setNeedsTasteSetup(false);
              void fetchRecommendations({ sort: "popular" });
            }}
          />
        )}
      </main>
    </MainLayout>
  );
}
