import React, { useState, useEffect, useRef, useMemo } from 'react';
import { marked } from 'marked';
import * as d3 from 'd3';
import { 
    Share2, Edit3, Menu, X, BrainCircuit, Search, Bold, Italic, Link, Code,
    FolderPlus, FilePlus, ChevronDown, ChevronRight, Folder, FolderOpen, FileText, Plus, Trash2
} from 'lucide-react';
import { fetchWithAuth } from '../utils/api';

export default function Obsidian() {
    const [notes, setNotes] = useState([]);
    const [folders, setFolders] = useState([]);
    const [currentNoteId, setCurrentNoteId] = useState(null);
    const [viewMode, setViewMode] = useState('edit'); // 'edit' or 'graph'
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);

    // Initial Load
    useEffect(() => {
        Promise.all([loadFolders(), loadNotes()]).then(() => setLoading(false));
    }, []);

    const loadNotes = async () => {
        try {
            const res = await fetchWithAuth('/obsidian/notes');
            if (res.ok) setNotes(await res.json());
        } catch (e) { console.error(e); }
    };

    const loadFolders = async () => {
        try {
            const res = await fetchWithAuth('/obsidian/folders');
            if (res.ok) setFolders(await res.json());
        } catch (e) { console.error(e); }
    };

    // Helpers
    const currentNote = useMemo(() => notes.find(n => n.id === currentNoteId), [notes, currentNoteId]);

    // Set default note if none selected and notes exist
    useEffect(() => {
        if (!currentNoteId && notes.length > 0 && !loading) {
            // setCurrentNoteId(notes[0].id); // Optional: auto-select first note
        }
    }, [notes, currentNoteId, loading]);

    const filteredNotes = useMemo(() => {
        if (!searchQuery) return notes;
        const q = searchQuery.toLowerCase();
        return notes.filter(n => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q));
    }, [notes, searchQuery]);

    const createNote = async () => {
        const title = "New Note";
        try {
             // Optimistic
            const tempId = 'temp-' + Date.now();
            const newNoteTemp = { id: tempId, title, folderId: null, content: `# ${title}\n\n`, lastModified: new Date().toISOString() };
            setNotes([newNoteTemp, ...notes]);
            setCurrentNoteId(tempId);
            
            const res = await fetchWithAuth('/obsidian/notes', {
                method: 'POST',
                body: JSON.stringify({ title, content: `# ${title}\n\n` })
            });
            const newNote = await res.json();
            
            // Replace temp with real
            setNotes(prev => prev.map(n => n.id === tempId ? newNote : n));
            setCurrentNoteId(newNote.id);
            setViewMode('edit');
        } catch (e) {
            console.error(e);
            loadNotes();
        }
    };

    const createFolder = async () => {
        const name = prompt("Folder name:");
        if (!name) return;
        
        try {
            const res = await fetchWithAuth('/obsidian/folders', {
                method: 'POST',
                body: JSON.stringify({ name })
            });
            const newFolder = await res.json();
            setFolders([...folders, newFolder]);
        } catch (e) { console.error(e); }
    };

    const deleteNote = async (e, id) => {
        e.stopPropagation();
        if (window.confirm("Delete note?")) {
            setNotes(notes.filter(n => n.id !== id));
            if (currentNoteId === id) setCurrentNoteId(null);
            
            try {
                await fetchWithAuth(`/obsidian/notes/${id}`, { method: 'DELETE' });
            } catch (err) { console.error(err); }
        }
    };
    
    const deleteFolder = async (e, id) => {
        e.stopPropagation();
        if (window.confirm("Delete folder and unfile its notes?")) {
            setFolders(folders.filter(f => f.id !== id));
            try {
                await fetchWithAuth(`/obsidian/folders/${id}`, { method: 'DELETE' });
                loadNotes(); // Reload notes as their folderId might have changed (or we handle it optimistically)
            } catch (err) { console.error(err); }
        }
    };
    
    const toggleFolder = async (folder) => {
        const updated = { ...folder, isOpen: !folder.isOpen };
        setFolders(folders.map(f => f.id === folder.id ? updated : f));
        
        try {
            await fetchWithAuth(`/obsidian/folders/${folder.id}`, { 
                method: 'PUT',
                body: JSON.stringify({ isOpen: updated.isOpen })
            });
        } catch (err) { console.error(err); }
    };

    const moveNoteToFolder = async (noteId, folderId) => {
        // Optimistic update
        setNotes(prev => prev.map(n => n.id === noteId ? { ...n, folderId } : n));
        try {
            await fetchWithAuth(`/obsidian/notes/${noteId}`, {
                method: 'PUT',
                body: JSON.stringify({ folderId })
            });
        } catch (err) {
            console.error(err);
            loadNotes();
        }
    };

    const updateNoteContent = async (val) => {
        const lines = val.split('\n');
        const foundTitle = lines[0].startsWith('# ') ? lines[0].replace('# ', '').trim() : "Untitled";
        
        // Optimistic update
        setNotes(notes.map(n => n.id === currentNoteId ? { ...n, content: val, title: foundTitle || n.title, lastModified: new Date().toISOString() } : n));
        
        // Debounce? For now just fire and forget (or maybe small timeout in real app)
        // Let's rely on a separate save function or `useEffect` for syncing to DB to avoid spamming
    };
    
    // Save effect for current note content (simple debounce)
    useEffect(() => {
        if (!currentNoteId) return;
        const note = notes.find(n => n.id === currentNoteId);
        if (!note) return;

        const timer = setTimeout(async () => {
            try {
                await fetchWithAuth(`/obsidian/notes/${note.id}`, {
                    method: 'PUT',
                    body: JSON.stringify({ 
                        title: note.title,
                        content: note.content,
                        lastModified: note.lastModified
                    })
                });
            } catch (err) { console.error(err); }
        }, 1000);

        return () => clearTimeout(timer);
    }, [currentNoteId, notes]); // This is heavy if notes array changes constantly. 
    // Optimization: Store draft content in a separate state `currentContent` and only update `notes` array on save or blur?
    // For now this works but sends 1 request per keypress group.

    const insertText = (before, after = '') => {
        const textarea = document.querySelector('textarea'); // Simple selector, ref would be better but this works for now
        if (!textarea) return;
        
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const beforeText = text.substring(0, start);
        const afterText = text.substring(end);
        const selection = text.substring(start, end);
        
        const newText = beforeText + before + selection + after + afterText;
        updateNoteContent(newText);
        
        // Need to set selection after render, simpler to ignore for this POC or use ref
    };

    const navigateToNote = async (title) => {
        const existing = notes.find(n => n.title.toLowerCase() === title.toLowerCase());
        if (existing) {
            setCurrentNoteId(existing.id);
            setViewMode('edit');
            return;
        }

        // Create and persist a new note for this wiki-link
        const content = `# ${title}\n\n`;
        try {
            const res = await fetchWithAuth('/obsidian/notes', {
                method: 'POST',
                body: JSON.stringify({ title, content })
            });
            if (!res.ok) throw new Error(await res.text());
            const newNote = await res.json();
            setNotes(prev => [newNote, ...prev]);
            setCurrentNoteId(newNote.id);
            setViewMode('edit');
        } catch (e) {
            console.error('Failed to create linked note', e);
        }
    };

    return (
        <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-[#1e1e1e] text-[#dcddde] font-sans">
            {/* Sidebar */}
            <aside className={`bg-[#161616] border-r border-white/10 flex flex-col transition-all duration-300 ${isSidebarOpen ? 'w-64' : 'w-0 overflow-hidden'}`}>
                <div className="p-4 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Explorer</span>
                        <div className="flex gap-1">
                            <button onClick={createFolder} className="p-1.5 hover:bg-white/10 rounded"><FolderPlus size={16} /></button>
                            <button onClick={createNote} className="p-1.5 hover:bg-white/10 rounded"><FilePlus size={16} /></button>
                        </div>
                    </div>
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-2 top-1.5 text-gray-500" size={14} />
                        <input 
                            className="w-full bg-[#0f0f0f] border border-white/10 rounded px-2 pl-7 py-1 text-xs text-gray-300 focus:border-indigo-500 outline-none"
                            placeholder="Search notes..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto px-2 pb-4 custom-scrollbar">
                    {/* Folders */}
                    {folders.map(folder => (
                        <div key={folder.id} className="mb-1">
                            <div 
                                className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-white/5 cursor-pointer group text-sm font-medium text-gray-300"
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    const noteId = e.dataTransfer.getData('text/obsidian-note-id');
                                    if (noteId) moveNoteToFolder(noteId, folder.id);
                                }}
                            >
                                <div 
                                    className="flex items-center gap-2 flex-1"
                                    onClick={() => toggleFolder(folder)}
                                >
                                    {folder.isOpen ? <ChevronDown size={14} className="text-gray-500" /> : <ChevronRight size={14} className="text-gray-500" />}
                                    <Folder size={14} className="text-indigo-400" />
                                    <span className="truncate">{folder.name}</span>
                                </div>
                                <button onClick={(e) => deleteFolder(e, folder.id)} className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400">
                                    <X size={12} />
                                </button>
                            </div>
                            {folder.isOpen && (
                                <div className="ml-4 border-l border-white/5 pl-1">
                                    {filteredNotes.filter(n => n.folderId === folder.id).map(note => (
                                        <NoteItem 
                                            key={note.id} 
                                            note={note} 
                                            active={currentNoteId === note.id} 
                                            onClick={() => setCurrentNoteId(note.id)} 
                                            onDelete={(e) => deleteNote(e, note.id)} 
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                    {/* Root Notes */}
                    <div
                        className="mt-2 pt-2 border-t border-white/5"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                            e.preventDefault();
                            const noteId = e.dataTransfer.getData('text/obsidian-note-id');
                            if (noteId) moveNoteToFolder(noteId, null);
                        }}
                    >
                        {filteredNotes.filter(n => !n.folderId).map(note => (
                            <NoteItem 
                                key={note.id} 
                                note={note} 
                                active={currentNoteId === note.id} 
                                onClick={() => setCurrentNoteId(note.id)} 
                                onDelete={(e) => deleteNote(e, note.id)} 
                            />
                        ))}
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0">
                {/* Toolbar */}
                <header className="h-12 border-b border-white/10 bg-[#161616] flex items-center justify-between px-4">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-1 hover:bg-white/5 rounded">
                            <Menu size={18} />
                        </button>
                        <div className="flex items-center gap-2 text-sm">
                            <BrainCircuit className="text-indigo-400" size={18} />
                            <span className="font-semibold tracking-tight hidden sm:inline">LUMINA NOTES</span>
                            {currentNote && <span className="text-gray-500 px-2 font-mono text-xs">/ {currentNote.title}</span>}
                        </div>
                    </div>
                    <div className="bg-[#2d2d2d] rounded-md p-1 flex gap-1">
                        <button 
                            onClick={() => setViewMode('edit')}
                            className={`px-3 py-1 rounded text-xs font-medium flex items-center gap-2 transition-colors ${viewMode === 'edit' ? 'bg-[#3d3d3d] text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                        >
                            <Edit3 size={14} /> Editor
                        </button>
                        <button 
                            onClick={() => setViewMode('graph')}
                            className={`px-3 py-1 rounded text-xs font-medium flex items-center gap-2 transition-colors ${viewMode === 'graph' ? 'bg-[#3d3d3d] text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                        >
                            <Share2 size={14} /> Graph
                        </button>
                    </div>
                </header>

                {/* Content Area */}
                {viewMode === 'edit' ? (
                    <div className="flex-1 flex">
                        {/* Editor Input */}
                        <div className="flex-1 border-r border-white/10 bg-[#1e1e1e] flex flex-col">
                            {/* Editor Toolbar */}
                            <div className="border-b border-white/5 p-2 flex gap-2 items-center bg-[#252525]">
                                <button onClick={() => insertText('**', '**')} className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white" title="Bold"><Bold size={16} /></button>
                                <button onClick={() => insertText('*', '*')} className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white" title="Italic"><Italic size={16} /></button>
                                <div className="w-px h-4 bg-white/10 mx-1"></div>
                                <button onClick={() => insertText('[[', ']]')} className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white" title="Link Note"><Link size={16} /></button>
                                <button onClick={() => insertText('```\n', '\n```')} className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white" title="Code Block"><Code size={16} /></button>
                                <div className="ml-auto text-xs text-gray-600 font-mono">
                                    {currentNote?.lastModified && `Edited ${new Date(currentNote.lastModified).toLocaleTimeString()}`}
                                </div>
                            </div>
                            <textarea
                                value={currentNote?.content || ''}
                                onChange={(e) => updateNoteContent(e.target.value)}
                                className="flex-1 p-8 bg-transparent outline-none resize-none font-mono text-sm text-gray-300 leading-relaxed w-full custom-scrollbar"
                                placeholder="# Untitled Note..."
                            />
                        </div>
                        {/* Preview */}
                        <div className="flex-1 bg-[#1e1e1e] hidden md:block overflow-y-auto custom-scrollbar p-8 prose prose-invert prose-sm max-w-none">
                             <Preview content={currentNote?.content || ''} onLinkClick={navigateToNote} />
                        </div>
                    </div>
                ) : (
                    <GraphView notes={notes} currentId={currentNoteId} onNodeClick={(id) => { setCurrentNoteId(id); setViewMode('edit'); }} />
                )}
            </main>
        </div>
    );
}

const NoteItem = ({ note, active, onClick, onDelete }) => (
    <div 
        onClick={onClick}
        draggable
        onDragStart={(e) => {
            e.dataTransfer.setData('text/obsidian-note-id', note.id);
            e.dataTransfer.effectAllowed = 'move';
        }}
        className={`group flex items-center justify-between px-3 py-2 rounded-md cursor-pointer transition text-xs my-0.5 ${active ? 'bg-[#2d2d2d] border-l-2 border-indigo-500 text-white font-semibold' : 'text-gray-400 hover:bg-white/5'}`}
    >
        <div className="flex items-center gap-2 overflow-hidden">
            <FileText size={14} className="flex-shrink-0 opacity-50" />
            <span className="truncate">{note.title}</span>
        </div>
        <button onClick={onDelete} className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400">
            <Trash2 size={12} />
        </button>
    </div>
);

// Preview Component with custom renderer for [[Links]]
const Preview = ({ content, onLinkClick }) => {
    // We handle the click intercept via event delegation in the container or by replacing HTML
    const html = useMemo(() => {
        // Custom renderer or regex replace for [[Link]]
        const processed = content.replace(/\[\[(.*?)\]\]/g, (match, title) => {
             return `<span class="text-indigo-400 cursor-pointer hover:underline wiki-link" data-link="${title}">${title}</span>`;
        });
        return marked.parse(processed);
    }, [content]);

    const handleClick = (e) => {
        if (e.target.classList.contains('wiki-link')) {
            onLinkClick(e.target.dataset.link);
        }
    };

    return <div dangerouslySetInnerHTML={{ __html: html }} onClick={handleClick} />;
};

// Graph View using D3
const GraphView = ({ notes, currentId, onNodeClick }) => {
    const containerRef = useRef(null);

    useEffect(() => {
        if (!containerRef.current) return;

        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;
        
        // Only clear if we really need to full re-init (e.g. notes changed structure)
        // For now, we'll keep the simple "clear all" approach but we'll optimize the click handler
        // to NOT trigger this effect if we can avoid it.
        // Actually best practice: 
        // 1. Setup SVG and Simulation once
        // 2. Update data
        
        const container = d3.select(containerRef.current);
        container.selectAll("*").remove();

        const svg = container.append("svg")
            .attr("width", width)
            .attr("height", height);

        const g = svg.append("g");
            
        const zoom = d3.zoom()
            .scaleExtent([0.1, 4])
            .on("zoom", (event) => g.attr("transform", event.transform));
            
        svg.call(zoom);

        const data = {
            nodes: notes.map(n => ({ id: n.id, title: n.title })),
            links: []
        };

        // Build links
        notes.forEach(note => {
            const regex = /\[\[(.*?)\]\]/g;
            let match;
            while ((match = regex.exec(note.content)) !== null) {
                const target = notes.find(n => n.title.toLowerCase() === match[1].toLowerCase());
                if (target) {
                    data.links.push({ source: note.id, target: target.id });
                }
            }
        });

        const simulation = d3.forceSimulation(data.nodes)
            .force("link", d3.forceLink(data.links).id(d => d.id).distance(100))
            .force("charge", d3.forceManyBody().strength(-300))
            .force("center", d3.forceCenter(width / 2, height / 2));

        const link = g.append("g")
            .selectAll("line")
            .data(data.links)
            .join("line")
            .attr("stroke", "#444")
            .attr("stroke-opacity", 0.6);

        const node = g.append("g")
            .selectAll("g")
            .data(data.nodes)
            .join("g")
            .call(d3.drag()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended));

        const circles = node.append("circle")
            .attr("r", 8)
            .attr("fill", d => d.id === currentId ? "#7c4dff" : "#555") // Initial color
            .attr("stroke", "#000")
            .attr("stroke-width", 1.5)
            .attr("cursor", "pointer")
            .attr("class", "node-circle") // Class for selection
            .on("click", (event, d) => onNodeClick(d.id));

        node.append("text")
            .text(d => d.title)
            .attr("x", 12)
            .attr("y", 4)
            .attr("fill", "#9da2a6")
            .attr("font-size", "10px")
            .style("pointer-events", "none");

        simulation.on("tick", () => {
            link
                .attr("x1", d => d.source.x)
                .attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x)
                .attr("y2", d => d.target.y);

            node
                .attr("transform", d => `translate(${d.x},${d.y})`);
        });

        function dragstarted(event) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            event.subject.fx = event.subject.x;
            event.subject.fy = event.subject.y;
        }

        function dragged(event) {
            event.subject.fx = event.x;
            event.subject.fy = event.y;
        }

        function dragended(event) {
            if (!event.active) simulation.alphaTarget(0);
            event.subject.fx = null;
            event.subject.fy = null;
        }

        // Store references for the second effect
        containerRef.current.__d3_circles = circles;

        return () => simulation.stop();
    }, [notes]); // Only re-run if NOTES change, not selection

    // 2nd Effect: Update selection visuals only
    useEffect(() => {
        if (containerRef.current && containerRef.current.__d3_circles) {
            containerRef.current.__d3_circles
                .attr("fill", d => d.id === currentId ? "#7c4dff" : "#555");
        }
    }, [currentId]);

    return <div ref={containerRef} className="w-full h-full bg-[#0f0f0f] relative cursor-move" />;
};


