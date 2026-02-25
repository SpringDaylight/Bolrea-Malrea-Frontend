import { useCallback, useEffect, useState, type MouseEvent } from "react";
import { Link, NavLink } from "react-router-dom";
import logoToggle from "../../assets/logo-ticket-ver2.png";
import { getAccessToken, setAccessToken } from "../../api/http";
import { logout } from "../../api/auth";

export default function Header() {
  const navClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? "active" : undefined;
  const handleHeaderLinkClick =
    (to: string) => (event: MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => {
      if (window.location.pathname === to) {
        event.preventDefault();
        window.location.reload();
        return;
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    };

  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const syncProfile = useCallback(() => {
    setIsLoggedIn(Boolean(getAccessToken()));
  }, []);

  useEffect(() => {
    syncProfile();
    const handleAuthChange = () => syncProfile();
    window.addEventListener("mw_auth_change", handleAuthChange);
    window.addEventListener("storage", handleAuthChange);

    return () => {
      window.removeEventListener("mw_auth_change", handleAuthChange);
      window.removeEventListener("storage", handleAuthChange);
    };
  }, [syncProfile]);

  const handleLogout = async () => {
    if (window.confirm("로그아웃 하시겠습니까?")) {
      try {
        await logout();
      } catch (err) {
        console.error("Logout failed:", err);
      } finally {
        setAccessToken(null);
        
        // LLM 추천 캐시 삭제
        localStorage.removeItem('llm_recommend_state');
        
        window.dispatchEvent(new Event("mw_auth_change"));
        window.location.href = "/";
      }
    }
  };

  return (
    <header className="top-bar">
      <div className="top-bar-inner">
        <Link className="brand" to="/" onClick={handleHeaderLinkClick("/")}>
          <img className="brand-logo" src={logoToggle} alt="서비스 로고" />
          <div>
            <p className="brand-title">볼래! 말래?</p>
            <p className="brand-sub">취향 기반 영화 탐색 서비스</p>
          </div>
        </Link>

        <nav className="top-nav">
          <NavLink to="/" className={navClass} end onClick={handleHeaderLinkClick("/")}>
            홈
          </NavLink>
          <NavLink
            to="/movies"
            className={navClass}
            onClick={handleHeaderLinkClick("/movies")}
          >
            영화
          </NavLink>
          <NavLink
            to="/llm-recommend"
            className={navClass}
            onClick={handleHeaderLinkClick("/llm-recommend")}
          >
            🎯 AI 추천
          </NavLink>
          <NavLink
            to="/group"
            className={navClass}
            onClick={handleHeaderLinkClick("/group")}
          >
            다함께
          </NavLink>
          {/* <NavLink
            to="/moviemong"
            className={navClass}
            onClick={handleHeaderLinkClick("/moviemong")}
          >
            무비몽
          </NavLink> */}
          <NavLink
            to="/mypage"
            className={navClass}
            onClick={handleHeaderLinkClick("/mypage")}
          >
            마이 홈
          </NavLink>
        </nav>

        <div className="top-actions">
          {isLoggedIn ? (
            <button
              className="profile-chip"
              onClick={handleLogout}
              style={{ padding: '0.4rem 0.8rem', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}
            >
              로그아웃
            </button>
          ) : (
            <>
              <Link className="profile-chip" to="/login" onClick={handleHeaderLinkClick("/login")}>
                로그인
              </Link>
              <Link className="profile-chip" to="/signup" onClick={handleHeaderLinkClick("/signup")}>
                회원가입
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
