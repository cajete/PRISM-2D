
import React from 'react';
import { Search, Key, BrainCircuit } from 'lucide-react';
import { usePrismStore } from '../store/prismStore';

const SidebarButton: React.FC<{
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
  label: string;
  colorClass?: string;
  isSidebarOpen: boolean;
}> = ({ icon, isActive, onClick, label, colorClass = 'text-cyan-400', isSidebarOpen }) => (
  <div className={`relative group transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
    <button
      onClick={onClick}
      className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-300 ${
        isActive 
          ? 'bg-slate-800 text-white shadow-lg ring-1 ring-white/10' 
          : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
      }`}
    >
      <div className={`transition-colors duration-300 ${isActive ? colorClass : ''}`}>
         {icon}
      </div>
    </button>
    <div className="absolute left-14 top-1/2 -translate-y-1/2 bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
      {label}
    </div>
    {isActive && (
      <div className={`absolute -right-1 top-1/2 -translate-y-1/2 w-1 h-1 rounded-full ${colorClass.replace('text-', 'bg-')}`} />
    )}
  </div>
);

const Sidebar: React.FC = () => {
  const { ui, toggleResearchPanel, toggleLegend, toggleSidebar, zoomLevel } = usePrismStore();
  const isOpen = ui.isSidebarOpen;

  return (
    <div 
      className={`fixed left-0 top-0 h-full w-16 flex flex-col items-center py-6 z-50 transition-all duration-500 ${
        isOpen 
          ? 'bg-white/50 backdrop-blur-md border-r border-slate-200 shadow-sm' 
          : 'bg-transparent border-none pointer-events-none'
      }`}
    >
      <div className="mb-8 pointer-events-auto">
        <button 
          onClick={toggleSidebar}
          className="hover:scale-105 transition-transform active:scale-95 focus:outline-none"
          title={isOpen ? "Collapse Menu" : "Expand Menu"}
        >
          <BrainCircuit className={`w-8 h-8 transition-colors duration-500 ${isOpen ? 'text-cyan-600' : 'text-slate-400'}`} />
        </button>
      </div>

      <div className={`flex flex-col items-center w-full h-full transition-all duration-300 ${isOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10 pointer-events-none'}`}>
        
        <div className="flex flex-col gap-4 w-full px-3">
          <SidebarButton
            icon={<Search className="w-5 h-5" />}
            isActive={ui.isResearchPanelOpen}
            onClick={toggleResearchPanel}
            label="Research Sequence"
            colorClass="text-cyan-400"
            isSidebarOpen={isOpen}
          />
        </div>

        <div className="flex-1" />

        <div className="flex flex-col gap-4 w-full px-3 mb-6">
          <SidebarButton
            icon={<Key className="w-5 h-5" />}
            isActive={ui.isLegendOpen}
            onClick={toggleLegend}
            label="Ontology Key"
            colorClass="text-rose-400"
            isSidebarOpen={isOpen}
          />
        </div>
        
        <div className="mb-8 flex flex-col items-center">
          <span className="text-[8px] font-bold text-slate-400 uppercase mb-1">ZOOM</span>
          <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 min-w-[32px] text-center">
             {zoomLevel.toFixed(1)}x
          </span>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
