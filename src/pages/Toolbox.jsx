import React, { useState, useMemo, useEffect } from 'react';
import { Search, Plus, Download, Upload, Trash2, X, ExternalLink, Check, List as ListIcon, Grid, Star, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';
import { fetchWithAuth } from '../utils/api';

export default function Toolbox() {
  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTag, setActiveTag] = useState('All');
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTool, setEditingTool] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); 

  // Fetch Tools
  useEffect(() => {
      loadTools();
  }, []);

  const loadTools = async () => {
      try {
          const res = await fetchWithAuth('/tools');
          if (res.ok) {
              const data = await res.json();
              setTools(data);
          }
      } catch (err) {
          console.error("Failed to load tools", err);
      } finally {
          setLoading(false);
      }
  };

  // Filter Logic
  const filteredTools = useMemo(() => {
    let result = tools.filter(tool => {
        const matchesSearch = tool.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              (tool.comment && tool.comment.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesTag = activeTag === 'All' || (tool.tags && tool.tags.includes(activeTag));
        return matchesSearch && matchesTag;
    });
    // Sort favorites first
    return result.sort((a, b) => (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0));
  }, [tools, searchQuery, activeTag]);

  // Tags Logic
  const uniqueTags = useMemo(() => {
    const tags = new Set(['All']);
    tools.forEach(tool => (tool.tags || []).forEach(tag => tags.add(tag)));
    return Array.from(tags);
  }, [tools]);

  // Handlers
  const handleSelect = (id) => {
    if (!isSelectionMode) {
        setEditingTool(tools.find(t => t.id === id));
        setIsModalOpen(true);
        return;
    }
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedIds(newSelected);
  };

  const toggleFavorite = async (e, id) => {
    e.stopPropagation();
    const tool = tools.find(t => t.id === id);
    if (!tool) return;

    // Optimistic update
    const updatedTools = tools.map(t => t.id === id ? { ...t, isFavorite: !t.isFavorite } : t);
    setTools(updatedTools);

    try {
        await fetchWithAuth(`/tools/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ isFavorite: !tool.isFavorite })
        });
    } catch (err) {
        console.error("Favorite toggle failed", err);
        loadTools();
    }
  };

  const deleteSelected = async () => {
    if (window.confirm(`Delete ${selectedIds.size} tools?`)) {
        // Optimistic
        setTools(tools.filter(t => !selectedIds.has(t.id)));
        setIsSelectionMode(false);

        // API calls
        for (const id of selectedIds) {
            await fetchWithAuth(`/tools/${id}`, { method: 'DELETE' });
        }
        setSelectedIds(new Set());
    }
  };

  const saveTool = async (formData) => {
      // Logic for both Create and Update
      const payload = {
          ...formData,
          link: formData.url, // Map url to link for backend
          description: formData.description || (formData.pros ? `Pros: ${formData.pros}\nCons: ${formData.cons}` : '')
      };

      if (editingTool) {
          // Update
          try {
              const res = await fetchWithAuth(`/tools/${editingTool.id}`, {
                  method: 'PUT',
                  body: JSON.stringify(payload)
              });
              if (!res.ok) throw new Error(await res.text());
              const updated = await res.json();
              setTools(tools.map(t => t.id === updated.id ? updated : t));
              toast.success('Tool updated successfully');
          } catch (err) {
              console.error("Update failed", err);
              toast.error("Failed to update tool: " + err.message);
          }
      } else {
          // Create
          try {
              const res = await fetchWithAuth('/tools', {
                  method: 'POST',
                  body: JSON.stringify(payload)
              });
              if (!res.ok) throw new Error(await res.text());
              const newTool = await res.json();
              setTools([newTool, ...tools]);
              toast.success('Tool created successfully');
          } catch (err) {
               console.error("Create failed", err);
               toast.error("Failed to create tool: " + err.message);
          }
      }
      closeModal();
      setEditingTool(null);
  };

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(tools));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "my_tools.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImport = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (event) => {
          try {
              const imported = JSON.parse(event.target.result);
              if (Array.isArray(imported)) {
                  // For database, we should probably add them one by one or create a bulk endpoint
                  // For now, let's just add them one by one to be safe with IDs
                  for (const tool of imported) {
                    await fetchWithAuth('/tools', {
                        method: 'POST',
                        body: JSON.stringify({
                            title: tool.title,
                            link: tool.url || tool.link, // handle both old and new schema if needed
                            description: tool.pros ? `Pros: ${tool.pros}\nCons: ${tool.cons}` : tool.description,
                            comment: tool.comment,
                            tags: tool.tags,
                            isFavorite: tool.isFavorite
                        })
                    });
                  }
                  loadTools();
              }
          } catch (err) {
              alert("Invalid JSON file");
          }
      };
      reader.readAsText(file);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTool(null);
  };

  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedIds(new Set());
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-900">
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 shrink-0 z-10 bg-slate-50 dark:bg-slate-900">
          {/* Search & Filters */}
          <div className="flex flex-col gap-6 mb-6">
            <div className="relative w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input 
                    type="text" 
                    placeholder="Search tools..." 
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm dark:text-white"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
            <div className="flex flex-wrap gap-2 items-center">
                {uniqueTags.map(tag => (
                    <button
                        key={tag}
                        onClick={() => setActiveTag(tag)}
                        className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                            activeTag === tag 
                                ? 'bg-indigo-600 text-white shadow-md' 
                                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                        }`}
                    >
                        {tag}
                    </button>
                ))}
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
                <div className="bg-white dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 flex">
                    <button 
                        onClick={() => setViewMode('grid')}
                        className={clsx("p-2 rounded transition-all", viewMode === 'grid' ? "bg-indigo-100 text-indigo-600 dark:bg-slate-700 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300")}
                        title="Grid View"
                    >
                        <Grid size={18} />
                    </button>
                    <button 
                        onClick={() => setViewMode('list')}
                        className={clsx("p-2 rounded transition-all", viewMode === 'list' ? "bg-indigo-100 text-indigo-600 dark:bg-slate-700 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300")}
                        title="List View"
                    >
                        <ListIcon size={18} />
                    </button>
                </div>
                <div className="w-px h-6 bg-slate-300 dark:bg-slate-700 mx-2"></div>
                <button 
                    onClick={toggleSelectionMode} 
                    className={`p-2 rounded-lg transition-colors border border-transparent ${isSelectionMode ? 'bg-indigo-100 text-indigo-600 border-indigo-200' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500'}`}
                    title="Selection Mode"
                >
                    <Check size={20} />
                </button>
                <button onClick={handleExport} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500" title="Export">
                    <Download size={20} />
                </button>
                <label className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer" title="Import">
                    <Upload size={20} />
                    <input type="file" className="hidden" accept=".json" onChange={handleImport} />
                </label>
            </div>

            <button 
                onClick={() => setIsModalOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-all active:scale-95 w-full sm:w-auto justify-center"
            >
                <Plus size={18} />
                <span className="inline">Add Tool</span>
            </button>
          </div>
      </div>
        
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-20 max-w-7xl mx-auto w-full custom-scrollbar">
        <div
            className={clsx(
                viewMode === 'grid'
                    ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
                    : 'flex flex-col gap-3'
            )}
        >
            {filteredTools.map(tool => {
                const url = tool.url || tool.link;
                return (
                <div 
                    key={tool.id}
                    onClick={() => handleSelect(tool.id)}
                    className={`group relative bg-white dark:bg-slate-800 rounded-2xl overflow-hidden border transition-none cursor-pointer hover:shadow-lg ${
                        selectedIds.has(tool.id) 
                            ? 'ring-2 ring-indigo-500 border-indigo-500' 
                            : 'border-slate-200 dark:border-slate-700 shadow-sm'
                    } ${viewMode === 'list' ? 'flex flex-row items-center p-4 gap-6' : 'flex flex-col'}`}
                >
                    {/* Favorite Button */}
                    {!isSelectionMode && (
                        <button 
                            onClick={(e) => toggleFavorite(e, tool.id)}
                            className={clsx("absolute top-4 right-4 z-20 p-1.5 rounded-full transition-all", tool.isFavorite ? "text-yellow-400 bg-yellow-400/10" : "text-slate-300 hover:text-yellow-400 bg-transparent")}
                        >
                            <Star size={16} fill={tool.isFavorite ? "currentColor" : "none"} />
                        </button>
                    )}

                    <div className={clsx("relative", viewMode === 'list' ? "flex-1 min-w-0" : "p-5 flex-1")}>
                        {/* Selection Checkbox */}
                        {isSelectionMode && (
                            <div className={clsx("z-10", viewMode === 'grid' ? "absolute top-4 left-4" : "mr-4 inline-block align-middle")}>
                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${selectedIds.has(tool.id) ? 'bg-indigo-600 border-indigo-600' : 'bg-white/80 border-slate-300'}`}>
                                    {selectedIds.has(tool.id) && <Check size={14} className="text-white" />}
                                </div>
                            </div>
                        )}

                        <div className={`flex justify-between items-start mb-3 ${isSelectionMode && viewMode === 'grid' ? 'pl-8' : ''}`}>
                            <h3 className="font-bold text-lg dark:text-white line-clamp-1">{tool.title}</h3>
                            {/* External Link */}
                            {!isSelectionMode && viewMode === 'grid' && url && (
                                <a 
                                    href={url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-slate-400 hover:text-indigo-600 p-1 mr-6" // mr-6 for favorite btn
                                    title="Open website"
                                >
                                    <ExternalLink size={16} />
                                </a>
                            )}
                        </div>

                        <div className={`flex flex-wrap gap-2 mb-4 ${isSelectionMode && viewMode === 'grid' ? 'pl-8' : ''}`}>
                            {(tool.tags || []).map((t, i) => (
                                <span key={i} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] rounded font-bold uppercase tracking-wider">#{t}</span>
                            ))}
                        </div>

                        <div className={`space-y-4 text-sm ${isSelectionMode ? 'opacity-40' : ''} ${viewMode === 'list' ? 'hidden sm:block' : ''}`}>
                            {tool.pros && (
                                <div>
                                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Pros</p>
                                    <ul className="text-xs space-y-1">
                                        {tool.pros.split('\n').filter(Boolean).slice(0, 2).map((l, i) => (
                                            <li key={i} className="flex items-start gap-2 text-slate-600 dark:text-slate-300 line-clamp-1">
                                                <span className="text-emerald-500 font-bold">•</span> {l}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    {viewMode === 'list' && (
                        <div className="flex items-center gap-2 pr-12 shrink-0">
                            {url && (
                                <a
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                                    title="Open website"
                                >
                                    <ExternalLink size={18} />
                                </a>
                            )}
                            <div className="text-[10px] text-slate-400 font-mono whitespace-nowrap hidden lg:block">{tool.date}</div>
                        </div>
                    )}

                    {viewMode === 'grid' && (
                        <div className="px-5 py-3 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center text-[10px] text-slate-400 uppercase font-bold">
                            <span>{tool.date}</span>
                            <span className={`text-indigo-500 group-hover:opacity-100 transition-opacity ${isSelectionMode ? 'hidden' : 'opacity-0'}`}>Edit</span>
                        </div>
                    )}
                </div>
                );
            })}
        </div>


      {filteredTools.length === 0 && (
          <div className="text-center py-20 text-slate-400">
              <div className="text-6xl mb-4">📦</div>
              <p>No tools found.</p>
          </div>
      )}
      </div>

      {/* Bulk Actions Bar */}
      <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-6 transition-all duration-300 ${isSelectionMode && selectedIds.size > 0 ? 'translate-y-0 opacity-100' : 'translate-y-32 opacity-0'}`}>
          <span className="font-medium text-sm">{selectedIds.size} selected</span>
          <div className="flex gap-3">
              <button onClick={() => { setIsSelectionMode(false); setSelectedIds(new Set()); }} className="px-3 py-1.5 rounded-lg hover:bg-slate-800 text-sm border border-slate-700">Cancel</button>
              <button onClick={deleteSelected} className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-sm font-bold flex items-center gap-2">
                  <Trash2 size={16} /> Delete
              </button>
          </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
          <ModalTool 
            tool={editingTool} 
            onClose={closeModal} 
            onSave={saveTool} 
          />
      )}
    </div>
  );
}

function ModalTool({ tool, onClose, onSave }) {
    const [formData, setFormData] = useState({
        title: tool?.title || '',
        url: tool?.link || tool?.url || '', // Handle backend 'link'
        tags: (tool?.tags || []).join(', '),
        pros: tool?.description?.includes('Pros:') ? tool.description.split('Pros:')[1].split('Cons:')[0].trim() : '',
        cons: tool?.description?.includes('Cons:') ? tool.description.split('Cons:')[1].trim() : '',
        comment: tool?.comment || '',
        description: tool?.description || '' // Keep original description if not parsed
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({
            ...formData,
            tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean)
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold dark:text-white">{tool ? 'Edit Tool' : 'New Tool'}</h2>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        <X size={24} />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto custom-scrollbar space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-semibold dark:text-slate-300">Name *</label>
                            <input 
                                required 
                                className="w-full px-3 py-2 rounded-lg border dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={formData.title}
                                onChange={e => setFormData({...formData, title: e.target.value})}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-semibold dark:text-slate-300">URL</label>
                            <input 
                                type="url"
                                className="w-full px-3 py-2 rounded-lg border dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="https://..."
                                value={formData.url}
                                onChange={e => setFormData({...formData, url: e.target.value})}
                            />
                        </div>
                    </div>
                    
                    <div className="space-y-1">
                        <label className="text-sm font-semibold dark:text-slate-300">Tags (comma separated)</label>
                        <input 
                            className="w-full px-3 py-2 rounded-lg border dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="IA, Design, Code..."
                            value={formData.tags}
                            onChange={e => setFormData({...formData, tags: e.target.value})}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-semibold text-emerald-600 uppercase">Pros</label>
                            <textarea 
                                rows="3" 
                                className="w-full px-3 py-2 rounded-lg border dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                placeholder="One point per line"
                                value={formData.pros}
                                onChange={e => setFormData({...formData, pros: e.target.value})}
                            ></textarea>
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-semibold text-rose-600 uppercase">Cons</label>
                            <textarea 
                                rows="3" 
                                className="w-full px-3 py-2 rounded-lg border dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                placeholder="One point per line"
                                value={formData.cons}
                                onChange={e => setFormData({...formData, cons: e.target.value})}
                            ></textarea>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-semibold dark:text-slate-300">Comment</label>
                        <textarea 
                            rows="2" 
                            className="w-full px-3 py-2 rounded-lg border dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                            value={formData.comment}
                            onChange={e => setFormData({...formData, comment: e.target.value})}
                        ></textarea>
                    </div>

                    <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-700 mt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 dark:text-slate-400 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">Cancel</button>
                        <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold text-sm shadow-md hover:bg-indigo-700 active:scale-95 transition-all">Save</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
