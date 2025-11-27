import React from 'react';
import { usePrismStore } from '../store';
import { GROUP_COLORS } from '../constants';

const DetailPanel: React.FC = () => {
  const { selectedNode, selectNode } = usePrismStore();

  if (!selectedNode) return null;

  const color = GROUP_COLORS[selectedNode.groupLabel] || GROUP_COLORS.default;

  return (
    <div className="fixed top-4 right-4 z-10 w-80 bg-slate-900/90 backdrop-blur-md border-l-4 border-slate-700 rounded-r-lg shadow-2xl h-[calc(100vh-2rem)] overflow-y-auto custom-scrollbar" style={{ borderColor: color }}>
      
      <div className="p-6">
        <button 
          onClick={() => selectNode(null)}
          className="absolute top-2 right-2 text-slate-500 hover:text-white"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>

        <span 
          className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-white mb-2"
          style={{ backgroundColor: color }}
        >
          {selectedNode.groupLabel}
        </span>
        
        <h2 className="text-2xl font-bold text-white mb-1">{selectedNode.label}</h2>
        <p className="text-slate-400 text-sm italic mb-4">{selectedNode.type}</p>

        <div className="bg-slate-800/50 rounded p-3 mb-4 border border-slate-700">
           <div className="flex justify-between items-center mb-1">
             <span className="text-xs text-slate-400">Significance</span>
             <div className="flex gap-0.5">
               {Array.from({ length: 10 }).map((_, i) => (
                 <div 
                    key={i} 
                    className={`w-1.5 h-3 rounded-sm ${i < selectedNode.metrics.significance ? 'bg-cyan-400' : 'bg-slate-700'}`}
                 />
               ))}
             </div>
           </div>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide border-b border-slate-700 pb-1 mb-2">Analysis</h3>
            <p className="text-slate-300 text-sm leading-relaxed">{selectedNode.summary}</p>
          </div>
          
          <div className="pt-4">
             <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide border-b border-slate-700 pb-1 mb-2">Metadata</h3>
             <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
                <div>ID: <span className="text-slate-200 font-mono">{selectedNode.id}</span></div>
                <div>X: <span className="text-slate-200 font-mono">{Math.round(selectedNode.x || 0)}</span></div>
                <div>Y: <span className="text-slate-200 font-mono">{Math.round(selectedNode.y || 0)}</span></div>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default DetailPanel;
