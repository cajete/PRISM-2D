
import React, { useState, useRef } from 'react';
import { usePrismStore } from '../store/prismStore';
import { generateGraphFromTopic } from '../services/geminiService';
import { AppStatus } from '../types/prism';
import { Search, BrainCircuit, AlertCircle, Loader2, MousePointer2 } from 'lucide-react';
import { GROUP_COLORS } from '../constants';

const ControlPanel: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [progress, setProgress] = useState(0);
  const [loadingStage, setLoadingStage] = useState('');
  
  const { status, setStatus, addGraphData, saveToDb, nodes, links, hoveredNode, ui } = usePrismStore();
  const progressTimer = useRef<number | null>(null);

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    
    setStatus(AppStatus.GENERATING);
    setProgress(5);
    setLoadingStage("Initializing Neural Handshake...");
    
    // Clear any existing timer
    if (progressTimer.current) clearInterval(progressTimer.current);

    // Simulate progress while waiting for API
    progressTimer.current = window.setInterval(() => {
      setProgress((prev) => {
        if (prev >= 92) return 92; // Stall at 92% until response
        const jump = Math.random() * 8; // Random jump
        const next = prev + jump;

        // Semantic updates based on fake progress
        if (next > 15 && next < 30) setLoadingStage(`Analysing Context: "${topic.substring(0, 15)}..."`);
        if (next >= 30 && next < 50) setLoadingStage("Extracting Semantic Entities...");
        if (next >= 50 && next < 70) setLoadingStage("Triangulating Relationships...");
        if (next >= 70 && next < 85) setLoadingStage("Optimizing Vector Topology...");
        if (next >= 85) setLoadingStage("Finalizing Data Structure...");

        return next;
      });
    }, 400);

    try {
      const data = await generateGraphFromTopic(topic);
      
      // Success sequence
      if (progressTimer.current) clearInterval(progressTimer.current);
      setProgress(100);
      setLoadingStage("Integration Complete.");
      
      setTimeout(() => {
        addGraphData(data.nodes, data.links);
        saveToDb();
        
        // Reset after short delay
        setTimeout(() => {
          setStatus(AppStatus.IDLE);
          setProgress(0);
          setLoadingStage("");
        }, 800);
      }, 500);

    } catch (e) {
      if (progressTimer.current) clearInterval(progressTimer.current);
      console.error(e);
      setStatus(AppStatus.ERROR);
      setLoadingStage("Sequence Interrupted.");
      setTimeout(() => setStatus(AppStatus.IDLE), 3000);
    }
  };

  return (
    <div 
      className={`fixed top-4 left-20 z-10 w-80 p-5 bg-white/80 backdrop-blur-xl border border-slate-200 rounded-xl shadow-xl text-slate-800 ring-1 ring-black/5 transition-transform duration-500 cubic-bezier(0.16, 1, 0.3, 1) ${ui.isControlPanelOpen ? 'translate-x-0' : '-translate-x-[200%]'}`}
    >
      <div className="flex items-center gap-2 mb-6">
        <BrainCircuit className="w-6 h-6 text-cyan-600" />
        <h1 className="text-xl font-bold tracking-wider text-slate-900">P.R.I.S.M. <span className="text-xs text-cyan-600 font-normal">v2.0</span></h1>
      </div>
      
      <div className="mb-6">
        <label className="block text-[10px] uppercase text-slate-500 font-bold tracking-widest mb-2">Target Sequence</label>
        <div className="flex gap-2">
          <div className="relative flex-1">
             <input 
              type="text" 
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
              disabled={status === AppStatus.GENERATING}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-3 pr-2 py-2 text-sm text-slate-900 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all placeholder:text-slate-400"
              placeholder="Inject Topic..."
            />
          </div>
          <button 
            onClick={handleGenerate}
            disabled={status === AppStatus.GENERATING}
            className="bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-200 disabled:text-slate-400 text-white p-2 rounded-lg transition-all shadow-lg hover:shadow-cyan-500/20 active:scale-95"
          >
            {status === AppStatus.GENERATING ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
          </button>
        </div>
        
        {/* Dynamic Hover Status - Appears when hovering a node */}
        {hoveredNode && status === AppStatus.IDLE && (
          <div className="mt-2 flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
             <MousePointer2 className="w-3 h-3 text-slate-400" />
             <span className="text-xs font-semibold text-slate-600">
                Entity: <span style={{ color: GROUP_COLORS[hoveredNode.groupLabel] }}>{hoveredNode.label}</span>
             </span>
          </div>
        )}

        {/* Progress Bar Area */}
        {status === AppStatus.GENERATING && (
          <div className="mt-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex justify-between items-end mb-1">
              <span className="text-[10px] font-mono text-cyan-700 truncate max-w-[80%]">{loadingStage}</span>
              <span className="text-[10px] font-bold text-cyan-600">{Math.round(progress)}%</span>
            </div>
            <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)] transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {status === AppStatus.ERROR && (
          <div className="flex items-center gap-2 mt-2 text-red-500 text-xs">
            <AlertCircle className="w-3 h-3" />
            <span>Connection Failed. Retrying...</span>
          </div>
        )}
      </div>

      <div className="border-t border-slate-200 pt-4">
        <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono">
           <span>SYSTEM STATUS: <span className="text-emerald-600">ONLINE</span></span>
           <span>{nodes.length} N / {links.length} L</span>
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;
