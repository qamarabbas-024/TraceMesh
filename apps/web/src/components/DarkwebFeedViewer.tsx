'use client';

import React from 'react';
import { DiscoveredEntity } from '@tracemesh/shared';

interface DarkwebFeedViewerProps {
  entities: DiscoveredEntity[];
}

export const DarkwebFeedViewer: React.FC<DarkwebFeedViewerProps> = ({ entities }) => {
  const darkwebEntities = entities.filter(
    (e) => e.sourceTool === 'darkweb_scraper' || e.type === 'breach',
  );

  if (darkwebEntities.length === 0) return null;

  return (
    <div className="bg-slate-950/90 border border-red-500/30 rounded-xl p-5 shadow-[0_0_30px_rgba(239,68,68,0.15)] mb-6 font-mono text-xs">
      <div className="flex items-center justify-between border-b border-red-500/20 pb-3 mb-4">
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
          <h3 className="font-bold text-red-400 text-sm tracking-wider">
            🧅 DEEP DARKWEB & HIDDEN SERVICE THREAT INTELLIGENCE
          </h3>
        </div>
        <span className="px-2 py-0.5 bg-red-950/80 border border-red-500/40 text-red-300 rounded text-[10px]">
          {darkwebEntities.length} ONION TARGETS IDENTIFIED
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {darkwebEntities.map((item, idx) => {
          const meta = item.metadata || {};
          return (
            <div
              key={idx}
              className="p-3 bg-slate-900/80 border border-red-500/20 rounded hover:border-red-500/50 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="px-1.5 py-0.5 bg-red-950 text-red-300 border border-red-800 rounded text-[9px] uppercase font-bold">
                  {meta.threatCategory || 'DARKNET EXPOSURE'}
                </span>
                <span className="text-slate-400 text-[10px]">
                  ENGINE: {meta.sourceEngine || 'TOR HIDDEN SERVICE'}
                </span>
              </div>

              <div className="text-white font-bold text-xs mb-1 truncate">
                {item.label || item.value}
              </div>

              <div className="text-slate-400 text-[11px] mb-2 line-clamp-2">
                {meta.snippet || 'Referenced across indexed darknet leak directories and paste archives.'}
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-slate-800">
                <span className="text-red-400/80 truncate max-w-[200px]">{item.value}</span>
                <span>CONFIDENCE: {Math.round((item.confidence || 0.8) * 100)}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
