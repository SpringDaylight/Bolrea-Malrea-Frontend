import { useEffect, useRef, useState } from "react";
import MainLayout from "../components/layout/MainLayout";
import {
  simulateGroup,
  vectorizeMovie,
  type GroupSimulationResult,
  type UserProfile,
} from "../api/ml";
import { searchMovies, type Movie } from "../api/A2_movies";
import { searchGroupUsers, type GroupUserSearchItem } from "../api/A4_group";

const groupTypeOptions = ["친구", "가족", "연인", "모임", "기타"];
const userRequiredMessage = "회원 사용자를 선택해주세요.";

const getUserId = (user: GroupUserSearchItem) => user.user_id ?? user.id;
const getUserDisplayName = (user: GroupUserSearchItem) =>
  user.nickname?.trim() || user.name?.trim() || user.user_id || user.id;

export default function GroupPage() {
  const [groupType, setGroupType] = useState("");
  const [draftTotalMembers, setDraftTotalMembers] = useState("2");
  const [draftGuestMembers, setDraftGuestMembers] = useState("0");
  const [totalMembers, setTotalMembers] = useState(2);
  const [guestMembers, setGuestMembers] = useState(0);
  const [memberConfigApplied, setMemberConfigApplied] = useState(false);
  const [userQuery, setUserQuery] = useState("");
  const [movieQuery, setMovieQuery] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [selectedMemberProfiles, setSelectedMemberProfiles] = useState<
    Record<string, { nickname: string; name: string }>
  >({});
  const [isUserSearchOpen, setIsUserSearchOpen] = useState(false);
  const [isGroupTypeOpen, setIsGroupTypeOpen] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [movieSearchResults, setMovieSearchResults] = useState<Movie[]>([]);
  const [groupResult, setGroupResult] = useState<GroupSimulationResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorTick, setErrorTick] = useState(0);
  const [userSearchResults, setUserSearchResults] = useState<GroupUserSearchItem[]>([]);
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  const [userSearchError, setUserSearchError] = useState<string | null>(null);
  const currentUserPk = localStorage.getItem("mw_user_pk");

  const userSearchRef = useRef<HTMLDivElement | null>(null);
  const groupTypeRef = useRef<HTMLDivElement | null>(null);

  const showError = (message: string) => {
    setError(message);
    setErrorTick((prev) => prev + 1);
  };

  const userRequiredError = error === userRequiredMessage ? error : null;
  const movieRequiredError = error === "영화를 선택해주세요." ? error : null;
  const formError =
    error && error !== "영화를 선택해주세요." && error !== userRequiredMessage
      ? error
      : null;

  const memberSlots = Math.max(totalMembers - guestMembers, 0);

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

    if (selectedMembers.length >= memberSlots) return;

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
      if (groupTypeRef.current && !groupTypeRef.current.contains(event.target)) {
        setIsGroupTypeOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  useEffect(() => {
    if (!memberConfigApplied || !isUserSearchOpen) {
      setUserSearchResults([]);
      setUserSearchError(null);
      setUserSearchLoading(false);
      return;
    }
    if (!currentUserPk) {
      setUserSearchResults([]);
      setUserSearchError("로그인이 필요합니다.");
      setUserSearchLoading(false);
      return;
    }

    let isCancelled = false;
    const timer = setTimeout(() => {
      setUserSearchLoading(true);
      searchGroupUsers(userQuery, 20, currentUserPk)
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
  }, [memberConfigApplied, isUserSearchOpen, userQuery]);

  const handleApplyMemberConfig = () => {
    if (!groupType) {
      showError("그룹을 선택해주세요.");
      setMemberConfigApplied(false);
      return;
    }

    const totalValue = Number(draftTotalMembers);
    const guestValue = draftGuestMembers === "" ? 0 : Number(draftGuestMembers);

    if (!draftTotalMembers || Number.isNaN(totalValue) || totalValue < 1) {
      showError("총 인원은 1명 이상 입력해주세요.");
      setMemberConfigApplied(false);
      return;
    }

    if (Number.isNaN(guestValue) || guestValue < 0) {
      showError("비회원 인원은 0명 이상 입력해주세요.");
      setMemberConfigApplied(false);
      return;
    }

    if (guestValue > totalValue) {
      showError("비회원 인원은 총 인원보다 많을 수 없습니다.");
      setMemberConfigApplied(false);
      return;
    }

    const nextSlots = Math.max(totalValue - guestValue, 0);
    setTotalMembers(totalValue);
    setGuestMembers(guestValue);
    setSelectedMembers((prev) => prev.slice(0, nextSlots));
    setSelectedMemberProfiles((prev) => {
      const allowed = new Set(selectedMembers.slice(0, nextSlots));
      return Object.fromEntries(
        Object.entries(prev).filter(([id]) => allowed.has(id))
      );
    });
    setUserQuery("");
    setMovieQuery("");
    setSelectedMovie(null);
    setMovieSearchResults([]);
    setIsUserSearchOpen(false);
    setIsGroupTypeOpen(false);
    setGroupResult(null);
    setError(null);
    setMemberConfigApplied(true);
  };

  const handleMovieSearch = async () => {
    if (!movieQuery.trim()) {
      setMovieSearchResults([]);
      return;
    }

    try {
      const results = await searchMovies(movieQuery, 1);
      setMovieSearchResults(results.movies.slice(0, 5));
    } catch (err) {
      console.error("Failed to search movies:", err);
    }
  };

  const handleMovieSelect = (movie: Movie) => {
    setSelectedMovie(movie);
    setMovieSearchResults([]);
    setMovieQuery(movie.title);
  };

  const handleAnalyze = async () => {
    if (memberSlots > 0 && selectedMembers.length < memberSlots) {
      showError(userRequiredMessage);
      return;
    }

    if (!selectedMovie) {
      showError("영화를 선택해주세요.");
      return;
    }

    setAnalyzing(true);
    setError(null);

    try {
      const currentUserProfile = localStorage.getItem("mw_user_profile");
      if (!currentUserProfile) {
        showError(
          "취향 분석 데이터가 없습니다. 먼저 취향 설문을 완료해주세요."
        );
        setAnalyzing(false);
        return;
      }

      const userProfile = JSON.parse(currentUserProfile) as UserProfile;
      const movieProfile = await vectorizeMovie({
        movie_id: selectedMovie.id,
        title: selectedMovie.title,
        overview: selectedMovie.synopsis || undefined,
        genres: selectedMovie.genres,
        keywords: selectedMovie.tags,
      });

      const result = await simulateGroup({
        members: [
          {
            user_id: "me",
            profile: userProfile,
            dislikes: userProfile.dislike_tags,
            likes: userProfile.boost_tags,
          },
        ],
        movie_profile: movieProfile,
        strategy: "least_misery",
      });

      setGroupResult(result);
    } catch (err) {
      console.error("Failed to analyze group:", err);
      showError("그룹 분석에 실패했습니다.");
    } finally {
      setAnalyzing(false);
    }
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
            {!memberConfigApplied && (
              <p className="muted">인원을 입력하고 적용하기를 눌러주세요.</p>
            )}

            <div className="group-config-grid">
              <div className="group-config-box">
                <p className="group-member-title">그룹 선택</p>
                <div className="group-select-wrap option-select" ref={groupTypeRef}>
                  <button
                    type="button"
                    className={`option-select-trigger ${groupType ? "" : "is-placeholder"}`}
                    aria-haspopup="listbox"
                    aria-expanded={isGroupTypeOpen}
                    onClick={() => setIsGroupTypeOpen((prev) => !prev)}
                  >
                    <span>{groupType || "그룹을 선택해주세요"}</span>
                    <span className="option-select-arrow" aria-hidden="true">
                      ▼
                    </span>
                  </button>
                  {isGroupTypeOpen && (
                    <div className="search-results option-select-list" role="listbox">
                      {groupTypeOptions.map((option) => (
                        <button
                          key={option}
                          type="button"
                          className="search-item option-select-item"
                          onClick={() => {
                            setGroupType(option);
                            setMemberConfigApplied(false);
                            setIsGroupTypeOpen(false);
                          }}
                        >
                          <strong>{option}</strong>
                          {groupType === option && <span>✓</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="group-config-box">
                <div className="group-member-grid">
                  <div className="group-member-box">
                    <p className="group-member-title">총 인원</p>
                    <div className="group-member-input-row">
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={draftTotalMembers}
                        onChange={(event) => {
                          setDraftTotalMembers(event.target.value.replace(/\D/g, ""));
                          setMemberConfigApplied(false);
                        }}
                        placeholder="0"
                      />
                      <span className="group-member-suffix">명</span>
                    </div>
                  </div>
                  <div className="group-member-box">
                    <p className="group-member-title">비회원 인원</p>
                    <div className="group-member-input-row">
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={draftGuestMembers}
                        onChange={(event) => {
                          setDraftGuestMembers(event.target.value.replace(/\D/g, ""));
                          setMemberConfigApplied(false);
                        }}
                        placeholder="0"
                      />
                      <span className="group-member-suffix">명</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <button className="secondary-btn" type="button" onClick={handleApplyMemberConfig}>
              적용하기
            </button>

            {memberConfigApplied && (
              <p className="muted">
                적용된 인원: 총 {totalMembers}명 / 비회원 {guestMembers}명 / 회원 {memberSlots}명
              </p>
            )}

            {formError && (
              <p className="error" key={`form-error-${errorTick}`}>
                {formError}
              </p>
            )}

            {memberConfigApplied && (
              <>
                <label>사용자 검색</label>
                <div ref={userSearchRef}>
                  <input
                    type="text"
                    placeholder="사용자 이름/닉네임/아이디 검색"
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
                      {!userSearchLoading && !userSearchError && userResults.length === 0 && (
                        <div className="search-empty">검색 결과가 없습니다.</div>
                      )}
                      {userResults.map((user) => {
                        const userId = getUserId(user);
                        const nickname = getUserDisplayName(user);
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
                                name: user.name || nickname,
                              })
                            }
                          >
                            <strong>{nickname}</strong>
                            <span>{user.name}</span>
                            {selectedMembers.includes(userId) && <span>✓</span>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {userRequiredError && (
                  <p className="error" key={`user-error-${errorTick}`}>
                    {userRequiredError}
                  </p>
                )}

                {selectedMembers.length > 0 && (
                  <div className="group-selected-members">
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
                    <p className="muted">
                      선택된 회원 멤버: {selectedMembers.length}/{memberSlots}명
                    </p>
                  </div>
                )}

                <label>영화 선택</label>
                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    placeholder="영화 제목 입력"
                    value={movieQuery}
                    onChange={(event) => {
                      setMovieQuery(event.target.value);
                      if (movieRequiredError) setError(null);
                      if (event.target.value.length > 1) {
                        handleMovieSearch();
                      } else {
                        setMovieSearchResults([]);
                      }
                    }}
                  />
                  {movieSearchResults.length > 0 && (
                    <div className="search-results">
                      {movieSearchResults.map((movie) => (
                        <button
                          className="search-item"
                          type="button"
                          key={movie.id}
                          onClick={() => handleMovieSelect(movie)}
                        >
                          <strong>{movie.title}</strong>
                          <span className="muted">
                            {movie.release ? new Date(movie.release).getFullYear() : ""} ·{" "}
                            {movie.genres.slice(0, 2).join("/")}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {movieRequiredError && (
                  <p className="error" key={`movie-error-${errorTick}`}>
                    {movieRequiredError}
                  </p>
                )}

                <button className="primary-btn" onClick={handleAnalyze} disabled={analyzing}>
                  {analyzing ? "분석 중..." : "분석하기"}
                </button>
              </>
            )}
          </div>
        </section>

        {groupResult && selectedMovie && (
          <section className="section">
            <article className="card">
              <div className="movie-tile">
                <img
                  className="poster"
                  src={
                    selectedMovie.poster_url ||
                    "https://via.placeholder.com/500x750?text=No+Image"
                  }
                  alt={`${selectedMovie.title} 포스터`}
                />
                <div className="movie-info">
                  <h3>{selectedMovie.title}</h3>
                  <p className="probability">
                    그룹 만족 확률 {Math.round(groupResult.group_score * 100)}%
                  </p>
                  <p className="muted">{groupResult.comment}</p>
                </div>
              </div>

              <div className="section" style={{ marginTop: 16 }}>
                <h3>멤버별 예상 반응</h3>
                <ul className="list">
                  {groupResult.members.map((member) => (
                    <li key={member.user_id}>
                      {member.user_id}: {member.level} ({Math.round(member.probability * 100)}%)
                    </li>
                  ))}
                </ul>
              </div>

              <div className="section" style={{ marginTop: 16 }}>
                <h3>추천 의견</h3>
                <p className="muted">{groupResult.recommendation}</p>
              </div>

              <div className="section" style={{ marginTop: 16 }}>
                <h3>통계</h3>
                <ul className="list">
                  <li>최소 만족도: {Math.round(groupResult.statistics.min_satisfaction * 100)}%</li>
                  <li>최대 만족도: {Math.round(groupResult.statistics.max_satisfaction * 100)}%</li>
                  <li>평균 만족도: {Math.round(groupResult.statistics.avg_satisfaction * 100)}%</li>
                </ul>
              </div>
            </article>
          </section>
        )}
      </main>
    </MainLayout>
  );
}
