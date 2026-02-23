/**
 * 취향 설문 모달 컴포넌트
 * SignupPage의 설문 로직을 재사용
 */
import { useState, type Dispatch, type SetStateAction } from "react";
import { analyzePreference } from "../api/ml";
import { getAccessToken } from "../api/http";

const genreLikeOptions = [
  "💕 로맨스 / 로코",
  "😂 코미디",
  "😢 드라마 / 휴먼",
  "🔪 스릴러 / 미스터리",
  "👻 공포 / 호러",
  "👊 액션",
  "🚔 범죄 / 느와르",
  "👽 SF",
  "🧙 판타지",
  "🧚 애니메이션",
  "⚔️ 전쟁 / 역사",
  "🎥 다큐멘터리",
];

const avoidNoneLabel = "🆗 없음 (다 잘 봐요!)";

const genreAvoidOptions = [
  "💕 로맨스 / 로코",
  "😂 코미디",
  "😢 드라마 / 휴먼",
  "🔪 스릴러 / 미스터리",
  "👻 공포 / 호러",
  "👊 액션",
  "🚔 범죄 / 느와르",
  "👽 SF",
  "🧙 판타지",
  "🧚 애니메이션",
  "⚔️ 전쟁 / 역사",
  "🎥 다큐멘터리",
  avoidNoneLabel,
];

const contextOptions = [
  "🧘 혼자 몰입파",
  "💑 연인/친구와 함께",
  "👨👩👧👦 가족과 오순도순",
  "🌙 자기 전 가볍게",
  "🍿 주말에 각 잡고 진득하게",
];

const vibeOptions = [
  "🤣 가볍고 유쾌한",
  "😭 감동적이고 여운 남는",
  "🤯 충격적이고 파격적인",
  "🌿 잔잔하고 힐링되는",
  "🧠 철학적이고 생각하게 만드는",
  "🌃 어둡고 피폐한",
];

const keywordOptions = [
  "✨ 성장 / 청춘",
  "🤝 가족 / 우정",
  "💼 전문직 / 직업물",
  "📜 실화 기반",
  "🧟 디스토피아 / 아포칼립스",
  "🔄 타임루프 / 시간여행",
  "🎮 게임 / 가상세계",
  "🔎 본격 추리",
  "🎵 음악 / 예술",
  "⚽ 스포츠",
];

const originOptions = [
  "🇰🇷 한국 영화",
  "🇺🇸 미국/할리우드",
  "🇯🇵 일본 영화/애니",
  "🇪🇺 유럽/기타 해외",
  "🎞️ 고전 명작",
];

const totalSurveySteps = 6;

interface TasteSurveyModalProps {
  onClose: () => void;
  onComplete: () => void;
}

const readStorageArray = (key: string): string[] => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is string => typeof item === "string" && item.trim().length > 0
    );
  } catch {
    return [];
  }
};

const readStorageString = (key: string): string => {
  try {
    return (localStorage.getItem(key) || "").trim();
  } catch {
    return "";
  }
};

const readAvoidGenres = (): string[] => {
  const stored = readStorageArray("mw_taste_avoid_genres");
  if (stored.includes(avoidNoneLabel)) {
    return [avoidNoneLabel];
  }
  return stored;
};

const readKeywords = (): string[] => {
  const stored = readStorageArray("mw_taste_keywords");
  if (stored.length > 0) return stored;
  return readStorageArray("mw_tast_keyword");
};

