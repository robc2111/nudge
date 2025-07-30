//Profile.jsx
import React, { useEffect, useState } from 'react';
import axios from '../api/axios';
import { Link } from 'react-router-dom';

const Profile = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    axios.get('/users/me')
      .then(res => setUser(res.data))
      .catch(err => console.error('Error loading user:', err));
  }, []);

  if (!user) return <p>Loading your profile...</p>;

  return (
    <div style={{ padding: '2rem' }}>
      <h1>👤 Your Profile</h1>
      <p><strong>Name:</strong> {user.name}</p>
      <p><strong>Email:</strong> {user.email}</p>
      <p><strong>Telegram ID:</strong> {user.telegram_id}</p>
      <Link
  to="/goal-setup"
  className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
>
  ➕ Add New Goal
</Link>
    </div>
  );
};

export default Profile;