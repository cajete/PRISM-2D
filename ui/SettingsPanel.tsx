
import React, { useEffect, useState } from 'react';
import { GlassPanel } from './shared/GlassPanel';
import { usePrismStore } from '../store/prismStore';
import { aiManager } from '../services/aiService';
import { Settings, Zap, Cpu, Server, AlertTriangle, Lock } from 'lucide-react';
import { AIModel } from '../types/prism';

const SettingsPanel: React.FC = () => {
  const { 
    aiSettings, 
    setAIAutoMode, 
    setAIProvider, 
    setAIModel, 
    providerStats,
    ui 
  } = usePrismStore();
  
  const isSettingsOpen = ui.isSettingsOpen;

  // Local state only for stats polling (which changes independently of selection)
  const [allStats, setAllStats] = useState(aiManager.getAllStats());
  
  // 1. POLLING EFFECT
  useEffect(() => {
    if (isSettingsOpen) {
      setAllStats(aiManager.getAllStats());
      const interval = setInterval(() => setAllStats(aiManager.getAllStats()), 2000);
      return () => clearInterval(interval);
    }
  }, [isSettingsOpen]);

  // 2. DERIVED STATE (Single Source of Truth)
  const currentProviderData = aiManager.getProviders().find(p => p.name === aiSettings.selectedProvider);
  const availableModels: AIModel[] = currentProviderData ? currentProviderData.models : [];

  // 3. PROVIDER CHANGE HANDLER
  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newProviderName = e.target.value;
    
    // Get new data based on selection
    const nextProviderData = aiManager.getProviders().find(p => p.name === newProviderName);
    const nextModels = nextProviderData ? nextProviderData.models : [];

    // Update Store: Provider
    setAIProvider(newProviderName);

    // Update Store: Model (Smart Auto-Select best available)
    if (nextModels.length > 0) {
      const sortedModels = [...nextModels].sort((a, b) => b.remainingTokens - a.remainingTokens);
      setAIModel(sortedModels[0].id);
    } else {
      setAIModel('');
    }
  };

  const isVisible = ui.isSidebarOpen && isSettingsOpen;

  // Safeguard display value
  const displayModelValue = availableModels.some(m => m.id === aiSettings.selectedModel)
    ? aiSettings.selectedModel
    : (availableModels[0]?.id || "");

  return (
    <GlassPanel isOpen={isVisible} positionClasses="bottom-20 left-20" widthClasses="w-[340px]">
      <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
        <Settings className="w-5 h-5 text-slate-600" />
        <h2 className="text-sm font-bold uppercase tracking-widest text-slate-700">System Configuration</h2>
      </div>

      <div className="space-y-6">
        
        {/* AUTO MODE TOGGLE */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-500" /> Auto-Pilot Mode
            </span>
            <button 
              onClick={() => setAIAutoMode(!aiSettings.autoMode)}
              className={`relative w-9 h-5 rounded-full transition-colors duration-300 ${aiSettings.autoMode ? 'bg-cyan-500' : 'bg-slate-300'}`}
            >
              <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-300 ${aiSettings.autoMode ? 'translate-x-4' : 'translate-x-0'}`} />
            </button>
          </div>
          <p className="text-[10px] text-slate-400 leading-tight">
            {aiSettings.autoMode 
              ? "System prioritizes 'Thinking' models and rotates providers based on quota availability."
              : "Manual control active. System uses selected provider first."}
          </p>
        </div>

        {/* MANUAL OVERRIDE SECTION */}
        <div className={`relative transition-all duration-300 ${aiSettings.autoMode ? 'opacity-40 grayscale pointer-events-none' : 'opacity-100'}`}>
           
           {aiSettings.autoMode && (
             <div className="absolute inset-0 z-10 flex items-center justify-center">
               <div className="bg-slate-800/80 text-white text-[10px] font-bold px-3 py-1.5 rounded-full flex items-center gap-2 backdrop-blur-sm">
                 <Lock className="w-3 h-3" /> SYSTEM OVERRIDE LOCKED
               </div>
             </div>
           )}

           <h3 className="text-[10px] font-bold text-slate-400 uppercase mb-2">Manual Override</h3>
           
           <div className="space-y-3">
             {/* Provider Select */}
             <div>
               <label className="block text-[9px] text-slate-500 font-bold mb-1">PROVIDER ENGINE</label>
               <div className="relative">
                 <select 
                    value={aiSettings.selectedProvider}
                    onChange={handleProviderChange}
                    className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-700 rounded-md py-1.5 pl-2 pr-6 outline-none focus:border-cyan-400 font-medium appearance-none cursor-pointer hover:bg-slate-50"
                 >
                   {aiManager.getProviders().map(p => {
                     const isExhausted = p.getStats().status === 'EXHAUSTED';
                     return (
                       <option key={p.name} value={p.name} disabled={isExhausted}>
                         {p.name} {isExhausted ? '(Exhausted)' : ''}
                       </option>
                     );
                   })}
                 </select>
                 <Server className="absolute right-2 top-2 w-3 h-3 text-slate-400 pointer-events-none" />
               </div>
             </div>

             {/* Model Select */}
             <div>
               <label className="block text-[9px] text-slate-500 font-bold mb-1">MODEL ARCHITECTURE</label>
               <div className="relative">
                 <select 
                    value={displayModelValue}
                    onChange={(e) => setAIModel(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-700 rounded-md py-1.5 pl-2 pr-6 outline-none focus:border-cyan-400 font-medium appearance-none cursor-pointer hover:bg-slate-50"
                 >
                   {availableModels.map(m => {
                     const isExhausted = m.remainingTokens <= 0;
                     return (
                       <option key={m.id} value={m.id} disabled={isExhausted} className={isExhausted ? 'text-slate-300' : ''}>
                          {m.name} {m.type === 'heavy' ? '(Reasoning)' : ''} {isExhausted ? '- 0 TKN' : ''}
                       </option>
                     );
                   })}
                 </select>
                 <Cpu className="absolute right-2 top-2 w-3 h-3 text-slate-400 pointer-events-none" />
               </div>
             </div>
           </div>
        </div>

        {/* LIVE STATS - GRANULAR */}
        <div className="pt-3 border-t border-slate-100 max-h-[200px] overflow-y-auto custom-scrollbar pr-1">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase mb-3">Live Token Budget</h3>
          
          <div className="space-y-4">
            {allStats.map(provider => (
              <div key={provider.name} className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-bold text-slate-700 uppercase">{provider.name}</span>
                  {provider.status === 'EXHAUSTED' && <span className="text-[8px] text-rose-500 font-bold px-1 bg-rose-50 rounded">OFFLINE</span>}
                </div>
                
                {provider.models.map(model => {
                  const percent = (model.remainingTokens / model.maxTokens) * 100;
                  const isLow = percent < 20;
                  const isEmpty = model.remainingTokens <= 0;
                  
                  // Color Logic
                  let barColor = 'bg-emerald-400';
                  if (isLow) barColor = 'bg-amber-400';
                  if (isEmpty) barColor = 'bg-rose-400';

                  const isActive = provider.name === aiSettings.selectedProvider && model.id === aiSettings.selectedModel;

                  return (
                    <div key={model.id} className="bg-slate-50 rounded border border-slate-100 p-1.5">
                      <div className="flex justify-between items-center text-[9px] mb-1">
                        <span className={`font-semibold flex items-center gap-1 ${isActive ? 'text-cyan-600' : 'text-slate-500'}`}>
                          {model.name}
                          {isLow && !isEmpty && <AlertTriangle className="w-2.5 h-2.5 text-amber-500" />}
                        </span>
                        <span className="font-mono text-slate-400">
                           {Math.floor(model.remainingTokens / 1000)}k <span className="text-slate-300">/ {Math.floor(model.maxTokens / 1000)}k</span>
                        </span>
                      </div>
                      <div className="h-1 w-full bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-500 ${barColor}`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

      </div>
    </GlassPanel>
  );
};

export default SettingsPanel;
