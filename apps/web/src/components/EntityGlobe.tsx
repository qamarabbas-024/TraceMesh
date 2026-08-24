'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import type { DiscoveredEntity, InputType } from '@tracemesh/shared';
import { Eye, EyeOff, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';

interface EntityGlobeProps {
  entities?: DiscoveredEntity[];
  onNodeClick?: (value: string, type: InputType) => void;
  reduceMotion?: boolean;
}

interface Point3D {
  x: number;
  y: number;
  z: number;
  originX: number;
  originY: number;
  originZ: number;
  radius: number;
  color: string;
  glowColor: string;
  label?: string;
  type?: string;
  sourceTool?: string;
  isEntity?: boolean;
  value?: string;
}

const TOOL_COLORS: Record<string, string> = {
  sherlock: '#818cf8',
  holehe: '#34d399',
  exiftool: '#fb923c',
  maigret: '#a78bfa',
  phoneinfoga: '#38bdf8',
};

export function EntityGlobe({ entities = [], onNodeClick, reduceMotion = false }: EntityGlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [hoveredNode, setHoveredNode] = useState<Point3D | null>(null);
  const [rotation, setRotation] = useState({ yaw: 0, pitch: 0.2 });
  const [zoom, setZoom] = useState(1);
  const [assembledProgress, setAssembledProgress] = useState(reduceMotion ? 1 : 0);
  const isDraggingRef = useRef(false);
  const prevMouseRef = useRef({ x: 0, y: 0 });

  // Generate sphere base particles
  const baseParticles = useMemo(() => {
    const points: Point3D[] = [];
    const count = 380;
    const radius = 180;

    for (let i = 0; i < count; i++) {
      const phi = Math.acos(-1 + (2 * i) / count);
      const theta = Math.sqrt(count * Math.PI) * phi;

      const x = radius * Math.cos(theta) * Math.sin(phi);
      const y = radius * Math.sin(theta) * Math.sin(phi);
      const z = radius * Math.cos(phi);

      // Scattered start positions for assembly animation
      const scatterFactor = 4;
      const originX = (Math.random() - 0.5) * radius * scatterFactor * 2;
      const originY = (Math.random() - 0.5) * radius * scatterFactor * 2;
      const originZ = (Math.random() - 0.5) * radius * scatterFactor * 2;

      points.push({
        x,
        y,
        z,
        originX,
        originY,
        originZ,
        radius: 1.5,
        color: '#0e7490',
        glowColor: 'rgba(34, 211, 238, 0.4)',
        isEntity: false,
      });
    }
    return points;
  }, []);

  // Map discovered entities onto sphere surface
  const entityPoints = useMemo(() => {
    const radius = 180;
    return entities.map((entity, i) => {
      // Golden spiral distribution for entities
      const phi = Math.acos(-1 + (2 * (i + 1)) / (entities.length + 1));
      const theta = Math.sqrt((entities.length + 1) * Math.PI) * phi;

      const x = radius * Math.cos(theta) * Math.sin(phi);
      const y = radius * Math.sin(theta) * Math.sin(phi);
      const z = radius * Math.cos(phi);

      const color = TOOL_COLORS[entity.sourceTool.toLowerCase()] || '#22d3ee';

      return {
        x,
        y,
        z,
        originX: (Math.random() - 0.5) * 500,
        originY: (Math.random() - 0.5) * 500,
        originZ: (Math.random() - 0.5) * 500,
        radius: 4.5,
        color,
        glowColor: color,
        label: entity.label,
        type: entity.type,
        sourceTool: entity.sourceTool,
        value: entity.value,
        isEntity: true,
      };
    });
  }, [entities]);

  // Assembly animation on mount
  useEffect(() => {
    if (reduceMotion) {
      setAssembledProgress(1);
      return;
    }

    let start = Date.now();
    const duration = 1500; // 1.5s assembly per DESIGN.md

    const timer = setInterval(() => {
      const elapsed = Date.now() - start;
      const progress = Math.min(1, elapsed / duration);
      // Ease out cubic
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setAssembledProgress(easeOut);
      if (progress >= 1) clearInterval(timer);
    }, 16);

    return () => clearInterval(timer);
  }, [reduceMotion]);

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrame: number;
    let lastTime = performance.now();

    const render = (now: number) => {
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      // Auto-rotation: ~20s per full rotation (2 * PI / 20 = ~0.314 rad/s)
      if (!isHovered && !isDraggingRef.current && !reduceMotion) {
        setRotation((prev) => ({
          yaw: prev.yaw + 0.314 * delta,
          pitch: prev.pitch,
        }));
      }

      // Clear Canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      // Combine points and interpolate from origin to final position based on assembly progress
      const allPoints = [...baseParticles, ...entityPoints];
      const projected = allPoints.map((p) => {
        const curX = p.originX + (p.x - p.originX) * assembledProgress;
        const curY = p.originY + (p.y - p.originY) * assembledProgress;
        const curZ = p.originZ + (p.z - p.originZ) * assembledProgress;

        // Apply 3D Rotation (Yaw around Y, Pitch around X)
        const cosY = Math.cos(rotation.yaw);
        const sinY = Math.sin(rotation.yaw);
        const x1 = curX * cosY - curZ * sinY;
        const z1 = curZ * cosY + curX * sinY;

        const cosX = Math.cos(rotation.pitch);
        const sinX = Math.sin(rotation.pitch);
        const y2 = curY * cosX - z1 * sinX;
        const z2 = z1 * cosX + curY * sinX;

        // Perspective projection
        const fov = 400;
        const scale = (fov / (fov + z2)) * zoom;
        const px = cx + x1 * scale;
        const py = cy + y2 * scale;

        return {
          ...p,
          px,
          py,
          scale,
          zDepth: z2,
        };
      });

      // Sort by depth (back to front)
      projected.sort((a, b) => b.zDepth - a.zDepth);

      // Draw wireframe latitude & longitude rings
      ctx.save();
      ctx.strokeStyle = 'rgba(14, 116, 144, 0.2)';
      ctx.lineWidth = 1;

      for (let lat = -60; lat <= 60; lat += 30) {
        ctx.beginPath();
        const rad = (lat * Math.PI) / 180;
        const ringR = 180 * Math.cos(rad) * zoom * assembledProgress;
        const ringY = 180 * Math.sin(rad);

        // Simple projected ellipse
        ctx.ellipse(cx, cy + ringY * Math.cos(rotation.pitch) * zoom, ringR, ringR * Math.sin(rotation.pitch), 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();

      // Draw light-trail edges between discovered entities
      if (entityPoints.length > 1) {
        ctx.save();
        ctx.strokeStyle = 'rgba(34, 211, 238, 0.35)';
        ctx.lineWidth = 1.2;

        const projectedEntities = projected.filter((p) => p.isEntity);
        for (let i = 0; i < projectedEntities.length - 1; i++) {
          const p1 = projectedEntities[i];
          const p2 = projectedEntities[i + 1];

          ctx.beginPath();
          ctx.moveTo(p1.px, p1.py);
          ctx.lineTo(p2.px, p2.py);
          ctx.stroke();
        }
        ctx.restore();
      }

      // Draw points
      for (const p of projected) {
        const alpha = Math.max(0.15, Math.min(1, (p.zDepth + 200) / 400));
        ctx.save();

        if (p.isEntity) {
          // Glowing Entity Node
          ctx.fillStyle = p.color;
          ctx.shadowColor = p.glowColor;
          ctx.shadowBlur = 12;

          ctx.beginPath();
          ctx.arc(p.px, p.py, p.radius * p.scale, 0, Math.PI * 2);
          ctx.fill();

          // Outer halo ring
          ctx.strokeStyle = p.glowColor;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(p.px, p.py, (p.radius + 3) * p.scale, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          // Base particle
          ctx.fillStyle = `rgba(14, 116, 144, ${alpha * 0.7})`;
          ctx.beginPath();
          ctx.arc(p.px, p.py, p.radius * p.scale, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }

      animFrame = requestAnimationFrame(render);
    };

    animFrame = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrame);
  }, [baseParticles, entityPoints, rotation, zoom, assembledProgress, isHovered, reduceMotion]);

  // Handle Mouse Drag / Orbit
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    prevMouseRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - prevMouseRef.current.x;
    const dy = e.clientY - prevMouseRef.current.y;
    prevMouseRef.current = { x: e.clientX, y: e.clientY };

    setRotation((prev) => ({
      yaw: prev.yaw + dx * 0.008,
      pitch: Math.max(-1.2, Math.min(1.2, prev.pitch + dy * 0.008)),
    }));
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  return (
    <div
      className="relative w-full h-[380px] sm:h-[450px] flex items-center justify-center overflow-hidden rounded border border-accent-cyan-dim/30 bg-bg-base select-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        isDraggingRef.current = false;
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* 3D Canvas */}
      <canvas
        ref={canvasRef}
        width={700}
        height={450}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* Top HUD Controls Overlay */}
      <div className="absolute top-3 left-3 flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono uppercase bg-bg-surface/85 backdrop-blur-md border border-accent-cyan-dim/40 text-accent-cyan rounded">
          <span className="w-1.5 h-1.5 rounded-full bg-status-success animate-pulse" />
          <span>Entity Graph Globe // 3D HUD</span>
        </div>
        {entities.length > 0 && (
          <span className="px-2 py-0.5 text-[10px] font-mono bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/40 rounded">
            {entities.length} Nodes Rendered
          </span>
        )}
      </div>

      {/* Right Controls Overlay (Zoom, Reset Orbit) */}
      <div className="absolute top-3 right-3 flex flex-col gap-1.5">
        <button
          onClick={() => setZoom((z) => Math.min(1.8, z + 0.15))}
          className="p-1.5 bg-bg-surface/85 border border-accent-cyan-dim/30 hover:border-accent-cyan text-text-secondary hover:text-accent-cyan rounded transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(0.6, z - 0.15))}
          className="p-1.5 bg-bg-surface/85 border border-accent-cyan-dim/30 hover:border-accent-cyan text-text-secondary hover:text-accent-cyan rounded transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={() => {
            setRotation({ yaw: 0, pitch: 0.2 });
            setZoom(1);
          }}
          className="p-1.5 bg-bg-surface/85 border border-accent-cyan-dim/30 hover:border-accent-cyan text-text-secondary hover:text-accent-cyan rounded transition-colors"
          title="Reset Orbit"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Bottom Legend */}
      <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 bg-bg-surface/80 backdrop-blur-md border border-accent-cyan-dim/20 rounded text-[10px] font-mono text-text-secondary">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#818cf8]" />
            Sherlock
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#34d399]" />
            Holehe
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#fb923c]" />
            ExifTool
          </span>
        </div>
        <span className="text-text-muted hidden sm:inline">
          Drag to orbit 360° • Scroll/buttons to zoom
        </span>
      </div>
    </div>
  );
}
