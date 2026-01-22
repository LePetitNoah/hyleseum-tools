import { useState, useRef, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Plus, Trash2, ArrowLeft, MoreHorizontal, X, Bold, Italic, Underline, List, ListOrdered, Calendar, Tag, Clock, Share2, Filter, Layout, Kanban } from 'lucide-react';
import { clsx } from 'clsx';
import { fetchWithAuth } from '../utils/api';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

export default function Trello() {
  const [projects, setProjects] = useState([]);
  const [currentProjectId, setCurrentProjectId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
     loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
        const res = await fetchWithAuth('/projects');
        if (res.ok) {
            const data = await res.json();
            setProjects(data);
        }
    } catch (err) {
        console.error("Failed to load projects", err);
    } finally {
        setLoading(false);
    }
  };

  const currentProject = projects.find(p => p.id === currentProjectId);

  const addProject = async (name) => {
    if (!name.trim()) return;
    try {
        const res = await fetchWithAuth('/projects', {
            method: 'POST',
            body: JSON.stringify({ name })
        });
        const newProject = await res.json();
        setProjects([newProject, ...projects]);
        toast.success("Project created!");
    } catch (err) {
        console.error("Failed to create project", err);
        toast.error("Failed to create project");
    }
  };

  const deleteProject = async (id) => {
    if (window.confirm("Delete this project and all tasks?")) {
        // Optimistic
        setProjects(projects.filter(p => p.id !== id));
        if (currentProjectId === id) setCurrentProjectId(null);

        try {
            await fetchWithAuth(`/projects/${id}`, { method: 'DELETE' });
            toast.success("Project deleted");
        } catch (err) {
            console.error("Failed to delete project", err);
            loadProjects(); // Revert
            toast.error("Failed to delete project");
        }
    }
  };

  const updateProjectTasks = async (projectId, newTasks) => {
    // Optimistic
    setProjects(projects.map(p => p.id === projectId ? { ...p, tasks: newTasks } : p));
    
    try {
        await fetchWithAuth(`/projects/${projectId}`, {
            method: 'PUT',
            body: JSON.stringify({ tasks: newTasks })
        });
    } catch (err) {
        console.error("Failed to update tasks", err);
    }
  };

  if (loading) return <div className="h-full flex items-center justify-center dark:text-white">Loading projects...</div>;

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-[#0B0C15] overflow-hidden bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-100/40 via-slate-50/0 to-slate-50/0 dark:from-blue-900/20 dark:via-slate-900/0 dark:to-slate-900/0">
      <AnimatePresence mode="wait">
        {!currentProject ? (
            <motion.div 
                key="list"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="h-full"
            >
                <ProjectList 
                    projects={projects} 
                    onAdd={addProject} 
                    onSelect={setCurrentProjectId} 
                    onDelete={deleteProject} 
                />
            </motion.div>
        ) : (
            <motion.div 
                key="board"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="h-full flex flex-col"
            >
                <KanbanBoard 
                    project={currentProject} 
                    onBack={() => setCurrentProjectId(null)}
                    onUpdateTasks={(tasks) => updateProjectTasks(currentProject.id, tasks)}
                />
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ProjectList({ projects, onAdd, onSelect, onDelete }) {
  const [newProjectName, setNewProjectName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onAdd(newProjectName);
    setNewProjectName('');
  };

  return (
    <div className="max-w-5xl mx-auto w-full p-8 h-full flex flex-col justify-center">
      <div className="mb-8">
          <h2 className="text-4xl font-black mb-2 text-slate-900 dark:text-white tracking-tight">My Projects</h2>
          <p className="text-slate-500 text-lg">Manage your tasks and workflows.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {projects.map(project => (
            <div 
                key={project.id} 
                onClick={() => onSelect(project.id)}
                className="group cursor-pointer bg-white dark:bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-200 dark:border-slate-700/50 hover:border-blue-500 dark:hover:border-blue-500 transition-all hover:shadow-xl hover:-translate-y-1 relative overflow-hidden"
            >
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full -mr-8 -mt-8 blur-2xl group-hover:bg-blue-500/20 transition-colors"></div>
                <div className="flex justify-between items-start mb-4 relative">
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                        <Layout size={24} />
                    </div>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onDelete(project.id); }}
                        className="text-slate-400 hover:text-rose-500 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 opacity-0 group-hover:opacity-100 transition-all"
                    >
                        <Trash2 size={18} />
                    </button>
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{project.name}</h3>
                <div className="flex items-center gap-4 text-sm text-slate-500">
                    <span className="flex items-center gap-1"><ListOrdered size={14} /> {project.tasks?.length || 0} tasks</span>
                    <span className="flex items-center gap-1"><Clock size={14} /> {format(new Date(project.createdAt || Date.now()), 'MMM d')}</span>
                </div>
            </div>
          ))}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-4 max-w-xl">
        <input 
          id="new-project-input"
          type="text" 
          value={newProjectName}
          onChange={(e) => setNewProjectName(e.target.value)}
          placeholder="Enter project name..."
          className="flex-1 px-6 py-4 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none shadow-sm text-lg transition-all"
        />
        <button 
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-bold shadow-lg shadow-blue-600/30 hover:shadow-blue-600/40 active:scale-95 transition-all text-lg"
        >
          Create
        </button>
      </form>
    </div>
  );
}

function KanbanBoard({ project, onBack, onUpdateTasks }) {
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [editingTask, setEditingTask] = useState(null);

  const COLUMNS = [
    { id: 'todo', title: 'To Do', color: 'bg-slate-100/50 dark:bg-slate-800/30' },
    { id: 'inprogress', title: 'In Progress', color: 'bg-blue-50/50 dark:bg-blue-900/10' },
    { id: 'done', title: 'Done', color: 'bg-emerald-50/50 dark:bg-emerald-900/10' }
  ];

  const handleAddTask = (status, name) => {
    const newTask = { id: Date.now(), name, status, description: '' };
    onUpdateTasks([...project.tasks, newTask]);
    toast.success("Task added");
  };

  const handleDeleteTask = (taskId) => {
    onUpdateTasks(project.tasks.filter(t => t.id !== taskId));
    toast.success("Task deleted");
  };

  const handleUpdateTask = (task) => {
    onUpdateTasks(project.tasks.map(t => t.id === task.id ? task : t)); 
    setEditingTask(null);
    toast.success("Task updated");
  };

  const onDragEnd = (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    // Find the dragged task
    const task = project.tasks.find(t => t.id.toString() === draggableId);
    if (!task) return;

    // Group tasks by column
    const tasksByColumn = {
      todo: project.tasks.filter(t => t.status === 'todo'),
      inprogress: project.tasks.filter(t => t.status === 'inprogress'),
      done: project.tasks.filter(t => t.status === 'done')
    };

    // Remove task from source column
    const sourceColumn = tasksByColumn[source.droppableId];
    const sourceIndex = sourceColumn.findIndex(t => t.id.toString() === draggableId);
    if (sourceIndex !== -1) {
      sourceColumn.splice(sourceIndex, 1);
    }

    // Update task status if moved to different column
    const updatedTask = { ...task, status: destination.droppableId };

    // Insert task into destination column at new position
    const destColumn = tasksByColumn[destination.droppableId];
    destColumn.splice(destination.index, 0, updatedTask);

    // Combine all columns back into one array
    const newTasks = [
      ...tasksByColumn.todo,
      ...tasksByColumn.inprogress,
      ...tasksByColumn.done
    ];

    onUpdateTasks(newTasks);
  };

  return (
    <div className="flex flex-col h-full">
        {/* Header */}
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between shadow-sm z-10">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors">
                    <ArrowLeft size={20} className="text-slate-500" />
                </button>
                <div>
                    <h2 className="text-xl font-bold flex items-center gap-2 dark:text-white">
                        <Kanban size={20} className="text-blue-500" />
                        {project.name}
                    </h2>
                </div>
            </div>
            <div className="flex items-center gap-2">
                 <div className="flex -space-x-2 mr-4">
                     {[1,2,3].map(i => (
                         <div key={i} className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 border-2 border-white dark:border-slate-800"></div>
                     ))}
                 </div>
                 <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500">
                     <Filter size={20} />
                 </button>
                 <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500">
                     <Share2 size={20} />
                 </button>
            </div>
        </div>

        {/* Board */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
            <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex h-full gap-8 min-w-[1000px]">
                {COLUMNS.map(col => (
                    <Droppable key={col.id} droppableId={col.id}>
                    {(provided, snapshot) => (
                    <div 
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex-1 flex flex-col rounded-2xl border border-slate-200/50 dark:border-slate-700/50 ${col.color} backdrop-blur-md transition-colors ${snapshot.isDraggingOver ? 'ring-2 ring-blue-500/50 bg-blue-50/80' : ''}`}
                    >
                        <div className="p-4 font-bold text-slate-700 dark:text-slate-200 flex justify-between items-center">
                            <span className="text-sm uppercase tracking-wider">{col.title}</span>
                            <span className="bg-white/50 dark:bg-black/20 px-2 py-0.5 rounded-full text-xs font-mono opacity-60">
                                {project.tasks.filter(t => t.status === col.id).length}
                            </span>
                        </div>
                        
                        <div className="flex-1 p-3 overflow-y-auto custom-scrollbar space-y-3">
                            {project.tasks.filter(t => t.status === col.id).map((task, index) => (
                                <Draggable key={task.id} draggableId={task.id.toString()} index={index}>
                                {(provided, snapshot) => (
                                <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    style={provided.draggableProps.style}
                                    onClick={() => setEditingTask(task)}
                                    className={`bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 cursor-grab active:cursor-grabbing group hover:border-blue-400 dark:hover:border-blue-500 transition-all ${snapshot.isDragging ? 'shadow-2xl rotate-2 scale-105 z-50 ring-2 ring-blue-500' : 'hover:shadow-md hover:-translate-y-0.5'}`}
                                >
                                    {/* Labels */}
                                    {task.labels && task.labels.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mb-3">
                                            {task.labels.map((l, i) => (
                                                <span key={i} className={`h-1.5 w-6 rounded-full ${l.color}`}></span>
                                            ))}
                                        </div>
                                    )}

                                    <div className="flex justify-between items-start mb-2 gap-2">
                                        <h4 className="font-semibold text-slate-800 dark:text-white text-sm leading-snug">{task.name}</h4>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id); }}
                                            className="text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all -mr-1 -mt-1 p-1"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                    
                                    {(task.description || task.dueDate) && (
                                        <div className="flex items-center gap-3 text-xs text-slate-400 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/50">
                                            {task.description && <List size={14} />}
                                            {task.dueDate && (
                                                <div className={`flex items-center gap-1.5 ${new Date(task.dueDate) < new Date() ? 'text-rose-500 font-bold' : ''}`}>
                                                    <Clock size={14} />
                                                    <span>{format(new Date(task.dueDate), 'MMM d')}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                )}
                                </Draggable>
                            ))}
                            {provided.placeholder}
                        </div>

                        <div className="p-3 mt-auto">
                            <AddTaskForm onAdd={(name) => handleAddTask(col.id, name)} />
                        </div>
                    </div>
                    )}
                    </Droppable>
                ))}
            </div>
            </DragDropContext>
        </div>

        <AnimatePresence>
            {editingTask && (
                <TaskModal 
                    task={editingTask} 
                    onClose={() => setEditingTask(null)} 
                    onSave={handleUpdateTask} 
                />
            )}
        </AnimatePresence>
    </div>
  );
}

function AddTaskForm({ onAdd }) {
    const [name, setName] = useState('');
    const handleSubmit = (e) => {
        e.preventDefault();
        onAdd(name);
        setName('');
    };
    return (
        <form onSubmit={handleSubmit}>
            <button 
                type="submit"
                className={`w-full text-left px-3 py-2.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 text-sm hover:bg-white dark:hover:bg-slate-700/50 hover:border-blue-400 focus-within:ring-2 focus-within:ring-blue-500 transition-all flex items-center gap-2 ${name ? 'bg-white dark:bg-slate-700 border-solid border-blue-500 ring-2 ring-blue-500/20' : ''}`}
            >
                <Plus size={16} />
                <input 
                    className="bg-transparent outline-none w-full placeholder:text-slate-400"
                    placeholder="Add a card"
                    value={name}
                    onChange={e => setName(e.target.value)}
                />
            </button>
        </form>
    );
}

function TaskModal({ task, onClose, onSave }) {
    const [name, setName] = useState(task.name);
    const [dueDate, setDueDate] = useState(task.dueDate || '');
    const [labels, setLabels] = useState(task.labels || []);
    const contentRef = useRef(null);

    const LABEL_COLORS = [
        { id: 'red', color: 'bg-rose-500' },
        { id: 'green', color: 'bg-emerald-500' },
        { id: 'blue', color: 'bg-blue-500' },
        { id: 'yellow', color: 'bg-amber-400' },
        { id: 'purple', color: 'bg-purple-500' },
    ];

    useEffect(() => {
        if (contentRef.current) {
            contentRef.current.innerHTML = task.description || '';
        }
    }, []);

    const execCmd = (cmd, val = null) => {
        document.execCommand(cmd, false, val);
    };

    const handleSave = () => {
        onSave({ 
            ...task, 
            name, 
            dueDate,
            labels,
            description: contentRef.current.innerHTML 
        });
    };

    const toggleLabel = (label) => {
        if (labels.find(l => l.id === label.id)) {
            setLabels(labels.filter(l => l.id !== label.id));
        } else {
            setLabels([...labels, label]);
        }
    };

    return (
        <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
        >
            <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-200 dark:border-slate-700"
            >
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="flex items-center gap-3 text-slate-500">
                        <Kanban size={18} />
                        <span className="text-sm font-medium">Task Details</span>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="p-8 space-y-8 flex-1 overflow-y-auto custom-scrollbar">
                    {/* Title */}
                    <div>
                        <input 
                            className="w-full text-3xl font-black border-none focus:ring-0 outline-none bg-transparent dark:text-white placeholder:text-slate-300"
                            value={name}
                            onChange={e => setName(e.target.value)}
                        />
                    </div>

                    <div className="flex flex-col md:flex-row gap-12">
                        {/* Main Content */}
                        <div className="flex-1 space-y-6">
                            <div>
                                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">
                                    <List size={16} /> Description
                                </label>
                                <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                                    <div className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 p-2 flex gap-1">
                                        <ToolbarBtn icon={Bold} onClick={() => execCmd('bold')} />
                                        <ToolbarBtn icon={Italic} onClick={() => execCmd('italic')} />
                                        <ToolbarBtn icon={Underline} onClick={() => execCmd('underline')} />
                                        <div className="w-px h-6 bg-slate-300 dark:bg-slate-700 mx-1 self-center"></div>
                                        <ToolbarBtn icon={List} onClick={() => execCmd('insertUnorderedList')} />
                                        <ToolbarBtn icon={ListOrdered} onClick={() => execCmd('insertOrderedList')} />
                                    </div>
                                    <div 
                                        ref={contentRef}
                                        contentEditable
                                        className="min-h-[150px] p-4 outline-none dark:text-slate-200 prose prose-sm max-w-none dark:prose-invert"
                                    ></div>
                                </div>
                            </div>
                        </div>

                        {/* Sidebar */}
                        <div className="w-full md:w-64 space-y-6">
                            <div className="space-y-3">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Add to card</label>
                                
                                <div className="space-y-2">
                                     <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 font-medium text-sm mb-2">
                                        <Tag size={14} /> Labels
                                     </div>
                                     <div className="flex flex-wrap gap-2">
                                         {LABEL_COLORS.map(l => (
                                             <button 
                                                key={l.id}
                                                onClick={() => toggleLabel(l)}
                                                className={`w-8 h-8 rounded-full ${l.color} hover:scale-110 transition-transform ${labels.find(lbl => lbl.id === l.id) ? 'ring-2 ring-offset-2 ring-blue-500 dark:ring-offset-slate-800 scale-110' : 'opacity-60 hover:opacity-100'}`}
                                             />
                                         ))}
                                     </div>
                                </div>

                                <div className="space-y-2">
                                     <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 font-medium text-sm mb-2">
                                        <Calendar size={14} /> Due Date
                                     </div>
                                     <input 
                                        type="date"
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                        value={dueDate}
                                        onChange={e => setDueDate(e.target.value)}
                                     />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3 bg-slate-50 dark:bg-slate-900/50">
                    <button onClick={onClose} className="px-5 py-2.5 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl font-medium transition-colors">Cancel</button>
                    <button onClick={handleSave} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/30 active:scale-95 transition-all">Save Changes</button>
                </div>
            </motion.div>
        </motion.div>
    );
}

const ToolbarBtn = ({ icon: Icon, onClick }) => (
    <button onClick={onClick} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-md transition-colors text-slate-500 dark:text-slate-400">
        <Icon size={16} />
    </button>
);