export default function TasteSurveyModal({ onClose, onComplete }: TasteSurveyModalProps) {
  const [surveyStep, setSurveyStep] = useState(0);
  const [genres, setGenres] = useState<string[]>(() =>
    readStorageArray("mw_taste_genres")
  );
  const [avoidGenres, setAvoidGenres] = useState<string[]>(() => readAvoidGenres());
  const [context, setContext] = useState(() => readStorageString("mw_taste_context"));
  const [vibe, setVibe] = useState(() => readStorageString("mw_taste_vibe"));
  const [keywords, setKeywords] = useState<string[]>(() => readKeywords());
  const [origin, setOrigin] = useState(() => readStorageString("mw_taste_origin"));
  const [submitting, setSubmitting] = useState(false);

  const toggleValueWithLimit = (
    value: string,
    setList: Dispatch<SetStateAction<string[]>>,
    limit: number
  ) => {
    setList((prev) => {
      if (prev.includes(value)) {
        return prev.filter((item) => item !== value);
      }
      if (prev.length >= limit) {
        return prev;
      }
      return [...prev, value];
    });
  };

  const toggleAvoidGenre = (value: string) => {
    setAvoidGenres((prev) => {
      if (value === avoidNoneLabel) {
        return prev.includes(avoidNoneLabel) ? [] : [avoidNoneLabel];
      }
      const withoutNone = prev.filter((item) => item !== avoidNoneLabel);
      if (withoutNone.includes(value)) {
        return withoutNone.filter((item) => item !== value);
      }
      return [...withoutNone, value];
    });
  };

  const handleNext = () => {
    if (surveyStep < totalSurveySteps) {
      setSurveyStep(surveyStep + 1);
    }
  };

  const handlePrev = () => {
    if (surveyStep > 0) {
      setSurveyStep(surveyStep - 1);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // localStorage에 저장
      localStorage.setItem("mw_taste_genres", JSON.stringify(genres));
      localStorage.setItem("mw_taste_avoid_genres", JSON.stringify(avoidGenres));
      localStorage.setItem("mw_taste_context", context);
      localStorage.setItem("mw_taste_vibe", vibe);
      localStorage.setItem("mw_taste_keywords", JSON.stringify(keywords));
      localStorage.setItem("mw_taste_origin", origin);

      // ML API: 취향 분석 수행
      const userText = `${vibe} ${keywords.join(", ")} ${genres.join(", ")}`;
      const userDislikes = avoidGenres.filter((g) => g !== avoidNoneLabel).join(", ");

      const userProfile = await analyzePreference({
        text: userText,
        dislikes: userDislikes || undefined,
      });

      // 분석 결과 저장
      localStorage.setItem("mw_user_profile", JSON.stringify(userProfile));

      // 로그인한 사용자라면 DB에도 저장
      const isLoggedIn = Boolean(getAccessToken());
      const userPk = localStorage.getItem("mw_user_pk");

      if (isLoggedIn && userPk) {
        const { saveUserPreference } = await import("../api/userPreferences");

        await saveUserPreference({
          user_id: userPk,
          preference_vector_json: {
            emotion_scores: userProfile.emotion_scores,
            narrative_traits: userProfile.narrative_traits,
            direction_mood: userProfile.direction_mood,
            character_relationship: userProfile.character_relationship,
            ending_preference: userProfile.ending_preference,
          },
          boost_tags: userProfile.boost_tags,
          dislike_tags: userProfile.dislike_tags,
          penalty_tags: [],
        });
      }

      onComplete();
    } catch (err) {
      console.error("Failed to analyze preference:", err);
      alert("취향 분석 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal" role="dialog" aria-modal="true">
      <div className="modal-overlay" onClick={onClose} />
      <div className="modal-content">
        <div className="modal-scroll">
          <div className="modal-header">
            {surveyStep === 0 ? (
              <h2>취향 분석 설문</h2>
            ) : (
              <h2>
                취향 분석 설문 {surveyStep}/{totalSurveySteps}
              </h2>
            )}
            <button className="icon-btn" type="button" aria-label="닫기" onClick={onClose}>
              ×
            </button>
          </div>

          <div className="modal-section">
            {surveyStep === 0 && (
              <p className="muted">당신에게 맞는 영화를 추천하기 위해 간단한 질문을 드릴게요.</p>
            )}

            {surveyStep === 1 && (
              <>
                <h3 className="filter-title">가장 좋아하는 장르를 골라주세요. (최대 5개)</h3>
                <div className="tag-list">
                  {genreLikeOptions.map((genre) => (
                    <button
                      key={genre}
                      className={`filter-chip ${genres.includes(genre) ? "active" : ""}`}
                      type="button"
                      onClick={() => toggleValueWithLimit(genre, setGenres, 5)}
                    >
                      {genre}
                    </button>
                  ))}
                </div>
              </>
            )}

            {surveyStep === 2 && (
              <>
                <h3 className="filter-title">이것만큼은 피하고 싶다! 절대 안 보는 장르는? (선택)</h3>
                <div className="tag-list">
                  {genreAvoidOptions.map((genre) => (
                    <button
                      key={`avoid-${genre}`}
                      className={`filter-chip ${avoidGenres.includes(genre) ? "active" : ""}`}
                      type="button"
                      onClick={() => toggleAvoidGenre(genre)}
                    >
                      {genre}
                    </button>
                  ))}
                </div>
              </>
            )}

            {surveyStep === 3 && (
              <>
                <h3 className="filter-title">보통 영화를 언제, 어떻게 즐기시나요?</h3>
                <div className="tag-list">
                  {contextOptions.map((option) => (
                    <button
                      key={option}
                      className={`filter-chip ${context === option ? "active" : ""}`}
                      type="button"
                      onClick={() => setContext(option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </>
            )}

            {surveyStep === 4 && (
              <>
                <h3 className="filter-title">어떤 분위기의 영화가 땡기나요?</h3>
                <div className="tag-list">
                  {vibeOptions.map((option) => (
                    <button
                      key={option}
                      className={`filter-chip ${vibe === option ? "active" : ""}`}
                      type="button"
                      onClick={() => setVibe(option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </>
            )}

            {surveyStep === 5 && (
              <>
                <h3 className="filter-title">관심 있는 키워드를 골라주세요. (최대 3개)</h3>
                <div className="tag-list">
                  {keywordOptions.map((option) => (
                    <button
                      key={option}
                      className={`filter-chip ${keywords.includes(option) ? "active" : ""}`}
                      type="button"
                      onClick={() => toggleValueWithLimit(option, setKeywords, 3)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </>
            )}

            {surveyStep === 6 && (
              <>
                <h3 className="filter-title">주로 어느 나라 영화를 보시나요?</h3>
                <div className="tag-list">
                  {originOptions.map((option) => (
                    <button
                      key={option}
                      className={`filter-chip ${origin === option ? "active" : ""}`}
                      type="button"
                      onClick={() => setOrigin(option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="modal-footer">
            {surveyStep === 0 && (
              <button className="primary-btn" type="button" onClick={handleNext}>
                시작하기
              </button>
            )}
            {surveyStep > 0 && surveyStep < totalSurveySteps && (
              <>
                <button className="secondary-btn" type="button" onClick={handlePrev}>
                  이전
                </button>
                <button className="primary-btn" type="button" onClick={handleNext}>
                  다음
                </button>
              </>
            )}
            {surveyStep === totalSurveySteps && (
              <>
                <button className="secondary-btn" type="button" onClick={handlePrev}>
                  이전
                </button>
                <button
                  className="primary-btn"
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? "저장 중..." : "완료"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
