
import { create } from 'zustand';
import { ResearchNode, OptimizedConnection, AppStatus, AIProviderStats } from '../types/prism';
import { INITIAL_NODES, INITIAL_LINKS } from '../data/mockData';
import { db } from '../db';
import { consolidateGraphData } from '../utils/graphUtils';

// --- SLICE INTERFACES ---

interface DataSlice {
  nodes: ResearchNode[];
  links: OptimizedConnection[];
  selectedNode: ResearchNode | null;
  hoveredNode: ResearchNode | null;
  status: AppStatus; // 'IDLE' | 'GENERATING' | 'SWITCHING_PROVIDER' | 'ERROR'
  narrativeMode: boolean;
  
  setGraphData: (nodes: ResearchNode[], links: OptimizedConnection[]) => void;
  addGraphData: (nodes: ResearchNode[], links: OptimizedConnection[]) => void;
  selectNode: (node: ResearchNode | null) => void;
  setHoveredNode: (node: ResearchNode | null) => void;
  toggleNarrativeMode: () => void;
  setStatus: (status: AppStatus | string) => void; // Allow string for flexible status updates
  getNodesByGroup: (group: string) => ResearchNode[];
  
  // Persistence
  loadFromDb: () => Promise<void>;
  saveToDb: () => Promise<void>;
}

interface UISlice {
  ui: {
    isSidebarOpen: boolean;
    isResearchPanelOpen: boolean;
    isLegendOpen: boolean;
    isControlPanelOpen: boolean;
    isCorrelationPanelOpen: boolean;
  };
  zoomLevel: number;
  isSettingsOpen: boolean;
  
  // AI Status
  activeProvider: string;
  providerStats: AIProviderStats | null;
  updateAIStatus: (providerName: string, stats: AIProviderStats) => void;

  setZoomLevel: (zoom: number) => void;
  toggleSidebar: () => void;
  toggleResearchPanel: () => void;
  toggleLegend: () => void;
  triggerCameraReset: number;
  closeAllPanels: () => void;
}

// --- STORE IMPLEMENTATION ---

export const usePrismStore = create<DataSlice & UISlice>((set, get) => ({
  // --- Data Slice ---
  nodes: INITIAL_NODES,
  links: INITIAL_LINKS,
  selectedNode: null,
  hoveredNode: null,
  status: AppStatus.IDLE,
  narrativeMode: false,

  setGraphData: (nodes, links) => set({ nodes, links }),

  addGraphData: (newNodes, newLinks) => set((state) => {
    const result = consolidateGraphData(state.nodes, state.links, newNodes, newLinks);
    if (result.mergedCount > 0) console.log(`[P.R.I.S.M.]: Consolidated ${result.mergedCount} entities.`);
    return { nodes: [...result.nodes], links: [...result.links] };
  }),

  selectNode: (node) => set({ selectedNode: node }),
  setHoveredNode: (node) => set({ hoveredNode: node }),
  toggleNarrativeMode: () => set((state) => ({ narrativeMode: !state.narrativeMode })),
  setStatus: (status) => set({ status: status as AppStatus }),
  getNodesByGroup: (group) => get().nodes.filter(n => n.groupLabel === group),

  loadFromDb: async () => {
    try {
      const nodes = await db.nodes.toArray();
      const links = await db.links.toArray();
      if (nodes.length > 0) set({ nodes, links });
    } catch (e) { console.error("DB Load Error", e); }
  },

  saveToDb: async () => {
    const { nodes, links } = get();
    try {
      const cleanNodes = nodes.map(n => ({
        id: n.id, label: n.label, type: n.type, summary: n.summary,
        groupLabel: n.groupLabel, metrics: n.metrics, tags: n.tags || [], aliases: n.aliases || [],
        x: n.x, y: n.y
      }));
      const cleanLinks = links.map(l => ({
        source: typeof l.source === 'object' ? (l.source as ResearchNode).id : l.source,
        target: typeof l.target === 'object' ? (l.target as ResearchNode).id : l.target,
        relation: l.relation, weight: l.weight
      }));
      await db.nodes.clear(); await db.links.clear();
      await db.nodes.bulkPut(cleanNodes); await db.links.bulkPut(cleanLinks as OptimizedConnection[]); 
    } catch (e) { console.error("DB Save Error", e); }
  },

  // --- UI Slice ---
  ui: {
    isSidebarOpen: true,
    isResearchPanelOpen: true,
    isLegendOpen: true,
    isControlPanelOpen: false,
    isCorrelationPanelOpen: false
  },
  zoomLevel: 1,
  isSettingsOpen: false,
  triggerCameraReset: 0,
  
  // AI Status
  activeProvider: 'Gemini',
  providerStats: { name: 'Gemini', model: 'gemini-2.5-flash', remainingTokens: 100000, maxTokens: 100000, status: 'ACTIVE' },
  updateAIStatus: (name, stats) => set({ activeProvider: name, providerStats: stats }),

  setZoomLevel: (zoomLevel) => set({ zoomLevel }),
  toggleSidebar: () => set((state) => ({ ui: { ...state.ui, isSidebarOpen: !state.ui.isSidebarOpen } })),
  toggleResearchPanel: () => set((state) => ({ ui: { ...state.ui, isResearchPanelOpen: !state.ui.isResearchPanelOpen } })),
  toggleLegend: () => set((state) => ({ ui: { ...state.ui, isLegendOpen: !state.ui.isLegendOpen } })),
  closeAllPanels: () => set((state) => ({ ui: { ...state.ui, isResearchPanelOpen: false, isLegendOpen: false } })),
}));
