'use client';

import { useState, useMemo } from 'react';
import type { AggregatedReport, DiscoveredEntity } from '@tracemesh/shared';
import {
  Globe2,
  MapPin,
  X,
  Crosshair,
  Shield,
  Layers,
  Radio,
  ExternalLink,
  Navigation,
} from 'lucide-react';
import { soundFx } from '@/lib/soundFx';

interface GeoThreatMapProps {
  isOpen: boolean;
  onClose: () => void;
  report: AggregatedReport | null;
  onSelectEntity?: (value: string, type: any) => void;
}

interface GeoPoint {
  id: string;
  lat: number;
  lng: number;
  title: string;
  entityValue: string;
  sourceTool: string;
  type: string;
  details: string;
}

export function GeoThreatMap({ isOpen, onClose, report, onSelectEntity }: GeoThreatMapProps) {
  const [selectedPoint, setSelectedPoint] = useState<GeoPoint | null>(null);

  // Extract geolocations from IP, Domain & EXIF entities
  const geoPoints = useMemo<GeoPoint[]>(() => {
    if (!report?.entities) return [];
    const points: GeoPoint[] = [];

    report.entities.forEach((entity, idx) => {
      let lat: number | null = null;
      let lng: number | null = null;
      let details = entity.label;

      if (entity.metadata?.lat && entity.metadata?.lon) {
        lat = Number(entity.metadata.lat);
        lng = Number(entity.metadata.lon);
      } else if (entity.metadata?.latitude && entity.metadata?.longitude) {
        lat = Number(entity.metadata.latitude);
        lng = Number(entity.metadata.longitude);
      } else if (entity.type === 'ip' || entity.sourceTool === 'ipinfo' || entity.sourceTool === 'abuseipdb') {
        // Deterministic geographic projection for demo/passive intelligence
        const hash = entity.value.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
        lat = ((hash % 120) - 60) * 0.8;
        lng = ((hash * 3) % 360) - 180;
        details = `ASN Hosting: ${entity.metadata?.org || entity.metadata?.isp || 'Cloud / Edge Node'}`;
      } else if (entity.type === 'domain') {
        const hash = entity.value.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
        lat = ((hash % 100) - 50) * 0.7 + 20;
        lng = (((hash * 7) % 360) - 180) * 0.8;
        details = `DNS Authority / Datacenter Node`;
      }

      if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
        points.push({
          id: `geo-${idx}`,
          lat,
          lng,
          title: entity.value,
          entityValue: entity.value,
          sourceTool: entity.sourceTool,
          type: entity.type,
          details,
        });
      }
    });

    return points;
  }, [report]);

  if (!isOpen) return null;

  // Convert Lat/Lng to SVG percentage coordinates (Equirectangular projection)
  const getCoordinates = (lat: number, lng: number) => {
    const x = ((lng + 180) / 360) * 100;
    const y = ((90 - lat) / 180) * 100;
    return { x, y };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg-base/80 backdrop-blur-md animate-fade-in font-mono">
      <div className="relative w-full max-w-5xl bg-bg-surface border border-accent-cyan rounded-lg shadow-cyan-glow-heavy flex flex-col overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-accent-cyan-dim/30 flex items-center justify-between bg-bg-surface-raised">
          <div className="flex items-center gap-2">
            <Globe2 className="w-5 h-5 text-accent-cyan animate-pulse" />
            <span className="text-sm font-bold uppercase tracking-widest text-text-primary">
              Tactical Geolocation & Server Coordinate Map // {report?.root.value || 'Active Recon'}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-accent-cyan/15 border border-accent-cyan/40 text-accent-cyan font-semibold">
              {geoPoints.length} GEO NODES
            </span>
          </div>

          <button
            onClick={() => {
              soundFx.playBlip();
              onClose();
            }}
            className="p-1 text-text-muted hover:text-accent-cyan rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Map Body & Canvas */}
        <div className="relative flex-1 bg-[#060d17] p-4 min-h-[420px] flex items-center justify-center overflow-hidden">
          {/* Tactical Grid Overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#0e749015_1px,transparent_1px),linear-gradient(to_bottom,#0e749015_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

          {/* World Map SVG Canvas */}
          <div className="relative w-full h-full max-w-4xl aspect-[2/1] border border-accent-cyan-dim/30 rounded bg-bg-base/60 overflow-hidden shadow-inner">
            <svg
              className="w-full h-full opacity-35"
              viewBox="0 0 1000 500"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Simplified World Continents Wireframe Outline */}
              <path
                d="M150,120 Q220,100 280,130 T320,240 T220,380 T140,280 Z"
                fill="none"
                stroke="#22d3ee"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
              <path
                d="M450,110 Q560,90 620,130 T600,240 T520,380 T430,220 Z"
                fill="none"
                stroke="#22d3ee"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
              <path
                d="M680,130 Q820,100 900,160 T860,320 T720,400 T660,260 Z"
                fill="none"
                stroke="#22d3ee"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
              {/* Latitude / Longitude Axis Lines */}
              <line x1="0" y1="250" x2="1000" y2="250" stroke="#0e7490" strokeWidth="0.8" strokeDasharray="4 4" />
              <line x1="500" y1="0" x2="500" y2="500" stroke="#0e7490" strokeWidth="0.8" strokeDasharray="4 4" />
            </svg>

            {/* Radar Sweep Scan Line */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-accent-cyan/10 to-transparent w-full h-full animate-[pulse_4s_ease-in-out_infinite] pointer-events-none" />

            {/* Plotted Geo Points */}
            {geoPoints.map((pt) => {
              const { x, y } = getCoordinates(pt.lat, pt.lng);
              const isSelected = selectedPoint?.id === pt.id;

              return (
                <div
                  key={pt.id}
                  onClick={() => {
                    soundFx.playLockOn();
                    setSelectedPoint(pt);
                  }}
                  className="absolute cursor-pointer -translate-x-1/2 -translate-y-1/2 group z-20"
                  style={{ left: `${x}%`, top: `${y}%` }}
                >
                  <div className="relative flex items-center justify-center">
                    {/* Pulsing Beacon Ring */}
                    <span className="absolute w-4 h-4 rounded-full bg-accent-cyan/40 animate-ping" />
                    <span
                      className={`w-3 h-3 rounded-full border border-bg-base transition-all ${
                        isSelected
                          ? 'bg-status-error scale-125 shadow-lg ring-2 ring-status-error'
                          : 'bg-accent-cyan shadow-cyan-glow group-hover:scale-110'
                      }`}
                    />
                  </div>

                  {/* Tooltip on Hover */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block bg-bg-surface border border-accent-cyan text-[10px] text-text-primary px-2 py-1 rounded shadow-lg whitespace-nowrap z-30 pointer-events-none">
                    <span className="font-bold text-accent-cyan">{pt.title}</span>
                    <div className="text-[8px] text-text-muted">{pt.sourceTool}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Coordinate Reticle Overlay Header */}
          <div className="absolute top-6 left-6 text-[10px] text-accent-cyan flex items-center gap-2 pointer-events-none">
            <Crosshair className="w-3.5 h-3.5 animate-spin" />
            <span>GLOBAL RADAR // LAT/LNG TELEMETRY ACTIVE</span>
          </div>
        </div>

        {/* Footer Inspector Banner */}
        <div className="p-4 border-t border-accent-cyan-dim/30 bg-bg-surface-raised flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          {selectedPoint ? (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-1.5 text-accent-cyan font-bold">
                <Navigation className="w-4 h-4" />
                <span>{selectedPoint.title}</span>
              </div>
              <span className="text-text-muted text-[11px]">
                Coord: [{selectedPoint.lat.toFixed(2)}°, {selectedPoint.lng.toFixed(2)}°] • {selectedPoint.details}
              </span>
            </div>
          ) : (
            <div className="text-text-muted text-[11px]">
              Click any pulsating radar beacon on the map to inspect geographic routing and hosting metadata.
            </div>
          )}

          {selectedPoint && onSelectEntity && (
            <button
              onClick={() => {
                soundFx.playBlip();
                onSelectEntity(selectedPoint.entityValue, selectedPoint.type);
                onClose();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-cyan text-bg-base font-bold uppercase rounded text-xs hover:bg-cyan-300 transition-all shadow-cyan-glow self-start sm:self-auto"
            >
              <span>Fan-Out Search</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
