import MainLayout from "../components/layout/MainLayout";
import { Link } from "react-router-dom";

export default function TasteAnalysisPage() {
  return (
    <MainLayout>
      <main className="container taste-analysis-page">
        <section className="taste-hero">
          <div>
            <h1>도슨님의 취향 분석</h1>
            <p className="muted">최근 128편의 평가를 바탕으로 구성했어요.</p>
            <div className="taste-tags">
              <span className="tag">감정선</span>
              <span className="tag">몰입</span>
              <span className="tag">관계 서사</span>
              <span className="tag">여운</span>
            </div>
          </div>
          <div className="card taste-score">
            <p className="muted">취향 일치율 높은 장르</p>
            <div className="score-number">87%</div>
            <p className="muted">드라마 · SF · 로맨스</p>
            <button className="secondary-btn" style={{ marginTop: 14 }}>
              추천 다시 받기
            </button>
          </div>
        </section>

        <section className="section">
          <div className="section-header">
            <h2>취향 요약</h2>
            <p>내가 좋아하는 흐름</p>
          </div>
          <div className="feature-grid">
            <article className="feature-card">
              <h3>감정선 깊은 이야기</h3>
              <p>사람 사이의 관계 변화와 감정 흐름에 높은 점수를 줍니다.</p>
            </article>
            <article className="feature-card">
              <h3>몰입감 있는 세계관</h3>
              <p>SF, 미스터리 같은 확장된 설정을 선호합니다.</p>
            </article>
            <article className="feature-card">
              <h3>여운이 남는 결말</h3>
              <p>결말 이후 생각할 거리가 있는 작품을 좋아합니다.</p>
            </article>
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
            <article className="card mood-card">
              <h3>잔잔함</h3>
              <p className="muted">선호도 높음</p>
              <div className="meter">
                <span style={{ width: "82%" }} />
              </div>
            </article>
            <article className="card mood-card">
              <h3>긴장감</h3>
              <p className="muted">중간</p>
              <div className="meter">
                <span style={{ width: "58%" }} />
              </div>
            </article>
            <article className="card mood-card">
              <h3>스케일</h3>
              <p className="muted">선호도 높음</p>
              <div className="meter">
                <span style={{ width: "74%" }} />
              </div>
            </article>
            <article className="card mood-card">
              <h3>유머</h3>
              <p className="muted">낮음</p>
              <div className="meter">
                <span style={{ width: "36%" }} />
              </div>
            </article>
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
                  <h3>이터널 선샤인</h3>
                  <p className="probability">평점 4.6</p>
                  <p className="muted">관계의 감정선을 섬세하게 다뤘어요.</p>
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
                </div>
              </article>
            </Link>
          </div>
        </section>
      </main>
    </MainLayout>
  );
}
