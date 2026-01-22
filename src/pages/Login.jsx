import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Layout, ArrowRight } from 'lucide-react';

import toast from 'react-hot-toast';

export default function Login() {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const { login, register } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        
        const loadingToast = toast.loading(isLogin ? 'Signing in...' : 'Creating account...');

        let res;
        if (isLogin) {
            res = await login(email, password);
        } else {
            res = await register(email, password);
        }

        if (res.success) {
            toast.success(isLogin ? 'Welcome back!' : 'Account created!', { id: loadingToast });
            navigate('/');
        } else {
            setError(res.error);
            toast.error(res.error, { id: loadingToast });
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 border border-slate-200 dark:border-slate-700">
                <div className="flex flex-col items-center mb-8">
                    <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white mb-4 shadow-lg shadow-indigo-600/30">
                        <Layout size={24} />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                        {isLogin ? 'Welcome Back' : 'Create Account'}
                    </h1>
                    <p className="text-slate-500 text-sm mt-2">
                        {isLogin ? 'Enter your credentials to access your workspace' : 'Start your productivity journey today'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Email</label>
                        <input 
                            type="email" 
                            required 
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                            placeholder="you@example.com"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                        />
                    </div>
                    <div>
                         <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Password</label>
                        <input 
                            type="password" 
                            required 
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                            placeholder="••••••••"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                        />
                    </div>

                    {error && (
                        <div className="p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 text-sm rounded-lg font-medium text-center">
                            {error}
                        </div>
                    )}

                    <button 
                        type="submit" 
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                        {isLogin ? 'Sign In' : 'Sign Up'} <ArrowRight size={18} />
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <button 
                        onClick={() => setIsLogin(!isLogin)}
                        className="text-sm text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition-colors"
                    >
                        {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                    </button>
                </div>
            </div>
        </div>
    );
}
