import { useEffect, useState } from "react";
import MainLayout from "../components/layout/MainLayout";
import { Link } from "react-router-dom";
import { getTasteMap, type UserProfile } from "../api/ml";

export default function TasteAnalysisPage() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTasteAnalysis = async () => {
      setLoading(true);
      try {
        // localStorage에서 사용자 프로필 가져오기
        const savedProfile = localStorage.getItem("mw_user_profile");
        if (savedProfile) {
          const profile = JSON.parse(savedProfile) as UserProfile;
          setUserProfile(profile);

          // 취향 지도 생성
          await getTasteMap({
            user_text: profile.user_text,
            k: 8,
          });
        }
      } catch (err) {
        console.error('Failed to load taste analysis:', err);
      } finally {
        setLoading(false);
      }
    };

    loadTasteAnalysis();
  }, []);

  // 상위 감정 태그 추출
  const getTopEmotions = (scores: Record<string, number>, limit = 4) => {
    return Object.entries(scores)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([tag]) => tag);
  };

  // 선호 장르 계산 (더미 데이터, 실제로는 리뷰 기반 계산 필요)
  const getPreferredGenres = () => {
    const savedGenres = localStorage.getItem("mw_taste_genres");
    if (savedGenres) {
      const genres = JSON.parse(savedGenres);
      return genres.slice(0, 3).join(' · ');
    }
    return '드라마 · SF · 로맨스';
  };

  if (loading) {
    return (
      <MainLayout>
        <main className="container taste-analysis-page">
          <p>취향 분석 중...</p>
        </main>
      </MainLayout>
    );
  }

  if (!userProfile) {
    return (
      <MainLayout>
        <main className="container taste-analysis-page">
          <section className="page-title">
            <h1>취향 분석</h1>
            <p>아직 취향 분석 데이터가 없습니다.</p>
            <Link to="/taste-survey" className="primary-btn">
              취향 설문 시작하기
            </Link>
          </section>
        </main>
      </MainLayout>
    );
  }

  const topEmotions = getTopEmotions(userProfile.emotion_scores);
  const topNarratives = getTopEmotions(userProfile.narrative_traits, 3);

  return (
    <MainLayout>
      <main className="container taste-analysis-page">
        <section className="taste-hero">
          <div>
            <h1>나의 취향 분석</h1>
            <p className="muted">최근 설문을 바탕으로 구성했어요.</p>
            <div className="taste-tags">
              {topEmotions.map((tag) => (
                <span key={tag} className="tag">{tag}</span>
              ))}
            </div>
          </div>
          <div className="card taste-score">
            <p className="muted">취향 일치율 높은 장르</p>
            <div className="score-number">87%</div>
            <p className="muted">{getPreferredGenres()}</p>
            <Link to="/taste-survey">
              <button className="secondary-btn" style={{ marginTop: 14 }}>
                추천 다시 받기
              </button>
            </Link>
          </div>
        </section>

        <section className="section">
          <div className="section-header">
            <h2>취향 요약</h2>
            <p>내가 좋아하는 흐름</p>
          </div>
          <div className="feature-grid">
            {topNarratives.map((narrative, idx) => (
              <article key={idx} className="feature-card">
                <h3>{narrative}</h3>
                <p>이런 요소가 있는 영화를 선호합니다.</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section">
          <div className="section-header">
            <h2>장르 선호도</h2>
            <p>가장 높은 만족 확률 순</p>
          </div>
          <div className="card taste-chart">
            <div className="taste-row">
              <span>드라마</span>
              <div className="bar">
                <span style={{ width: "86%" }} />
              </div>
              <strong>4.6</strong>
            </div>
            <div className="taste-row">
              <span>SF</span>
              <div className="bar">
                <span style={{ width: "78%" }} />
              </div>
              <strong>4.2</strong>
            </div>
            <div className="taste-row">
              <span>로맨스</span>
              <div className="bar">
                <span style={{ width: "72%" }} />
              </div>
              <strong>4.0</strong>
            </div>
            <div className="taste-row">
              <span>스릴러</span>
              <div className="bar">
                <span style={{ width: "58%" }} />
              </div>
              <strong>3.6</strong>
            </div>
            <div className="taste-row">
              <span>코미디</span>
              <div className="bar">
                <span style={{ width: "44%" }} />
              </div>
              <strong>3.1</strong>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="section-header">
            <h2>무드 스펙트럼</h2>
            <p>선호하는 감정 톤</p>
          </div>
          <div className="mood-grid">
            {Object.entries(userProfile.emotion_scores)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 4)
              .map(([emotion, score]) => {
                const percentage = Math.round(score * 100);
                let level = '낮음';
                if (percentage > 70) level = '선호도 높음';
                else if (percentage > 40) level = '중간';
                
                return (
                  <article key={emotion} className="card mood-card">
                    <h3>{emotion}</h3>
                    <p className="muted">{level}</p>
                    <div className="meter">
                      <span style={{ width: `${percentage}%` }} />
                    </div>
                  </article>
                );
              })}
          </div>
        </section>

        <section className="section">
          <div className="section-header">
            <h2>최근 고평가 작품</h2>
            <p>평점 4.5 이상</p>
          </div>
          <div className="movie-grid">
            <Link className="card-link" to="/movies/1">
              <article className="card movie-tile">
                <img
                  className="poster"
                  src="https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg"
                  alt="인터스텔라 포스터"
                />
                <div className="movie-info">
                  <h3>인터스텔라</h3>
                  <p className="probability">평점 4.8</p>
                  <p className="muted">
                    우주 스케일과 가족 서사의 균형이 인상적이었어요.
                  </p>
                  <span className="ghost-btn movie-detail-btn">�� ����</span>
                </div>
              </article>
            </Link>

            <Link className="card-link" to="/movies/2">
              <article className="card movie-tile">
                <img
                  className="poster"
                  src="https://image.tmdb.org/t/p/w500/5MwkWH9tYHv3mV9OdYTMR5qreIz.jpg"
                  alt="이터널 선샤인 포스터"
                />
                <div className="movie-info">
                  <h3>이터널 선샤인?</h3>
                  <p className="probability">평점 4.6</p>
                  <p className="muted">관계의 감정선을 섬세하게 다뤘어요.</p>
                  <span className="ghost-btn movie-detail-btn">�� ����</span>
                </div>
              </article>
            </Link>

            <Link className="card-link" to="/movies/3">
              <article className="card movie-tile">
                <img
                  className="poster"
                  src="https://image.tmdb.org/t/p/w500/bgIt92V3IDysoAIcEfOo2ZK9PEv.jpg"
                  alt="??? ???"
                />
                <div className="movie-info">
                  <h3>???</h3>
                  <p className="probability">?? 4.7</p>
                  <p className="muted">??? ?? ???? ???? ????.</p>
                  <span className="ghost-btn movie-detail-btn">�� ����</span>
                </div>
              </article>
            </Link>

            <Link className="card-link" to="/movies/4">
              <article className="card movie-tile">
                <img
                  className="poster"
                  src="https://image.tmdb.org/t/p/w500/uDO8zWDhfWwoFdKS4fzkUJt0Rf0.jpg"
                  alt="???? ???"
                />
                <div className="movie-info">
                  <h3>????</h3>
                  <p className="probability">?? 4.5</p>
                  <p className="muted">???? ??? ?? ?? ?????.</p>
                  <span className="ghost-btn movie-detail-btn">�� ����</span>
                </div>
              </article>
            </Link>
          </div>
        </section>
      </main>
    </MainLayout>
  );
}


