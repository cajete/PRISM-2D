
import React, { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import ForceGraph2D, { ForceGraphMethods } from 'react-force-graph-2d';
import * as d3 from 'd3';
import { usePrismStore } from '../../store/prismStore';
import { ResearchNode, SimulationNode } from '../../types/prism';
import { NODE_REL_SIZE, LINK_COLOR, GRAPH_BACKGROUND } from '../../constants';
import { paintNode, paintLink } from '../../utils/canvasRenderers';

const GraphCanvas: React.FC = () => {
  // Selectors: Atomic selection to prevent wastage
  const nodes = usePrismStore(state => state.nodes);
  const links = usePrismStore(state => state.links);
  const selectNode = usePrismStore(state => state.selectNode);
  const selectedNode = usePrismStore(state => state.selectedNode);
  const hoveredNode = usePrismStore(state => state.hoveredNode);
  const setHoveredNode = usePrismStore(state => state.setHoveredNode);
  const setZoomLevel = usePrismStore(state => state.setZoomLevel);
  const resetSignal = usePrismStore(state => state.resetCameraSignal); 

  const graphRef = useRef<ForceGraphMethods | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [dimensions, setDimensions] = useState({ w: window.innerWidth, h: window.innerHeight });

  // ---------------------------------------------------------------------------
  // 1. DATA SANITIZATION & MEMOIZATION
  // D3 mutates objects. We guard against this pollution.
  // ---------------------------------------------------------------------------
  const graphData = useMemo(() => {
    // Deep clone nodes to keep Store immutable
    const rawNodes = nodes.map(n => ({ ...n }));
    const nodeIds = new Set(rawNodes.map(n => n.id));

    // Filter broken links
    const validLinks = links
      .map(l => ({
        ...l,
        source: typeof l.source === 'object' ? (l.source as any).id : l.source,
        target: typeof l.target === 'object' ? (l.target as any).id : l.target
      }))
      .filter(l => nodeIds.has(l.source) && nodeIds.has(l.target));

    return { nodes: rawNodes, links: validLinks };
  }, [nodes, links]);

  // ---------------------------------------------------------------------------
  // 2. RESPONSIVE LAYOUT
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const handleResize = () => {
      setDimensions({ w: window.innerWidth, h: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ---------------------------------------------------------------------------
  // 3. CAMERA CONTROL
  // ---------------------------------------------------------------------------
  
  // Auto-Focus on Selection
  useEffect(() => {
    if (selectedNode && graphRef.current) {
        graphRef.current.centerAt(selectedNode.x, selectedNode.y, 800);
        graphRef.current.zoom(2.5, 800);
    }
  }, [selectedNode?.id]); // Only trigger on ID change, not coord change
  
  // External Reset Signal
  useEffect(() => {
      if (resetSignal > 0 && graphRef.current) {
          graphRef.current.zoomToFit(1000, 50);
      }
  }, [resetSignal]);

  // ---------------------------------------------------------------------------
  // 4. PHYSICS ENGINE CONFIGURATION
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const timer = setTimeout(() => {
        if (graphRef.current) {
            // Electrostatic Repulsion: Keeps nodes spread out
            graphRef.current.d3Force('charge')?.strength(-400);
            
            // Link Tension: Keeps connected nodes relatively close
            graphRef.current.d3Force('link')?.distance(100);
            
            // Hard Collision: Prevents overlaps based on visual radius
            graphRef.current.d3Force('collide', d3.forceCollide((n: any) => {
              const radius = (Math.sqrt(n.metrics?.significance || 1) * NODE_REL_SIZE);
              return radius + 15; // +Buffer
            }).strength(1).iterations(3));
        }
    }, 100); // Slight delay ensures D3 is initialized
    return () => clearTimeout(timer);
  }, []);

  // ---------------------------------------------------------------------------
  // 5. RENDER LOOPS
  // Using pure callbacks to avoid React render cycle overhead in Canvas
  // ---------------------------------------------------------------------------
  
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
        nodeLabel="" // Custom handling via paintNode
        minZoom={0.001}
        maxZoom={1000}
        
        // Rendering Delegates
        nodeCanvasObject={handleNodePaint}
        linkCanvasObject={handleLinkPaint}
        nodePointerAreaPaint={(node, color, ctx) => {
          // Hitbox definition
          const r = Math.sqrt((node as ResearchNode).metrics.significance) * NODE_REL_SIZE;
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(node.x!, node.y!, r + 10, 0, 2 * Math.PI, false); 
          ctx.fill();
        }}

        // Interaction Handlers
        onNodeClick={(node) => selectNode(node as ResearchNode)}
        onBackgroundClick={() => selectNode(null)}
        onNodeHover={(node) => setHoveredNode(node as ResearchNode || null)}
        onZoom={(t) => setZoomLevel(t.k)}
        
        // Drag Physics
        enableNodeDrag={true}
        onNodeDragEnd={node => {
          node.fx = node.x; // Fix position after drag
          node.fy = node.y;
        }}
      />
    </div>
  );
};

export default GraphCanvas;
