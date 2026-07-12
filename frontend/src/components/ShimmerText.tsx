import React from 'react';

interface ShimmerTextProps {
  children: React.ReactNode;
  className?: string;
}

export const ShimmerText: React.FC<ShimmerTextProps> = ({ children, className = '' }) => {
  return (
    <span
      className={`shimmer-text bg-gradient-to-r from-white via-blue-300 to-white bg-clip-text text-transparent ${className}`}
      style={{ backgroundSize: '200% 100%' }}
    >
      {children}
    </span>
  );
};
