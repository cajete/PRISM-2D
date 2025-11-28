
import React, { useEffect } from 'react';
import GraphCanvas from './components/graph/GraphCanvas';
import ResearchPanel from './ui/ResearchPanel';
import DetailPanel from './ui/DetailPanel';
import LegendPanel from './ui/LegendPanel';
import SettingsPanel from './ui/SettingsPanel';
import Sidebar from './ui/Sidebar';
import { usePrismStore } from './store/prismStore';
import { db } from './db';

const App: React.FC = () => {
  const { loadFromDb, saveToDb, aiSettings, activeProvider, providerStats } = usePrismStore();

  // Initialization Logic
  useEffect(() => {
    const init = async () => {
      await loadFromDb();
      try {
        const count = await db.nodes.count();
        if (count === 0) {
          console.log("[App] Database empty. Seeding initial dataset...");
          await saveToDb();
        }
      } catch (e) {
        console.error("[App] DB Init Error:", e);
      }
    };
    init();
  }, []); // Run once on mount

  return (
    <div className="relative w-screen h-screen bg-slate-50 overflow-hidden font-sans select-none">
      
      {/* LAYER 1: The Visualization Core */}
      <GraphCanvas />
      
      {/* LAYER 2: The Vignette (Visual Polish) */}
      <div className="fixed inset-0 pointer-events-none z-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(241,245,249,0.8)_120%)]"></div>

      {/* LAYER 3: The User Interface (Pointer-Events Logic enforced) */}
      <div className="pointer-events-none fixed inset-0 z-10">
        
        {/* All UI components must reactivate pointer-events manually */}
        <div className="pointer-events-auto">
          <Sidebar />
        </div>
        
        <div className="pointer-events-auto">
          <ResearchPanel />
        </div>
        
        <div className="pointer-events-auto">
          <DetailPanel />
        </div>
        
        <div className="pointer-events-auto">
          <LegendPanel />
        </div>
        
        <div className="pointer-events-auto">
          <SettingsPanel />
        </div>
        
      </div>
    </div>
  );
};

export default App;
