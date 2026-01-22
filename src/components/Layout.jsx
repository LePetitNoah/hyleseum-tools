import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import CommandPalette from './CommandPalette';
import { useLocalStorage } from '../hooks/useLocalStorage';

export default function Layout({ children }) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const location = useLocation();
  const [darkMode] = useLocalStorage('theme_dark', true);

  // Sync dark mode class
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Keyboard shortcut for palette
  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setPaletteOpen(current => !current);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="flex bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300 h-screen overflow-hidden">
      
      <Sidebar onOpenPalette={() => setPaletteOpen(true)} />
      
      <main className="flex-1 relative flex flex-col h-full overflow-hidden">
        {children}
      </main>

      <CommandPalette isOpen={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
