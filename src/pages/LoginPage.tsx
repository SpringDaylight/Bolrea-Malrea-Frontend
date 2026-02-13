import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import MainLayout from "../components/layout/MainLayout";
import googleIcon from "../assets/web_neutral_sq_na@1x.png";
import kakaoIcon from "../assets/kakao_sq_login.png";
import { getKakaoLoginUrl, login as loginApi } from "../api/auth";

const defaultProfileBio = "Enjoying drama and SF with strong emotional arcs.";

export default function LoginPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async () => {
    if (isSubmitting) return;
    setLoginError("");

    const userIdValue = userId.trim();
    if (!userIdValue || !password.trim()) {
      setLoginError("아이디와 비밀번호를 입력해주세요.");
      return;
    }

    const existingRealname = localStorage.getItem("mw_profile_realname") || "";
    const existingNickname = localStorage.getItem("mw_profile_nickname") || "";
    const existingProfileId = localStorage.getItem("mw_profile_id") || "";
    const existingUserPk = localStorage.getItem("mw_user_pk") || "";
    const existingEmail = localStorage.getItem("mw_profile_email") || "";
    const existingAge = localStorage.getItem("mw_profile_age") || "";
    const existingGender = localStorage.getItem("mw_profile_gender") || "";
    const rawSnapshot = localStorage.getItem("mw_signup_profile");
    let snapshot: {
      realname?: string;
      nickname?: string;
      id?: string;
      userPk?: string;
      email?: string;
      age?: string;
      gender?: string;
    } = {};

    if (rawSnapshot) {
      try {
        snapshot = JSON.parse(rawSnapshot) as typeof snapshot;
      } catch (error) {
        console.error("Failed to parse signup profile snapshot:", error);
      }
    }

    try {
      setIsSubmitting(true);
      const loggedInUser = await loginApi({
        user_id: userIdValue,
        password,
      });
      const profileSnapshot = {
        realname: loggedInUser.name || snapshot.realname || existingRealname || userIdValue,
        nickname:
          loggedInUser.nickname ||
          snapshot.nickname ||
          existingNickname ||
          loggedInUser.name ||
          userIdValue,
        id: loggedInUser.user_id || snapshot.id || existingProfileId || userIdValue,
        userPk: loggedInUser.id || snapshot.userPk || existingUserPk,
        email: loggedInUser.email || snapshot.email || existingEmail,
        age: snapshot.age || existingAge || "선택 안함",
        gender: snapshot.gender || existingGender || "선택 안함",
      };

      localStorage.setItem(
        "mw_profile_name",
        profileSnapshot.nickname
      );
      localStorage.setItem(
        "mw_profile_realname",
        profileSnapshot.realname
      );
      localStorage.setItem(
        "mw_profile_nickname",
        profileSnapshot.nickname
      );
      localStorage.setItem("mw_profile_id", profileSnapshot.id);
      localStorage.setItem("mw_user_pk", profileSnapshot.userPk);
      localStorage.setItem("mw_profile_email", profileSnapshot.email);
      localStorage.setItem("mw_profile_age", profileSnapshot.age);
      localStorage.setItem(
        "mw_profile_gender",
        profileSnapshot.gender
      );
      localStorage.setItem("mw_user_id", profileSnapshot.id);
      localStorage.setItem("mw_profile_bio", defaultProfileBio);
      localStorage.setItem(
        "mw_signup_profile",
        JSON.stringify(profileSnapshot)
      );
      localStorage.setItem("mw_logged_in", "true");
      window.dispatchEvent(new Event("mw_auth_change"));
      navigate("/mypage");
    } catch (error) {
      const message = error instanceof Error ? error.message : "로그인에 실패했습니다.";
      setLoginError(message || "로그인에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKakaoLogin = async () => {
    try {
      const response = await getKakaoLoginUrl();
      // Redirect to Kakao OAuth page
      window.location.href = response.auth_url;
    } catch (error) {
      console.error('Failed to get Kakao login URL:', error);
      alert('카카오 로그인에 실패했습니다.');
    }
  };

  return (
    <MainLayout>
      <main className="container">
        <section className="page-title centered">
          <h1>로그인</h1>
        </section>

        <section className="section">
          <article className="card auth-card">
            <div className="form-grid">
              <label htmlFor="login-name">아이디</label>
              <input
                id="login-name"
                type="text"
                placeholder="아이디"
                value={userId}
                onChange={(event) => {
                  setUserId(event.target.value);
                  setLoginError("");
                }}
              />
              <label htmlFor="login-password">비밀번호</label>
              <input
                id="login-password"
                type="password"
                placeholder="********"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setLoginError("");
                }}
              />
              <button
                className="primary-btn"
                type="button"
                onClick={handleLogin}
                disabled={isSubmitting}
              >
                {isSubmitting ? "로그인 중..." : "로그인"}
              </button>
              {loginError && (
                <p className="field-error-text" role="alert">
                  {loginError}
                </p>
              )}
            </div>
            <ul className="auth-actions">
              <li>
                <Link className="secondary-btn" to="/signup">회원가입</Link>
              </li>
              <li>
                <Link className="secondary-btn" to="/find-id">아이디 찾기</Link>
              </li>
              <li>
                <Link className="secondary-btn" to="/find-password">비밀번호 찾기</Link>
              </li>
            </ul>
            <div className="social-login">
              <div className="social-login-buttons">
                <button className="social-btn" type="button" aria-label="구글로 로그인">
                  <img src={googleIcon} alt="" />
                </button>
                <button 
                  className="social-btn" 
                  type="button" 
                  aria-label="카카오로 로그인"
                  onClick={handleKakaoLogin}
                >
                  <img src={kakaoIcon} alt="" />
                </button>
              </div>
            </div>
          </article>
        </section>
      </main>
    </MainLayout>
  );
}
