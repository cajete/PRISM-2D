
export const NODE_REL_SIZE = 4; // Base multiplier for node size

// Futuristic Bright Palette (Clean Sci-Fi)
export const GROUP_COLORS: Record<string, string> = {
  'Person': '#2563eb', // Blue 600 (Vibrant)
  'Organization': '#7c3aed', // Violet 600
  'Event': '#e11d48', // Rose 600
  'Location': '#059669', // Emerald 600
  'Concept': '#d97706', // Amber 600
  'Technology': '#0891b2', // Cyan 600
  'default': '#64748b' // Slate 500
};

// Shape Mapping for Node Categories
export const GROUP_SHAPES: Record<string, string> = {
  'Person': 'circle',
  'Organization': 'square',
  'Event': 'diamond',
  'Location': 'triangle',
  'Concept': 'pentagon',
  'Technology': 'hexagon',
  'default': 'circle'
};

export const GRAPH_BACKGROUND = '#f8fafc'; // Slate 50 (Near White)
export const LINK_COLOR = '#cbd5e1'; // Slate 300 (Subtle structure)
