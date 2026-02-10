import MainLayout from "../components/layout/MainLayout";

export default function ReviewDetailPage() {
  return (
    <MainLayout>
      <main className="container">
        <section className="page-title">
          <h1>리뷰 상세</h1>
          <p>한 줄 코멘트와 반응을 모아보세요.</p>
        </section>

        <section className="section">
          <article className="card review-detail">
            <div className="review-header">
              <div className="review-user">
                <div className="review-avatar">HJ</div>
                <div>
                  <p className="review-name">해진</p>
                  <p className="muted">인터스텔라 · 2026.01.30 · 평점 4.0</p>
                </div>
              </div>
              <button className="ghost-btn">팔로우</button>
            </div>

            <p className="review-text review-body">
              "과학보다 감정이 더 선명하게 남는 작품. 가족 서사가 깊게 와닿았다."
            </p>

            <div className="review-actions">
              <button className="like-btn">좋아요 24</button>
              <button className="ghost-btn">댓글 6</button>
              <span className="tag">가족</span>
              <span className="tag">감정선</span>
            </div>
          </article>
        </section>

        <section className="section">
          <div className="section-header">
            <h2>댓글</h2>
            <p>이 리뷰에 대한 대화</p>
          </div>

          <article className="card comment-form">
            <div className="comment-input">
              <div className="review-avatar">DS</div>
              <textarea placeholder="댓글을 남겨보세요" />
            </div>
            <div className="comment-actions">
              <button className="secondary-btn">댓글 남기기</button>
            </div>
          </article>

          <div className="comment-list">
            <article className="card comment-card">
              <div className="review-user">
                <div className="review-avatar">MK</div>
                <div>
                  <p className="review-name">민규</p>
                  <p className="muted">2026.02.01</p>
                </div>
              </div>
              <p className="muted">
                저도 가족 서사가 핵심이라고 느꼈어요. 음악이 진짜 좋아요.
              </p>
              <div className="comment-meta">
                <button className="ghost-btn">좋아요 3</button>
                <button className="ghost-btn">답글</button>
              </div>
            </article>

            <article className="card comment-card">
              <div className="review-user">
                <div className="review-avatar">SY</div>
                <div>
                  <p className="review-name">소영</p>
                  <p className="muted">2026.01.31</p>
                </div>
              </div>
              <p className="muted">극장 사운드가 정말 큰 역할을 하는 영화였죠.</p>
              <div className="comment-meta">
                <button className="ghost-btn">좋아요 8</button>
                <button className="ghost-btn">답글</button>
              </div>
            </article>

            <article className="card comment-card">
              <div className="review-user">
                <div className="review-avatar">JH</div>
                <div>
                  <p className="review-name">지훈</p>
                  <p className="muted">2026.01.30</p>
                </div>
              </div>
              <p className="muted">
                저는 후반부가 조금 어려웠는데, 그래도 감정은 남았어요.
              </p>
              <div className="comment-meta">
                <button className="ghost-btn">좋아요 2</button>
                <button className="ghost-btn">답글</button>
              </div>
            </article>
          </div>
        </section>
      </main>
    </MainLayout>
  );
}