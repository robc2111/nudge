// src/components/Header.jsx
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';

const Header = () => {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    navigate('/login', { replace: true });
  };

  useEffect(() => {
    if (!token) return;

    api.get('/users/me')
      .then((res) => {
        setUser(res.data);
        localStorage.setItem('user', JSON.stringify(res.data));
      })
      .catch((err) => {
        console.error('Failed to load user:', err);
        // No manual logout here — axios.js 401 handler will catch auth issues
      });
  }, [token]);

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
          {token ? (
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
              <button
                type="button"
                onClick={handleLogout}
                aria-label="Sign out"
              >
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