// client/src/components/PlanGuard.jsx
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import axios from '../api/axios';

export default function PlanGuard({ children }) {
  const [state, setState] = useState({ ready: false, allow: false });

  useEffect(() => {
    (async () => {
      try {
        // load user + count active goals
        const me = await axios.get('/users/me');
        const { data: myGoals } = await axios.get('/goals/mine');

        const plan = (me.data?.plan || 'free').toLowerCase();
        const activeCount = (myGoals || []).filter(g => g.status !== 'done').length;
        const atFreeLimit = plan === 'free' && activeCount >= 1;

        setState({ ready: true, allow: !atFreeLimit });
      } catch {
        setState({ ready: true, allow: false });
      }
    })();
  }, []);

  if (!state.ready) return null;           // or a tiny spinner
  if (!state.allow) return <Navigate to="/dashboard" replace />;

  return children;
}