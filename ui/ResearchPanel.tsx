import React, { useState, useRef, useEffect } from 'react';
import { usePrismStore } from '../store/prismStore';
import { generateGraphFromTopic, findCorrelation } from '../services/aiService';
import { AppStatus, ResearchNode } from '../types/prism';
import { Search, BrainCircuit, AlertCircle, Loader2, MousePointer2, Link2, ArrowRight, X, ChevronDown, Zap, Server } from 'lucide-react';
import { GROUP_COLORS } from '../constants';
import { GlassPanel } from './shared/GlassPanel';

// --- SUB-COMPONENT: Smart Autocomplete ---
interface NodeAutocompleteProps {
  label: string;
  selectedId: string;
  onChange: (id: string) => void;
  nodes: ResearchNode[];
  globalSelectedNode: ResearchNode | null;
}

const NodeAutocomplete: React.FC<NodeAutocompleteProps> = ({ 
  label, selectedId, onChange, nodes, globalSelectedNode 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedNode = nodes.find(n => n.id === selectedId);

  useEffect(() => {
    if (selectedNode) setQuery(selectedNode.label);
    else setQuery('');
  }, [selectedNode]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        if (selectedNode) setQuery(selectedNode.label);
        else setQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedNode]);

  const filteredNodes = nodes.filter(n => 
    n.label.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 50);

  const handleSelect = (id: string) => {
    onChange(id);
    setIsOpen(false);
  };

  const handleInject = () => {
    if (globalSelectedNode) {
      onChange(globalSelectedNode.id);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative mb-3" ref={containerRef}>
      <div className="flex justify-between items-center mb-1">
        <label className="text-[10px] text-slate-400 font-bold tracking-wider">{label}</label>
        {globalSelectedNode && globalSelectedNode.id !== selectedId && (
          <button 
            onClick={handleInject}
            className="flex items-center gap-1 text-[9px] text-cyan-600 hover:text-cyan-500 font-bold bg-cyan-50 px-1.5 py-0.5 rounded border border-cyan-100 transition-colors"
            title={`Use currently selected node: ${globalSelectedNode.label}`}
          >
            <MousePointer2 className="w-3 h-3" />
            <span>USE {globalSelectedNode.label.toUpperCase().slice(0, 10)}...</span>
          </button>
        )}
      </div>
      <div className="relative group">
        <div className="absolute left-3 top-2.5 text-slate-400">
           {selectedNode ? (
             <div className="w-2 h-2 rounded-full" style={{ backgroundColor: GROUP_COLORS[selectedNode.groupLabel] }} />
           ) : (
             <Search className="w-4 h-4" />
           )}
        </div>
        <input
          type="text"
          value={query}
          onFocus={() => { setIsOpen(true); setIsFocused(true); }}
          onChange={(e) => { setQuery(e.target.value); setIsOpen(true); if (selectedId) onChange(''); }}
          placeholder="Search entities..."
          className={`w-full bg-slate-50 border rounded-lg pl-9 pr-8 py-2 text-xs text-slate-800 outline-none transition-all ${
            isFocused ? 'border-cyan-400 ring-1 ring-cyan-400' : 'border-slate-200 hover:border-slate-300'
          }`}
        />
        {selectedId ? (
          <button onClick={() => { onChange(''); setQuery(''); setIsOpen(true); }} className="absolute right-2 top-2 text-slate-400 hover:text-rose-500">
            <X className="w-4 h-4" />
          </button>
        ) : (
          <ChevronDown className={`absolute right-2 top-2.5 w-4 h-4 text-slate-300 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        )}
        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-48 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-100">
            {filteredNodes.length > 0 ? (
              filteredNodes.map(node => (
                <button
                  key={node.id}
                  onClick={() => handleSelect(node.id)}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center gap-2 border-b border-slate-50 last:border-0"
                >
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: GROUP_COLORS[node.groupLabel] }} />
                  <span className="text-slate-700 truncate font-medium">{node.label}</span>
                  <span className="text-[9px] text-slate-400 ml-auto uppercase">{node.type}</span>
                </button>
              ))
            ) : (
              <div className="px-3 py-3 text-xs text-slate-400 italic text-center">No matching entities found.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// --- MAIN COMPONENT ---
const ResearchPanel: React.FC = () => {
  const { status, setStatus, addGraphData, saveToDb, nodes, links, hoveredNode, ui, selectedNode, activeProvider, providerStats } = usePrismStore();
  const [activeTab, setActiveTab] = useState<'target' | 'correlation'>('target');
  
  // Target Sequence State
  const [topic, setTopic] = useState('');
  
  // Correlation Sequence State
  const [sourceId, setSourceId] = useState('');
  const [targetId, setTargetId] = useState('');

  // Shared State
  const [progress, setProgress] = useState(0);
  const [loadingStage, setLoadingStage] = useState('');
  const progressTimer = useRef<number | null>(null);

  const isVisible = ui.isSidebarOpen && ui.isResearchPanelOpen;

  // --- HANDLERS ---
  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setStatus(AppStatus.GENERATING);
    setProgress(5);
    setLoadingStage("Initializing Neural Handshake...");
    
    if (progressTimer.current) clearInterval(progressTimer.current);
    progressTimer.current = window.setInterval(() => {
      setProgress((prev) => prev >= 92 ? 92 : prev + Math.random() * 8);
    }, 400);

    try {
      const data = await generateGraphFromTopic(topic);
      finishLoading("Integration Complete.", data);
    } catch (e) {
      handleError(e);
    }
  };

  const handleCorrelate = async () => {
    if (!sourceId || !targetId) return;
    const nodeA = nodes.find(n => n.id === sourceId);
    const nodeB = nodes.find(n => n.id === targetId);
    if (!nodeA || !nodeB) return;

    setStatus(AppStatus.GENERATING);
    setProgress(5);
    setLoadingStage(`Locking Targets: ${nodeA.label} <-> ${nodeB.label}`);
    
    if (progressTimer.current) clearInterval(progressTimer.current);
    progressTimer.current = window.setInterval(() => {
      setProgress((prev) => prev >= 90 ? 90 : prev + Math.random() * 5);
    }, 500);

    try {
      const data = await findCorrelation(nodeA, nodeB);
      finishLoading("Correlation Established.", data);
    } catch (e) {
      handleError(e);
    }
  };

  const finishLoading = (msg: string, data: any) => {
    if (progressTimer.current) clearInterval(progressTimer.current);
    setProgress(100);
    setLoadingStage(msg);
    setTimeout(() => {
      addGraphData(data.nodes, data.links);
      saveToDb();
      setTimeout(() => {
        setStatus(AppStatus.IDLE);
        setProgress(0);
        setLoadingStage("");
      }, 800);
    }, 500);
  };

  const handleError = (e: any) => {
    if (progressTimer.current) clearInterval(progressTimer.current);
    console.error(e);
    setStatus(AppStatus.ERROR);
    setLoadingStage("Process Failed.");
    setTimeout(() => setStatus(AppStatus.IDLE), 3000);
  };

  // Helper for provider color
  const getProviderColor = (name: string) => {
     if (name === 'Gemini') return 'text-cyan-600 bg-cyan-50 border-cyan-100';
     if (name === 'OpenAI') return 'text-emerald-600 bg-emerald-50 border-emerald-100';
     if (name === 'DeepSeek') return 'text-violet-600 bg-violet-50 border-violet-100';
     return 'text-slate-600 bg-slate-50 border-slate-100';
  };

  return (
    <GlassPanel isOpen={isVisible} positionClasses="top-4 left-20">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
           <BrainCircuit className="w-6 h-6 text-cyan-600" />
           <h1 className="text-xl font-bold tracking-wider text-slate-900">P.R.I.S.M. <span className="text-xs text-cyan-600 font-normal">v2.0</span></h1>
        </div>
        
        {/* AI Provider Status Pill */}
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md border text-[9px] font-bold ${getProviderColor(activeProvider)}`}>
           <Server className="w-3 h-3" />
           <span>{activeProvider.toUpperCase()}</span>
           {providerStats && (
             <span className="opacity-70 border-l border-current pl-1.5 ml-0.5">
               {Math.floor(providerStats.totalRemaining / 1000)}k TKN
             </span>
           )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-100 p-1 rounded-lg mb-5">
        <button 
          onClick={() => setActiveTab('target')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'target' ? 'bg-white text-cyan-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
        >
          TARGET DISCOVERY
        </button>
        <button 
          onClick={() => setActiveTab('correlation')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'correlation' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
        >
          ENTITY CORRELATION
        </button>
      </div>
      
      {/* Content Area */}
      <div className="min-h-[140px]">
        {activeTab === 'target' ? (
          <div className="animate-in fade-in slide-in-from-left-2 duration-300">
            <div className="flex gap-2 mb-2">
              <input 
                type="text" 
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                disabled={status === AppStatus.GENERATING}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-3 pr-2 py-2 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all placeholder:text-slate-400"
                placeholder="Inject Topic..."
              />
              <button 
                onClick={handleGenerate}
                disabled={status === AppStatus.GENERATING}
                className="bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-200 disabled:text-slate-400 text-white p-2 rounded-lg shadow-lg active:scale-95 transition-all"
              >
                {status === AppStatus.GENERATING ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
              </button>
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-right-2 duration-300">
             <NodeAutocomplete 
                label="SOURCE"
                selectedId={sourceId}
                onChange={setSourceId}
                nodes={nodes}
                globalSelectedNode={selectedNode}
             />
             <div className="flex justify-center -my-1 relative z-10"><div className="bg-slate-100 p-1 rounded-full"><ArrowRight className="w-3 h-3 text-slate-400 rotate-90" /></div></div>
             <NodeAutocomplete 
                label="TARGET"
                selectedId={targetId}
                onChange={setTargetId}
                nodes={nodes}
                globalSelectedNode={selectedNode}
             />
             <button 
               onClick={handleCorrelate}
               disabled={status === AppStatus.GENERATING || !sourceId || !targetId || sourceId === targetId}
               className="w-full mt-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-200 disabled:text-slate-400 text-white p-2 rounded-lg shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 text-xs font-bold"
             >
               {status === AppStatus.GENERATING ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
               RUN CORRELATION
             </button>
          </div>
        )}
      </div>

      {/* Shared Status / Progress Section */}
      <div className="mt-4 pt-4 border-t border-slate-200">
         <div className="flex items-center gap-2 h-4 mb-2">
            <MousePointer2 className={`w-3 h-3 ${hoveredNode ? 'text-cyan-500' : 'text-slate-300'}`} />
            <span className="text-xs font-semibold text-slate-600 truncate">
               Entity: {hoveredNode ? (
                 <span style={{ color: GROUP_COLORS[hoveredNode.groupLabel] }}>{hoveredNode.label}</span>
               ) : (
                 <span className="text-slate-400 italic">No Selection</span>
               )}
            </span>
         </div>

         {/* Failover / Switching Status */}
         {status === 'SWITCHING_PROVIDER' && (
            <div className="mb-2 flex items-center gap-2 text-[10px] text-amber-600 bg-amber-50 p-1.5 rounded border border-amber-200 animate-pulse">
               <Zap className="w-3 h-3" />
               <span>Provider limit reached. Rerouting neural pathways...</span>
            </div>
         )}

         {status === AppStatus.GENERATING && (
           <div className="animate-in fade-in slide-in-from-top-2 duration-300">
             <div className="flex justify-between items-end mb-1">
               <span className="text-[10px] font-mono text-cyan-700 truncate max-w-[80%]">{loadingStage}</span>
               <span className="text-[10px] font-bold text-cyan-600">{Math.round(progress)}%</span>
             </div>
             <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
               <div 
                 className={`h-full shadow-[0_0_10px_rgba(6,182,212,0.5)] transition-all duration-300 ease-out ${activeTab === 'target' ? 'bg-cyan-500' : 'bg-indigo-500'}`}
                 style={{ width: `${progress}%` }}
               />
             </div>
           </div>
         )}

         <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono mt-3">
            <span>SYSTEM STATUS: <span className="text-emerald-600">ONLINE</span></span>
            <span>{nodes.length} N / {links.length} L</span>
         </div>
      </div>
    </GlassPanel>
  );
};

export default ResearchPanel;