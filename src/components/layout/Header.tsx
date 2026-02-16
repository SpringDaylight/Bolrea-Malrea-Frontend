import { useCallback, useEffect, useState, type MouseEvent } from "react";
import { Link, NavLink } from "react-router-dom";
import logoToggle from "../../assets/logo-ticket-ver2.png";

export default function Header() {
  const navClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? "active" : undefined;
  const handleHeaderLinkClick =
    (to: string) => (event: MouseEvent<HTMLAnchorElement>) => {
      if (window.location.pathname === to) {
        event.preventDefault();
        window.location.reload();
        return;
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
  const [profileHref, setProfileHref] = useState("/login");
  const [profileLabel, setProfileLabel] = useState("로그인");

  const syncProfile = useCallback(() => {
    const isLoggedIn = localStorage.getItem("mw_logged_in") === "true";
    const savedName = localStorage.getItem("mw_profile_name");

    if (isLoggedIn) {
      setProfileHref("/mypage");
      setProfileLabel(savedName ? savedName.slice(0, 2) : "DS");
    } else {
      setProfileHref("/login");
      setProfileLabel("로그인");
    }
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

  return (
    <header className="top-bar">
      <div className="top-bar-inner">
        <Link className="brand" to="/" onClick={handleHeaderLinkClick("/")}>
          <img className="brand-logo" src={logoToggle} alt="서비스 로고" />
          <div>
            <p className="brand-title">볼래! 말래?</p>
            <p className="brand-sub">취향 기반 영화 탐색</p>
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
            to="/group"
            className={navClass}
            onClick={handleHeaderLinkClick("/group")}
          >
            다함께
          </NavLink>
          <NavLink
            to="/moviemong"
            className={navClass}
            onClick={handleHeaderLinkClick("/moviemong")}
          >
            무비몽
          </NavLink>
          <NavLink
            to="/mypage"
            className={navClass}
            onClick={handleHeaderLinkClick("/mypage")}
          >
            마이 홈
          </NavLink>
        </nav>

        <div className="top-actions">
          <Link className="profile-chip" to={profileHref} onClick={handleHeaderLinkClick(profileHref)}>
            {profileLabel}
          </Link>
        </div>
      </div>
    </header>
  );
}
