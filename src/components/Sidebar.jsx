import { NavLink, useLocation } from 'react-router-dom';
import { 
  Home, Wrench, Brain, Kanban, PenTool, 
  ChevronLeft, ChevronRight, Moon, Sun, Settings,
  Search,
  Command,
  LogOut
} from 'lucide-react';
import { clsx } from 'clsx';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ onOpenPalette }) {
  const [collapsed, setCollapsed] = useLocalStorage('sidebar_collapsed', false);
  const [darkMode, setDarkMode] = useLocalStorage('theme_dark', true);
  const { logout } = useAuth();
  const location = useLocation();

  const toggleTheme = () => {
    setDarkMode(!darkMode);
    if (!darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const navItems = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/milanote', icon: PenTool, label: 'MoodBoard' },
    { to: '/obsidian', icon: Brain, label: 'Notes' },
    { to: '/trello', icon: Kanban, label: 'Kanban' },
    { to: '/toolbox', icon: Wrench, label: 'ToolBox' },
  ];

  return (
    <aside 
      className={clsx(
        "h-screen bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-all duration-300 relative z-40",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* Header */}
      <div className="h-16 flex items-center justify-center border-b border-slate-100 dark:border-slate-800 relative">
        <div className={clsx("flex items-center gap-2 font-bold text-xl bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent overflow-hidden whitespace-nowrap transition-all", collapsed ? "w-0 opacity-0" : "w-auto opacity-100")}>
          <span>Hyleseum</span>
        </div>
        {collapsed && <div className="text-2xl font-bold text-indigo-600">H</div>}
        
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-1/2 -translate-y-1/2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full p-1 text-slate-400 hover:text-indigo-600 shadow-sm"
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Quick Actions */}
      <div className="p-4">
        <button 
          onClick={onOpenPalette}
          className={clsx(
            "w-full flex items-center gap-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-xl transition-colors border border-transparent hover:border-slate-300 dark:hover:border-slate-600",
            collapsed ? "justify-center p-3" : "px-4 py-2.5"
          )}
          title="Command Palette (Ctrl+K)"
        >
          {collapsed ? <Search size={20} /> : (
            <>
              <Search size={18} />
              <span className="text-sm font-medium">Search...</span>
              <kbd className="ml-auto text-xs font-mono bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">Ctrl K</kbd>
            </>
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => {
           const isActive = location.pathname === item.to;
           return (
            <NavLink
              key={item.to}
              to={item.to}
              className={clsx(
                "flex items-center gap-3 px-3 py-3 rounded-xl transition-all group",
                isActive 
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30" 
                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200"
              )}
            >
              <item.icon size={22} className={clsx(isActive ? "text-white" : "group-hover:scale-110 transition-transform")} />
              <span className={clsx("font-medium transition-all whitespace-nowrap", collapsed ? "w-0 opacity-0 overflow-hidden" : "w-auto opacity-100")}>
                {item.label}
              </span>
              
              {/* Tooltip for collapsed state */}
              {collapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                  {item.label}
                </div>
              )}
            </NavLink>
           );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
        <button 
          onClick={logout}
          className={clsx(
            "w-full flex items-center gap-3 rounded-xl transition-colors text-slate-500 dark:text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-600 dark:hover:text-rose-400",
            collapsed ? "justify-center p-3" : "px-3 py-3"
          )}
          title="Logout"
        >
          <LogOut size={20} />
          <span className={clsx("font-medium transition-all whitespace-nowrap", collapsed ? "w-0 opacity-0 overflow-hidden" : "w-auto opacity-100")}>
            Logout
          </span>
        </button>

        <button 
          onClick={toggleTheme}
          className={clsx(
            "w-full flex items-center gap-3 rounded-xl transition-colors text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50",
            collapsed ? "justify-center p-3" : "px-3 py-3"
          )}
        >
          {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          <span className={clsx("font-medium transition-all whitespace-nowrap", collapsed ? "w-0 opacity-0 overflow-hidden" : "w-auto opacity-100")}>
            {darkMode ? "Light Mode" : "Dark Mode"}
          </span>
        </button>
      </div>
    </aside>
  );
}
