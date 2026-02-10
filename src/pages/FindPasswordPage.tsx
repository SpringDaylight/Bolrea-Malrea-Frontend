import { useState } from "react";
import { Link } from "react-router-dom";
import MainLayout from "../components/layout/MainLayout";

export default function FindPasswordPage() {
  const [email, setEmail] = useState("");

  return (
    <MainLayout>
      <main className="container">
        <section className="page-title centered">
          <h1>비밀번호 찾기</h1>
          <p>가입한 이메일로 비밀번호 재설정 링크를 보내드립니다.</p>
        </section>

        <section className="section">
          <article className="card auth-card">
            <div className="form-grid">
              <label htmlFor="find-password-email">이메일</label>
              <input
                id="find-password-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              <button className="primary-btn" type="button">
                비밀번호 재설정 링크 보내기
              </button>
            </div>
            <ul className="auth-actions">
              <li>
                <Link className="secondary-btn auth-link" to="/login">
                  로그인으로 돌아가기
                </Link>
              </li>
              <li>
                <Link className="secondary-btn auth-link" to="/signup">
                  회원가입
                </Link>
              </li>
            </ul>
          </article>
        </section>
      </main>
    </MainLayout>
  );
}
