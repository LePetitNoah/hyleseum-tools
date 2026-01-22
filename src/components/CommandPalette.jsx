import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Command, ArrowRight, FileText, Layout, Wrench, Smile } from 'lucide-react';
import { clsx } from 'clsx';
import { fetchWithAuth } from '../utils/api';

export default function CommandPalette({ isOpen, onClose }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  
  // Data for search
  const [data, setData] = useState({ notes: [], projects: [], boards: [] });

  useEffect(() => {
      if (isOpen) {
          // Fetch data only when opened to keep it fresh
          const loadData = async () => {
             try {
                 const [n, p, b] = await Promise.all([
                     fetchWithAuth('/obsidian/notes').then(r => r.ok ? r.json() : []),
                     fetchWithAuth('/projects').then(r => r.ok ? r.json() : []),
                     fetchWithAuth('/boards').then(r => r.ok ? r.json() : [])
                 ]);
                 setData({ notes: n, projects: p, boards: b });
             } catch (e) { console.error(e); }
          };
          loadData();
      }
  }, [isOpen]);

  // Define searchable actions
  const actions = useMemo(() => {
    const staticActions = [
      { id: 'home', title: 'Go to Home', icon: Layout, type: 'Page', action: () => navigate('/') },
      { id: 'milanote', title: 'Go to MoodBoard', icon: Smile, type: 'Page', action: () => navigate('/milanote') },
      { id: 'obsidian', title: 'Go to Notes', icon: FileText, type: 'Page', action: () => navigate('/obsidian') },
      { id: 'trello', title: 'Go to Kanban', icon: Layout, type: 'Page', action: () => navigate('/trello') },
      { id: 'toolbox', title: 'Go to ToolBox', icon: Wrench, type: 'Page', action: () => navigate('/toolbox') },
    ];

    // Dynamic items
    const noteActions = data.notes.map(n => ({
      id: `note-${n.id}`,
      title: n.title || 'Untitled Note',
      icon: FileText,
      type: 'Note',
      action: () => { navigate('/obsidian'); /* TODO: Open specific note */ }
    }));

    const projectActions = data.projects.map(p => ({
      id: `proj-${p.id}`,
      title: p.name,
      icon: Layout,
      type: 'Project',
      action: () => { navigate('/trello'); /* TODO: Open specific project */ }
    }));
    
    // Add boards search if needed?
    const boardActions = data.boards.map(b => ({
      id: `board-${b.id}`,
      title: b.title || 'Untitled Board',
      icon: Smile,
      type: 'Board',
      action: () => { navigate('/milanote'); /* TODO: Open specific board */ }
    }));

    return [...staticActions, ...noteActions, ...projectActions, ...boardActions];
  }, [navigate, data]);

  const filteredActions = useMemo(() => {
    if (!query) return actions.slice(0, 5); // Show top 5 by default
    return actions.filter(a => a.title.toLowerCase().includes(query.toLowerCase())).slice(0, 10);
  }, [query, actions]);

  // Reset index on query change
  useEffect(() => setActiveIndex(0), [query]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex(i => (i + 1) % filteredActions.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex(i => (i - 1 + filteredActions.length) % filteredActions.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredActions[activeIndex]) {
          filteredActions[activeIndex].action();
          onClose();
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredActions, activeIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-start justify-center pt-[20vh] animate-fade-in">
      <div 
        className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-800">
          <Search className="text-slate-400" size={20} />
          <input 
            autoFocus
            className="flex-1 bg-transparent outline-none text-lg text-slate-800 dark:text-slate-100 placeholder-slate-400"
            placeholder="Type a command or search..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <div className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-xs text-slate-500 font-mono">ESC</div>
        </div>
        
        <div className="py-2 max-h-[60vh] overflow-y-auto">
          {filteredActions.length === 0 ? (
            <div className="px-4 py-8 text-center text-slate-500">No results found.</div>
          ) : (
            filteredActions.map((action, idx) => (
              <button
                key={action.id}
                onClick={() => { action.action(); onClose(); }}
                onMouseEnter={() => setActiveIndex(idx)}
                className={clsx(
                  "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
                  idx === activeIndex ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border-l-2 border-indigo-500" : "text-slate-700 dark:text-slate-300 border-l-2 border-transparent"
                )}
              >
                <action.icon size={18} className={idx === activeIndex ? "text-indigo-500" : "text-slate-400"} />
                <span className="flex-1 font-medium">{action.title}</span>
                <span className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">{action.type}</span>
                {idx === activeIndex && <ArrowRight size={14} className="text-indigo-500 opacity-50" />}
              </button>
            ))
          )}
        </div>
        
        <div className="bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 px-4 py-2 flex gap-4 text-xs text-slate-500">
            <span><strong className="font-semibold">↑↓</strong> to navigate</span>
            <span><strong className="font-semibold">Enter</strong> to select</span>
        </div>
      </div>
      
      {/* Backdrop click to close */}
      <div className="fixed inset-0 -z-10" onClick={onClose}></div>
    </div>
  );
}
