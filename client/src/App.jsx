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
import EditGoal from './pages/EditGoal';
import Reflections from './pages/Reflections';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  return (
    <BrowserRouter>
      <Header /> {/* ✅ Always visible */}
      <ToastContainer position="bottom-right" autoClose={3000} />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/edit-goal/:id" element={<EditGoal />} />
        <Route
          path="/reflections"
          element={
            <PrivateRoute>
              <Reflections />
            </PrivateRoute>
          }
        />
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