//Signup.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axios';

const Signup = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    telegram_id: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    try {
      const res = await axios.post('/auth/register', formData);
      localStorage.setItem('token', res.data.token);
      setSuccess(true);
      setTimeout(() => navigate('/dashboard'), 1000);
    } catch (err) {
      setError(err.response?.data?.error || 'Signup failed');
    }
  };

  return (
    
    <div style={{ maxWidth: 400, margin: 'auto' }}>
      <h2>Sign Up</h2>
      <form onSubmit={handleSubmit}>
        <input
          name="name"
          type="text"
          placeholder="Your Name"
          value={formData.name}
          onChange={handleChange}
          required
        /><br />
        <input
          name="email"
          type="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
          required
        /><br />
        <input
          name="telegram_id"
          type="text"
          placeholder="Telegram ID"
          value={formData.telegram_id}
          onChange={handleChange}
          required
        /><br />
        <input
          name="password"
          type="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleChange}
          required
        /><br />
        <button type="submit">Create Account</button>
      </form>
      {success && <p style={{ color: 'green' }}>🎉 Registration successful!</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div> // ✅ this closing </div> was in the wrong place or missing
  );
};

export default Signup;