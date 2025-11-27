
export interface ResearchNode {
  id: string; // Unique Snake Case ID
  label: string;
  type: string;
  summary: string;
  
  // Deduplication & Metadata
  tags?: string[];
  aliases?: string[];
  
  // 2D Visuals
  groupLabel: string;
  metrics: {
    significance: number;
  };

  // Coordinates
  x?: number;
  y?: number;
}

// Extends ResearchNode to include D3 internal simulation properties
export interface SimulationNode extends ResearchNode {
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface OptimizedConnection {
  source: string | ResearchNode;
  target: string | ResearchNode;
  relation: string;
  weight: number;
}

export interface GraphData {
  nodes: ResearchNode[];
  links: OptimizedConnection[];
}

export enum AppStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  GENERATING = 'GENERATING',
  SWITCHING_PROVIDER = 'SWITCHING_PROVIDER',
  ERROR = 'ERROR'
}

// --- AI SERVICE TYPES ---

export type AIModelType = 'standard' | 'heavy'; // Heavy = Reasoning/Thinking models

export interface AIModel {
  id: string;
  name: string;
  type: AIModelType;
  // Granular Token Tracking
  remainingTokens: number;
  maxTokens: number;
}

export interface AISettings {
  autoMode: boolean; // If true, smart rotation logic is used
  selectedProvider: string; // Name of manually selected provider
  selectedModel: string; // ID of manually selected model
}

export interface AIProviderStats {
  name: string;
  activeModel: string;
  // Aggregates
  totalRemaining: number;
  totalMax: number;
  // Granular
  models: AIModel[]; 
  status: 'ACTIVE' | 'EXHAUSTED' | 'RATE_LIMITED' | 'ERROR';
}

export interface AIProvider {
  name: string;
  models: AIModel[];
  getStats: () => AIProviderStats;
  generateGraph: (prompt: string, modelId?: string) => Promise<GraphData>;
  resetCycle: () => void;
}
