
// -----------------------------------------------------------------------------
// P.R.I.S.M. TYPE DEFINITIONS
// Authority: Absolute.
// -----------------------------------------------------------------------------

/**
 * CORE ENTITY: ResearchNode
 * Represents a single point of knowledge in the graph.
 */
export interface ResearchNode {
  id: string; // Unique Identifier (Snake Case enforced: 'berlin_wall')
  label: string; // Human-readable display name
  type: string; // Classification (e.g., 'Event', 'Person')
  summary: string; // AI-generated context
  
  // Taxonomy & Metadata
  groupLabel: string; // Determines visual category (Color/Shape)
  tags?: string[]; // Semantic tags for clustering
  aliases?: string[]; // For fuzzy matching and deduplication
  
  // Provenance (The "Paper Trail")
  researchMetadata?: {
    provider: string; // e.g., 'Gemini', 'OpenAI'
    model: string; // e.g., 'gemini-2.5-flash'
    timestamp: number; // EPOCH
  };
  
  // Visualization Metrics
  metrics: {
    significance: number; // 1-10 Scale. Determines radius and gravity.
  };

  // Coordinates (Managed by D3 Simulation)
  x?: number;
  y?: number;
}

/**
 * SIMULATION EXTENSION
 * Extends the core node with D3-specific physics properties.
 * These are transient and used only during rendering.
 */
export interface SimulationNode extends ResearchNode {
  x: number;
  y: number;
  vx?: number; // Velocity X
  vy?: number; // Velocity Y
  fx?: number | null; // Fixed X (for dragging)
  fy?: number | null; // Fixed Y (for dragging)
}

/**
 * CORE RELATIONSHIP: OptimizedConnection
 * Represents the vector between two nodes.
 */
export interface OptimizedConnection {
  source: string | ResearchNode; // ID during transit, Object Ref during render
  target: string | ResearchNode;
  relation: string; // Predicate (e.g., 'LEADER_OF')
  weight: number; // 0.0 - 1.0. Determines link thickness/strength.
}

/**
 * PAYLOAD: GraphData
 * The standard transfer object for Graph operations.
 */
export interface GraphData {
  nodes: ResearchNode[];
  links: OptimizedConnection[];
}

// -----------------------------------------------------------------------------
// APPLICATION STATE ENUMS
// -----------------------------------------------------------------------------

export enum AppStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  GENERATING = 'GENERATING', // AI is thinking
  SWITCHING_PROVIDER = 'SWITCHING_PROVIDER', // Fallback logic active
  ERROR = 'ERROR'
}

// -----------------------------------------------------------------------------
// AI ARCHITECTURE TYPES
// -----------------------------------------------------------------------------

export type AIModelType = 'standard' | 'heavy'; // 'Heavy' implies Reasoning capabilities

export interface AIModel {
  id: string;
  name: string;
  type: AIModelType;
  remainingTokens: number; // Simulation of quota/context window
  maxTokens: number;
}

export interface AIProviderStats {
  name: string;
  activeModel: string;
  totalRemaining: number;
  totalMax: number;
  models: AIModel[]; 
  status: 'ACTIVE' | 'EXHAUSTED' | 'RATE_LIMITED' | 'ERROR';
}

export interface AISettings {
  autoMode: boolean; // Smart routing enabled
  selectedProvider: string; // Manual override
  selectedModel: string; // Manual override
}

/**
 * INTERFACE: AIProvider
 * Contract for all AI Service implementations.
 */
export interface AIProvider {
  name: string;
  models: AIModel[];
  getStats: () => AIProviderStats;
  generateGraph: (prompt: string, modelId?: string) => Promise<GraphData>;
  resetCycle: () => void;
}
