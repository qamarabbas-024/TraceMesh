'use client';

import React from 'react';

export interface GeoLocationData {
  latitude: number;
  longitude: number;
  city: string;
  country: string;
  asn?: string;
  isp?: string;
  cable?: string;
}

interface GeoIpMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  geoData: GeoLocationData | null;
}

export const GeoIpMapModal: React.FC<GeoIpMapModalProps> = ({ isOpen, onClose, geoData }) => {
  if (!isOpen || !geoData) return null;

  // Approximate SVG projection: maps [-180, 180] to [0, 800] and [90, -90] to [0, 400]
  const svgX = ((geoData.longitude + 180) / 360) * 800;
  const svgY = ((90 - geoData.latitude) / 180) * 400;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-slate-950 border border-cyan-500/40 rounded-xl p-6 shadow-[0_0_50px_rgba(0,240,255,0.2)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-cyan-500/20 pb-4 mb-4">
          <div className="flex items-center space-x-3">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
            </span>
            <h2 className="text-lg font-mono font-bold text-cyan-400 tracking-wider">
              TACTICAL GEOSPATIAL TELEMETRY
            </h2>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-mono text-xs border border-slate-700 hover:border-cyan-500 transition-colors"
          >
            [ ESC / CLOSE ]
          </button>
        </div>

        {/* Map & Grid */}
        <div className="relative w-full h-80 bg-slate-900/80 rounded-lg border border-cyan-500/20 overflow-hidden mb-4 flex items-center justify-center">
          {/* Grid Lines */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#00f0ff08_1px,transparent_1px),linear-gradient(to_bottom,#00f0ff08_1px,transparent_1px)] bg-[size:24px_24px]"></div>

          {/* SVG World Projection Outline */}
          <svg viewBox="0 0 800 400" className="w-full h-full opacity-40">
            <ellipse cx="400" cy="200" rx="380" ry="180" fill="none" stroke="#00f0ff" strokeWidth="0.5" strokeDasharray="4 4" />
            <line x1="0" y1="200" x2="800" y2="200" stroke="#00f0ff" strokeWidth="0.5" strokeOpacity="0.3" />
            <line x1="400" y1="0" x2="400" y2="400" stroke="#00f0ff" strokeWidth="0.5" strokeOpacity="0.3" />
          </svg>

          {/* Target Ping Radar */}
          <div
            className="absolute z-20 pointer-events-none transform -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${(svgX / 800) * 100}%`, top: `${(svgY / 400) * 100}%` }}
          >
            <div className="relative flex items-center justify-center">
              <div className="w-12 h-12 rounded-full border border-cyan-400 animate-ping absolute"></div>
              <div className="w-6 h-6 rounded-full border border-cyan-300 bg-cyan-400/20 absolute"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-cyan-300 shadow-[0_0_12px_#00f0ff]"></div>
            </div>
          </div>

          {/* Floating Coordinate HUD */}
          <div className="absolute bottom-3 left-3 bg-slate-950/80 border border-cyan-500/30 px-3 py-1.5 rounded font-mono text-xs text-cyan-300">
            LAT: {geoData.latitude}° &bull; LON: {geoData.longitude}°
          </div>
        </div>

        {/* Telemetry Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono text-xs">
          <div className="p-3 bg-slate-900/60 border border-slate-800 rounded">
            <div className="text-slate-400">LOCATION</div>
            <div className="text-white font-bold mt-1">{geoData.city}, {geoData.country}</div>
          </div>
          <div className="p-3 bg-slate-900/60 border border-slate-800 rounded">
            <div className="text-slate-400">ASN GATEWAY</div>
            <div className="text-cyan-400 font-bold mt-1">{geoData.asn || 'AS-UNKNOWN'}</div>
          </div>
          <div className="p-3 bg-slate-900/60 border border-slate-800 rounded">
            <div className="text-slate-400">CARRIER / ISP</div>
            <div className="text-slate-200 font-bold mt-1 truncate">{geoData.isp || 'Backbone Node'}</div>
          </div>
          <div className="p-3 bg-slate-900/60 border border-slate-800 rounded">
            <div className="text-slate-400">CABLE PROXIMITY</div>
            <div className="text-amber-400 font-bold mt-1 truncate">{geoData.cable || 'Tier-1 Terrestrial'}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
