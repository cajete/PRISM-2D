
import { create } from 'zustand';
import { ResearchNode, OptimizedConnection, AppStatus, AIProviderStats, AISettings } from '../types/prism';
import { INITIAL_NODES, INITIAL_LINKS } from '../data/mockData';
import { db } from '../db';
import { consolidateGraphData } from '../utils/graphUtils';

interface DataSlice {
  nodes: ResearchNode[];
  links: OptimizedConnection[];
  selectedNode: ResearchNode | null;
  hoveredNode: ResearchNode | null;
  status: AppStatus;
  narrativeMode: boolean;
  
  setGraphData: (nodes: ResearchNode[], links: OptimizedConnection[]) => void;
  addGraphData: (nodes: ResearchNode[], links: OptimizedConnection[]) => void;
  selectNode: (node: ResearchNode | null) => void;
  setHoveredNode: (node: ResearchNode | null) => void;
  toggleNarrativeMode: () => void;
  setStatus: (status: AppStatus | string) => void;
  getNodesByGroup: (group: string) => ResearchNode[];
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
  
  // AI Settings & Status
  aiSettings: AISettings;
  activeProvider: string;
  providerStats: AIProviderStats | null;
  
  updateAIStatus: (providerName: string, stats: AIProviderStats) => void;
  setAIAutoMode: (enabled: boolean) => void;
  setAIProvider: (provider: string) => void;
  setAIModel: (model: string) => void;
  toggleSettings: () => void;

  setZoomLevel: (zoom: number) => void;
  toggleSidebar: () => void;
  toggleResearchPanel: () => void;
  toggleLegend: () => void;
  triggerCameraReset: number;
  closeAllPanels: () => void;
}

export const usePrismStore = create<DataSlice & UISlice>((set, get) => ({
  // Data Slice
  nodes: INITIAL_NODES,
  links: INITIAL_LINKS,
  selectedNode: null,
  hoveredNode: null,
  status: AppStatus.IDLE,
  narrativeMode: false,

  setGraphData: (nodes, links) => set({ nodes, links }),
  addGraphData: (newNodes, newLinks) => set((state) => {
    const result = consolidateGraphData(state.nodes, state.links, newNodes, newLinks);
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
      await db.nodes.clear(); await db.links.clear();
      await db.nodes.bulkPut(nodes); await db.links.bulkPut(links as OptimizedConnection[]); 
    } catch (e) { console.error("DB Save Error", e); }
  },

  // UI Slice
  ui: {
    isSidebarOpen: true,
    isResearchPanelOpen: true,
    isLegendOpen: true,
    isControlPanelOpen: false,
    isCorrelationPanelOpen: false
  },
  zoomLevel: 1,
  isSettingsOpen: false,

  // AI State
  aiSettings: {
    autoMode: true,
    selectedProvider: 'Gemini',
    selectedModel: 'gemini-2.5-flash'
  },
  activeProvider: 'Gemini',
  providerStats: { name: 'Gemini', activeModel: 'gemini-2.5-flash', remainingTokens: 150000, maxTokens: 150000, status: 'ACTIVE' },

  updateAIStatus: (name, stats) => set({ activeProvider: name, providerStats: stats }),
  setAIAutoMode: (enabled) => set(state => ({ aiSettings: { ...state.aiSettings, autoMode: enabled } })),
  setAIProvider: (provider) => set(state => ({ aiSettings: { ...state.aiSettings, selectedProvider: provider } })),
  setAIModel: (model) => set(state => ({ aiSettings: { ...state.aiSettings, selectedModel: model } })),
  
  toggleSettings: () => set(state => ({ isSettingsOpen: !state.isSettingsOpen })),

  setZoomLevel: (zoomLevel) => set({ zoomLevel }),
  toggleSidebar: () => set(state => ({ ui: { ...state.ui, isSidebarOpen: !state.ui.isSidebarOpen } })),
  toggleResearchPanel: () => set(state => ({ ui: { ...state.ui, isResearchPanelOpen: !state.ui.isResearchPanelOpen } })),
  toggleLegend: () => set(state => ({ ui: { ...state.ui, isLegendOpen: !state.ui.isLegendOpen } })),
  triggerCameraReset: 0,
  closeAllPanels: () => set(state => ({ ui: { ...state.ui, isResearchPanelOpen: false, isLegendOpen: false, isSettingsOpen: false } })),
}));
