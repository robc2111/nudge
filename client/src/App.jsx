import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import PrivateRoute from './components/PrivateRoute';
import ErrorBoundary from './components/ErrorBoundary';
import NotFound from './pages/NotFound';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ResetPassword from './pages/ResetPassword';
import PlanGuard from './components/PlanGuard';
import CookieBanner from './components/CookieBanner';
import ScrollManager from './components/ScrollManager';
import BlogIndex from './pages/BlogIndex';
import BlogPost from './pages/BlogPost';

const LandingPage = lazy(() => import('./pages/LandingPage'));
const LogIn = lazy(() => import('./pages/LogIn'));
const SignUp = lazy(() => import('./pages/SignUp'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Profile = lazy(() => import('./pages/Profile'));
const GoalSetup = lazy(() => import('./pages/GoalSetup'));
const EditGoal = lazy(() => import('./pages/EditGoal'));
const Reflections = lazy(() => import('./pages/Reflections'));
const BillingSuccess = lazy(() => import('./pages/BillingSuccess'));
const BillingCancel = lazy(() => import('./pages/BillingCancel'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Terms = lazy(() => import('./pages/Terms'));
const FAQ = lazy(() => import('./pages/FAQ'));

const Protected = () => (
  <PrivateRoute>
    <Outlet />
  </PrivateRoute>
);

// App.jsx
export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <div className="app-shell">
          {/* ✅ NEW wrapper */}
          {/* Skip link for keyboard users */}
          <a href="#main" className="skip-link">
            Skip to main content
          </a>

          <Header />

          {/* 🔝 Always reset scroll on route changes */}
          <ScrollManager />

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

          {/* ✅ give main the layout class */}
          <main id="main" role="main" tabIndex={-1} className="app-main">
            <Routes>
              {/* Public */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/logIn" element={<LogIn />} />
              <Route path="/signup" element={<SignUp />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/blog" element={<BlogIndex />} />
              <Route path="/blog/:slug" element={<BlogPost />} />

              {/* Private */}
              <Route element={<Protected />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/reflections" element={<Reflections />} />
                <Route
                  path="/goal-setup"
                  element={
                    <PlanGuard>
                      <GoalSetup />
                    </PlanGuard>
                  }
                />
                <Route path="/edit-goal/:id" element={<EditGoal />} />
                <Route path="/billing/success" element={<BillingSuccess />} />
                <Route path="/billing/cancel" element={<BillingCancel />} />
              </Route>

              {/* Password reset */}
              <Route path="/reset-password" element={<ResetPassword />} />

              {/* 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            {typeof window !== 'undefined' && (
              <Suspense
                fallback={<div style={{ padding: '2rem' }}>Loading…</div>}
              >
                <CookieBanner />
              </Suspense>
            )}
          </main>

          <Footer />
        </div>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
