// src/components/header.jsx
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/auth-context';

const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout(); // clears token, caches, and emits logoutBus
    navigate('/login', { replace: true });
  };

  return (
    <header className="goalcrumbs-header">
      <div className="header-container">
        <div className="header-left">
          <Link to="/" className="logo-link">
            <img className="logo" src="/logo.png" alt="GoalCrumbs Logo" />
            <span className="logo-text">GoalCrumbs</span>
          </Link>
        </div>

        <nav className="header-nav">
          <Link to="/">Home</Link>
          <Link to="/faq">FAQs</Link>
          {user ? (
            <>
              <Link to="/dashboard">Dashboard</Link>
              <Link to="/profile">Profile</Link>
            </>
          ) : (
            <>
              <Link to="/login">Login</Link>
              <Link to="/signup">Sign Up</Link>
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
