import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import MainLayout from "../components/layout/MainLayout";
import { handleKakaoCallback } from "../api/auth";

export default function KakaoCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const processCallback = async () => {
      const code = searchParams.get('code');
      const errorParam = searchParams.get('error');

      if (errorParam) {
        setError('카카오 로그인이 취소되었습니다.');
        setTimeout(() => navigate('/login'), 2000);
        return;
      }

      if (!code) {
        setError('인증 코드가 없습니다.');
        setTimeout(() => navigate('/login'), 2000);
        return;
      }

      try {
        const response = await handleKakaoCallback(code);
        
        // Save user info to localStorage
        localStorage.setItem("mw_logged_in", "true");
        localStorage.setItem("mw_user_id", response.user_id);
        localStorage.setItem("mw_profile_name", response.name);
        localStorage.setItem("mw_profile_bio", response.avatar_text);
        localStorage.setItem("mw_access_token", response.access_token);

        // Redirect to home or profile page
        navigate('/');
      } catch (err) {
        console.error('Kakao callback error:', err);
        setError('카카오 로그인 처리 중 오류가 발생했습니다.');
        setTimeout(() => navigate('/login'), 2000);
      }
    };

    processCallback();
  }, [searchParams, navigate]);

  return (
    <MainLayout>
      <main className="container">
        <section className="page-title centered">
          <h1>카카오 로그인 처리 중...</h1>
        </section>
        <section className="section">
          <article className="card" style={{ textAlign: 'center', padding: '40px' }}>
            {error ? (
              <p className="error">{error}</p>
            ) : (
              <p>잠시만 기다려주세요...</p>
            )}
          </article>
        </section>
      </main>
    </MainLayout>
  );
}
