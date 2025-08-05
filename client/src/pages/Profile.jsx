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
        <Link to="/login" className="btn">🔐 Log In</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center p-6">
      <h1 className="text-3xl font-bold mb-4">👤 Your Profile</h1>
      <p><strong>Name:</strong> {user.name || 'N/A'}</p>
      <p><strong>Email:</strong> {user.email || 'Not provided'}</p>
      <p><strong>Telegram ID:</strong> {user.telegram_id || 'Not connected'}</p>

      <div className="profile-buttons">
  <Link to="/reflections" className="btn">🪞 View My Reflections</Link>
  <Link to="/goal-setup" className="add-goal-btn">➕ Add New Goal</Link>
</div>
    </div>
  );
};

export default Profile;