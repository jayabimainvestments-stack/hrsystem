import { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkLoggedIn = async () => {
            const token = localStorage.getItem('token');
            const storedUser = localStorage.getItem('user');

            if (token && storedUser) {
                try {
                    const userObj = JSON.parse(storedUser);
                    setUser(userObj);
                } catch (error) {
                    console.error("Failed to parse user from storage", error);
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                }
            } else {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
            }
            setLoading(false);
        };
        checkLoggedIn();

        // Cross-tab synchronization logic
        const handleStorageChange = (e) => {
            if (e.key === 'token') {
                if (!e.newValue) {
                    // Logged out in another tab
                    setUser(null);
                    window.location.href = '/login';
                } else if (e.newValue !== e.oldValue) {
                    // Different user logged in in another tab
                    window.location.reload();
                }
            }
            if (e.key === 'user' && !e.newValue) {
                setUser(null);
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    const login = async (email, password) => {
        try {
            const { data } = await api.post('/auth/login', { email, password });
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data));
            setUser(data);
            return { success: true };
        } catch (error) {
            const message = error.response?.data?.message || error.message || 'Login failed';
            return { success: false, error: message };
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
    };

    const updateUser = (updates) => {
        const updatedUser = { ...user, ...updates };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading, updateUser }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
