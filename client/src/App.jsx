//App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from './components/Header'; // ✅
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import PrivateRoute from './components/PrivateRoute';
import GoalSetup from './pages/GoalSetup';

function App() {
  return (
    <BrowserRouter>
      <Header /> {/* ✅ Always visible */}
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <PrivateRoute>
              <Profile />
            </PrivateRoute>
          }
        />
        <Route
  path="/goal-setup"
  element={
    <PrivateRoute>
      <GoalSetup />
    </PrivateRoute>
  }
/>
      </Routes>
    </BrowserRouter>
  );
}

export default App;