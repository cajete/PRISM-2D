
import React, { useEffect, useState } from 'react';
import { GlassPanel } from './shared/GlassPanel';
import { usePrismStore } from '../store/prismStore';
import { aiManager } from '../services/aiService';
import { Settings, Zap, Cpu, Server } from 'lucide-react';
import { AIModel } from '../types/prism';

const SettingsPanel: React.FC = () => {
  const { 
    isSettingsOpen, 
    aiSettings, 
    setAIAutoMode, 
    setAIProvider, 
    setAIModel, 
    providerStats,
    ui 
  } = usePrismStore();
  
  // Local state for stats polling
  const [allStats, setAllStats] = useState(aiManager.getAllStats());
  
  // Local state for the model dropdown list
  // initialized with empty array, populated via useEffect or handler
  const [availableModels, setAvailableModels] = useState<AIModel[]>([]);

  // 1. INITIALIZATION & SYNC
  // When the panel opens or the provider changes externally (e.g. reset), sync the list.
  useEffect(() => {
    if (isSettingsOpen) {
      // Update Token Stats
      setAllStats(aiManager.getAllStats());
      const interval = setInterval(() => setAllStats(aiManager.getAllStats()), 2000);

      // Initialize Model List based on current Store Provider
      const currentProvider = aiManager.getProviders().find(p => p.name === aiSettings.selectedProvider);
      if (currentProvider) {
        setAvailableModels(currentProvider.models);
      }

      return () => clearInterval(interval);
    }
  }, [isSettingsOpen, aiSettings.selectedProvider]);

  // 2. ROBUST PROVIDER CHANGE HANDLER
  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newProviderName = e.target.value;
    
    // Step A: Find the data for the new provider
    const newProviderData = aiManager.getProviders().find(p => p.name === newProviderName);
    const newModelList = newProviderData ? newProviderData.models : [];

    // Step B: Update Local State (The Dropdown List)
    // We do this explicitly to force a re-render of the options
    setAvailableModels(newModelList);

    // Step C: Update Global Store (The Provider Selection)
    setAIProvider(newProviderName);

    // Step D: Reset Model Selection
    // Always default to the first available model of the new provider to avoid invalid states
    if (newModelList.length > 0) {
      setAIModel(newModelList[0].id);
    } else {
      setAIModel('');
    }
  };

  const isVisible = ui.isSidebarOpen && isSettingsOpen;

  // VISUAL SAFEGUARD:
  // Calculate the value to display. If the store's selectedModel isn't in the available list 
  // (which happens for a split second during switch), fall back to the first available model.
  const displayModelValue = availableModels.some(m => m.id === aiSettings.selectedModel)
    ? aiSettings.selectedModel
    : (availableModels[0]?.id || "");

  return (
    <GlassPanel isOpen={isVisible} positionClasses="bottom-20 left-20" widthClasses="w-[320px]">
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
        <div className={`transition-opacity duration-300 ${aiSettings.autoMode ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
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
                   {aiManager.getProviders().map(p => (
                     <option key={p.name} value={p.name}>{p.name}</option>
                   ))}
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
                   {availableModels.map(m => (
                     <option key={m.id} value={m.id}>
                        {m.name} {m.type === 'heavy' ? '(Heavy)' : ''}
                     </option>
                   ))}
                 </select>
                 <Cpu className="absolute right-2 top-2 w-3 h-3 text-slate-400 pointer-events-none" />
               </div>
             </div>
           </div>
        </div>

        {/* LIVE STATS */}
        <div className="pt-2 border-t border-slate-100">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase mb-3">Live Token Budget</h3>
          <div className="space-y-2">
            {allStats.map(stat => {
              const percent = (stat.remainingTokens / stat.maxTokens) * 100;
              const isExhausted = stat.remainingTokens <= 0;
              return (
                <div key={stat.name} className="group">
                  <div className="flex justify-between text-[9px] mb-0.5">
                    <span className={`font-bold ${providerStats?.name === stat.name ? 'text-cyan-600' : 'text-slate-600'}`}>
                      {stat.name}
                      {providerStats?.name === stat.name && <span className="ml-1 text-[8px] text-cyan-500">(ACTIVE)</span>}
                    </span>
                    <span className="font-mono text-slate-400">{Math.floor(stat.remainingTokens / 1000)}k / {Math.floor(stat.maxTokens / 1000)}k</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${isExhausted ? 'bg-rose-400' : 'bg-emerald-400'}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </GlassPanel>
  );
};

export default SettingsPanel;
