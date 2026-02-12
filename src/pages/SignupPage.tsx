import { useState, type Dispatch, type SetStateAction } from "react";
import { Link, useNavigate } from "react-router-dom";
import MainLayout from "../components/layout/MainLayout";
import googleIcon from "../assets/web_neutral_sq_na@1x.png";
import kakaoIcon from "../assets/kakao_sq_login.png";
import { signup as signupApi } from "../api/auth";

const genreLikeOptions = [ "💕 로맨스 / 로코", "😂 코미디", "😢 드라마 / 휴먼", "🔪 스릴러 / 미스터리", "👻 공포 / 호러", "👊 액션", "🚔 범죄 / 느와르", "👽 SF", "🧙 판타지", "🧚 애니메이션", "⚔️ 전쟁 / 역사", "🎥 다큐멘터리"];

const avoidNoneLabel = "🆗 없음 (다 잘 봐요!)";

const genreAvoidOptions = [ "💕 로맨스 / 로코", "😂 코미디", "😢 드라마 / 휴먼", "🔪 스릴러 / 미스터리", "👻 공포 / 호러", "👊 액션", "🚔 범죄 / 느와르", "👽 SF", "🧙 판타지", "🧚 애니메이션", "⚔️ 전쟁 / 역사", "🎥 다큐멘터리", avoidNoneLabel];

const contextOptions = [ "🧘 혼자 몰입파", "💑 연인/친구와 함께", "👨👩👧👦 가족과 오순도순", "🌙 자기 전 가볍게", "🍿 주말에 각 잡고 진득하게"];

const vibeOptions = [ "🤣 가볍고 유쾌한", "😭 감동적이고 여운 남는", "🤯 충격적이고 파격적인", "🌿 잔잔하고 힐링되는", "🧠 철학적이고 생각하게 만드는", "🌃 어둡고 피폐한"];

const keywordOptions = [ "✨ 성장 / 청춘", "🤝 가족 / 우정", "💼 전문직 / 직업물", "📜 실화 기반", "🧟 디스토피아 / 아포칼립스", "🔄 타임루프 / 시간여행", "🎮 게임 / 가상세계", "🔎 본격 추리", "🎵 음악 / 예술", "⚽ 스포츠"];

const originOptions = [ "🇰🇷 한국 영화", "🇺🇸 미국/할리우드", "🇯🇵 일본 영화/애니", "🇪🇺 유럽/기타 해외", "🎞️ 고전 명작"];

const totalSurveySteps = 6;
const defaultProfileBio = "Enjoying drama and SF with strong emotional arcs.";

type SignupField = "name" | "nickname" | "userId" | "email" | "password" | "confirm";
type SignupFieldErrors = Partial<Record<SignupField, string>>;

