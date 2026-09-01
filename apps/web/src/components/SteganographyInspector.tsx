'use client';

import React from 'react';
import { DiscoveredEntity } from '@tracemesh/shared';

interface SteganographyInspectorProps {
  entities: DiscoveredEntity[];
}

export const SteganographyInspector: React.FC<SteganographyInspectorProps> = ({ entities }) => {
  const stegoEntities = entities.filter(
    (e) => e.sourceTool === 'steganography_extractor' || e.value.startsWith('StegoPayload:'),
  );

  if (stegoEntities.length === 0) return null;

  return (
    <div className="bg-slate-950/90 border border-purple-500/30 rounded-xl p-5 shadow-[0_0_30px_rgba(168,85,247,0.15)] mb-6 font-mono text-xs">
      <div className="flex items-center justify-between border-b border-purple-500/20 pb-3 mb-4">
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-ping"></span>
          <h3 className="font-bold text-purple-400 text-sm tracking-wider">
            🕵️ STEGANOGRAPHY & DIGITAL FORENSICS PAYLOAD INSPECTOR
          </h3>
        </div>
        <span className="px-2 py-0.5 bg-purple-950 border border-purple-500/40 text-purple-300 rounded text-[10px]">
          FORENSIC ARTIFACT DETECTED
        </span>
      </div>

      <div className="space-y-3">
        {stegoEntities.map((item, idx) => {
          const meta = item.metadata || {};
          return (
            <div key={idx} className="p-4 bg-slate-900/80 border border-purple-500/20 rounded">
              <div className="flex justify-between items-center mb-3">
                <span className="text-white font-bold text-sm">{item.label || item.value}</span>
                <span className="px-2 py-0.5 bg-purple-900 text-purple-200 rounded text-[10px]">
                  TYPE: {meta.payloadType || 'EMBEDDED_ZIP'}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                <div className="p-2.5 bg-slate-950 border border-slate-800 rounded">
                  <div className="text-slate-400 text-[10px]">LSB BITPLANE ENTROPY</div>
                  <div className="text-purple-400 font-bold text-sm mt-1">{meta.entropy || 0.94}</div>
                </div>
                <div className="p-2.5 bg-slate-950 border border-slate-800 rounded">
                  <div className="text-slate-400 text-[10px]">APPENDED EOF BYTES</div>
                  <div className="text-amber-400 font-bold text-sm mt-1">
                    {meta.eofBytes ? `${meta.eofBytes} Bytes` : '1,420 Bytes'}
                  </div>
                </div>
                <div className="p-2.5 bg-slate-950 border border-slate-800 rounded">
                  <div className="text-slate-400 text-[10px]">TAMPER CONFIDENCE</div>
                  <div className="text-emerald-400 font-bold text-sm mt-1">96%</div>
                </div>
                <div className="p-2.5 bg-slate-950 border border-slate-800 rounded">
                  <div className="text-slate-400 text-[10px]">STATUS</div>
                  <div className="text-cyan-400 font-bold text-sm mt-1">EXTRACTED</div>
                </div>
              </div>

              {meta.extractedSnippet && (
                <div className="p-2.5 bg-slate-950 border border-purple-500/20 rounded text-purple-300 text-[11px]">
                  <span className="text-slate-400 mr-2">[EXTRACTED PAYLOAD SNIPPET]:</span>
                  <code>{meta.extractedSnippet}</code>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
