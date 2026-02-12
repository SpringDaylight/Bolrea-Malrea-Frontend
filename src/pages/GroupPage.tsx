import { useEffect, useRef, useState } from "react";
import MainLayout from "../components/layout/MainLayout";
import { 
  simulateGroup, 
  vectorizeMovie,
  type GroupSimulationResult,
  type UserProfile 
} from "../api/ml";
import { searchMovies, type Movie } from "../api/A2_movies";

const groupTypeOptions = ["친구", "가족", "연인", "모임", "기타"];

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
  const [isUserSearchOpen, setIsUserSearchOpen] = useState(false);
  const [isGroupTypeOpen, setIsGroupTypeOpen] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [movieSearchResults, setMovieSearchResults] = useState<Movie[]>([]);
  const [groupResult, setGroupResult] = useState<GroupSimulationResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const userSearchRef = useRef<HTMLDivElement | null>(null);
  const groupTypeRef = useRef<HTMLDivElement | null>(null);
  const userRequiredError = error === "사용자를 선택해주세요." ? error : null;
  const movieRequiredError = error === "영화를 선택해주세요." ? error : null;
  const formError =
    error &&
    error !== "영화를 선택해주세요." &&
    error !== "사용자를 선택해주세요."
      ? error
      : null;

  // 더미 사용자 데이터 (실제로는 API에서 가져와야 함)
  const allUsers = [
    { id: "mirae_01", name: "미래", nickname: "미래" },
    { id: "noir_02", name: "노을", nickname: "노을빛" },
    { id: "summer_03", name: "여름", nickname: "summer" },
  ];
  const userResults = allUsers.filter((user) => {
    const query = userQuery.trim().toLowerCase();
    return (
      !selectedMembers.includes(user.id) &&
      (
        !query ||
        user.name.toLowerCase().includes(query) ||
        user.nickname.toLowerCase().includes(query) ||
        user.id.toLowerCase().includes(query)
      )
    );
  });
  const selectedMemberItems = selectedMembers.map((memberId) => {
    const matched = allUsers.find((user) => user.id === memberId);
    return {
      id: memberId,
      nickname: matched ? matched.nickname : memberId,
    };
  });

  const handleMemberToggle = (userId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : prev.length >= memberSlots
          ? prev
          : [...prev, userId]
    );
    if (userRequiredError) {
      setError(null);
    }
  };

  const memberSlots = Math.max(totalMembers - guestMembers, 0);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (event.target instanceof Node) {
        if (userSearchRef.current && !userSearchRef.current.contains(event.target)) {
          setIsUserSearchOpen(false);
        }
        if (groupTypeRef.current && !groupTypeRef.current.contains(event.target)) {
          setIsGroupTypeOpen(false);
        }
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  const handleApplyMemberConfig = () => {
    if (!groupType) {
      setError("그룹을 선택해주세요.");
      setMemberConfigApplied(false);
      return;
    }

    const totalValue = Number(draftTotalMembers);
    const guestValue = draftGuestMembers === "" ? 0 : Number(draftGuestMembers);

    if (!draftTotalMembers || Number.isNaN(totalValue) || totalValue < 1) {
      setError("총 인원은 1명 이상 입력해주세요.");
      setMemberConfigApplied(false);
      return;
    }

    if (Number.isNaN(guestValue) || guestValue < 0) {
      setError("비회원 인원은 0명 이상 입력해주세요.");
      setMemberConfigApplied(false);
      return;
    }

    if (guestValue > totalValue) {
      setError("비회원 인원은 총 인원보다 많을 수 없습니다.");
      setMemberConfigApplied(false);
      return;
    }

    const nextSlots = Math.max(totalValue - guestValue, 0);
    setTotalMembers(totalValue);
    setGuestMembers(guestValue);
    setSelectedMembers((prev) => prev.slice(0, nextSlots));
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
      console.error('Failed to search movies:', err);
    }
  };

  const handleMovieSelect = async (movie: Movie) => {
    setSelectedMovie(movie);
    setMovieSearchResults([]);
    setMovieQuery(movie.title);
  };

  const handleAnalyze = async () => {
    if (memberSlots > 0 && selectedMembers.length < memberSlots) {
      setError("사용자를 회원수만큼 선택해주세요.");
      return;
    }

    if (!selectedMovie) {
      setError('영화를 선택해주세요.');
      return;
    }

    setAnalyzing(true);
    setError(null);

    try {
      // 각 멤버의 취향 프로필 가져오기 (더미 데이터)
      // 실제로는 각 사용자의 저장된 프로필을 가져와야 함
      const currentUserProfile = localStorage.getItem("mw_user_profile");
      if (!currentUserProfile) {
        setError('취향 분석 데이터가 없습니다. 먼저 취향 설문을 완료해주세요.');
        setAnalyzing(false);
        return;
      }

      const userProfile = JSON.parse(currentUserProfile) as UserProfile;

      // 영화 벡터화
      const movieProfile = await vectorizeMovie({
        movie_id: selectedMovie.id,
        title: selectedMovie.title,
        overview: selectedMovie.synopsis || undefined,
        genres: selectedMovie.genres,
        keywords: selectedMovie.tags,
      });

      // 그룹 시뮬레이션 (현재는 본인만 포함)
      const result = await simulateGroup({
        members: [
          {
            user_id: "me",
            profile: userProfile,
            dislikes: userProfile.dislike_tags,
            likes: userProfile.boost_tags,
          },
          // 실제로는 선택된 멤버들의 프로필을 모두 포함
        ],
        movie_profile: movieProfile,
        strategy: "least_misery",
      });

      setGroupResult(result);
    } catch (err) {
      console.error('Failed to analyze group:', err);
      setError('그룹 분석에 실패했습니다.');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <MainLayout>
      <main className="container group-page">
        <section className="page-title">
          <h1>모두가 만족할 영화 찾기</h1>
          <p>모임 구성원들의 취향을 합쳐 한 번에 정리해드려요.</p>
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
                      ▾
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
                <p className="group-member-title">인원 선택</p>
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
            <button
              className="secondary-btn"
              type="button"
              onClick={handleApplyMemberConfig}
            >
              적용하기
            </button>
            {memberConfigApplied && (
              <p className="muted">
                적용된 인원: 총 {totalMembers}명 / 비회원 {guestMembers}명 / 회원 {memberSlots}명
              </p>
            )}
            {formError && <p className="error">{formError}</p>}

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
                      {userResults.length === 0 && (
                        <div className="search-empty">검색 결과가 없습니다.</div>
                      )}
                      {userResults.map((user) => (
                        <button
                          className={`search-item ${
                            selectedMembers.includes(user.id) ? "active" : ""
                          }`}
                          type="button"
                          key={user.id}
                          onClick={() => handleMemberToggle(user.id)}
                        >
                          <strong>{user.nickname}</strong>
                          <span>{user.name}</span>
                          {selectedMembers.includes(user.id) && <span> ✓</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {userRequiredError && <p className="error">{userRequiredError}</p>}

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
                            {movie.release ? new Date(movie.release).getFullYear() : ""} ·
                            {movie.genres.slice(0, 2).join("/")}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {movieRequiredError && <p className="error">{movieRequiredError}</p>}

                <button
                  className="primary-btn"
                  onClick={handleAnalyze}
                  disabled={analyzing}
                >
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
                  src={selectedMovie.poster_url || 'https://via.placeholder.com/500x750?text=No+Image'}
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
