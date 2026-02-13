import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import MainLayout from "../components/layout/MainLayout";

type ViewMode = "posters" | "reviews";
type ProfileState = {
  nickname: string;
  realname: string;
  age: string;
  gender: string;
  id: string;
  email: string;
  bio: string;
};

type ReviewReply = {
  id: number;
  author: string;
  content: string;
  createdAt: string;
};

type ReviewVisibility = "public" | "private";

type ReviewItem = {
  id: number;
  movieId: number;
  title: string;
  poster: string;
  dateLabel: string;
  genre: string;
  rating: number;
  content: string;
  createdAt: string;
  visibility?: ReviewVisibility;
  replies: ReviewReply[];
};

type WatchedMovieItem = {
  movieId: number;
  title: string;
  poster?: string | null;
  addedAt?: string;
};

const REVIEW_STORAGE_KEY = "mw_my_reviews";
const WATCHED_STORAGE_KEY = "mw_watched_movies";

const normalizeReviewVisibility = (value: unknown): ReviewVisibility =>
  value === "private" ? "private" : "public";

const getReviewVisibilityMeta = (visibility: unknown) =>
  normalizeReviewVisibility(visibility) === "private"
    ? { className: "is-private", label: "비공개 리뷰" }
    : { className: "is-public", label: "공개 리뷰" };

const defaultProfile: ProfileState = {
  nickname: "닉네임",
  realname: "사용자",
  age: "선택 안함",
  gender: "선택 안함",
  id: "watched_01",
  email: "you@example.com",
  bio: "",
  // bio: "감정선 강한 드라마 · SF를 자주 봐요.",
};

