import { useEffect, useRef, useState } from "react";
import MainLayout from "../components/layout/MainLayout";
import { type GroupSimulationResult } from "../api/ml";
import { searchGroupUsers, type GroupUserSearchItem } from "../api/A4_group";
import { getCurrentUser } from "../api/A7_profile";

const userRequiredMessage = "회원 사용자를 선택해주세요.";

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
  const [groupResult, setGroupResult] = useState<GroupSimulationResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorTick, setErrorTick] = useState(0);
  const [userSearchResults, setUserSearchResults] = useState<GroupUserSearchItem[]>([]);
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  const [userSearchError, setUserSearchError] = useState<string | null>(null);
  const [currentUserNickname, setCurrentUserNickname] = useState("나");
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

    setAnalyzing(true);
    setError(null);

    try {
      const likedGenres = parseArrayFromStorage("mw_taste_genres");
      const avoidedGenres = parseArrayFromStorage("mw_taste_avoid_genres");
      const keywords = parseArrayFromStorage("mw_taste_keywords");

      const computeScoreFromTaste = () => {
        let score = 0.5;

        if (likedGenres.length > 0) {
          score += Math.min(0.3, likedGenres.length * 0.03);
        }

        if (avoidedGenres.length > 0) {
          score -= Math.min(0.2, avoidedGenres.length * 0.02);
        }

        if (keywords.length > 0) {
          score += Math.min(0.15, keywords.length * 0.02);
        }

        return clamp01(score);
      };

      const members = selectedMembers.map((memberId) => {
        const isMe = currentUserId && memberId === currentUserId;
        const label =
          (isMe ? currentUserNickname : selectedMemberProfiles[memberId]?.nickname) ||
          memberId;
        const probability = isMe ? computeScoreFromTaste() : 0.5;
        return {
          user_id: label,
          probability,
          confidence: isMe ? 0.6 : 0.4,
          level: resolveSatisfactionLevel(probability),
        };
      });

      const probabilities = members.map((member) => member.probability);
      const avg =
        probabilities.length > 0
          ? probabilities.reduce((sum, value) => sum + value, 0) / probabilities.length
          : 0.5;
      const min = probabilities.length > 0 ? Math.min(...probabilities) : avg;
      const max = probabilities.length > 0 ? Math.max(...probabilities) : avg;
      const variance =
        probabilities.length > 0
          ? probabilities.reduce((sum, value) => sum + Math.pow(value - avg, 2), 0) /
            probabilities.length
          : 0;

      const scorePercent = Math.round(avg * 100);
      const comment =
        scorePercent >= 70
          ? "대체로 만족도가 높을 것 같아요."
          : scorePercent >= 50
          ? "호불호가 갈릴 수 있어요."
          : "만족도가 낮을 수 있어요.";
      const recommendation =
        scorePercent >= 70
          ? "다 같이 보기 좋은 선택입니다."
          : scorePercent >= 50
          ? "함께 보기 전에 취향을 한번 더 확인해보세요."
          : "다른 영화를 추천해요.";

      const result: GroupSimulationResult = {
        group_score: avg,
        strategy: "local",
        members,
        comment,
        recommendation,
        statistics: {
          min_satisfaction: min,
          max_satisfaction: max,
          avg_satisfaction: avg,
          variance,
        },
      };

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
            {formError && (
              <p className="error" key={`form-error-${errorTick}`}>
                {formError}
              </p>
            )}

            <div className="group-search-column">
              <div className="group-search-field">
                <label>영화 같이 볼 회원 검색하기
                  (최대 10명까지 검색 가능해요)</label>
                <div className="group-search-input" ref={userSearchRef}>
                  <input
                    type="text"
                    placeholder="이름/닉네임/아이디로 검색해서 찾을 수 있어요"
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
              {analyzing ? "추천 받는 중..." : "추천받기"}
            </button>
          </div>
        </section>

        {groupResult && (
          <section className="section">
            <article className="card">
              <div className="movie-info">
                <h3>추천 결과</h3>
                <p className="probability">
                  그룹 만족 확률 {Math.round(groupResult.group_score * 100)}%
                </p>
                <p className="muted">{groupResult.comment}</p>
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
