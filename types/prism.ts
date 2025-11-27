
export interface ResearchNode {
  id: string; // Unique Snake Case ID
  label: string;
  type: string;
  summary: string;
  
  // 2D Visuals
  groupLabel: string; // MANDATORY: Used for Color (e.g. "Witnesses" = Blue)
  metrics: {
    significance: number; // 1-10: Used for Node Radius
  };

  // Coordinates (Calculated by Engine)
  x?: number;
  y?: number;
}

// Extends ResearchNode to include D3 internal simulation properties
// This prevents 'any' casting in the Graph component
export interface SimulationNode extends ResearchNode {
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface OptimizedConnection {
  source: string | ResearchNode; // ForceGraph converts string ID to object ref
  target: string | ResearchNode;
  relation: string;
  weight: number; // 0.1 - 1.0 (Link Thickness)
}

export interface GraphData {
  nodes: ResearchNode[];
  links: OptimizedConnection[];
}

export enum AppStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  GENERATING = 'GENERATING',
  ERROR = 'ERROR'
}
