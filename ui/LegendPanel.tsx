
import React from 'react';
import { GROUP_COLORS, GROUP_SHAPES } from '../constants';
import { usePrismStore } from '../store/prismStore';
import { GlassPanel } from './shared/GlassPanel';

const ShapeIcon: React.FC<{ shape: string; color: string }> = ({ shape, color }) => {
  const renderPath = () => {
    switch (shape) {
      case 'circle': return <circle cx="8" cy="8" r="6" fill={color} />;
      case 'square': return <rect x="3" y="3" width="10" height="10" rx="1" fill={color} />;
      case 'diamond': return <polygon points="8,1 15,8 8,15 1,8" fill={color} />;
      case 'triangle': return <polygon points="8,2 15,14 1,14" fill={color} />;
      case 'pentagon': return <polygon points="8,1 15,6.5 12.5,14.5 3.5,14.5 1,6.5" fill={color} />;
      case 'hexagon': return <polygon points="8,1 14.5,4.5 14.5,11.5 8,15 1.5,11.5 1.5,4.5" fill={color} />;
      default: return <circle cx="8" cy="8" r="6" fill={color} />;
    }
  };

  return (
    <svg width="16" height="16" viewBox="0 0 16 16" className="overflow-visible drop-shadow-sm">
      {renderPath()}
    </svg>
  );
};

const LegendPanel: React.FC = () => {
  const { ui } = usePrismStore();
  const categories = Object.keys(GROUP_COLORS).filter(k => k !== 'default');
  
  const isVisible = ui.isSidebarOpen && ui.isLegendOpen;

  return (
    <GlassPanel isOpen={isVisible} positionClasses="bottom-6 left-20" widthClasses="max-w-[200px]">
      <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4 border-b border-slate-100 pb-2">Ontology Key</h3>
      <div className="space-y-3">
        {categories.map(cat => (
          <div key={cat} className="flex items-center gap-3 group cursor-default">
            <div className="transition-transform duration-300 group-hover:scale-110">
              <ShapeIcon 
                shape={GROUP_SHAPES[cat] || 'circle'} 
                color={GROUP_COLORS[cat]} 
              />
            </div>
            <span className="text-xs font-semibold text-slate-600 group-hover:text-slate-900 transition-colors">{cat}</span>
          </div>
        ))}
      </div>
    </GlassPanel>
  );
};

export default LegendPanel;
