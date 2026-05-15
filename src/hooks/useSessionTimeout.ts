import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth';

const TIMEOUT = 30 * 60 * 1000;
const THROTTLE = 60 * 1000;

export function useSessionTimeout() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const lastActivity = useRef(Date.now());
  const lastUpdate = useRef(0);

  useEffect(() => {
    if (!isAuthenticated) return;

    const updateActivity = () => {
      const now = Date.now();
      if (now - lastUpdate.current > THROTTLE) {
        lastActivity.current = now;
        lastUpdate.current = now;
      }
    };

    const check = setInterval(() => {
      if (Date.now() - lastActivity.current > TIMEOUT) {
        useAuthStore.getState().logout();
        navigate('/login');
      }
    }, 60_000);

    const events = ['mousemove', 'keydown', 'touchstart', 'click'] as const;
    events.forEach((e) => window.addEventListener(e, updateActivity));

    return () => {
      clearInterval(check);
      events.forEach((e) => window.removeEventListener(e, updateActivity));
    };
  }, [isAuthenticated, navigate]);
}
