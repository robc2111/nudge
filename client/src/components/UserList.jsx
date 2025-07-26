import React, { useEffect, useState } from 'react';
import axios from '../api/axios';

const UserList = () => {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    axios.get('/api/users')
      .then(res => setUsers(res.data))
      .catch(err => console.error(err));
  }, []);

  return (
    <div>
      <h2>Users</h2>
      {users.length === 0 ? (
        <p>No users yet.</p>
      ) : (
        <ul>
          {users.map(user => (
            <li key={user.id}>{user.name} (Telegram ID: {user.telegram_id})</li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default UserList;