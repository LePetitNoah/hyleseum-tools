import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token') || null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (token) {
            // Validate token or fetch user info if real auth logic was deeper
            // For now we persist session via localStorage 'token'
            // In a real app we'd call /auth/me here
            setLoading(false);
        } else {
            setLoading(false);
        }
    }, [token]);

    const login = async (email, password) => {
        try {
            const res = await fetch('http://localhost:3001/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            const data = await res.json();
            if (res.ok) {
                setToken(data.token);
                setUser(data.user);
                localStorage.setItem('token', data.token);
                return { success: true };
            } else {
                return { success: false, error: data.error };
            }
        } catch (err) {
            return { success: false, error: 'Connection failed' };
        }
    };

    const register = async (email, password) => {
        try {
            const res = await fetch('http://localhost:3001/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            const data = await res.json();
            if (res.ok) {
                setToken(data.token);
                setUser(data.user);
                localStorage.setItem('token', data.token);
                return { success: true };
            } else {
                return { success: false, error: data.error };
            }
        } catch (err) {
            return { success: false, error: 'Connection failed' };
        }
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
    };

    return (
        <AuthContext.Provider value={{ user, token, login, register, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
