// Header.jsx
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from '../api/axios';

const Header = () => {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    navigate('/');
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        if (token) {
          const res = await axios.get('/users/me');
          setUser(res.data);
        }
      } catch (err) {
        console.error('Failed to load user:', err);
      }
    };
    fetchUser();
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
          {user ? (
            <>
              <span>👤 {user.name}</span>
              <button onClick={handleLogout}>Sign Out</button>
            </>
          ) : null}
        </div>
      </div>
    </header>
  );
};

export default Header;