export default function ActivityPage() {
  const [view, setView] = useState<ViewMode>("posters");
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileState>(defaultProfile);
  const [editDraft, setEditDraft] = useState<ProfileState>(defaultProfile);
  const [editVisible, setEditVisible] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showAllPosters, setShowAllPosters] = useState(false);
  const [savedReviews, setSavedReviews] = useState<ReviewItem[]>([]);
  const [savedWatchedMovies, setSavedWatchedMovies] = useState<WatchedMovieItem[]>([]);

  const posterItems = useMemo(
    () =>
      savedWatchedMovies.map((item) => ({
        id: item.movieId,
        movieId: item.movieId,
        to: `/movies/${item.movieId}`,
        src:
          item.poster ||
          "https://via.placeholder.com/500x750?text=No+Image",
        alt: `${item.title} 포스터`,
      })),
    [savedWatchedMovies]
  );

  const reviewItems: ReviewItem[] = [];

  const posterLimit = 18;
  const visiblePosters = showAllPosters
    ? posterItems
    : posterItems.slice(0, posterLimit);

  useEffect(() => {
    const savedName = localStorage.getItem("mw_profile_name");
    const savedBio = localStorage.getItem("mw_profile_bio");
    const savedNickname = localStorage.getItem("mw_profile_nickname");
    const savedRealname = localStorage.getItem("mw_profile_realname");
    const savedAge = localStorage.getItem("mw_profile_age");
    const savedGender = localStorage.getItem("mw_profile_gender");
    const savedId = localStorage.getItem("mw_profile_id");
    const savedEmail = localStorage.getItem("mw_profile_email");

    const nextProfile: ProfileState = {
      nickname: savedNickname || savedName || defaultProfile.nickname,
      realname: savedRealname || defaultProfile.realname,
      age: savedAge || defaultProfile.age,
      gender: savedGender || defaultProfile.gender,
      id: savedId || defaultProfile.id,
      email: savedEmail || defaultProfile.email,
      bio: savedBio || defaultProfile.bio,
    };

    setProfile(nextProfile);
    setEditDraft(nextProfile);
  }, []);

  useEffect(() => {
    const raw = localStorage.getItem(REVIEW_STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as ReviewItem[];
      if (!Array.isArray(parsed)) return;
      const normalized = parsed
        .filter((item) => item && typeof item === "object")
        .map((item) => ({
          ...item,
          visibility: normalizeReviewVisibility(item.visibility),
          replies: Array.isArray(item.replies) ? item.replies : [],
        }));
      setSavedReviews(normalized);
    } catch (err) {
      console.error("Failed to parse saved reviews:", err);
    }
  }, []);

  useEffect(() => {
    const raw = localStorage.getItem(WATCHED_STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as WatchedMovieItem[];
      if (!Array.isArray(parsed)) return;
      const normalized = parsed
        .filter((item): item is WatchedMovieItem => {
          if (!item || typeof item !== "object") return false;
          const movieId = Number(item.movieId);
          return Number.isFinite(movieId);
        })
        .map((item) => ({
          movieId: Number(item.movieId),
          title: item.title || "영화",
          poster:
            item.poster ||
            "https://via.placeholder.com/500x750?text=No+Image",
          addedAt: item.addedAt,
        }));
      setSavedWatchedMovies(normalized);
    } catch (err) {
      console.error("Failed to parse watched movies:", err);
    }
  }, []);

  const mergedReviewItems = useMemo(() => {
    const seen = new Set<number>();
    const combined = [...savedReviews, ...reviewItems];
    return combined.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }, [savedReviews, reviewItems]);
  const watchedCount = posterItems.length;
  const reviewCount = mergedReviewItems.length;

  const avatarLabel = useMemo(
    () => profile.nickname.slice(0, 2),
    [profile.nickname]
  );
  const isLoggedIn = useMemo(
    () => localStorage.getItem("mw_logged_in") === "true",
    []
  );

  const handleOpenEdit = () => {
    setEditDraft(profile);
    setEditVisible(true);
    setPasswordVisible(false);
  };

  const handleOpenPassword = () => {
    setPasswordVisible(true);
    setEditVisible(false);
  };

  const handleSaveProfile = () => {
    const nextProfile: ProfileState = {
      nickname: editDraft.nickname.trim() || defaultProfile.nickname,
      realname: editDraft.realname.trim() || defaultProfile.realname,
      age: editDraft.age || defaultProfile.age,
      gender: editDraft.gender || defaultProfile.gender,
      id: editDraft.id.trim() || defaultProfile.id,
      email: editDraft.email.trim() || defaultProfile.email,
      bio: editDraft.bio.trim() || defaultProfile.bio,
    };

    localStorage.setItem("mw_profile_nickname", nextProfile.nickname);
    localStorage.setItem("mw_profile_realname", nextProfile.realname);
    localStorage.setItem("mw_profile_age", nextProfile.age);
    localStorage.setItem("mw_profile_gender", nextProfile.gender);
    localStorage.setItem("mw_profile_id", nextProfile.id);
    localStorage.setItem("mw_profile_email", nextProfile.email);
    localStorage.setItem("mw_profile_name", nextProfile.nickname);
    localStorage.setItem("mw_profile_bio", nextProfile.bio);

    setProfile(nextProfile);
    setEditVisible(false);
  };

  const handleCancelEdit = () => {
    setEditDraft(profile);
    setEditVisible(false);
  };

  const handlePasswordSave = () => {
    setPasswordVisible(false);
  };

  const handlePasswordCancel = () => {
    setPasswordVisible(false);
  };

  const handleLogout = () => {
    localStorage.setItem("mw_logged_in", "false");
    navigate("/login");
  };

  const handleDelete = () => {
    localStorage.removeItem("mw_logged_in");
    localStorage.removeItem("mw_profile_name");
    localStorage.removeItem("mw_profile_bio");
    navigate("/login");
  };

  const handleRemoveWatchedMovie = (movieId: number) => {
    const nextWatchedMovies = savedWatchedMovies.filter(
      (item) => item.movieId !== movieId
    );
    setSavedWatchedMovies(nextWatchedMovies);
    try {
      localStorage.setItem(
        WATCHED_STORAGE_KEY,
        JSON.stringify(nextWatchedMovies)
      );
    } catch (err) {
      console.error("Failed to save watched movies:", err);
    }
  };

  const scrollToWithHeaderOffset = (elementId: string) => {
    const target = document.getElementById(elementId);
    if (!target) return;
    const header = document.querySelector<HTMLElement>(".top-bar");
    const headerOffset = header ? header.offsetHeight + 12 : 0;
    const targetTop = target.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({
      top: Math.max(0, targetTop - headerOffset),
      behavior: "smooth",
    });
  };

  const renderReviewRatingStars = (rating: number, reviewId: number) => {
    const ratingValue = Number.isFinite(rating)
      ? Math.max(0, Math.min(5, Math.round(rating * 2) / 2))
      : 0;
    const activeStars = Math.floor(ratingValue);
    const ratingLabel =
      Number.isInteger(ratingValue) ? `${ratingValue}` : ratingValue.toFixed(1);

    return (
      <span className="review-rating-stars" aria-label={`평점 ${ratingLabel}점`}>
        {Array.from({ length: 5 }).map((_, index) => (
          <span
            key={`${reviewId}-star-${index}`}
            className={`review-star ${index < activeStars ? "is-active" : ""}`}
            aria-hidden="true"
          >
            ★
          </span>
        ))}
        <span className="review-rating-value">{ratingLabel}점</span>
      </span>
    );
  };

  if (!isLoggedIn) {
    return (
      <MainLayout>
        <main className="container activity-page">
          <div className="activity-top-grid">
            <section className="section card taste-preview-section activity-top-card">
              <article className="taste-preview">
                <div className="taste-preview-header">
                  <h2>프로필</h2>
                </div>
                <p className="muted login-required-text">로그인 후 이용해주세요.</p>
              </article>
            </section>

            <section className="section card taste-preview-section activity-top-card">
              <article className="taste-preview">
                <div className="taste-preview-header">
                  <h2>취향 분석</h2>
                </div>
                <p className="muted login-required-text">로그인 후 이용해주세요.</p>
              </article>
            </section>
          </div>
        </main>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <main className="container activity-page">
        <div className="activity-top-grid">
          <section className="section card profile-card activity-top-card">
          {/* <div className="page-title">
            <h1>프로필</h1>
            <p>프로필과 설정을 관리해요.</p>
          </div> */}
          <div className="profile-header">
            <div className="profile-info">
              <div className="profile-top-row">
                <div className="profile-summary">
                <div className="profile-header-row">
                  <div className="profile-avatar-block">
                    <div className="profile-avatar">{avatarLabel}</div>
                    <h2 className="profile-nickname">{profile.nickname}</h2>
                  </div>
                  <button
                    className="icon-btn settings-btn"
                    type="button"
                    aria-label="설정 열기"
                    onClick={() => setSettingsOpen(true)}
                  >
                    ⚙
                  </button>
                </div>
                </div>
                <div className="profile-divider" />
                <div className="profile-meta">
                  <div>
                    <span className="muted">이름</span>
                    <strong>{profile.realname}</strong>
                  </div>
                  <div>
                    <span className="muted">나이대</span>
                    <strong>{profile.age}</strong>
                  </div>
                  <div>
                    <span className="muted">성별</span>
                    <strong>{profile.gender}</strong>
                  </div>
                  <div>
                    <span className="muted">아이디</span>
                    <strong>{profile.id}</strong>
                  </div>
                  <div>
                    <span className="muted">이메일</span>
                    <strong>{profile.email}</strong>
                  </div>
                </div>
              </div>
              {/* <div className="profile-actions">
                <button className="ghost-btn" type="button" onClick={handleLogout}>
                  로그아웃
                </button>
              </div> */}
            </div>
          </div>
          {/* <p className="muted profile-bio profile-bio-below">"{profile.bio}"</p> */}
        </section>

          <section className="section card taste-preview-section activity-top-card">
          <article className="taste-preview">
            <div className="taste-preview-header with-cta">
              <div>
                <h2>취향 분석 대시보드</h2>
                <p>최근 평가 기반 요약</p>
              </div>
              <button
                className="secondary-btn taste-preview-top-cta"
                type="button"
                onClick={() => navigate("/taste-analysis")}
              >
                상세보기
              </button>
            </div>
            <div className="taste-preview-body taste-preview-grid">
              <div className="taste-preview-main">
                <p className="muted">선호 키워드</p>
                <div className="tag-list" style={{ marginTop: 8 }}>
                  <span className="tag">감정선</span>
                  <span className="tag">몰입</span>
                  <span className="tag">여운</span>
                </div>
              </div>
              <div className="taste-preview-side">
                <p className="muted">가장 높은 장르</p>
                <p className="probability">드라마 · SF</p>
              </div>
            </div>
            {/* <button
              className="primary-btn taste-preview-cta"
              type="button"
              onClick={() => navigate("/taste-analysis")}
            >
              자세히보기
            </button> */}
          </article>
          </section>
        </div>

        <section className="section card activity-summary-card">
          <article className="taste-preview">

          {/*  
          <section className="page-title">
            <h1>내 활동</h1>
            <p>내가 본 영화와 남긴 리뷰를 관리해요.</p>
          </section> */}

        
          <div className="taste-preview-header">
            <h2>활동 요약</h2>
            <p>내가 본 영화와 남긴 리뷰를 관리해요.</p>
            {/* <p>시청/리뷰/컬렉션 현황</p> */}
          </div>  
          <div className="activity-stats taste-preview-grid">
            <div
              className="stat taste-preview-main clickable hoverable"
              role="button"
              tabIndex={0}
              onClick={() => {
                setView("posters");
                setTimeout(() => {
                  scrollToWithHeaderOffset("posters-header");
                }, 0);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setView("posters");
                  setTimeout(() => {
                    scrollToWithHeaderOffset("posters-header");
                  }, 0);
                }
              }}
            >
              <strong>{watchedCount}</strong>
              <span>시청작</span>
            </div>
            <div
              className="stat taste-preview-side clickable hoverable"
              role="button"
              tabIndex={0}
              onClick={() => {
                setView("reviews");
                setTimeout(() => {
                  scrollToWithHeaderOffset("reviews-header");
                }, 0);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setView("reviews");
                  setTimeout(() => {
                    scrollToWithHeaderOffset("reviews-header");
                  }, 0);
                }
              }}
            >
              <strong>{reviewCount}</strong>
              <span>리뷰</span>
            </div>
          </div>
          <section className="section">
          {view === "posters" && <div className="section-header" id="posters-header" />}
          {/* <div className="view-toggle" role="tablist" aria-label="내 영화 보기">
            <button
              className={`filter-chip ${view === "posters" ? "active" : ""}`}
              id="tab-posters"
              data-view="posters"
              role="tab"
              aria-selected={view === "posters"}
              type="button"
              onClick={() => setView("posters")}
            >
              포스터 그리드
            </button>
            <button
              className={`filter-chip ${view === "reviews" ? "active" : ""}`}
              id="tab-reviews"
              data-view="reviews"
              role="tab"
              aria-selected={view === "reviews"}
              type="button"
              onClick={() => setView("reviews")}
            >
              리뷰 목록
            </button>
          </div> */}
          </section>

          {view === "posters" && (
            <article className="section view-section" data-view="posters" id="posters-section">
              <div className="poster-grid poster-grid-6">
                {visiblePosters.map((poster) => (
                  <div key={poster.id} className="poster-card">
                    <Link to={poster.to}>
                      <img src={poster.src} alt={poster.alt} />
                    </Link>
                    <button
                      className="poster-remove-btn"
                      type="button"
                      aria-label={`${poster.alt} 제거`}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        handleRemoveWatchedMovie(poster.movieId);
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              {posterItems.length > posterLimit && (
                <div className="poster-toggle-row">
                  <button
                    className="poster-toggle-bar"
                    type="button"
                    onClick={() => setShowAllPosters((prev) => !prev)}
                  >
                    {showAllPosters ? "접기▲" : "펼치기▼"}
                  </button>
                </div>
              )}
            </article>
          )}

          {view === "reviews" && (
            <article className="section view-section" data-view="reviews" id="reviews-section">
            <div className="section-header" id="reviews-header" />
              <div className="review-list">
                {mergedReviewItems.map((review) => {
                  const visibilityMeta = getReviewVisibilityMeta(review.visibility);
                  return (
                  <div className="review-item" key={review.id}>
                    <article
                      className="card review-card review-card-toggle"
                      role="button"
                      tabIndex={0}
                      onClick={() => navigate(`/movies/${review.movieId}#my-review`)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          navigate(`/movies/${review.movieId}#my-review`);
                        }
                      }}
                    >
                      <div className="movie-tile">
                        <img
                          className="poster"
                          src={review.poster}
                          alt={`${review.title} 포스터`}
                        />
                        <div className="movie-info">
                          <h3 className="review-title-row">
                            <span>{review.title}</span>
                            <span
                              className={`review-visibility-indicator ${visibilityMeta.className}`}
                              role="img"
                              aria-label={visibilityMeta.label}
                              title={visibilityMeta.label}
                            />
                          </h3>
                          <p className="muted">"{review.content}"</p>
                          <div className="meta-list review-meta-inline">
                            <span>{review.dateLabel}</span>
                            <span>{review.genre}</span>
                            {renderReviewRatingStars(review.rating, review.id)}
                          </div>
                        </div>
                      </div>
                    </article>
                </div>
                  );
                })}
              </div>
            </article>
          )}
          </article>
        </section>
      </main>

      {settingsOpen && (
        <div
          className="modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="settings-title"
        >
          <div className="modal-overlay" onClick={() => setSettingsOpen(false)} />
          <div className="modal-content settings-modal">
            <div className="modal-scroll">
              <div className="modal-header">
                <h2 id="settings-title">설정</h2>
                <button
                  className="icon-btn"
                  type="button"
                  aria-label="설정 닫기"
                  onClick={() => setSettingsOpen(false)}
                >
                  ✕
                </button>
              </div>

              {/* <div className="modal-section">
                <h3>공개 설정</h3>
                <div className="toggle-row">
                  <span>프로필 공개</span>
                  <label className="toggle">
                    <input type="checkbox" defaultChecked />
                    <span />
                  </label>
                </div>
                <div className="toggle-row">
                  <span>리뷰 공개</span>
                  <label className="toggle">
                    <input type="checkbox" defaultChecked />
                    <span />
                  </label>
                </div>
              </div> */}

              <div className="modal-section">
                <h3>계정 설정</h3>
                <ul className="auth-actions support-actions">
                  <li>
                    <button
                      className="secondary-btn"
                      type="button"
                      onClick={handleOpenEdit}
                    >
                      프로필 수정
                    </button>
                  </li>
                  <li>
                    <button
                      className="secondary-btn"
                      type="button"
                      onClick={handleOpenPassword}
                    >
                      비밀번호 변경
                    </button>
                  </li>
                </ul>
              </div>

              <div className="modal-section">
                <h3>SNS 연동 설정</h3>
                <ul className="auth-actions support-actions">
                  <li>
                    <button className="secondary-btn" type="button">
                      카카오
                    </button>
                  </li>
                  <li>
                    <button className="secondary-btn" type="button">
                      구글
                    </button>
                  </li>
                </ul>
              </div>

              <div className="modal-section">
                <h3>고객센터</h3>
                <ul className="auth-actions support-actions">
                  <li>
                    <Link className="secondary-btn" to="/notice">
                      공지사항
                    </Link>
                  </li>
                  <li>
                    <Link className="secondary-btn" to="/inquiry">
                      문의하기
                    </Link>
                  </li>
                  <li>
                    <Link className="secondary-btn" to="/faq">
                      FAQ
                    </Link>
                  </li>
                </ul>
              </div>

              <div className="modal-footer">
                <button className="secondary-btn" type="button" onClick={handleLogout}>
                  로그아웃
                </button>
                <button className="ghost-btn danger" type="button" onClick={handleDelete}>
                  탈퇴하기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {editVisible && (
        <div
          className="modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="profile-edit-title"
        >
          <div className="modal-overlay" onClick={handleCancelEdit} />
          <div className="modal-content">
            <div className="modal-scroll">
              <div className="modal-header">
                <h2 id="profile-edit-title">프로필 수정</h2>
                <button
                  className="icon-btn"
                  type="button"
                  aria-label="프로필 수정 닫기"
                  onClick={handleCancelEdit}
                >
                  ✕
                </button>
              </div>
              <div className="profile-edit">
                <label htmlFor="profile-nickname-input">닉네임</label>
                <input
                  id="profile-nickname-input"
                  type="text"
                  value={editDraft.nickname}
                  onChange={(event) =>
                    setEditDraft((prev) => ({
                      ...prev,
                      nickname: event.target.value,
                    }))
                  }
                />
                <label htmlFor="profile-name-input">이름</label>
                <input
                  id="profile-name-input"
                  type="text"
                  value={editDraft.realname}
                  onChange={(event) =>
                    setEditDraft((prev) => ({
                      ...prev,
                      realname: event.target.value,
                    }))
                  }
                />
                <label htmlFor="profile-age-input">나이대</label>
                <select
                  id="profile-age-input"
                  value={editDraft.age}
                  onChange={(event) =>
                    setEditDraft((prev) => ({
                      ...prev,
                      age: event.target.value,
                    }))
                  }
                >
                  <option>선택 안함</option>
                  <option>10대</option>
                  <option>20대</option>
                  <option>30대</option>
                  <option>40대</option>
                  <option>50대+</option>
                </select>
                <label htmlFor="profile-gender-input">성별</label>
                <select
                  id="profile-gender-input"
                  value={editDraft.gender}
                  onChange={(event) =>
                    setEditDraft((prev) => ({
                      ...prev,
                      gender: event.target.value,
                    }))
                  }
                >
                  <option>선택 안함</option>
                  <option>여성</option>
                  <option>남성</option>
                </select>
                <label htmlFor="profile-id-input">아이디</label>
                <input
                  id="profile-id-input"
                  type="text"
                  value={editDraft.id}
                  onChange={(event) =>
                    setEditDraft((prev) => ({
                      ...prev,
                      id: event.target.value,
                    }))
                  }
                />
                <label htmlFor="profile-email-input">이메일</label>
                <input
                  id="profile-email-input"
                  type="email"
                  value={editDraft.email}
                  onChange={(event) =>
                    setEditDraft((prev) => ({
                      ...prev,
                      email: event.target.value,
                    }))
                  }
                />
                {/* <label htmlFor="profile-bio-input">한줄소개</label>
                <textarea
                  id="profile-bio-input"
                  value={editDraft.bio}
                  onChange={(event) =>
                    setEditDraft((prev) => ({
                      ...prev,
                      bio: event.target.value,
                    }))
                  }
                /> */}
                <div className="profile-edit-actions">
                  <button
                    className="primary-btn"
                    type="button"
                    onClick={handleSaveProfile}
                  >
                    저장
                  </button>
                  <button
                    className="ghost-btn"
                    type="button"
                    onClick={handleCancelEdit}
                  >
                    취소
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {passwordVisible && (
        <div
          className="modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="password-edit-title"
        >
          <div className="modal-overlay" onClick={handlePasswordCancel} />
          <div className="modal-content">
            <div className="modal-scroll">
              <div className="modal-header">
                <h2 id="password-edit-title">비밀번호 변경</h2>
                <button
                  className="icon-btn"
                  type="button"
                  aria-label="비밀번호 변경 닫기"
                  onClick={handlePasswordCancel}
                >
                  ✕
                </button>
              </div>
              <div className="profile-edit">
                <label htmlFor="password-current">현재 비밀번호</label>
                <input id="password-current" type="password" placeholder="••••••••" />
                <label htmlFor="password-next">새 비밀번호</label>
                <input id="password-next" type="password" placeholder="••••••••" />
                <label htmlFor="password-confirm">새 비밀번호 확인</label>
                <input id="password-confirm" type="password" placeholder="••••••••" />
                <div className="profile-edit-actions">
                  <button
                    className="primary-btn"
                    type="button"
                    onClick={handlePasswordSave}
                  >
                    변경
                  </button>
                  <button
                    className="ghost-btn"
                    type="button"
                    onClick={handlePasswordCancel}
                  >
                    취소
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
