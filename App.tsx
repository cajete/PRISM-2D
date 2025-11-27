
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

  useEffect(() => {
    const init = async () => {
      // 1. Try to load from local Dexie DB
      await loadFromDb();
      
      // 2. Check if the DB was empty. If so, the Store is using INITIAL_NODES from mockData.ts
      try {
        const count = await db.nodes.count();
        if (count === 0) {
          console.log("Database empty. Persisting initial dataset...");
          await saveToDb();
        }
      } catch (e) {
        console.error("Error initializing DB:", e);
      }
    };

    init();
  }, [loadFromDb, saveToDb]);

  // Debug: Track Provider Changes
  useEffect(() => {
    console.log('[App System] Active Provider:', activeProvider);
    console.log('[App System] Settings Preference:', aiSettings.selectedProvider);
    console.log('[App System] Stats:', providerStats);
  }, [activeProvider, aiSettings.selectedProvider, providerStats]);

  return (
    <div className="relative w-screen h-screen bg-slate-50 overflow-hidden font-sans select-none">
      <GraphCanvas />
      
      {/* Overlay UI Layer */}
      <div className="pointer-events-none fixed inset-0 z-10">
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
      
      {/* Light Vignette Effect */}
      <div className="fixed inset-0 pointer-events-none z-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(241,245,249,0.8)_120%)]"></div>
    </div>
  );
};

export default App;
