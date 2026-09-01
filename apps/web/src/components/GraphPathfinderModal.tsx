'use client';

import React, { useState } from 'react';
import { DiscoveredEntity } from '@tracemesh/shared';

interface GraphPathfinderModalProps {
  isOpen: boolean;
  onClose: () => void;
  entities: DiscoveredEntity[];
}

export const GraphPathfinderModal: React.FC<GraphPathfinderModalProps> = ({
  isOpen,
  onClose,
  entities,
}) => {
  const [source, setSource] = useState(entities[0]?.value || '');
  const [target, setTarget] = useState(entities[1]?.value || '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  if (!isOpen) return null;

  const handleComputePath = async () => {
    if (!source || !target) return;
    setLoading(true);
    try {
      const res = await fetch('http://localhost:3001/runs/pathfinder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entities, sourceValue: source, targetValue: target }),
      });
      if (res.ok) {
        const data = await res.json();
        setResult(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-3xl bg-slate-950 border border-cyan-500/40 rounded-xl p-6 shadow-[0_0_50px_rgba(0,240,255,0.2)] font-mono text-xs">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-cyan-500/20 pb-4 mb-4">
          <div className="flex items-center space-x-2">
            <span className="text-cyan-400 text-base font-bold">⚡ TACTICAL GRAPH PATHFINDER</span>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 hover:border-cyan-500 transition-colors"
          >
            [ CLOSE ]
          </button>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-slate-400 mb-1">SOURCE ENTITY NODE</label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="w-full bg-slate-900 border border-cyan-500/30 rounded p-2 text-white focus:outline-none focus:border-cyan-400"
            >
              {entities.map((e, idx) => (
                <option key={idx} value={e.value}>
                  [{e.type.toUpperCase()}] {e.value}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-400 mb-1">TARGET ENTITY NODE</label>
            <select
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="w-full bg-slate-900 border border-cyan-500/30 rounded p-2 text-white focus:outline-none focus:border-cyan-400"
            >
              {entities.map((e, idx) => (
                <option key={idx} value={e.value}>
                  [{e.type.toUpperCase()}] {e.value}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handleComputePath}
          disabled={loading}
          className="w-full py-2 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400 text-cyan-300 font-bold rounded mb-4 transition-colors"
        >
          {loading ? 'COMPUTING SHORTEST PATH...' : 'CALCULATE DEGREES OF SEPARATION'}
        </button>

        {/* Result view */}
        {result && (
          <div className="p-4 bg-slate-900/80 border border-cyan-500/20 rounded">
            {result.pathFound ? (
              <div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-emerald-400 font-bold">✓ PATH DISCOVERED</span>
                  <span className="text-cyan-300">
                    DEGREES OF SEPARATION: <strong>{result.degreesOfSeparation} HOPS</strong>
                  </span>
                </div>

                <div className="space-y-2">
                  {result.pathNodes.map((node: string, i: number) => (
                    <div key={i} className="flex items-center space-x-2">
                      <span className="w-6 h-6 rounded-full bg-cyan-950 border border-cyan-400 flex items-center justify-center text-cyan-300 text-[10px]">
                        {i + 1}
                      </span>
                      <span className="text-white font-bold">{node}</span>
                      {i < result.pathNodes.length - 1 && (
                        <span className="text-cyan-500 text-xs">➔</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-amber-400">
                ⚠ No direct or intermediate relational path discovered between the selected entities.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
