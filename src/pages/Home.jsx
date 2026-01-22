import React, { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Palette, Brain, Kanban, PenTool, Clock, ArrowRight, FileText, CheckSquare, Layout, Activity, Wrench, Sparkles } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fetchWithAuth } from '../utils/api';
import { motion } from 'framer-motion';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

const ToolCard = ({ to, icon: Icon, title, description, colorClass, iconClass }) => {
  return (
    <motion.div variants={item} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
        <Link to={to} className="relative group overflow-hidden bg-white/70 dark:bg-slate-800/50 backdrop-blur-xl rounded-3xl p-6 border border-white/20 dark:border-white/5 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 transition-all hover:shadow-2xl hover:shadow-indigo-500/10 h-full flex flex-col">
        <div className={`absolute top-0 right-0 -mt-12 -mr-12 w-48 h-48 rounded-full opacity-0 group-hover:opacity-10 transition-opacity duration-700 blur-3xl ${colorClass}`}></div>
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${colorClass} bg-opacity-10 dark:bg-opacity-20 group-hover:scale-110 transition-transform duration-300`}>
            <Icon className={`w-7 h-7 ${iconClass}`} />
        </div>
        <h3 className="text-xl font-bold mb-2 text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{title}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{description}</p>
        </Link>
    </motion.div>
  );
};

const RecentItem = ({ title, date, icon: Icon, type, to }) => (
    <Link to={to} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-white/50 dark:hover:bg-white/5 transition-colors group border border-transparent hover:border-white/40 dark:hover:border-white/5">
        <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/20 group-hover:text-indigo-500 transition-colors shadow-sm">
            <Icon size={20} />
        </div>
        <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-slate-900 dark:text-white truncate text-base group-hover:text-indigo-500 transition-colors">{title}</h4>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mt-1">
                <span className="bg-slate-200/50 dark:bg-slate-700/50 px-2 py-0.5 rounded-md text-slate-600 dark:text-slate-300">{type}</span>
                <span>•</span>
                <span>{date ? formatDistanceToNow(new Date(date), { addSuffix: true }) : 'Recently'}</span>
            </div>
        </div>
        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0">
             <ArrowRight size={16} className="text-indigo-500" />
        </div>
    </Link>
);

export default function Home() {
  const [data, setData] = useState({
      projects: [],
      notes: [],
      tools: [],
      boards: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
      const loadData = async () => {
          try {
              const [p, n, t, b] = await Promise.all([
                  fetchWithAuth('/projects').then(r => r.ok ? r.json() : [], () => []),
                  fetchWithAuth('/obsidian/notes').then(r => r.ok ? r.json() : [], () => []),
                  fetchWithAuth('/tools').then(r => r.ok ? r.json() : [], () => []),
                  fetchWithAuth('/boards').then(r => r.ok ? r.json() : [], () => [])
              ]);
              setData({ projects: p, notes: n, tools: t, boards: b });
          } catch (e) { console.error(e); }
          setLoading(false);
      };
      loadData();
  }, []);
  
  const recentProjects = useMemo(() => {
      return [...data.projects].reverse().slice(0, 3);
  }, [data.projects]);

  const recentNotes = useMemo(() => {
      return [...data.notes].sort((a,b) => new Date(b.lastModified || 0) - new Date(a.lastModified || 0)).slice(0, 3);
  }, [data.notes]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="flex flex-col min-h-full p-8 overflow-y-auto bg-slate-50 dark:bg-[#0B0C15] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-100/20 via-slate-50/0 to-slate-50/0 dark:from-indigo-900/20 dark:via-slate-900/0 dark:to-slate-900/0">
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-12 max-w-7xl mx-auto w-full"
      >
        <div className="flex items-center gap-3 mb-2">
             <Sparkles className="text-amber-400" size={24} />
             <h1 className="text-5xl font-black bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">{greeting}</h1>
        </div>
        <p className="text-slate-500 dark:text-slate-400 text-xl font-medium ml-9">Here's what's happening in your workspace today.</p>
      </motion.header>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 max-w-7xl mx-auto w-full">
          {/* Quick Access */}
          <div className="xl:col-span-2">
               <div className="flex items-center justify-between mb-6 px-1">
                   <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                       <Activity size={14} /> Apps
                   </h2>
               </div>
               <motion.div 
                 variants={container}
                 initial="hidden"
                 animate="show"
                 className="grid grid-cols-1 sm:grid-cols-2 gap-5"
               >
                    <ToolCard 
                        to="/milanote" 
                        icon={PenTool} 
                        title="MoodBoard" 
                        description={`${data.boards.length} Boards • Visualize ideas`}
                        colorClass="bg-pink-500"
                        iconClass="text-pink-600 dark:text-pink-400"
                    />
                    <ToolCard 
                        to="/obsidian" 
                        icon={Brain} 
                        title="Notes" 
                        description={`${data.notes.length} Notes • Second Brain`}
                        colorClass="bg-purple-500"
                        iconClass="text-purple-600 dark:text-purple-400"
                    />
                    <ToolCard 
                        to="/trello" 
                        icon={Kanban} 
                        title="Kanban" 
                        description={`${data.projects.length} Projects • Manage Tasks`}
                        colorClass="bg-blue-500"
                        iconClass="text-blue-600 dark:text-blue-400"
                    />
                    <ToolCard 
                        to="/toolbox" 
                        icon={Wrench} 
                        title="ToolBox" 
                        description={`${data.tools.length} Tools • Curated Resources`}
                        colorClass="bg-emerald-500"
                        iconClass="text-emerald-600 dark:text-emerald-400"
                    />
               </motion.div>
          </div>

          {/* Recent Activity Feed */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col"
          >
               <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2 px-1">
                   <Clock size={14} /> Recent Activity
               </h2>
               
               <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-3xl p-6 border border-white/20 dark:border-white/5 shadow-2xl shadow-indigo-500/5 flex flex-col h-full ring-1 ring-slate-900/5 dark:ring-white/10">
                   <div className="space-y-2 flex-1 relative">
                       {/* Decoration line */}
                       <div className="absolute left-[19px] top-4 bottom-4 w-px bg-indigo-500/10 dark:bg-indigo-500/20 rounded-full"></div>

                       {recentProjects.length === 0 && recentNotes.length === 0 && (
                           <div className="text-center py-20 text-slate-400 text-sm flex flex-col items-center">
                               <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-full mb-3">
                                   <Activity size={24} className="opacity-50" />
                               </div>
                               No recent activity found.
                           </div>
                       )}

                       {recentProjects.map(p => (
                           <RecentItem 
                              key={p.id}
                              title={p.name}
                              type="Project"
                              icon={Kanban}
                              to="/trello"
                              date={p.createdAt || null}
                           />
                       ))}

                       {recentNotes.map(n => (
                           <RecentItem 
                              key={n.id}
                              title={n.title}
                              type="Note"
                              icon={FileText}
                              to="/obsidian"
                              date={n.lastModified || n.createdAt || null}
                           />
                       ))}
                   </div>
                   
                   <Link to="/milanote" className="mt-6 py-3 block text-center text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all active:scale-95 shadow-lg shadow-indigo-600/20">
                       Open Workspace
                   </Link>
               </div>
          </motion.div>
      </div>
    </div>
  );
}
