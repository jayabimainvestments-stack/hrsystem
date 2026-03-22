import { createContext, useState, useEffect, useContext, useRef } from 'react';

import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // One-time mandatory cleanup to ensure old localStorage tokens don't revive sessions
        localStorage.removeItem('token');
        localStorage.removeItem('user');

        const checkLoggedIn = async () => {
            const token = sessionStorage.getItem('token');
            const storedUser = sessionStorage.getItem('user');

            if (token && storedUser) {
                try {
                    const userObj = JSON.parse(storedUser);
                    setUser(userObj);
                } catch (error) {
                    console.error("Failed to parse user from storage", error);
                    sessionStorage.removeItem('token');
                    sessionStorage.removeItem('user');
                }
            } else {
                sessionStorage.removeItem('token');
                sessionStorage.removeItem('user');
            }
            setLoading(false);
        };
        checkLoggedIn();
    }, []);

    const login = async (email, password) => {
        try {
            const { data } = await api.post('/auth/login', { email, password });
            sessionStorage.setItem('token', data.token);
            sessionStorage.setItem('user', JSON.stringify(data));
            setUser(data);
            return { success: true };
        } catch (error) {
            const message = error.response?.data?.message || error.message || 'Login failed';
            return { success: false, error: message };
        }
    };

    const logout = () => {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        setUser(null);
    };

    const updateUser = (updates) => {
        const updatedUser = { ...user, ...updates };
        sessionStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
    };

    const INTERVAL_TIME = 10000; // Check every 10 seconds
    const TIMEOUT_TIME = 3 * 60 * 1000; // 3 minutes
    const ACTIVITY_KEY = 'last_hr_activity';

    const checkInactivity = () => {
        const lastActivity = parseInt(localStorage.getItem(ACTIVITY_KEY) || Date.now());
        const inactiveTime = Date.now() - lastActivity;
        
        if (inactiveTime >= TIMEOUT_TIME && user) {
            logout();
            // Hard redirect to ensure all states are cleared and user is at login
            window.location.href = '/login?reason=inactivity';
        }
    };

    const resetTimer = () => {
        localStorage.setItem(ACTIVITY_KEY, Date.now().toString());
    };

    useEffect(() => {
        if (!user) {
            localStorage.removeItem(ACTIVITY_KEY);
            return;
        }

        const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
        const handleActivity = () => resetTimer();
        
        const handleStorageChange = (e) => {
            if (e.key === 'token' && !e.newValue) {
                // If token is removed in another tab, logout this tab too
                logout();
                window.location.href = '/login';
            }
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                checkInactivity();
            }
        };

        // Initial setup
        resetTimer();
        events.forEach(event => document.addEventListener(event, handleActivity));
        window.addEventListener('storage', handleStorageChange);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Periodic watchdog
        const interval = setInterval(checkInactivity, INTERVAL_TIME);

        return () => {
            events.forEach(event => document.removeEventListener(event, handleActivity));
            window.removeEventListener('storage', handleStorageChange);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            clearInterval(interval);
        };
    }, [user]);

    return (
        <AuthContext.Provider value={{ user, login, logout, loading, updateUser }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
