import React, { useRef, useEffect, useCallback } from 'react';
import ForceGraph2D, { ForceGraphMethods } from 'react-force-graph-2d';
import { usePrismStore } from '../store';
import { ResearchNode, OptimizedConnection } from '../types';
import { GROUP_COLORS, NODE_REL_SIZE, LINK_COLOR, GRAPH_BACKGROUND } from '../constants';

const PrismGraph: React.FC = () => {
  const { nodes, links, selectNode, narrativeMode } = usePrismStore();
  const graphRef = useRef<ForceGraphMethods | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Resize handler
  const [dimensions, setDimensions] = React.useState({ w: window.innerWidth, h: window.innerHeight });

  useEffect(() => {
    const handleResize = () => {
      setDimensions({ w: window.innerWidth, h: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Narrative Mode Auto-Focus
  useEffect(() => {
    if (narrativeMode && graphRef.current) {
      // Find the first narrative node or iterate (simple logic: zoom to fit all for now)
      graphRef.current.zoomToFit(1000, 50);
    }
  }, [narrativeMode, nodes]);

  // Focus on Selected Node
  useEffect(() => {
    const selected = usePrismStore.getState().selectedNode;
    if (selected && selected.x && selected.y && graphRef.current) {
      graphRef.current.centerAt(selected.x, selected.y, 1000);
      graphRef.current.zoom(4, 1000);
    }
  }, [usePrismStore.getState().selectedNode]);


  // Custom Node Painting (Strict Performance Rule: Canvas API)
  const paintNode = useCallback((node: ResearchNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const { groupLabel, metrics, label } = node;
    const significance = metrics?.significance || 1;
    const radius = Math.sqrt(significance) * NODE_REL_SIZE;
    const color = GROUP_COLORS[groupLabel] || GROUP_COLORS['default'];
    const isSelected = usePrismStore.getState().selectedNode?.id === node.id;

    // Draw Glow (if high significance or selected)
    if (isSelected || significance > 7) {
      ctx.beginPath();
      ctx.arc(node.x!, node.y!, radius * 2, 0, 2 * Math.PI, false);
      ctx.fillStyle = isSelected ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)';
      ctx.fill();
    }

    // Draw Core
    ctx.beginPath();
    ctx.arc(node.x!, node.y!, radius, 0, 2 * Math.PI, false);
    ctx.fillStyle = color;
    ctx.fill();

    // Draw Stroke if selected
    if (isSelected) {
      ctx.lineWidth = 2 / globalScale;
      ctx.strokeStyle = '#fff';
      ctx.stroke();
    }

    // Draw Label (Conditional Level of Detail)
    const showLabel = isSelected || globalScale > 2 || significance > 8;
    
    if (showLabel) {
      const fontSize = 12 / globalScale;
      ctx.font = `${fontSize}px Inter, Sans-Serif`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, node.x!, node.y! + radius + fontSize + 2);
    }
  }, []);

  return (
    <div ref={containerRef} className="fixed inset-0 z-0">
      <ForceGraph2D
        ref={graphRef}
        width={dimensions.w}
        height={dimensions.h}
        graphData={{ nodes, links }}
        nodeLabel="label"
        nodeRelSize={NODE_REL_SIZE}
        backgroundColor={GRAPH_BACKGROUND}
        linkColor={() => LINK_COLOR}
        linkWidth={(link: OptimizedConnection) => link.weight * 2}
        nodeCanvasObject={(node, ctx, globalScale) => paintNode(node as ResearchNode, ctx, globalScale)}
        nodePointerAreaPaint={(node, color, ctx) => {
          const r = Math.sqrt((node as ResearchNode).metrics.significance) * NODE_REL_SIZE;
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(node.x!, node.y!, r + 5, 0, 2 * Math.PI, false); // slightly larger hit area
          ctx.fill();
        }}
        onNodeClick={(node) => {
          selectNode(node as ResearchNode);
        }}
        onBackgroundClick={() => selectNode(null)}
        cooldownTicks={100} // Performance optimization: stop simulation earlier
      />
    </div>
  );
};

export default PrismGraph;