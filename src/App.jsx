import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Layout from './components/Layout';
import PageTransition from './components/PageTransition';
import Home from './pages/Home';
import Toolbox from './pages/Toolbox';
import Obsidian from './pages/Obsidian';
import Trello from './pages/Trello';
import Milanote from './pages/Milanote';
import Login from './pages/Login';
import { AuthProvider, useAuth } from './context/AuthContext';
function ProtectedRoute({ children }) {
    const { token, loading } = useAuth();
    if (loading) return <div className="h-screen w-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-400">Loading...</div>;
    if (!token) return <Navigate to="/login" replace />;
    return <Layout>{children}</Layout>;
}
function AnimatedRoutes() {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/toolbox" element={<ProtectedRoute><Toolbox /></ProtectedRoute>} />
        <Route path="/obsidian" element={<ProtectedRoute><Obsidian /></ProtectedRoute>} />
        <Route path="/trello" element={<ProtectedRoute><Trello /></ProtectedRoute>} />
        <Route path="/milanote" element={<ProtectedRoute><Milanote /></ProtectedRoute>} />
      </Routes>
    </AnimatePresence>
  );
}
import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <AuthProvider>
        <Router>
          <AnimatedRoutes />
          <Toaster position="bottom-right" toastOptions={{ duration: 3000, style: { background: '#333', color: '#fff' } }} />
        </Router>
    </AuthProvider>
  );
}
export default App;