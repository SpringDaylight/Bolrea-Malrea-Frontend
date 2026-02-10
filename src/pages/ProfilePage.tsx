import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../components/layout/MainLayout";

type ProfileState = {
  nickname: string;
  realname: string;
  age: string;
  gender: string;
  id: string;
  email: string;
  bio: string;
};

const defaultProfile: ProfileState = {
  nickname: "도슨",
  realname: "도현",
  age: "20대",
  gender: "남성",
  id: "watched_01",
  email: "you@example.com",
  bio: "감정선 강한 드라마 · SF를 자주 봐요.",
};

export default function ProfilePage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileState>(defaultProfile);
  const [editDraft, setEditDraft] = useState<ProfileState>(defaultProfile);
  const [editVisible, setEditVisible] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

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

  const avatarLabel = useMemo(
    () => profile.nickname.slice(0, 2),
    [profile.nickname]
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

  return (
    <MainLayout>
      <main className="container">
        <section className="page-title">
          <h1>프로필</h1>
          <p>프로필과 설정을 관리해요.</p>
        </section>

        <section className="section card profile-card">
          <div className="profile-header">
            <div className="profile-info">
              <div className="profile-top-row">
                <div className="profile-header-row">
                  <div className="profile-avatar">{avatarLabel}</div>
                  <div className="profile-title">
                    <h2>{profile.nickname}</h2>
                    <p className="muted profile-bio">{profile.bio}</p>
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
                <div className="profile-divider" />
                <div className="profile-meta">
                {/* <div>
                  <span className="muted">닉네임</span>
                  <strong>{profile.nickname}</strong>
                </div> */}
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
              <div
                className={`profile-edit-slot ${
                  editVisible || passwordVisible ? "is-open" : ""
                }`}
              >
                {editVisible && (
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
                    <option>남성</option>
                    <option>여성</option>
                    <option>선택 안 함</option>
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
                  <label htmlFor="profile-bio-input">한 줄 소개</label>
                  <textarea
                    id="profile-bio-input"
                    value={editDraft.bio}
                    onChange={(event) =>
                      setEditDraft((prev) => ({
                        ...prev,
                        bio: event.target.value,
                      }))
                    }
                  />
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
              )}
                {passwordVisible && (
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
                )}
              </div>
            </div>
          </div>
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
          <div className="modal-content">
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
            <h3>마케팅 정보</h3>
            <div className="toggle-row">
              <span>마케팅 정보 수신</span>
              <label className="toggle">
                <input type="checkbox" defaultChecked />
                <span />
              </label>
            </div>
          </div> */}

          <div className="modal-section">
            <h3>공개 설정</h3>
            <div className="toggle-row">
              <span>내 프로필 공개</span>
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
          </div>

          <div className="modal-section">
            <h3>계정 설정</h3>
            <div className="profile-actions">
              <button
                className="secondary-btn"
                type="button"
                onClick={handleOpenEdit}
              >
                프로필 수정
              </button>
              <button
                className="secondary-btn"
                type="button"
                onClick={handleOpenPassword}
              >
                비밀번호 변경
              </button>
            </div>
          </div>

          <div className="modal-section">
            <h3>SNS 연동 설정</h3>
            <div className="sns-grid">
              <button className="sns-chip" type="button">
                카카오
              </button>
              <button className="sns-chip" type="button">
                구글
              </button>
              {/* <button className="sns-chip" type="button">
                X
              </button>
              <button className="sns-chip" type="button">
                애플
              </button>
              <button className="sns-chip" type="button">
                라인
              </button> */}
            </div>
          </div>

          {/* <div className="modal-section">
            <h3>서비스 설정</h3>
            <div className="select-row">
              <span>언어</span>
              <select defaultValue="한국어">
                <option>한국어</option>
                <option>English</option>
                <option>日本語</option>
              </select>
            </div>
            <div className="select-row">
              <span>국가 및 지역</span>
              <select defaultValue="대한민국">
                <option>대한민국</option>
                <option>미국</option>                
                <option>일본</option>
              </select>
            </div>
            <div className="toggle-row">
              <span>홈 화면에서 지금 뜨는 코멘트 숨기기</span>
              <label className="toggle">
                <input type="checkbox" />
                <span />
              </label>
            </div>
            <div className="toggle-row">
              <span>다크모드</span>
              <label className="toggle">
                <input type="checkbox" />
                <span />
              </label>
            </div>
          </div> */}

          <div className="modal-section">
            <h3>고객센터</h3>
            <div className="link-list">
              <button className="ghost-btn" type="button">
                문의하기 / FAQ
              </button>
              {/* <button className="ghost-btn" type="button">
                DB 수정/추가 요청하기
              </button> */}
              <button className="ghost-btn" type="button">
                공지사항
              </button>
            </div>
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
    </MainLayout>
  );
}
