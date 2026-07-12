import React, { useMemo, useRef, useState } from 'react';

interface SpotlightPanelProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
  glowSize?: number;
}

export const SpotlightPanel: React.FC<SpotlightPanelProps> = ({
  children,
  className = '',
  glowColor = 'rgba(217, 163, 82, 0.16)',
  glowSize = 260
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const [pointer, setPointer] = useState({ x: 0, y: 0, active: false });

  const spotlightStyle = useMemo<React.CSSProperties>(() => {
    if (!pointer.active) {
      return {
        opacity: 0
      };
    }

    return {
      opacity: 1,
      background: `radial-gradient(${glowSize}px circle at ${pointer.x}px ${pointer.y}px, ${glowColor}, transparent 68%)`
    };
  }, [glowColor, glowSize, pointer]);

  return (
    <div
      ref={panelRef}
      onMouseMove={(event) => {
        const rect = panelRef.current?.getBoundingClientRect();
        if (!rect) return;

        setPointer({
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
          active: true
        });
      }}
      onMouseLeave={() => setPointer(prev => ({ ...prev, active: false }))}
      className={`relative overflow-hidden ${className}`}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 transition-opacity duration-300"
        style={spotlightStyle}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-[1px] rounded-[inherit] border border-white/4"
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
};
