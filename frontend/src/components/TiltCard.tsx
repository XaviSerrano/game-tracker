import React, { useMemo, useRef, useState } from 'react';

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  maxTilt?: number;
  scale?: number;
  glareColor?: string;
}

export const TiltCard: React.FC<TiltCardProps> = ({
  children,
  className = '',
  maxTilt = 8,
  scale = 1.015,
  glareColor = 'rgba(217, 163, 82, 0.18)'
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [pointer, setPointer] = useState({ x: 0.5, y: 0.5, active: false });

  const cardStyle = useMemo<React.CSSProperties>(() => {
    const rotateX = (0.5 - pointer.y) * maxTilt * 2;
    const rotateY = (pointer.x - 0.5) * maxTilt * 2;

    return {
      transform: pointer.active
        ? `perspective(1200px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale(${scale})`
        : 'perspective(1200px) rotateX(0deg) rotateY(0deg) scale(1)',
      transformStyle: 'preserve-3d',
      willChange: 'transform'
    };
  }, [maxTilt, pointer, scale]);

  const glareStyle = useMemo<React.CSSProperties>(() => ({
    opacity: pointer.active ? 1 : 0,
    background: `radial-gradient(220px circle at ${pointer.x * 100}% ${pointer.y * 100}%, ${glareColor}, transparent 72%)`
  }), [glareColor, pointer]);

  return (
    <div
      ref={cardRef}
      onMouseMove={(event) => {
        const rect = cardRef.current?.getBoundingClientRect();
        if (!rect) return;

        const x = (event.clientX - rect.left) / rect.width;
        const y = (event.clientY - rect.top) / rect.height;

        setPointer({
          x: Math.max(0, Math.min(1, x)),
          y: Math.max(0, Math.min(1, y)),
          active: true
        });
      }}
      onMouseLeave={() => setPointer({ x: 0.5, y: 0.5, active: false })}
      className={`relative ${className}`}
      style={cardStyle}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[inherit] transition-opacity duration-300"
        style={glareStyle}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
};
