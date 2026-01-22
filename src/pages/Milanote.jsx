import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
    Plus, Image, Link as LinkIcon, CheckSquare, FileText, Download, 
    Upload, Trash2, Sun, Moon, Magnet, ArrowLeft, MoreHorizontal, Network,
    Globe, ExternalLink, Layout
} from 'lucide-react';
import { clsx } from 'clsx';
import { fetchWithAuth, API_URL } from '../utils/api';
import toast from 'react-hot-toast';

const GRID_SIZE = 40;

export default function Milanote() {
  // State
  const [data, setData] = useState({
    currentBoardId: null,
    boards: {},
    view: { x: -25000 + (window.innerWidth / 2), y: -25000 + (window.innerHeight / 2), zoom: 1 },
    snapToGrid: false
  });
  const [loading, setLoading] = useState(true);

  // Load Data
  useEffect(() => {
      loadBoards();
  }, []);

  const loadBoards = async () => {
      try {
          const res = await fetchWithAuth('/boards');
          if (res.ok) {
              const boardsList = await res.json();
              if (boardsList.length === 0) {
                  // Create default board
                  createDefaultBoard();
              } else {
                    const boardsDict = {};
                    boardsList.forEach(b => boardsDict[b.id] = b);
                    setData(prev => ({
                        ...prev,
                        currentBoardId: boardsList[0].id,
                        boards: boardsDict
                    }));
              }
          }
      } catch (err) {
          console.error(err);
      } finally {
          setLoading(false);
      }
  };

  const createDefaultBoard = async () => {
      try {
          const res = await fetchWithAuth('/boards', {
              method: 'POST',
              body: JSON.stringify({ title: 'My First Board' })
          });
          const newBoard = await res.json();
          setData(prev => ({
              ...prev,
              currentBoardId: newBoard.id,
              boards: { [newBoard.id]: newBoard }
          }));
      } catch (e) { console.error(e); }
  };

  const [darkMode, setDarkMode] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [addingConnectionFrom, setAddingConnectionFrom] = useState(null);
  
  // Interaction States
  const [mode, setMode] = useState('select'); // 'select' | 'pan' | 'connect'
  
  // Transient states
  const [dragState, setDragState] = useState(null);
  const [panState, setPanState] = useState(null);

  const containerRef = useRef(null);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 }); 
  const rAF = useRef(null);

  const currentBoard = data.currentBoardId ? data.boards[data.currentBoardId] : null;
  const connections = currentBoard?.connections || [];
  
  const activeView = panState || data.view;

  // Debounced Save
  const saveTimeoutRef = useRef(null);
  const saveBoard = (boardId, boardData) => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(async () => {
          try {
              await fetchWithAuth(`/boards/${boardId}`, {
                  method: 'PUT',
                  body: JSON.stringify({
                      title: boardData.title,
                      elements: boardData.elements,
                      connections: boardData.connections
                  })
              });
          } catch (e) { console.error("Auto-save failed", e); }
      }, 1000);
  };

  // Helpers
  const updateBoard = (newData) => {
    setData(prev => {
        const board = prev.boards[prev.currentBoardId];
        const updatedBoard = { ...board, ...newData };
        
        // Trigger save
        saveBoard(prev.currentBoardId, updatedBoard);

        return {
            ...prev,
            boards: {
                ...prev.boards,
                [prev.currentBoardId]: updatedBoard
            }
        };
    });
  };

  const updateElement = (id, elData) => {
    if (!currentBoard) return;
    const newElements = currentBoard.elements.map(el => el.id === id ? { ...el, ...elData } : el);
    updateBoard({ elements: newElements });
  };



  const addElement = async (type) => {
    const id = 'el_' + Date.now();
    // Use active view
    let x = -activeView.x + (window.innerWidth / 2) - 100;
    let y = -activeView.y + (window.innerHeight / 2) - 50;
    
    if (data.snapToGrid) {
        x = Math.round(x / GRID_SIZE) * GRID_SIZE;
        y = Math.round(y / GRID_SIZE) * GRID_SIZE;
    }

    const newEl = { 
        id, type, x, y, 
        title: type === 'note' ? '' : type.toUpperCase(), 
        width: 280, 
        color: type === 'note' ? 'bg-yellow-100 dark:bg-yellow-900/20' : 'bg-white dark:bg-slate-800' 
    };
    if (type === 'todo') newEl.items = [{ text: '', done: false }];
    
    
    if (type === 'board') {
        const title = 'New Board';
        try {
            // Create real board in DB
            const res = await fetchWithAuth('/boards', {
                method: 'POST',
                body: JSON.stringify({ title, parentId: data.currentBoardId })
            });
            const newBoard = await res.json();

            // Update global state with new board AND add element to current board
            setData(prev => {
                const updatedCurrentBoard = {
                    ...prev.boards[prev.currentBoardId],
                    elements: [...prev.boards[prev.currentBoardId].elements, { 
                        ...newEl, 
                        boardId: newBoard.id, // Use real ID
                        width: 200,
                        title: title
                    }]
                };
                
                // Save current board (to persist the link element)
                saveBoard(prev.currentBoardId, updatedCurrentBoard);

                return {
                    ...prev,
                    boards: {
                        ...prev.boards,
                        [newBoard.id]: newBoard,
                        [prev.currentBoardId]: updatedCurrentBoard
                    }
                };
            });
        } catch (e) { console.error("Failed to create sub-board", e); }
        
        setMode('select');
        return;
    }
    
    updateBoard({ elements: [...currentBoard.elements, newEl] });
    setMode('select');
  };

  const navigateToBoard = (boardId) => {
      setData(prev => ({ ...prev, currentBoardId: boardId }));
      // Reset view or keep global? For now global view persists which feels like "moving" to another place on the infinite canvas conceptually, 
      // but maybe we want to reset to center. Let's reset for now to ensure we find the content.
      // actually, if we want to "enter" a board, we should probably reset zoom/pan.
      setData(prev => ({ 
          ...prev, 
          currentBoardId: boardId,
          view: { x: -25000 + (window.innerWidth / 2), y: -25000 + (window.innerHeight / 2), zoom: 1 }
      }));
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    const loadingToast = toast.loading('Uploading image...');

    fetchWithAuth('/upload', {
        method: 'POST',
        body: formData
    }).then(async res => {
        if (res.ok) {
            const data = await res.json();
            const id = 'el_' + Date.now();
            let x = -activeView.x + (window.innerWidth / 2) - 100;
            let y = -activeView.y + (window.innerHeight / 2) - 50;
            
            // Normalize URL from server (which returns /uploads/filename)
            const imageUrl = data.url.startsWith('http')
                ? data.url
                : `${API_URL}${data.url}`;
            
            const newEl = { id, type: 'image', x, y, title: file.name, src: imageUrl, width: 280 };
            updateBoard({ elements: [...currentBoard.elements, newEl] });
            toast.success('Image uploaded!', { id: loadingToast });
        } else {
            throw new Error('Upload failed');
        }
    }).catch(err => {
        console.error(err);
        toast.error('Failed to upload image', { id: loadingToast });
    });
  };

  const deleteSelection = useCallback(() => {
    if (selectedId) {
        const newElements = currentBoard.elements.filter(el => el.id !== selectedId);
        const newConnections = connections.filter(c => c.from !== selectedId && c.to !== selectedId);
        updateBoard({ elements: newElements, connections: newConnections });
        setSelectedId(null);
    }
  }, [selectedId, currentBoard, connections]);

  // Mouse Handlers
  const handleMouseDown = (e) => {
    if (e.button === 1 || e.altKey || mode === 'pan') {
        e.preventDefault();
        // Initialize pan state from current view
        setPanState({ ...data.view });
        lastMousePos.current = { x: e.clientX, y: e.clientY };
        return;
    }
    
    if (e.target === containerRef.current || e.target.id === 'infinite-canvas') {
        setSelectedId(null);
        setAddingConnectionFrom(null);
        setMode('select');
    }
  };

  const handleMouseMove = useCallback((e) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
         setMousePos({ x: e.clientX - rect.left - activeView.x, y: e.clientY - rect.top - activeView.y });
    }

    if (rAF.current) return;

    rAF.current = requestAnimationFrame(() => {
        rAF.current = null;
        
        if (panState) {
            const dx = e.clientX - lastMousePos.current.x;
            const dy = e.clientY - lastMousePos.current.y;
            setPanState(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    x: prev.x + dx,
                    y: prev.y + dy
                };
            });
            lastMousePos.current = { x: e.clientX, y: e.clientY };
        } else if (dragState && selectedId) {
            const dx = e.clientX - lastMousePos.current.x;
            const dy = e.clientY - lastMousePos.current.y;
            
            setDragState(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    x: prev.x + dx,
                    y: prev.y + dy
                };
            });
            lastMousePos.current = { x: e.clientX, y: e.clientY };
        }
    });
  }, [panState, dragState, selectedId, activeView]);

  const handleMouseUp = () => {
    if (dragState && selectedId) {
        // Commit drag
        let finalX = dragState.x;
        let finalY = dragState.y;

        if (data.snapToGrid) {
            finalX = Math.round(finalX / GRID_SIZE) * GRID_SIZE;
            finalY = Math.round(finalY / GRID_SIZE) * GRID_SIZE;
        }

        updateElement(selectedId, { x: finalX, y: finalY });
        setDragState(null);
    }
    
    if (panState) {
        // Commit pan
        setData(prev => ({ ...prev, view: panState }));
        setPanState(null);
    }
  };

  const handleNodeMouseDown = (e, id) => {
      e.stopPropagation();
      
      if (mode === 'connect') {
          if (!addingConnectionFrom) {
              setAddingConnectionFrom(id);
          } else {
              if (addingConnectionFrom !== id) {
                  const newConn = { id: 'conn_' + Date.now(), from: addingConnectionFrom, to: id };
                  updateBoard({ connections: [...connections, newConn] });
                  setAddingConnectionFrom(null);
                  setMode('select');
              } else {
                setAddingConnectionFrom(null);
              }
          }
          return;
      }

      if (['INPUT', 'TEXTAREA', 'BUTTON'].includes(e.target.tagName)) return;
      
      const el = currentBoard.elements.find(e => e.id === id);
      if (el) {
          setDragState({ id: el.id, x: el.x, y: el.y });
          setSelectedId(id);
          lastMousePos.current = { x: e.clientX, y: e.clientY };
          setAddingConnectionFrom(null);
      }
  };

  // Global listeners
  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove]);

  useEffect(() => {
    const handleKeyDown = (e) => {
        if ((e.key === 'Delete' || e.key === 'Backspace') && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
            deleteSelection();
        }
        if (e.key === 'Escape') {
            setMode('select');
            setAddingConnectionFrom(null);
            setSelectedId(null);
            // Cancel drag/pan
            setDragState(null);
            setPanState(null);
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deleteSelection]);

  // Calculate rendered elements only if we have data
  const renderedElements = currentBoard ? currentBoard.elements.map(el => {
      if (dragState && dragState.id === el.id) {
          return { ...el, x: dragState.x, y: dragState.y };
      }
      return el;
  }) : [];

  const getCenter = (el) => {
      if (!el) return { x: 0, y: 0 };
      const h = el.height || 150; 
      return { x: el.x + el.width / 2, y: el.y + h / 2 };
  };

  if (loading || !currentBoard) return <div className="flex h-full items-center justify-center bg-slate-900 text-white">Loading Moodboard...</div>;

  return (
    <div className={`w-full h-full overflow-hidden relative ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* Navigation / Header */}
      <div className="absolute top-4 left-4 z-50 flex items-center gap-3">
          {currentBoard.parentId && (
              <button 
                  onClick={() => navigateToBoard(currentBoard.parentId)}
                  className="p-2 bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-400"
                  title="Back to Parent Board"
              >
                  <ArrowLeft size={20} />
              </button>
          )}
          <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-4 py-2 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-center gap-3">
              <span className="font-bold bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">
                  {currentBoard.title}
              </span>
              {currentBoard.parentId && <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-500 uppercase font-bold tracking-wider">Sub-Board</span>}
          </div>
      </div>
      
      {/* View Controls */}
      <div className="absolute top-4 right-4 z-50 flex gap-2">
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-1 flex">
            <button 
                onClick={() => setData(prev => ({ ...prev, snapToGrid: !prev.snapToGrid }))} 
                className={clsx("p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition", data.snapToGrid && "text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20")}
                title="Snap to Grid"
            >
                <Magnet size={20} />
            </button>
            <div className="w-px bg-slate-200 dark:bg-slate-800 mx-1 my-1"></div>
            <button 
                onClick={() => setMode('connect')}
                className={clsx("p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition relative", mode === 'connect' && "text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20")}
                title="Connect Mode"
            >
                <Network size={20} />
                {mode === 'connect' && <span className="absolute top-1 right-1 w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />}
            </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50">
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-slate-700/50 p-2 rounded-2xl shadow-2xl flex gap-1 items-center px-3 scale-100 hover:scale-105 transition-transform duration-200">
            <ToolButton icon={FileText} label="Note" onClick={() => addElement('note')} />
            <ToolButton icon={CheckSquare} label="Todo" onClick={() => addElement('todo')} />
            <ToolButton icon={Layout} label="Board" onClick={() => addElement('board')} />
            <div className="w-px h-8 bg-slate-200 dark:bg-slate-700 mx-1"></div>
            <label className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer transition text-slate-600 dark:text-slate-400 hover:text-indigo-500 flex flex-col items-center gap-1 min-w-[60px] group">
                <Image size={24} className="group-hover:-translate-y-0.5 transition-transform" />
                <span className="text-[10px] font-bold">Image</span>
                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
            </label>
            <ToolButton icon={LinkIcon} label="Link" onClick={() => addElement('link')} />
        </div>
      </div>

      {/* Canvas */}
      <div 
        ref={containerRef}
        className={clsx("w-full h-full relative overflow-hidden", mode === 'pan' || panState ? "cursor-grab active:cursor-grabbing" : "cursor-default")}
        onMouseDown={handleMouseDown}
      >
        <div 
            id="infinite-canvas"
            className="absolute top-0 left-0 w-[50000px] h-[50000px] origin-top-left will-change-transform"
            style={{
                transform: `translate(${activeView.x}px, ${activeView.y}px)`,
                backgroundImage: `radial-gradient(${darkMode ? '#334155' : '#cbd5e1'} 1px, transparent 1px)`,
                backgroundSize: '40px 40px'
            }}
        >
            {/* Elements Layer */}
            {renderedElements.map(el => (
                <div
                    key={el.id}
                    id={el.id}
                    className={clsx(
                        "absolute rounded-2xl transition-all p-0 flex flex-col select-none group border",
                        "backdrop-blur-sm shadow-sm hover:shadow-lg", 
                        selectedId === el.id ? "ring-2 ring-indigo-500 z-30 shadow-2xl scale-[1.01]" : "z-20 hover:scale-[1.005]",
                        el.color,
                        el.type === 'note' ? 'border-yellow-200 dark:border-yellow-900/50' : 'border-slate-200 dark:border-slate-700'
                    )}
                    style={{
                        left: el.x,
                        top: el.y,
                        width: el.width,
                        minHeight: el.type === 'image' ? 'auto' : 120,
                        // Remove transition for position during drag to ensure instant response
                        transitionProperty: (dragState?.id === el.id) ? 'none' : 'all'
                    }}
                    onMouseDown={(e) => handleNodeMouseDown(e, el.id)}
                >
                    {/* Header Handle */}
                    <div className="flex justify-between items-center p-3 cursor-move opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 left-0 w-full">
                        <div className="bg-slate-800 text-white text-xs px-2 py-1 rounded-full shadow-lg">
                           {mode === 'connect' ? (addingConnectionFrom === el.id ? 'Connecting...' : 'Click to connect') : 'Drag to move'}
                        </div>
                        {mode !== 'connect' && (
                             <button onClick={() => deleteSelection()} className="bg-white dark:bg-slate-800 text-rose-500 p-1.5 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm hover:bg-rose-50">
                                <Trash2 size={14} />
                             </button>
                        )}
                    </div>
                    
                    {/* Card Content */}
                    <div className="p-4 flex flex-col h-full relative">
                         {/* Connection Node Indicator */}
                         {mode === 'connect' && (
                             <div className={clsx(
                                 "absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors z-50",
                                 addingConnectionFrom === el.id ? "bg-indigo-500 border-white" : "bg-white border-indigo-500"
                             )}>
                                 <Plus size={14} className={addingConnectionFrom === el.id ? "text-white" : "text-indigo-500"} />
                             </div>
                         )}

                         {/* Title Input */}
                        {el.type !== 'image' && (
                            <input 
                                className="bg-transparent font-bold text-lg mb-2 outline-none w-full text-slate-800 dark:text-slate-100 placeholder-slate-400/50"
                                value={el.title}
                                placeholder="Untitled"
                                onChange={(e) => updateElement(el.id, { title: e.target.value })}
                                onMouseDown={(e) => e.stopPropagation()}
                            />
                        )}

                        {/* Note Body */}
                        {el.type === 'note' && (
                            <textarea 
                                className="w-full bg-transparent outline-none resize-none text-base leading-relaxed text-slate-600 dark:text-slate-300 min-h-[100px]"
                                value={el.content || ''}
                                onChange={(e) => updateElement(el.id, { content: e.target.value })}
                                placeholder="Write something..."
                                onMouseDown={(e) => e.stopPropagation()}
                            />
                        )}
                        
                        {/* Todo Body */}
                        {el.type === 'todo' && (
                            <div className="space-y-2 mt-1">
                                {(el.items || []).map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-3 group/item">
                                        <div 
                                            className={clsx("w-5 h-5 rounded border cursor-pointer flex items-center justify-center transition-colors", item.done ? "bg-indigo-500 border-indigo-500" : "border-slate-300 dark:border-slate-600 hover:border-indigo-400")}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const newItems = [...el.items];
                                                newItems[idx].done = !newItems[idx].done;
                                                updateElement(el.id, { items: newItems });
                                            }}
                                        >
                                            {item.done && <CheckSquare size={14} className="text-white" />}
                                        </div>
                                        <input 
                                            className={clsx("flex-1 bg-transparent outline-none text-sm transition-opacity", item.done && "line-through opacity-50")}
                                            value={item.text}
                                            onChange={(e) => {
                                                const newItems = [...el.items];
                                                newItems[idx].text = e.target.value;
                                                updateElement(el.id, { items: newItems });
                                            }}
                                            onMouseDown={(e) => e.stopPropagation()}
                                            placeholder="To do..."
                                        />
                                        <button 
                                            onClick={() => updateElement(el.id, { items: el.items.filter((_, i) => i !== idx) })}
                                            className="opacity-0 group-hover/item:opacity-100 text-slate-400 hover:text-rose-500"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                ))}
                                <button 
                                    onClick={(e) => { e.stopPropagation(); updateElement(el.id, { items: [...(el.items || []), { text: '', done: false }] })}}
                                    className="text-xs text-indigo-500 hover:text-indigo-600 font-bold mt-2 flex items-center gap-1"
                                >
                                    <Plus size={12} /> Add Item
                                </button>
                            </div>
                        )}

                        {/* Image Body */}
                        {el.type === 'image' && (
                            <div className="rounded-lg overflow-hidden relative group/img">
                            <img src={el.src?.startsWith('http') ? el.src : `${API_URL}${el.src}`} alt={el.title} className="w-full h-auto pointer-events-none" />
                                <div className="absolute inset-x-0 bottom-0 bg-black/50 p-2 opacity-0 group-hover/img:opacity-100 transition-opacity">
                                    <input 
                                        className="bg-transparent text-white text-xs w-full outline-none text-center font-medium" 
                                        value={el.title} 
                                        onChange={(e) => updateElement(el.id, { title: e.target.value })}
                                        onMouseDown={e => e.stopPropagation()}
                                    />
                                </div>
                            </div>
                        )}
                        
                        {/* Link Body */}
                        {el.type === 'link' && (
                            <div className="flex flex-col gap-2 mt-1">
                                <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200 dark:border-slate-800 group/link transition-colors focus-within:ring-2 focus-within:ring-indigo-500/50">
                                    <div className="p-2.5 bg-indigo-100 dark:bg-indigo-500/20 rounded-lg text-indigo-500 dark:text-indigo-400 shrink-0">
                                        <Globe size={18} />
                                    </div>
                                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                                       <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Destination URL</div>
                                       <input 
                                            className="bg-transparent outline-none text-sm text-slate-700 dark:text-slate-200 font-medium placeholder-slate-400/50 w-full"
                                            value={el.url || ''}
                                            placeholder="example.com"
                                            onChange={(e) => updateElement(el.id, { url: e.target.value })}
                                            onMouseDown={(e) => e.stopPropagation()}
                                        />
                                    </div>
                                </div>
                                
                                {el.url && (
                                    <a 
                                      href={(() => {
                                          const url = el.url.trim();
                                          return url.startsWith('http') ? url : `https://${url}`;
                                      })()}
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="flex items-center justify-center gap-2 w-full p-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold rounded-lg transition-all shadow-sm group-hover/link:shadow-md"
                                    >
                                        <span>Visit Website</span>
                                        <ExternalLink size={12} />
                                    </a>
                                )}
                            </div>
                        )}

                        {/* Board Link Body */}
                        {el.type === 'board' && (
                            <div className="flex flex-col items-center justify-center h-full p-4 gap-3 bg-indigo-50 dark:bg-indigo-900/10 rounded-xl border border-indigo-100 dark:border-indigo-800/50">
                                <Layout size={32} className="text-indigo-500" />
                                <div className="text-center">
                                    <div className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">Sub-Board</div>
                                    <div className="font-bold text-slate-700 dark:text-slate-200">{el.title}</div>
                                </div>
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigateToBoard(el.boardId);
                                    }}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all active:scale-95 flex items-center gap-2"
                                >
                                    Open Board <ArrowRightIcon size={12} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            ))}
            
            {/* SVG Layer for Connections */}
            <svg className="absolute top-0 left-0 w-full h-full pointer-events-none z-10 overflow-visible">
                <defs>
                    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                        <polygon points="0 0, 10 3.5, 0 7" fill={darkMode ? "#64748b" : "#94a3b8"} />
                    </marker>
                </defs>
                
                {/* Existing Connections */}
                {connections.map(conn => {
                    // Find node from renderedElements so lines follow drag instantly
                    const fromEl = renderedElements.find(e => e.id === conn.from);
                    const toEl = renderedElements.find(e => e.id === conn.to);
                    if (!fromEl || !toEl) return null;

                    const start = getCenter(fromEl);
                    const end = getCenter(toEl);

                    return (
                        <path 
                            key={conn.id}
                            d={`M ${start.x} ${start.y} Q ${(start.x + end.x)/2} ${(start.y + end.y)/2 + 50}, ${end.x} ${end.y}`}
                            stroke={darkMode ? "#64748b" : "#cbd5e1"}
                            strokeWidth="2"
                            fill="none"
                            markerEnd="url(#arrowhead)"
                        />
                    );
                })}

                {/* Drawing Line */}
                {mode === 'connect' && addingConnectionFrom && (
                    <path 
                        d={( () => {
                            const fromEl = renderedElements.find(e => e.id === addingConnectionFrom);
                            if(!fromEl) return '';
                            const start = getCenter(fromEl);
                            // mousePos is relative to view
                            const end = mousePos;
                            return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
                        })()}
                        stroke={darkMode ? "#818cf8" : "#6366f1"}
                        strokeWidth="2"
                        strokeDasharray="5,5"
                        fill="none"
                    />
                )}
            </svg>
        </div>
      </div>
    </div>
  );
}

const ToolButton = ({ icon: Icon, label, onClick }) => (
    <button onClick={onClick} className="flex flex-col items-center gap-1 p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all text-slate-600 dark:text-slate-400 hover:text-indigo-500 min-w-[60px] group">
        <Icon size={24} className="group-hover:-translate-y-0.5 transition-transform" />
        <span className="text-[10px] font-bold">{label}</span>
    </button>
);

const ArrowRightIcon = ({ size }) => <ArrowLeft size={size} className="rotate-180" />;
