
import React, { useState } from 'react';
import { usePrismStore } from '../store/prismStore';
import { GROUP_COLORS } from '../constants';
import { X, Hash, MapPin, Activity, Maximize2, Minimize2, HelpCircle, Tag, Cpu, Database, Calendar } from 'lucide-react';
import { GlassPanel } from './shared/GlassPanel';

const DetailPanel: React.FC = () => {
  const { selectedNode, selectNode, ui } = usePrismStore();
  const [isExpanded, setIsExpanded] = useState(false);

  if (!selectedNode) return null;

  // IMPORTANT: Ensure the panel hides if the sidebar closes
  const isVisible = ui.isSidebarOpen;
  if (!isVisible) return null;

  const color = GROUP_COLORS[selectedNode.groupLabel] || GROUP_COLORS.default;

  // Fallback for nodes that might still lack metadata in transient states
  const provenance = selectedNode.researchMetadata || {
    provider: 'System Core',
    model: 'Pre-loaded',
    timestamp: Date.now()
  };

  return (
    <GlassPanel 
      isOpen={isVisible} 
      positionClasses="top-4 right-4" 
      widthClasses={isExpanded ? 'w-[800px]' : 'w-96'}
      className="h-[calc(100vh-2rem)] flex flex-col transition-all duration-300 !p-0 overflow-hidden"
    >
       {/* Header */}
       <div className="relative p-6 pb-4 border-b border-slate-100 bg-white/50">
        <div 
          className="absolute inset-x-0 top-0 h-1" 
          style={{ backgroundColor: color }}
        />
        
        <div className="absolute top-4 right-4 flex gap-2">
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-slate-400 hover:text-slate-900 transition-colors bg-white/80 rounded-full hover:bg-white"
            title={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button 
            onClick={() => selectNode(null)}
            className="p-1 text-slate-400 hover:text-slate-900 transition-colors bg-white/80 rounded-full hover:bg-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <span 
            className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest text-white shadow-sm"
            style={{ backgroundColor: color }}
          >
            {selectedNode.groupLabel}
          </span>
        </div>
        
        <h2 className="text-3xl font-bold text-slate-900 mb-1 leading-tight">{selectedNode.label}</h2>
        <p className="text-slate-500 text-sm font-medium flex items-center gap-2">
           <Hash className="w-3 h-3" /> {selectedNode.type}
        </p>
      </div>

      <div className="p-6 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
        {/* Metrics */}
        <div className="bg-slate-50/80 rounded-lg p-4 border border-slate-200">
           <div className="flex justify-between items-center mb-2">
             <div className="group relative flex items-center gap-2 cursor-help">
               <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                 <Activity className="w-3 h-3" /> Resonance
               </span>
               <HelpCircle className="w-3 h-3 text-slate-400" />
               <div className="absolute bottom-6 left-0 w-48 bg-slate-800 text-white text-[10px] p-2 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 leading-relaxed font-light">
                 A computed metric (1-10) representing the entity's structural centrality and semantic weight.
               </div>
             </div>
             <span className="text-cyan-600 font-mono text-xs">{selectedNode.metrics.significance}/10</span>
           </div>
           <div className="flex gap-1 h-2">
             {Array.from({ length: 10 }).map((_, i) => (
               <div 
                  key={i} 
                  className={`flex-1 rounded-full transition-all duration-500 ${i < selectedNode.metrics.significance ? 'bg-cyan-500' : 'bg-slate-300'}`}
               />
             ))}
           </div>
        </div>

        {/* Tags */}
        {selectedNode.tags && selectedNode.tags.length > 0 && (
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-100 pb-2 flex items-center gap-2">
              <Tag className="w-3 h-3" /> Tags
            </h3>
            <div className="flex flex-wrap gap-2">
              {selectedNode.tags.map((tag, idx) => (
                <span key={idx} className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] rounded border border-slate-200 font-mono">
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Content */}
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-100 pb-2">Analysis Protocol</h3>
          <p className="text-slate-700 text-sm leading-7 font-light">{selectedNode.summary}</p>
        </div>
        
        {/* Research Provenance - ALWAYS VISIBLE */}
        <div className="mt-6 pt-4 border-t border-slate-200">
           <div className="flex items-center gap-2 mb-3 text-slate-500">
              <Cpu className="w-3 h-3" />
              <h3 className="text-[10px] font-bold uppercase tracking-widest">Research Provenance</h3>
           </div>
           
           <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm grid grid-cols-2 gap-4">
              <div>
                 <div className="text-[9px] text-slate-400 uppercase font-bold mb-1 flex items-center gap-1">
                    <Database className="w-2.5 h-2.5" /> Provider
                 </div>
                 <div className="text-xs font-bold text-slate-800 bg-slate-50 px-2 py-1 rounded border border-slate-100 inline-block">
                    {provenance.provider}
                 </div>
              </div>
              
              <div>
                 <div className="text-[9px] text-slate-400 uppercase font-bold mb-1 flex items-center gap-1">
                    <Cpu className="w-2.5 h-2.5" /> Architecture
                 </div>
                 <div className="text-xs font-mono text-slate-600 truncate" title={provenance.model}>
                    {provenance.model}
                 </div>
              </div>

              <div className="col-span-2 pt-2 border-t border-slate-50">
                 <div className="flex justify-between items-center">
                    <span className="text-[9px] text-slate-400 flex items-center gap-1">
                       <Calendar className="w-2.5 h-2.5" /> Timestamp
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                       {new Date(provenance.timestamp).toLocaleString()}
                    </span>
                 </div>
              </div>
           </div>
        </div>

        {/* Metadata */}
        <div className="pt-2">
           <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-100 pb-2">Coordinates</h3>
           <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50 p-2 rounded flex items-center justify-between border border-slate-200">
                <span className="text-slate-500">ID</span>
                <span className="text-slate-700 font-mono truncate max-w-[100px]">{selectedNode.id}</span>
              </div>
              <div className="bg-slate-50 p-2 rounded flex items-center justify-between border border-slate-200">
                <span className="text-slate-500">LOC</span>
                <span className="text-slate-700 font-mono flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {Math.round(selectedNode.x || 0)}, {Math.round(selectedNode.y || 0)}
                </span>
              </div>
           </div>
        </div>

      </div>
    </GlassPanel>
  );
};

export default DetailPanel;
