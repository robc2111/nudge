//Header.jsx
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
      <nav>
        {/* ✅ Logo + Name */}
        <div>
          <Link to="/">
            <img className="logo" src="/logo.png" alt="Logo" />GoalCrumbs
          </Link>
        </div>

        {/* ✅ Navigation */}
        <div>
          <Link to="/">Home</Link>
          {!token ? (
            <>
              <Link to="/login">Login</Link>
              <Link to="/signup">Sign Up</Link>
            </>
          ) : (
            <>
              <Link to="/dashboard">Dashboard</Link>
              <Link to="/profile">Profile</Link>
            </>
          )}
        </div>

        {/* ✅ User Info */}
        {user && (
          <div>
            <span>👤 {user.name}</span>
            <button onClick={handleLogout}>Sign Out</button>
          </div>
        )}
      </nav>
    </header>
  );
};

export default Header;