export default function SignupPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [userId, setuserId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [signupStep, setSignupStep] = useState<number | null>(null);
  const [genres, setGenres] = useState<string[]>([]);
  const [avoidGenres, setAvoidGenres] = useState<string[]>([]);
  const [context, setContext] = useState("");
  const [vibe, setVibe] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [origin, setOrigin] = useState("");
  const [fieldErrors, setFieldErrors] = useState<SignupFieldErrors>({});
  const [signupError, setSignupError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleValueWithLimit = (
    value: string,
    setList: Dispatch<SetStateAction<string[]>>,
    limit: number
  ) => {
    setList((prev) => {
      if (prev.includes(value)) {
        return prev.filter((item) => item !== value);
      }
      if (prev.length >= limit) return prev;
      return [...prev, value];
    });
  };

  const toggleValue = (
    value: string,
    list: string[],
    setList: Dispatch<SetStateAction<string[]>>
  ) => {
    if (list.includes(value)) {
      setList(list.filter((item) => item !== value));
      return;
    }
    setList([...list, value]);
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

  const clearFieldError = (field: SignupField) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const validateSignupFields = () => {
    const nextErrors: SignupFieldErrors = {};

    if (!name.trim()) nextErrors.name = "내용을 입력해주세요.";
    if (!nickname.trim()) nextErrors.nickname = "내용을 입력해주세요.";
    if (!userId.trim()) nextErrors.userId = "내용을 입력해주세요.";
    if (!email.trim()) nextErrors.email = "내용을 입력해주세요.";
    if (!password.trim()) nextErrors.password = "내용을 입력해주세요.";
    if (!confirm.trim()) nextErrors.confirm = "내용을 입력해주세요.";
    if (password && confirm && password !== confirm) {
      nextErrors.confirm = "비밀번호가 일치하지 않습니다.";
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSignup = async () => {
    setSignupError("");
    if (isSubmitting) return;
    if (!validateSignupFields()) return;

    const payload = {
      user_id: userId.trim(),
      name: name.trim(),
      nickname: nickname.trim(),
      email: email.trim(),
      password,
      password_confirm: confirm,
    };

    try {
      setIsSubmitting(true);
      const createdUser = await signupApi(payload);
      const profileSnapshot = {
        realname: createdUser.name || payload.name,
        nickname: createdUser.nickname || payload.nickname,
        id: createdUser.user_id || payload.user_id,
        email: createdUser.email || payload.email,
        age: "선택 안함",
        gender: "선택 안함",
      };

      localStorage.setItem("mw_profile_name", profileSnapshot.nickname);
      localStorage.setItem("mw_profile_realname", profileSnapshot.realname);
      localStorage.setItem("mw_profile_nickname", profileSnapshot.nickname);
      localStorage.setItem("mw_profile_id", profileSnapshot.id);
      localStorage.setItem("mw_user_id", profileSnapshot.id);
      localStorage.setItem("mw_profile_email", profileSnapshot.email);
      localStorage.setItem("mw_profile_age", profileSnapshot.age);
      localStorage.setItem("mw_profile_gender", profileSnapshot.gender);
      localStorage.setItem("mw_profile_bio", defaultProfileBio);
      localStorage.setItem("mw_signup_profile", JSON.stringify(profileSnapshot));
      localStorage.setItem("mw_logged_in", "true");
      window.dispatchEvent(new Event("mw_auth_change"));

      setSignupStep(0);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "회원가입에 실패했습니다.";
      setSignupError(message || "회원가입에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteSurvey = () => {
    localStorage.setItem("mw_taste_genres", JSON.stringify(genres));
    localStorage.setItem("mw_taste_avoid_genres", JSON.stringify(avoidGenres));
    localStorage.setItem("mw_taste_context", context);
    localStorage.setItem("mw_taste_vibe", vibe);
    localStorage.setItem("mw_taste_keywords", JSON.stringify(keywords));
    localStorage.setItem("mw_tast_keyword", JSON.stringify(keywords));
    localStorage.setItem("mw_taste_origin", origin);
    setSignupStep(null);
  };

  const handleStart = () => {
    handleCompleteSurvey();
    navigate("/mypage");
  };

  const closeSurvey = () => setSignupStep(null);

  return (
    <MainLayout>
      <main className="container">
        <section className="page-title centered">
          <h1>회원가입</h1>
        </section>

        <section className="section">
          <article className="card auth-card">
            <div className="form-grid">
              <label htmlFor="signup-name">이름</label>
              <input
                id="signup-name"
                type="text"
                placeholder="이름"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  clearFieldError("name");
                  setSignupError("");
                }}
              />
              {fieldErrors.name && <p className="field-error-text">{fieldErrors.name}</p>}
              <label htmlFor="signup-nickname">닉네임</label>
              <input
                id="signup-nickname"
                type="text"
                placeholder="닉네임"
                value={nickname}
                onChange={(event) => {
                  setNickname(event.target.value);
                  clearFieldError("nickname");
                  setSignupError("");
                }}
              />
              {fieldErrors.nickname && <p className="field-error-text">{fieldErrors.nickname}</p>}
              <label htmlFor="signup-userid">아이디</label>
              <input
                id="signup-userid"
                type="text"
                placeholder="아이디"
                value={userId}
                onChange={(event) => {
                  setuserId(event.target.value);
                  clearFieldError("userId");
                  setSignupError("");
                }}
              />
              {fieldErrors.userId && <p className="field-error-text">{fieldErrors.userId}</p>}
              <label htmlFor="signup-password">비밀번호</label>
              <input
                id="signup-password"
                type="password"
                placeholder="********"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  clearFieldError("password");
                  clearFieldError("confirm");
                  setSignupError("");
                }}
              />
              {fieldErrors.password && <p className="field-error-text">{fieldErrors.password}</p>}
              <label htmlFor="signup-confirm">비밀번호 확인</label>
              <input
                id="signup-confirm"
                type="password"
                placeholder="********"
                value={confirm}
                onChange={(event) => {
                  setConfirm(event.target.value);
                  clearFieldError("confirm");
                  setSignupError("");
                }}
              />
              {fieldErrors.confirm && <p className="field-error-text">{fieldErrors.confirm}</p>}
              <label htmlFor="signup-email">이메일</label>
              <input
                id="signup-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  clearFieldError("email");
                  setSignupError("");
                }}
              />
              {fieldErrors.email && <p className="field-error-text">{fieldErrors.email}</p>}
              <button
                className="primary-btn"
                type="button"
                onClick={handleSignup}
                disabled={isSubmitting}
              >
                {isSubmitting ? "가입 중..." : "회원가입"}
              </button>
              {signupError && (
                <p className="field-error-text" role="alert">
                  {signupError}
                </p>
              )}
            </div>
            <div className="auth-actions">
              <Link className="secondary-btn" to="/login">
                로그인으로 돌아가기
              </Link>
            </div>
            <div className="social-login">
              <div className="social-login-buttons">
                <button className="secondary-btn social-btn" type="button">
                  <img src={googleIcon} alt="" />
                </button>
                <button className="secondary-btn social-btn" type="button">
                  <img src={kakaoIcon} alt="" />
                </button>
              </div>
            </div>
          </article>
        </section>

        {signupStep !== null && (
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="signup-complete-title"
          >
            <div className="modal-overlay" onClick={closeSurvey} />
            <div className="modal-content">
              <div className="modal-scroll">
                <div className="modal-header">
                  {signupStep === 0 ? (
                    <h2 id="signup-complete-title">취향 분석 설문</h2>
                  ) : (
                    <h2 id="signup-complete-title">
                      취향 분석 설문 {signupStep}/{totalSurveySteps}
                    </h2>
                  )}
                  <button
                    className="icon-btn"
                    type="button"
                    aria-label="닫기"
                    onClick={closeSurvey}
                  >
                    ×
                  </button>
                </div>

                <div className="modal-section">
                  {signupStep === 0 && (
                    <p className="muted">
                      당신에게 맞는 영화를 추천하기 위해 간단한 질문을 드릴게요.
                    </p>
                  )}

                  {signupStep === 1 && (
                    <>
                      <h3 className="filter-title">
                        가장 좋아하는 장르를 골라주세요. (최대 5개)
                      </h3>
                      <div className="tag-list">
                        {genreLikeOptions.map((genre) => (
                          <button
                            key={genre}
                            className={`filter-chip ${
                              genres.includes(genre) ? "active" : ""
                            }`}
                            type="button"
                            onClick={() =>
                              toggleValueWithLimit(genre, setGenres, 5)
                            }
                          >
                            {genre}
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  {signupStep === 2 && (
                    <>
                      <h3 className="filter-title">
                        이것만큼은 피하고 싶다! 절대 안 보는 장르는? (선택)
                      </h3>
                      <div className="tag-list">
                        {genreAvoidOptions.map((genre) => (
                          <button
                            key={`avoid-${genre}`}
                            className={`filter-chip ${
                              avoidGenres.includes(genre) ? "active" : ""
                            }`}
                            type="button"
                            onClick={() => toggleAvoidGenre(genre)}
                          >
                            {genre}
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  {signupStep === 3 && (
                    <>
                      <h3 className="filter-title">
                        보통 영화를 언제, 어떻게 즐기시나요?
                      </h3>
                      <div className="tag-list">
                        {contextOptions.map((option) => (
                          <button
                            key={option}
                            className={`filter-chip ${
                              context === option ? "active" : ""
                            }`}
                            type="button"
                            onClick={() => setContext(option)}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  {signupStep === 4 && (
                    <>
                      <h3 className="filter-title">
                        어떤 분위기의 영화가 땡기나요?
                      </h3>
                      <div className="tag-list">
                        {vibeOptions.map((option) => (
                          <button
                            key={option}
                            className={`filter-chip ${
                              vibe === option ? "active" : ""
                            }`}
                            type="button"
                            onClick={() => setVibe(option)}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  {signupStep === 5 && (
                    <>
                      <h3 className="filter-title">
                        특별히 꽂히는 소재가 있나요? (중복 선택)
                      </h3>
                      <div className="tag-list">
                        {keywordOptions.map((keyword) => (
                          <button
                            key={keyword}
                            className={`filter-chip ${
                              keywords.includes(keyword) ? "active" : ""
                            }`}
                            type="button"
                            onClick={() =>
                              toggleValue(keyword, keywords, setKeywords)
                            }
                          >
                            {keyword}
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  {signupStep === 6 && (
                    <>
                      <h3 className="filter-title">주로 어떤 영화를 많이 보세요?</h3>
                      <div className="tag-list">
                        {originOptions.map((option) => (
                          <button
                            key={option}
                            className={`filter-chip ${
                              origin === option ? "active" : ""
                            }`}
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
                  {signupStep === 0 && (
                    <button
                      className="primary-btn"
                      type="button"
                      onClick={() => setSignupStep(1)}
                    >
                      설문하러가기
                    </button>
                  )}
                  {signupStep !== 0 && signupStep >= 2 && (
                    <button
                      className="secondary-btn"
                      type="button"
                      onClick={() =>
                        setSignupStep((prev) => (prev && prev > 1 ? prev - 1 : 1))
                      }
                    >
                      이전
                    </button>
                  )}
                  {signupStep !== 0 && signupStep < totalSurveySteps && (
                    <button
                      className="primary-btn"
                      type="button"
                      onClick={() =>
                        setSignupStep((prev) => (prev ? prev + 1 : 1))
                      }
                    >
                      다음
                    </button>
                  )}
                  {signupStep === totalSurveySteps && (
                    <button
                      className="primary-btn"
                      type="button"
                      onClick={handleStart}
                    >
                      시작하기
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </MainLayout>
  );
}
