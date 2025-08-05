//Profile.jsx
import React, { useEffect, useState } from 'react';
import axios from '../api/axios';
import { Link } from 'react-router-dom';

const Profile = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/users/me')
      .then(res => {
        console.log("👤 Logged-in user:", res.data);
        setUser(res.data);
      })
      .catch(err => {
        console.error('Error loading user:', err);
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) return <p>Loading your profile...</p>;

  if (!user) {
    return (
      <div style={{ padding: '2rem' }}>
        <h1>⚠️ Error</h1>
        <p>We couldn't load your profile. Please try refreshing or log in again.</p>
        <Link to="/login" className="cta-button">🔐 Log In</Link>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h1>👤 Your Profile</h1>
      <p><strong>Name:</strong> {user.name || 'N/A'}</p>
      <p><strong>Email:</strong> {user.email || 'Not provided'}</p>
      <p><strong>Telegram ID:</strong> {user.telegram_id || 'Not connected'}</p>

      <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <Link
          to="/reflections"
          className="inline-block bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
        >
          🪞 View My Reflections
        </Link>

        <Link
          to="/goal-setup"
          className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
        >
          ➕ Add New Goal
        </Link>
      </div>
    </div>
  );
};

export default Profile;