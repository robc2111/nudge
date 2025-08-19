// Login.jsx
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from '../api/axios';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const res = await axios.post('/auth/login', { email, password });

      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));

      // 👇 Redirect to where the user was headed before login, or dashboard as fallback
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fff9f3] px-4">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center">🔐 Login</h2>

        <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="border border-gray-300 px-4 py-3 rounded w-full text-base"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="border border-gray-300 px-4 py-3 rounded w-full text-base"
          />

          <button
            type="submit"
            className="bg-[#bd661d] text-white py-3 rounded hover:bg-[#a55217] transition"
          >
            Login
          </button>
        </form>

        {error && <p className="text-red-600 text-sm mt-4 text-center">{error}</p>}
      </div>
    </div>
  );
};

export default Login;