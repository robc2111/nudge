// App.jsx
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import PrivateRoute from './components/PrivateRoute';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// --- Code-split pages ---
const LandingPage = lazy(() => import('./pages/LandingPage'));
const Login       = lazy(() => import('./pages/Login'));
const Signup      = lazy(() => import('./pages/Signup'));
const Dashboard   = lazy(() => import('./pages/Dashboard'));
const Profile     = lazy(() => import('./pages/Profile'));
const GoalSetup   = lazy(() => import('./pages/GoalSetup'));
const EditGoal    = lazy(() => import('./pages/EditGoal'));
const Reflections = lazy(() => import('./pages/Reflections'));

// --- Simple fallback while lazy chunks load ---
const Loader = () => <div style={{ padding: '2rem' }}>Loading…</div>;

// --- Protected layout: wraps any route group that requires auth ---
const Protected = () => (
  <PrivateRoute>
    <Outlet />
  </PrivateRoute>
);

function App() {
  return (
    <BrowserRouter>
      <Header />

      {/* Global toasts: keep tidy and non-intrusive */}
      <ToastContainer
        position="bottom-right"
        autoClose={3000}
        newestOnTop
        pauseOnFocusLoss={false}
        pauseOnHover
        closeOnClick
        draggable
        limit={3}
      />

      {/* Landmark for accessibility */}
      <main role="main">
        <Suspense fallback={<Loader />}>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            {/* Private routes (grouped) */}
            <Route element={<Protected />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/reflections" element={<Reflections />} />
              <Route path="/goal-setup" element={<GoalSetup />} />
              <Route path="/edit-goal/:id" element={<EditGoal />} />
            </Route>

            {/* 404 fallback (use a dedicated <NotFound /> later if you like) */}
            <Route path="*" element={<LandingPage />} />
          </Routes>
        </Suspense>
      </main>

      <Footer />
    </BrowserRouter>
  );
}

export default App;