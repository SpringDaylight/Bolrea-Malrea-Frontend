import { useEffect, useRef, useState } from "react";
import MainLayout from "../components/layout/MainLayout";
import { searchGroupUsers, type GroupUserSearchItem } from "../api/A4_group";
import { getCurrentUser } from "../api/A7_profile";
import { recommendGroupMovies, type RecommendedMovie, type UserDetail } from "../api/groupRecommend";

const userRequiredMessage = "회원 사용자를 선택해주세요.";
const maxMembers = 10;
const maxMembersMessage = `최대 ${maxMembers}명까지 선택할 수 있어요.`;

const getUserId = (user: GroupUserSearchItem) => user.user_id ?? user.id;
const getUserDisplayName = (user: GroupUserSearchItem) =>
  user.nickname?.trim() || user.user_id?.trim() || user.id;
const getUserSecondaryLabel = (user: GroupUserSearchItem) =>
  user.user_id?.trim() || user.id;

const getLocalStorageItem = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const parseArrayFromStorage = (key: string): string[] => {
  try {
    const raw = getLocalStorageItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const resolveSatisfactionLevel = (score: number) => {
  if (score >= 0.7) return "높음";
  if (score >= 0.5) return "보통";
  return "낮음";
};

export default function GroupPage() {
  const [userQuery, setUserQuery] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [selectedMemberProfiles, setSelectedMemberProfiles] = useState<
    Record<string, { nickname: string; name: string }>
  >({});
  const [isUserSearchOpen, setIsUserSearchOpen] = useState(false);
  const [recommendedMovies, setRecommendedMovies] = useState<RecommendedMovie[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorTick, setErrorTick] = useState(0);
  const [userSearchResults, setUserSearchResults] = useState<GroupUserSearchItem[]>([]);
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  const [userSearchError, setUserSearchError] = useState<string | null>(null);
  const [currentUserNickname, setCurrentUserNickname] = useState("나");
  const [expandedMovies, setExpandedMovies] = useState<Record<number, boolean>>({});
  const currentUserId =
    getLocalStorageItem("mw_user_id") ||
    getLocalStorageItem("mw_user_pk") ||
    "";
  const currentUserPk = getLocalStorageItem("mw_user_pk") || "";
  const userSearchRef = useRef<HTMLDivElement | null>(null);
  const hasAutoSelectedRef = useRef(false);

  const showError = (message: string) => {
    setError(message);
    setErrorTick((prev) => prev + 1);
  };

  useEffect(() => {
    if (!currentUserPk) return;
    const isLoggedIn = getLocalStorageItem("mw_logged_in") === "true";
    if (!isLoggedIn) return;

    let isCancelled = false;
    getCurrentUser(currentUserPk)
      .then((user) => {
        if (isCancelled) return;
        const name =
          user.nickname?.trim() ||
          user.name?.trim() ||
          user.user_id?.trim() ||
          user.id;
        setCurrentUserNickname(name || "나");
      })
      .catch((err) => {
        console.error("Failed to load current user:", err);
        if (!isCancelled) setCurrentUserNickname("나");
      });

    return () => {
      isCancelled = true;
    };
  }, [currentUserPk]);

  const userRequiredError = error === userRequiredMessage ? error : null;
  const formError =
    error && error !== userRequiredMessage
      ? error
      : null;

  const userResults = userSearchResults.filter(
    (user) => !selectedMembers.includes(getUserId(user))
  );

  const selectedMemberItems = selectedMembers.map((memberId) => {
    const cached = selectedMemberProfiles[memberId];
    const latest = userSearchResults.find((user) => getUserId(user) === memberId);
    const nickname =
      cached?.nickname || (latest ? getUserDisplayName(latest) : memberId);
    return {
      id: memberId,
      nickname,
    };
  });

  useEffect(() => {
    if (!currentUserId || hasAutoSelectedRef.current) return;
    setSelectedMembers((prev) => {
      if (prev.includes(currentUserId)) return prev;
      return [currentUserId, ...prev];
    });
    setSelectedMemberProfiles((prev) => ({
      ...prev,
      [currentUserId]: {
        nickname: currentUserNickname,
        name: currentUserNickname,
      },
    }));
    hasAutoSelectedRef.current = true;
  }, [currentUserId, currentUserNickname]);

  const handleMemberToggle = (userId: string, profile?: { nickname: string; name: string }) => {
    const alreadySelected = selectedMembers.includes(userId);
    if (alreadySelected) {
      setSelectedMembers((prev) => prev.filter((id) => id !== userId));
      setSelectedMemberProfiles((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
      return;
    }

    if (selectedMembers.length >= maxMembers) {
      showError(maxMembersMessage);
      return;
    }

    setSelectedMembers((prev) => [...prev, userId]);
    if (profile) {
      setSelectedMemberProfiles((prev) => ({
        ...prev,
        [userId]: profile,
      }));
    }

    if (userRequiredError) {
      setError(null);
    }
  };

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!(event.target instanceof Node)) return;

      if (userSearchRef.current && !userSearchRef.current.contains(event.target)) {
        setIsUserSearchOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  useEffect(() => {
    if (!isUserSearchOpen) {
      setUserSearchResults([]);
      setUserSearchError(null);
      setUserSearchLoading(false);
      return;
    }
    if (!userQuery.trim()) {
      setUserSearchResults([]);
      setUserSearchError(null);
      setUserSearchLoading(false);
      return;
    }

    let isCancelled = false;
    const timer = setTimeout(() => {
      setUserSearchLoading(true);
      searchGroupUsers(userQuery, 20)
        .then((results) => {
          if (isCancelled) return;
          setUserSearchResults(results);
          setUserSearchError(null);
        })
        .catch((err) => {
          if (isCancelled) return;
          console.error("Failed to search users:", err);
          const message =
            err instanceof Error && err.message
              ? err.message
              : "사용자 조회에 실패했습니다.";
          setUserSearchResults([]);
          setUserSearchError(message);
        })
        .finally(() => {
          if (isCancelled) return;
          setUserSearchLoading(false);
        });
    }, 250);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [isUserSearchOpen, userQuery]);

  const handleAnalyze = async () => {
    if (selectedMembers.length === 0) {
      showError(userRequiredMessage);
      return;
    }

    console.log('[그룹 추천 시작]', {
      memberCount: selectedMembers.length,
      timestamp: new Date().toISOString()
    });
    const startTime = Date.now();

    setAnalyzing(true);
    setError(null);

    try {
      const likedGenres = parseArrayFromStorage("mw_taste_genres");
      const avoidedGenres = parseArrayFromStorage("mw_taste_avoid_genres");
      const keywords = parseArrayFromStorage("mw_taste_keywords");

      // 사용자 데이터 구성
      const users = selectedMembers.map((memberId) => {
        const isMe = currentUserId && memberId === currentUserId;
        const label =
          (isMe ? currentUserNickname : selectedMemberProfiles[memberId]?.nickname) ||
          memberId;
        
        return {
          user_id: memberId,
          name: label,
          text: isMe ? keywords.join(", ") : "",
          likes: isMe ? likedGenres : [],
          dislikes: isMe ? avoidedGenres : []
        };
      });

      console.log('[API 호출 시작]', {
        users: users.length,
        top_k: 10,
        candidate_k: 200
      });

      // 백엔드 API 호출
      const response = await recommendGroupMovies({
        users,
        top_k: 10,
        candidate_k: 200,
        strategy: 'mean',
        use_bedrock: true
      });

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log('[그룹 추천 완료]', {
        movies: response.topk.length,
        candidates: response.candidates_count,
        elapsed: `${elapsed}초`
      });

      setRecommendedMovies(response.topk);
    } catch (err) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      console.error('[그룹 추천 실패]', {
        error: err,
        elapsed: `${elapsed}초`
      });
      
      let errorMessage = "그룹 분석에 실패했습니다.";
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      showError(errorMessage);
    } finally {
      setAnalyzing(false);
    }
  };

  const toggleMovieExpand = (movieId: number) => {
    setExpandedMovies(prev => ({
      ...prev,
      [movieId]: !prev[movieId]
    }));
  };

  return (
    <MainLayout>
      <main className="container group-page">
        <section className="page-title">
          <h1>모두가 만족하는 영화 찾기</h1>
          <p>모임 구성원들의 취향을 한 번에 정리해드려요.</p>
        </section>

        <section className="section card">
          <div className="form-grid">
            {formError && (
              <p className="error" key={`form-error-${errorTick}`}>
                {formError}
              </p>
            )}

            <div className="group-search-column">
              <div className="group-search-field">
                <label>영화 같이 볼 회원 검색하기
                  (최대 10명까지 검색 가능해요)</label>
                <div className="group-search-row">
                  <div className="group-search-input" ref={userSearchRef}>
                    <input
                      type="text"
                      placeholder="이름/닉네임/아이디로 검색하세요"
                      value={userQuery}
                      onClick={() => setIsUserSearchOpen(true)}
                      onFocus={() => setIsUserSearchOpen(true)}
                      onChange={(event) => setUserQuery(event.target.value)}
                    />
                    {isUserSearchOpen && (
                      <div className="search-results group-user-results">
                        {userSearchLoading && (
                          <div className="search-empty">사용자를 조회하는 중입니다.</div>
                        )}
                        {!userSearchLoading && userSearchError && (
                          <div className="search-empty">{userSearchError}</div>
                        )}
                        {!userSearchLoading &&
                          !userSearchError &&
                          userResults.length === 0 && (
                            <div className="search-empty">검색 결과가 없습니다.</div>
                          )}
                        {userResults.map((user) => {
                          const userId = getUserId(user);
                          const nickname = getUserDisplayName(user);
                          const secondary = getUserSecondaryLabel(user);
                          return (
                            <button
                              className={`search-item ${
                                selectedMembers.includes(userId) ? "active" : ""
                              }`}
                              type="button"
                              key={userId}
                              onClick={() =>
                                handleMemberToggle(userId, {
                                  nickname,
                                  name: secondary || nickname,
                                })
                              }
                            >
                              <strong>{nickname}</strong>
                              <span>{secondary}</span>
                              {selectedMembers.includes(userId) && <span>✓</span>}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <button
                    className="primary-btn group-analyze-btn"
                    onClick={handleAnalyze}
                    disabled={analyzing}
                    type="button"
                  >
                    {analyzing ? "추천 받는 중..." : "추천받기"}
                  </button>
                </div>
              </div>

              {selectedMembers.length > 0 && (
                <div className="group-selected-members is-inline">
                  <div className="tag-list">
                    {selectedMemberItems.map((member) => (
                      <span key={member.id} className="tag group-selected-tag">
                        {member.nickname}
                        <button
                          className="group-selected-remove"
                          type="button"
                          aria-label={`${member.nickname} 선택 해제`}
                          onClick={() => handleMemberToggle(member.id)}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <p className="muted">선택된 회원: {selectedMembers.length}명</p>
                </div>
              )}
            </div>

            {userRequiredError && (
              <p className="error" key={`user-error-${errorTick}`}>
                {userRequiredError}
              </p>
            )}

            <button className="primary-btn" onClick={handleAnalyze} disabled={analyzing}>
              {analyzing ? "추천 받는 중... (최대 30초 소요)" : "추천받기"}
            </button>
            
            {analyzing && (
              <p className="muted" style={{ marginTop: 8, fontSize: "0.9em" }}>
                💡 영화 데이터를 분석하고 있습니다. 잠시만 기다려주세요.
              </p>
            )}
          </div>
        </section>

        {recommendedMovies.length > 0 && (
          <section className="section">
            <h2>추천 영화 ({recommendedMovies.length}개)</h2>
            <div className="movie-list">
              {recommendedMovies.map((movie) => (
                <article key={movie.movie_id} className="card">
                  <div className="movie-info">
                    <h3>{movie.title}</h3>
                    <p className="muted">
                      {movie.release_year} · {movie.genres.join(", ")}
                    </p>
                    <p className="probability">
                      그룹 만족도: {Math.round(movie.group_score * 100)}%
                    </p>
                    
                    {movie.per_user_detail && movie.per_user_detail.length > 0 && (
                      <>
                        <button
                          className="ghost-btn"
                          onClick={() => toggleMovieExpand(movie.movie_id)}
                          style={{ marginTop: 12 }}
                        >
                          {expandedMovies[movie.movie_id] ? "멤버별 반응 접기" : "멤버별 반응 보기"}
                        </button>
                        
                        {expandedMovies[movie.movie_id] && (
                          <div className="section" style={{ marginTop: 16 }}>
                            <h4>멤버별 예상 반응</h4>
                            {movie.per_user_detail.map((detail) => (
                              <div key={detail.user_id} style={{ marginTop: 12, paddingLeft: 12, borderLeft: "3px solid #ddd" }}>
                                <p>
                                  <strong>{detail.name}</strong>: {Math.round(detail.probability * 100)}%
                                </p>
                                <p className="muted" style={{ marginTop: 4 }}>
                                  {detail.explanation}
                                </p>
                                {detail.top_factors.length > 0 && (
                                  <p className="muted" style={{ marginTop: 4, fontSize: "0.9em" }}>
                                    주요 요인: {detail.top_factors.join(", ")}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </main>
    </MainLayout>
  );
}
