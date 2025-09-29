// src/components/header.jsx
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/auth-context';

const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="goalcrumbs-header">
      <div className="header-container">
        <div className="header-left">
          <Link to="/" className="logo-link" aria-label="GoalCrumbs home">
            <picture>
              <source
                srcSet="/images/logo-512.avif 2x, /images/logo-256.avif 1x"
                type="image/avif"
              />
              <source
                srcSet="/images/logo-512.webp 2x, /images/logo-256.webp 1x"
                type="image/webp"
              />
              <img
                src="/images/logo-256.webp"
                alt="GoalCrumbs logo"
                width="256"
                height="256"
                loading="eager"
                fetchPriority="high"
                decoding="async"
                className="logo"
              />
            </picture>
            <span className="logo-text">GoalCrumbs</span>
          </Link>
        </div>

        <nav className="header-nav" aria-label="Primary">
          <NavLink to="/" end>
            Home
          </NavLink>
          <NavLink to="/faq">FAQs</NavLink>
          <NavLink to="/blog">Blog</NavLink>
          {user ? (
            <>
              <NavLink to="/dashboard">Dashboard</NavLink>
              <NavLink to="/profile">Profile</NavLink>
            </>
          ) : (
            <>
              <NavLink to="/login">Login</NavLink>
              <NavLink to="/signup">Sign Up</NavLink>
            </>
          )}
        </nav>

        <div className="header-user">
          {user && (
            <>
              <span>👤 {user.name}</span>
              <button type="button" onClick={handleLogout}>
                Sign Out
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
