import React from 'react';

export const StatsSkeleton: React.FC = () => (
  <div className="space-y-6 pb-20 animate-pulse selection:bg-blue-600 selection:text-white">
    <div className="space-y-2">
      <div className="h-7 w-56 bg-slate-850 rounded-lg" />
      <div className="h-3 w-80 max-w-full bg-slate-850 rounded-lg" />
    </div>

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="h-24 bg-slate-850 rounded-2xl w-full" />
      ))}
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 h-80 bg-slate-850 rounded-2xl w-full" />
      <div className="h-80 bg-slate-850 rounded-2xl w-full" />
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="h-64 bg-slate-850 rounded-2xl w-full" />
      <div className="h-64 bg-slate-850 rounded-2xl w-full" />
    </div>

    <div className="h-56 bg-slate-850 rounded-2xl w-full" />
    <div className="h-72 bg-slate-850 rounded-2xl w-full" />
  </div>
);
