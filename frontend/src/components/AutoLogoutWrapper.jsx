import React, { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const INACTIVITY_LIMIT_MS = 5 * 60 * 1000; // 5 minutes of inactivity

export default function AutoLogoutWrapper({ children }) {
    const navigate = useNavigate();
    const location = useLocation();
    const timerRef = useRef(null);

    const performLogout = () => {
        // Only log out if a user is currently logged in and we aren't already on the login/landing page
        const user = localStorage.getItem('user');
        if (user && location.pathname !== '/login' && location.pathname !== '/') {
            localStorage.removeItem('user');
            navigate('/login');
        }
    };

    const resetTimer = () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            performLogout();
        }, INACTIVITY_LIMIT_MS);
    };

    useEffect(() => {
        // 1. Listen for Tab Switch or Minimize (Visibility Change)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                performLogout();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        // 2. Listen for Inactivity Events
        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
        events.forEach(event => document.addEventListener(event, resetTimer));

        // Start timer initially
        resetTimer();

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            events.forEach(event => document.removeEventListener(event, resetTimer));
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [location.pathname]); // Re-bind on route change just in case

    return <>{children}</>;
}
