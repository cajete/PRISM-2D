
import { ResearchNode, SimulationNode, OptimizedConnection } from '../types/prism';
import { GROUP_COLORS, GROUP_SHAPES, NODE_REL_SIZE, LINK_COLOR, GRAPH_BACKGROUND } from '../constants';

// Pure helper to draw shapes based on category
export const drawShape = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number, shape: string) => {
  ctx.beginPath();
  switch (shape) {
    case 'square': ctx.rect(x - r, y - r, r * 2, r * 2); break;
    case 'diamond': ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y); ctx.closePath(); break;
    case 'triangle': ctx.moveTo(x, y - r); ctx.lineTo(x + r, y + (r * 1.5) - r); ctx.lineTo(x - r, y + (r * 1.5) - r); ctx.closePath(); break;
    case 'pentagon':
      for (let i = 0; i < 5; i++) {
        const a = (i * 2 * Math.PI) / 5 - Math.PI / 2;
        ctx.lineTo(x + r * Math.cos(a), y + r * Math.sin(a));
      }
      ctx.closePath(); break;
    case 'hexagon':
      for (let i = 0; i < 6; i++) {
        const a = (i * 2 * Math.PI) / 6 - Math.PI / 2;
        ctx.lineTo(x + r * Math.cos(a), y + r * Math.sin(a));
      }
      ctx.closePath(); break;
    default: ctx.arc(x, y, r, 0, 2 * Math.PI);
  }
};

// Extracted Node Painting Logic
export const paintNode = (
  node: SimulationNode,
  ctx: CanvasRenderingContext2D,
  globalScale: number,
  selectedId: string | null | undefined,
  hoveredId: string | null | undefined
) => {
  const { groupLabel, metrics, label, x, y } = node;
  // Safety check for D3 initialization
  if (x === undefined || y === undefined) return;

  const isSelected = selectedId === node.id;
  const isHovered = hoveredId === node.id;

  const shape = GROUP_SHAPES[groupLabel] || 'circle';
  const color = GROUP_COLORS[groupLabel] || GROUP_COLORS.default;
  const significance = metrics?.significance || 1;
  const radius = Math.sqrt(significance) * NODE_REL_SIZE;

  // 1. Halo (Selection/Hover)
  if (isSelected || isHovered) {
    ctx.beginPath();
    ctx.fillStyle = isSelected ? 'rgba(8, 145, 178, 0.2)' : 'rgba(148, 163, 184, 0.2)';
    drawShape(ctx, x, y, radius + 6, shape);
    ctx.fill();
  }

  // 2. Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.1)';
  drawShape(ctx, x, y, radius + 1.5, shape);
  ctx.fill();

  // 3. Core
  ctx.fillStyle = color;
  drawShape(ctx, x, y, radius, shape);
  ctx.fill();

  // 4. Stroke
  ctx.lineWidth = 1.5 / globalScale;
  ctx.strokeStyle = '#fff';
  ctx.stroke();

  // 5. Label (Conditional LOD)
  // JetBrains Mono for clean technical legibility
  const showLabel = isSelected || isHovered || globalScale > 1.0 || significance > 8;

  if (showLabel) {
    const fontSize = 12 / globalScale;
    ctx.font = `normal 500 ${fontSize}px "JetBrains Mono", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // White Outline
    ctx.lineWidth = 3 / globalScale;
    ctx.strokeStyle = '#ffffff';
    ctx.strokeText(label, x, y);

    // Text Fill
    ctx.fillStyle = '#0f172a';
    ctx.fillText(label, x, y);
  }
};

// Extracted Link Painting Logic
export const paintLink = (
  link: OptimizedConnection,
  ctx: CanvasRenderingContext2D,
  globalScale: number
) => {
  // Safe casting: ForceGraph guarantees these are objects after initialization
  const source = link.source as SimulationNode;
  const target = link.target as SimulationNode;

  if (source.x === undefined || source.y === undefined || target.x === undefined || target.y === undefined) return;

  const width = (link.weight * 1.5) / globalScale;

  // Pass 1: Eraser (Gap Effect)
  ctx.beginPath();
  ctx.strokeStyle = GRAPH_BACKGROUND;
  ctx.lineWidth = width + (5 / globalScale);
  ctx.lineCap = 'butt';
  ctx.moveTo(source.x, source.y);
  ctx.lineTo(target.x, target.y);
  ctx.stroke();

  // Pass 2: Ink
  ctx.beginPath();
  ctx.strokeStyle = LINK_COLOR;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.moveTo(source.x, source.y);
  ctx.lineTo(target.x, target.y);
  ctx.stroke();
};
