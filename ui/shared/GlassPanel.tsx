
import React from 'react';

interface GlassPanelProps {
  children: React.ReactNode;
  isOpen: boolean;
  positionClasses: string; // e.g., "top-4 left-20"
  widthClasses?: string;
  className?: string;
}

export const GlassPanel: React.FC<GlassPanelProps> = ({ 
  children, 
  isOpen, 
  positionClasses, 
  widthClasses = "w-80", 
  className = "" 
}) => {
  return (
    <div 
      className={`
        fixed z-10 p-5 ${positionClasses} ${widthClasses}
        bg-white/80 backdrop-blur-xl border border-slate-200 rounded-xl shadow-xl 
        ring-1 ring-black/5 text-slate-800
        transition-transform duration-500 cubic-bezier(0.16, 1, 0.3, 1)
        ${isOpen ? 'translate-x-0 opacity-100' : '-translate-x-[200%] opacity-0 pointer-events-none'}
        ${className}
      `}
    >
      {children}
    </div>
  );
};
