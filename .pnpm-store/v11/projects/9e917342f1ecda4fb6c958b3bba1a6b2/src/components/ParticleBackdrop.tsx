import React, { useMemo } from 'react';

interface ParticleBackdropProps {
  className?: string;
  count?: number;
}

export const ParticleBackdrop: React.FC<ParticleBackdropProps> = ({
  className = '',
  count = 16
}) => {
  const particles = useMemo(() => {
    return Array.from({ length: count }, (_, index) => {
      const width = 2 + (index % 4);
      const height = width;
      const left = (index * 17) % 100;
      const top = (index * 29) % 100;
      const delay = (index % 6) * 0.8;
      const duration = 9 + (index % 5) * 2;
      const opacity = 0.12 + (index % 4) * 0.03;

      return {
        id: `particle-${index}`,
        width,
        height,
        left,
        top,
        delay,
        duration,
        opacity
      };
    });
  }, [count]);

  return (
    <div aria-hidden="true" className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      {particles.map((particle) => (
        <span
          key={particle.id}
          className="particle-dot absolute rounded-full bg-blue-400"
          style={{
            width: `${particle.width}px`,
            height: `${particle.height}px`,
            left: `${particle.left}%`,
            top: `${particle.top}%`,
            opacity: particle.opacity,
            animationDelay: `${particle.delay}s`,
            animationDuration: `${particle.duration}s`
          }}
        />
      ))}
    </div>
  );
};
