// src/App.jsx
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import PrivateRoute from './components/PrivateRoute';
import ErrorBoundary from './components/ErrorBoundary';
import NotFound from './pages/NotFound';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const LandingPage = lazy(() => import('./pages/LandingPage'));
const Login       = lazy(() => import('./pages/Login'));
const Signup      = lazy(() => import('./pages/Signup'));
const Dashboard   = lazy(() => import('./pages/Dashboard'));
const Profile     = lazy(() => import('./pages/Profile'));
const GoalSetup   = lazy(() => import('./pages/GoalSetup'));
const EditGoal    = lazy(() => import('./pages/EditGoal'));
const Reflections = lazy(() => import('./pages/Reflections'));
const BillingSuccess = lazy(() => import('./pages/BillingSuccess'));
const BillingCancel = lazy(() => import('./pages/BillingCancel'));

const Loader = () => <div style={{ padding: '2rem' }}>Loading…</div>;

const Protected = () => (
  <PrivateRoute>
    <Outlet />
  </PrivateRoute>
);

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Header />

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

        <main role="main">
          <Suspense fallback={<Loader />}>
            <Routes>
              {/* Public */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/privacy" element={<Privacy />} />
<Route path="/terms" element={<Terms />} />

              {/* Private */}
              <Route element={<Protected />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/reflections" element={<Reflections />} />
                <Route path="/goal-setup" element={<GoalSetup />} />
                <Route path="/edit-goal/:id" element={<EditGoal />} />
                <Route path="/billing/success" element={<BillingSuccess />} />
<Route path="/billing/cancel" element={<BillingCancel />} />
              </Route>

              {/* 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </main>

        <Footer />
      </BrowserRouter>
    </ErrorBoundary>
  );
}