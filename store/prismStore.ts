
import { create } from 'zustand';
import { ResearchNode, OptimizedConnection, AppStatus, AIProviderStats, AISettings } from '../types/prism';
import { INITIAL_NODES, INITIAL_LINKS } from '../data/mockData';
import { db } from '../db';
import { consolidateGraphData } from '../utils/graphUtils';

// -----------------------------------------------------------------------------
// STATE SLICES
// Separation of Concerns: Data vs. UI vs. AI
// -----------------------------------------------------------------------------

interface DataSlice {
  nodes: ResearchNode[];
  links: OptimizedConnection[];
  
  // Interaction State
  selectedNode: ResearchNode | null;
  hoveredNode: ResearchNode | null;
  
  // Operational State
  status: AppStatus;
  narrativeMode: boolean; // Camera follows a sequence
  
  // Actions
  setGraphData: (nodes: ResearchNode[], links: OptimizedConnection[]) => void;
  addGraphData: (nodes: ResearchNode[], links: OptimizedConnection[]) => void;
  selectNode: (node: ResearchNode | null) => void;
  setHoveredNode: (node: ResearchNode | null) => void;
  setStatus: (status: AppStatus) => void;
  toggleNarrativeMode: () => void;
  
  // Persistence
  loadFromDb: () => Promise<void>;
  saveToDb: () => Promise<void>;
}

interface UISlice {
  ui: {
    isSidebarOpen: boolean;
    isResearchPanelOpen: boolean;
    isLegendOpen: boolean;
    isSettingsOpen: boolean;
    isCorrelationPanelOpen: boolean;
  };
  zoomLevel: number;
  
  // UI Actions
  setZoomLevel: (zoom: number) => void;
  toggleSidebar: () => void;
  toggleResearchPanel: () => void;
  toggleLegend: () => void;
  toggleSettings: () => void;
  toggleCorrelationPanel: () => void;
  closeAllPanels: () => void;
  resetCameraSignal: number; // Increment to trigger camera reset
  triggerCameraReset: () => void;
}

interface AISlice {
  aiSettings: AISettings;
  activeProvider: string;
  providerStats: AIProviderStats | null;
  
  // AI Actions
  updateAIStatus: (providerName: string, stats: AIProviderStats) => void;
  setAIAutoMode: (enabled: boolean) => void;
  setAIProvider: (provider: string) => void;
  setAIModel: (model: string) => void;
}

// -----------------------------------------------------------------------------
// STORE IMPLEMENTATION
// -----------------------------------------------------------------------------

export const usePrismStore = create<DataSlice & UISlice & AISlice>((set, get) => ({
  
  // --- DATA SLICE ---
  nodes: INITIAL_NODES,
  links: INITIAL_LINKS,
  selectedNode: null,
  hoveredNode: null,
  status: AppStatus.IDLE,
  narrativeMode: false,

  setGraphData: (nodes, links) => set({ nodes, links }),
  
  addGraphData: (newNodes, newLinks) => set((state) => {
    // Elegant merge strategy using the utility engine
    const result = consolidateGraphData(state.nodes, state.links, newNodes, newLinks);
    return { nodes: [...result.nodes], links: [...result.links] };
  }),

  selectNode: (node) => set({ selectedNode: node }),
  setHoveredNode: (node) => set({ hoveredNode: node }),
  setStatus: (status) => set({ status }),
  toggleNarrativeMode: () => set((state) => ({ narrativeMode: !state.narrativeMode })),

  loadFromDb: async () => {
    try {
      const nodes = await db.nodes.toArray();
      const links = await db.links.toArray();
      
      if (nodes.length > 0) {
        // Hydrate legacy nodes with default metadata if missing
        const hydratedNodes = nodes.map(n => ({
          ...n,
          researchMetadata: n.researchMetadata || {
            provider: 'System Core',
            model: 'Legacy/Local',
            timestamp: Date.now()
          }
        }));
        set({ nodes: hydratedNodes, links });
      }
    } catch (e) {
      console.error("[Store] DB Load Failed:", e);
    }
  },

  saveToDb: async () => {
    const { nodes, links } = get();
    try {
      await db.nodes.clear(); 
      await db.links.clear();
      await db.nodes.bulkPut(nodes); 
      // Cast links to satisfy Dexie indexing if needed
      await db.links.bulkPut(links as OptimizedConnection[]); 
    } catch (e) {
      console.error("[Store] DB Save Failed:", e);
    }
  },

  // --- UI SLICE ---
  ui: {
    isSidebarOpen: true,
    isResearchPanelOpen: true,
    isLegendOpen: true,
    isSettingsOpen: false,
    isCorrelationPanelOpen: false
  },
  zoomLevel: 1,
  resetCameraSignal: 0,

  setZoomLevel: (zoomLevel) => set({ zoomLevel }),
  toggleSidebar: () => set(state => ({ ui: { ...state.ui, isSidebarOpen: !state.ui.isSidebarOpen } })),
  toggleResearchPanel: () => set(state => ({ ui: { ...state.ui, isResearchPanelOpen: !state.ui.isResearchPanelOpen } })),
  toggleLegend: () => set(state => ({ ui: { ...state.ui, isLegendOpen: !state.ui.isLegendOpen } })),
  toggleSettings: () => set(state => ({ ui: { ...state.ui, isSettingsOpen: !state.ui.isSettingsOpen } })),
  toggleCorrelationPanel: () => set(state => ({ ui: { ...state.ui, isCorrelationPanelOpen: !state.ui.isCorrelationPanelOpen } })),
  
  closeAllPanels: () => set(state => ({ 
    ui: { 
      ...state.ui, 
      isResearchPanelOpen: false, 
      isLegendOpen: false, 
      isSettingsOpen: false, 
      isCorrelationPanelOpen: false 
    } 
  })),

  triggerCameraReset: () => set(state => ({ resetCameraSignal: state.resetCameraSignal + 1 })),

  // --- AI SLICE ---
  aiSettings: {
    autoMode: true,
    selectedProvider: 'Gemini',
    selectedModel: 'gemini-2.5-flash'
  },
  activeProvider: 'Gemini',
  providerStats: { 
    name: 'Gemini', 
    activeModel: 'gemini-2.5-flash', 
    totalRemaining: 150000, 
    totalMax: 150000, 
    status: 'ACTIVE',
    models: [
      { id: 'gemini-2.0-flash-thinking-exp-1219', name: 'Flash Thinking', type: 'heavy', remainingTokens: 50000, maxTokens: 50000 },
      { id: 'gemini-2.5-flash', name: 'Flash 2.5', type: 'standard', remainingTokens: 150000, maxTokens: 150000 }
    ]
  },

  updateAIStatus: (name, stats) => set({ activeProvider: name, providerStats: stats }),
  setAIAutoMode: (enabled) => set(state => ({ aiSettings: { ...state.aiSettings, autoMode: enabled } })),
  setAIProvider: (provider) => set(state => ({ aiSettings: { ...state.aiSettings, selectedProvider: provider } })),
  setAIModel: (model) => set(state => ({ aiSettings: { ...state.aiSettings, selectedModel: model } })),

}));
