
import React, { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import ForceGraph2D, { ForceGraphMethods } from 'react-force-graph-2d';
import * as d3 from 'd3';
import { usePrismStore } from '../../store/prismStore';
import { ResearchNode, SimulationNode } from '../../types/prism';
import { NODE_REL_SIZE, LINK_COLOR, GRAPH_BACKGROUND } from '../../constants';
import { paintNode, paintLink } from '../../utils/canvasRenderers';

const GraphCanvas: React.FC = () => {
  // Select specific state to prevent unnecessary re-renders
  const nodes = usePrismStore(state => state.nodes);
  const links = usePrismStore(state => state.links);
  const selectNode = usePrismStore(state => state.selectNode);
  const selectedNode = usePrismStore(state => state.selectedNode);
  const hoveredNode = usePrismStore(state => state.hoveredNode);
  const setHoveredNode = usePrismStore(state => state.setHoveredNode);
  const setZoomLevel = usePrismStore(state => state.setZoomLevel);
  const resetSignal = usePrismStore(state => (state as any).resetSignal); 

  const graphRef = useRef<ForceGraphMethods | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [dimensions, setDimensions] = useState({ w: window.innerWidth, h: window.innerHeight });

  // 1. Data Sanitization & Memoization
  const graphData = useMemo(() => {
    // We deep clone only when nodes/links *reference* changes to avoid D3 mutation side-effects
    const rawNodes = nodes.map(n => ({ ...n }));
    const nodeIds = new Set(rawNodes.map(n => n.id));

    const validLinks = links
      .map(l => ({
        ...l,
        source: typeof l.source === 'object' ? (l.source as any).id : l.source,
        target: typeof l.target === 'object' ? (l.target as any).id : l.target
      }))
      .filter(l => nodeIds.has(l.source) && nodeIds.has(l.target));

    return { nodes: rawNodes, links: validLinks };
  }, [nodes, links]);

  // 2. Window Resize Handler
  useEffect(() => {
    const handleResize = () => {
      setDimensions({ w: window.innerWidth, h: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 3. Camera Focus (Triggered on Selection)
  useEffect(() => {
    if (selectedNode && graphRef.current) {
        graphRef.current.centerAt(selectedNode.x, selectedNode.y, 800);
        graphRef.current.zoom(2.5, 800);
    }
  }, [selectedNode?.id]);
  
  // 4. Camera Reset Listener
  useEffect(() => {
      if (resetSignal && graphRef.current) {
          graphRef.current.zoomToFit(1000, 50);
      }
  }, [resetSignal]);

  // 5. Physics Configuration (On Mount)
  useEffect(() => {
    const timer = setTimeout(() => {
        if (graphRef.current) {
            // Strong Repulsion for clean layout
            graphRef.current.d3Force('charge')?.strength(-400);
            graphRef.current.d3Force('link')?.distance(100);
            
            // Strict Collision preventing overlap
            graphRef.current.d3Force('collide', d3.forceCollide((n: any) => {
              return (Math.sqrt(n.metrics?.significance || 1) * NODE_REL_SIZE) + 12; 
            }).strength(1).iterations(3));
        }
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // 6. Canvas Renderers (Using extracted utilities)
  const handleNodePaint = useCallback((node: any, ctx: CanvasRenderingContext2D, scale: number) => {
    paintNode(node as SimulationNode, ctx, scale, selectedNode?.id, hoveredNode?.id);
  }, [selectedNode?.id, hoveredNode?.id]);

  const handleLinkPaint = useCallback((link: any, ctx: CanvasRenderingContext2D, scale: number) => {
    paintLink(link, ctx, scale);
  }, []);

  return (
    <div ref={containerRef} className="fixed inset-0 z-0 bg-slate-50 cursor-grab active:cursor-grabbing">
      <ForceGraph2D
        ref={graphRef}
        width={dimensions.w}
        height={dimensions.h}
        graphData={graphData}
        backgroundColor={GRAPH_BACKGROUND}
        nodeLabel="" 
        minZoom={0.5}
        maxZoom={3}
        // Removing cooldownTicks={0} restores default simulation behavior (fluid start)
        nodeCanvasObject={handleNodePaint}
        linkCanvasObject={handleLinkPaint}
        onNodeClick={(node) => selectNode(node as ResearchNode)}
        onBackgroundClick={() => selectNode(null)}
        onNodeHover={(node) => setHoveredNode(node as ResearchNode || null)}
        onZoom={(t) => setZoomLevel(t.k)}
        enableNodeDrag={true}
        onNodeDragEnd={node => {
          node.fx = node.x;
          node.fy = node.y;
        }}
        nodePointerAreaPaint={(node, color, ctx) => {
          const r = Math.sqrt((node as ResearchNode).metrics.significance) * NODE_REL_SIZE;
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(node.x!, node.y!, r + 20, 0, 2 * Math.PI, false); 
          ctx.fill();
        }}
      />
    </div>
  );
};

export default GraphCanvas;
