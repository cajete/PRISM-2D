
import React, { useState, useRef, useEffect } from 'react';
import { usePrismStore } from '../store/prismStore';
import { findCorrelation } from '../services/geminiService';
import { AppStatus, ResearchNode } from '../types/prism';
import { Link2, AlertCircle, Loader2, ArrowRight, MousePointer2, X, Search, ChevronDown } from 'lucide-react';
import { GlassPanel } from './shared/GlassPanel';
import { GROUP_COLORS } from '../constants';

// --- SUB-COMPONENT: Smart Autocomplete Input ---
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

  // Sync query with selection
  useEffect(() => {
    if (selectedNode) {
      setQuery(selectedNode.label);
    } else {
      setQuery('');
    }
  }, [selectedNode]);

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        // Reset query if no valid selection was made
        if (selectedNode) setQuery(selectedNode.label);
        else setQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedNode]);

  // Filter logic
  const filteredNodes = nodes.filter(n => 
    n.label.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 50); // Limit results for performance

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
            isFocused ? 'border-indigo-400 ring-1 ring-indigo-400' : 'border-slate-200 hover:border-slate-300'
          }`}
        />

        {/* Clear Button */}
        {selectedId ? (
          <button 
            onClick={() => { onChange(''); setQuery(''); setIsOpen(true); }}
            className="absolute right-2 top-2 text-slate-400 hover:text-rose-500"
          >
            <X className="w-4 h-4" />
          </button>
        ) : (
          <ChevronDown className={`absolute right-2 top-2.5 w-4 h-4 text-slate-300 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        )}

        {/* Dropdown Results */}
        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-48 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-100">
            {filteredNodes.length > 0 ? (
              filteredNodes.map(node => (
                <button
                  key={node.id}
                  onClick={() => handleSelect(node.id)}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center gap-2 border-b border-slate-50 last:border-0"
                >
                  <span 
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0" 
                    style={{ backgroundColor: GROUP_COLORS[node.groupLabel] }} 
                  />
                  <span className="text-slate-700 truncate font-medium">{node.label}</span>
                  <span className="text-[9px] text-slate-400 ml-auto uppercase">{node.type}</span>
                </button>
              ))
            ) : (
              <div className="px-3 py-3 text-xs text-slate-400 italic text-center">
                No matching entities found.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};


// --- MAIN COMPONENT ---
const CorrelationPanel: React.FC = () => {
  const { nodes, addGraphData, saveToDb, status, setStatus, ui, selectedNode } = usePrismStore();
  const [sourceId, setSourceId] = useState<string>('');
  const [targetId, setTargetId] = useState<string>('');
  const [progress, setProgress] = useState(0);
  const [loadingStage, setLoadingStage] = useState('');
  
  const progressTimer = useRef<number | null>(null);

  // Panel Logic
  const isVisible = ui.isSidebarOpen && ui.isCorrelationPanelOpen;

  const handleCorrelate = async () => {
    if (!sourceId || !targetId || sourceId === targetId) return;
    
    const nodeA = nodes.find(n => n.id === sourceId);
    const nodeB = nodes.find(n => n.id === targetId);
    
    if (!nodeA || !nodeB) return;

    setStatus(AppStatus.GENERATING);
    setProgress(5);
    setLoadingStage(`Locking Targets: ${nodeA.label} <-> ${nodeB.label}`);
    
    if (progressTimer.current) clearInterval(progressTimer.current);

    progressTimer.current = window.setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return 90;
        const jump = Math.random() * 5;
        const next = prev + jump;
        
        if (next > 20 && next < 40) setLoadingStage("Tracing Historical Pathways...");
        if (next >= 40 && next < 60) setLoadingStage("Detecting Hidden Vectors...");
        if (next >= 60 && next < 80) setLoadingStage("Synthesizing Bridge Entities...");
        
        return next;
      });
    }, 500);

    try {
      const data = await findCorrelation(nodeA, nodeB);
      
      if (progressTimer.current) clearInterval(progressTimer.current);
      setProgress(100);
      setLoadingStage("Correlation Established.");
      
      setTimeout(() => {
        addGraphData(data.nodes, data.links);
        saveToDb();
        setTimeout(() => {
          setStatus(AppStatus.IDLE);
          setProgress(0);
          setLoadingStage("");
        }, 1000);
      }, 500);

    } catch (e) {
      if (progressTimer.current) clearInterval(progressTimer.current);
      console.error(e);
      setStatus(AppStatus.ERROR);
      setLoadingStage("Pathfinding Failed.");
      setTimeout(() => setStatus(AppStatus.IDLE), 3000);
    }
  };

  return (
    <GlassPanel isOpen={isVisible} positionClasses="top-64 left-20">
      <div className="flex items-center gap-2 mb-4 border-b border-indigo-100 pb-3">
        <Link2 className="w-5 h-5 text-indigo-500" />
        <div>
           <h2 className="text-sm font-bold uppercase tracking-widest text-slate-700">Correlation Sequence</h2>
           <p className="text-[9px] text-slate-400 leading-tight">Identify hidden vectors between two targets</p>
        </div>
      </div>

      <div className="space-y-1">
        
        {/* Source Selector */}
        <NodeAutocomplete 
          label="SOURCE ENTITY"
          selectedId={sourceId}
          onChange={setSourceId}
          nodes={nodes}
          globalSelectedNode={selectedNode}
        />

        {/* Direction Indicator */}
        <div className="flex justify-center py-1">
           <div className="bg-slate-100 p-1 rounded-full">
              <ArrowRight className="w-3 h-3 text-slate-400 rotate-90" />
           </div>
        </div>

        {/* Target Selector */}
        <NodeAutocomplete 
          label="TARGET ENTITY"
          selectedId={targetId}
          onChange={setTargetId}
          nodes={nodes}
          globalSelectedNode={selectedNode}
        />

        {/* Action Button */}
        <button 
          onClick={handleCorrelate}
          disabled={status === AppStatus.GENERATING || !sourceId || !targetId || sourceId === targetId}
          className="w-full mt-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-200 disabled:text-slate-400 text-white p-2.5 rounded-lg transition-all shadow-lg hover:shadow-indigo-500/20 active:scale-95 flex items-center justify-center gap-2 text-xs font-bold tracking-wide"
        >
          {status === AppStatus.GENERATING ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
          INITIATE CORRELATION
        </button>

        {/* Progress Feedback */}
        {status === AppStatus.GENERATING && (
          <div className="mt-4 animate-in fade-in slide-in-from-top-1 duration-300">
            <div className="flex justify-between items-end mb-1">
              <span className="text-[9px] font-mono text-indigo-700 truncate max-w-[80%]">{loadingStage}</span>
              <span className="text-[9px] font-bold text-indigo-600">{Math.round(progress)}%</span>
            </div>
            <div className="h-1 w-full bg-slate-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)] transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
        
        {status === AppStatus.ERROR && (
           <div className="mt-2 flex items-center gap-2 text-red-500 text-[10px] bg-red-50 p-2 rounded border border-red-100">
             <AlertCircle className="w-3 h-3" />
             <span>Analysis Failed. Try different nodes.</span>
           </div>
        )}

      </div>
    </GlassPanel>
  );
};

export default CorrelationPanel;
