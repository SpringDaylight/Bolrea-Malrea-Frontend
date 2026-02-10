import { NavLink } from "react-router-dom";

export default function BottomNav() {
  const navClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? "active" : undefined;

  return (
    <nav className="bottom-nav">
      <NavLink to="/" className={navClass} end>
        홈
      </NavLink>
      <NavLink to="/movies" className={navClass}>
        영화
      </NavLink>
      <NavLink to="/group" className={navClass}>
        다함께
      </NavLink>
      <NavLink to="/mypage" className={navClass}>
        마이 홈
      </NavLink>
    </nav>
  );
}
