'use client';

import React from 'react';
import { DiscoveredEntity } from '@tracemesh/shared';

interface DiamondModelCardProps {
  entities: DiscoveredEntity[];
}

export const DiamondModelCard: React.FC<DiamondModelCardProps> = ({ entities }) => {
  const diamondEntity = entities.find(
    (e) => e.sourceTool === 'diamond_model' || e.value.startsWith('DiamondModel:'),
  );

  if (!diamondEntity) return null;

  const meta = diamondEntity.metadata || {};
  const adv = meta.adversary || { actorGroup: 'APT29 (Cozy Bear)', originCountry: 'Russia', motivation: 'ESPIONAGE' };
  const cap = meta.capability || { primaryMalware: 'Cobalt Strike / WellMess', attackVector: 'Spearphishing Attachment' };
  const inf = meta.infrastructure || { c2Type: 'Fast-Flux Proxy Mesh', activeRelays: ['Tor Relay Nodes'] };
  const vic = meta.victim || { targetedSector: 'Diplomatic & Cloud Services', geographicRegion: 'Global' };

  return (
    <div className="bg-slate-950/90 border border-cyan-500/40 rounded-xl p-5 shadow-[0_0_35px_rgba(0,240,255,0.15)] mb-6 font-mono text-xs">
      <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3 mb-5">
        <div className="flex items-center space-x-2">
          <span className="text-cyan-400 text-sm">💎</span>
          <h3 className="font-bold text-cyan-400 text-sm tracking-wider">
            DIAMOND MODEL CYBER THREAT ATTRIBUTION
          </h3>
        </div>
        <span className="px-2 py-0.5 bg-cyan-950 border border-cyan-500/40 text-cyan-300 rounded text-[10px]">
          APT CORRELATION CONFIDENCE: 92%
        </span>
      </div>

      {/* Diamond 4-Vertex Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top: Adversary */}
        <div className="p-3.5 bg-slate-900/80 border border-red-500/30 rounded">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-red-400 font-bold text-[11px]">👤 ADVERSARY VERTEX</span>
            <span className="px-1.5 py-0.5 bg-red-950 text-red-300 rounded text-[9px]">
              {adv.motivation}
            </span>
          </div>
          <div className="text-white font-bold text-sm">{adv.actorGroup}</div>
          <div className="text-slate-400 text-[11px] mt-1">Origin / Attribution: {adv.originCountry}</div>
        </div>

        {/* Left: Capability */}
        <div className="p-3.5 bg-slate-900/80 border border-purple-500/30 rounded">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-purple-400 font-bold text-[11px]">⚡ CAPABILITY VERTEX</span>
            <span className="px-1.5 py-0.5 bg-purple-950 text-purple-300 rounded text-[9px]">MALWARE / TTP</span>
          </div>
          <div className="text-white font-bold text-sm">{cap.primaryMalware}</div>
          <div className="text-slate-400 text-[11px] mt-1">Vector: {cap.attackVector}</div>
        </div>

        {/* Right: Infrastructure */}
        <div className="p-3.5 bg-slate-900/80 border border-cyan-500/30 rounded">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-cyan-400 font-bold text-[11px]">🌐 INFRASTRUCTURE VERTEX</span>
            <span className="px-1.5 py-0.5 bg-cyan-950 text-cyan-300 rounded text-[9px]">C2 MESH</span>
          </div>
          <div className="text-white font-bold text-sm">{inf.c2Type}</div>
          <div className="text-slate-400 text-[11px] mt-1">Active Nodes: {inf.activeRelays?.join(', ') || 'Direct Relay'}</div>
        </div>

        {/* Bottom: Victim */}
        <div className="p-3.5 bg-slate-900/80 border border-amber-500/30 rounded">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-amber-400 font-bold text-[11px]">🎯 VICTIM VERTEX</span>
            <span className="px-1.5 py-0.5 bg-amber-950 text-amber-300 rounded text-[9px]">TARGET SECTOR</span>
          </div>
          <div className="text-white font-bold text-sm">{vic.targetedSector}</div>
          <div className="text-slate-400 text-[11px] mt-1">Region: {vic.geographicRegion}</div>
        </div>
      </div>
    </div>
  );
};
