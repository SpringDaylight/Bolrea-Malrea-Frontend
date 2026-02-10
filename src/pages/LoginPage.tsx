import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import MainLayout from "../components/layout/MainLayout";
import googleIcon from "../assets/web_neutral_sq_na@1x.png";
import kakaoIcon from "../assets/kakao_sq_login.png";
import { getKakaoLoginUrl } from "../api/auth";

export default function LoginPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = () => {
    const nameValue = name.trim();
    if (nameValue) {
      localStorage.setItem("mw_profile_name", nameValue);
      localStorage.setItem("mw_user_id", nameValue);
      localStorage.setItem(
        "mw_profile_bio",
        "Enjoying drama and SF with strong emotional arcs."
      );
    }
    localStorage.setItem("mw_logged_in", "true");
    navigate("/mypage");
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
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
              <label htmlFor="login-password">비밀번호</label>
              <input
                id="login-password"
                type="password"
                placeholder="********"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <button className="primary-btn" type="button" onClick={handleLogin}>
                로그인
              </button>
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
