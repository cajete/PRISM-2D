import { create } from 'zustand';
import { ResearchNode, OptimizedConnection, AppStatus } from './types/prism';
import { INITIAL_NODES, INITIAL_LINKS } from './data/mockData';
import { db } from './db';

interface PrismState {
  nodes: ResearchNode[];
  links: OptimizedConnection[];
  selectedNode: ResearchNode | null;
  status: AppStatus;
  narrativeMode: boolean;
  
  // Actions
  setGraphData: (nodes: ResearchNode[], links: OptimizedConnection[]) => void;
  addGraphData: (nodes: ResearchNode[], links: OptimizedConnection[]) => void;
  selectNode: (node: ResearchNode | null) => void;
  setStatus: (status: AppStatus) => void;
  toggleNarrativeMode: () => void;
  loadFromDb: () => Promise<void>;
  saveToDb: () => Promise<void>;
}

export const usePrismStore = create<PrismState>((set, get) => ({
  nodes: INITIAL_NODES as ResearchNode[],
  links: INITIAL_LINKS as OptimizedConnection[],
  selectedNode: null,
  status: AppStatus.IDLE,
  narrativeMode: false,

  setGraphData: (nodes, links) => set({ nodes, links }),
  
  addGraphData: (newNodes, newLinks) => set((state) => {
    // Merge preventing duplicates by ID
    const existingIds = new Set(state.nodes.map(n => n.id));
    const uniqueNewNodes = newNodes.filter(n => !existingIds.has(n.id));
    
    return {
      nodes: [...state.nodes, ...uniqueNewNodes],
      links: [...state.links, ...newLinks]
    };
  }),

  selectNode: (node) => set({ selectedNode: node }),
  
  setStatus: (status) => set({ status }),
  
  toggleNarrativeMode: () => set((state) => ({ narrativeMode: !state.narrativeMode })),

  loadFromDb: async () => {
    try {
      const nodes = await db.nodes.toArray();
      const links = await db.links.toArray();
      if (nodes.length > 0) {
        set({ nodes, links });
      }
    } catch (e) {
      console.error("Failed to load from DB", e);
    }
  },

  saveToDb: async () => {
    const { nodes, links } = get();
    try {
      await db.nodes.clear();
      await db.links.clear();
      await db.nodes.bulkPut(nodes);
      await db.links.bulkPut(links);
      console.log("Saved to DB");
    } catch (e) {
      console.error("Failed to save to DB", e);
    }
  }
}));