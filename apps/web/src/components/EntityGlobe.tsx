'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import type { DiscoveredEntity, InputType } from '@tracemesh/shared';
import {
  Sparkles,
  ExternalLink,
  Search,
  ArrowRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Layers,
  X,
} from 'lucide-react';

interface EntityGlobeProps {
  rootValue?: string;
  rootType?: InputType;
  entities?: DiscoveredEntity[];
  onNodeClick?: (value: string, type: InputType) => void;
  reduceMotion?: boolean;
}

interface ProjectedNode {
  id: string;
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
  value?: string;
  confidence?: number;
  isRoot?: boolean;
  isEntity?: boolean;
  px: number;
  py: number;
  scale: number;
  zDepth: number;
}

const TOOL_COLORS: Record<string, string> = {
  sherlock: '#818cf8',
  holehe: '#34d399',
  exiftool: '#fb923c',
  maigret: '#a78bfa',
  phoneinfoga: '#38bdf8',
  root: '#22d3ee',
};

export function EntityGlobe({
  rootValue,
  rootType,
  entities = [],
  onNodeClick,
  reduceMotion = false,
}: EntityGlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [selectedNode, setSelectedNode] = useState<ProjectedNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<ProjectedNode | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [rotation, setRotation] = useState({ yaw: 0, pitch: 0.25 });
  const [zoom, setZoom] = useState(1);
  const [assembledProgress, setAssembledProgress] = useState(reduceMotion ? 1 : 0);
  const isDraggingRef = useRef(false);
  const prevMouseRef = useRef({ x: 0, y: 0 });
  const projectedNodesRef = useRef<ProjectedNode[]>([]);

  // Base background sphere particles
  const baseParticles = useMemo(() => {
    const points: any[] = [];
    const count = 360;
    const radius = 185;

    for (let i = 0; i < count; i++) {
      const phi = Math.acos(-1 + (2 * i) / count);
      const theta = Math.sqrt(count * Math.PI) * phi;

      const x = radius * Math.cos(theta) * Math.sin(phi);
      const y = radius * Math.sin(theta) * Math.sin(phi);
      const z = radius * Math.cos(phi);

      const scatterFactor = 4;
      const originX = (Math.random() - 0.5) * radius * scatterFactor * 2;
      const originY = (Math.random() - 0.5) * radius * scatterFactor * 2;
      const originZ = (Math.random() - 0.5) * radius * scatterFactor * 2;

      points.push({
        id: `base-${i}`,
        x,
        y,
        z,
        originX,
        originY,
        originZ,
        radius: 1.4,
        color: '#0e7490',
        glowColor: 'rgba(34, 211, 238, 0.3)',
        isEntity: false,
        isRoot: false,
      });
    }
    return points;
  }, []);

  // Root and Discovered Entity Nodes
  const graphNodes = useMemo(() => {
    const nodes: any[] = [];
    const radius = 185;

    // Prominent Root Target Node
    if (rootValue) {
      nodes.push({
        id: 'root-node',
        x: 0,
        y: -10,
        z: radius,
        originX: 0,
        originY: -200,
        originZ: 0,
        radius: 7,
        color: '#22d3ee',
        glowColor: '#22d3ee',
        label: `Target Root (${rootType || 'Identifier'})`,
        value: rootValue,
        type: rootType || 'target',
        sourceTool: 'ROOT_TARGET',
        confidence: 1.0,
        isRoot: true,
        isEntity: true,
      });
    }

    // Discovered Child Entities
    entities.forEach((entity, i) => {
      const phi = Math.acos(-1 + (2 * (i + 1)) / (entities.length + 1));
      const theta = Math.sqrt((entities.length + 1) * Math.PI) * phi;

      const x = radius * Math.cos(theta) * Math.sin(phi);
      const y = radius * Math.sin(theta) * Math.sin(phi);
      const z = radius * Math.cos(phi);

      const color = TOOL_COLORS[entity.sourceTool.toLowerCase()] || '#22d3ee';

      nodes.push({
        id: `entity-${i}`,
        x,
        y,
        z,
        originX: (Math.random() - 0.5) * 600,
        originY: (Math.random() - 0.5) * 600,
        originZ: (Math.random() - 0.5) * 600,
        radius: 5,
        color,
        glowColor: color,
        label: entity.label,
        value: entity.value,
        type: entity.type,
        sourceTool: entity.sourceTool,
        confidence: entity.confidence || 0.9,
        isRoot: false,
        isEntity: true,
      });
    });

    return nodes;
  }, [rootValue, rootType, entities]);

  // Assembly animation on change
  useEffect(() => {
    if (reduceMotion) {
      setAssembledProgress(1);
      return;
    }

    let start = Date.now();
    const duration = 1500;

    const timer = setInterval(() => {
      const elapsed = Date.now() - start;
      const progress = Math.min(1, elapsed / duration);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setAssembledProgress(easeOut);
      if (progress >= 1) clearInterval(timer);
    }, 16);

    return () => clearInterval(timer);
  }, [reduceMotion, rootValue, entities]);

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

      // Ambient idle rotation (~20s full turn per DESIGN.md)
      if (!isHovered && !isDraggingRef.current && !reduceMotion) {
        setRotation((prev) => ({
          yaw: prev.yaw + 0.314 * delta,
          pitch: prev.pitch,
        }));
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      const allPoints = [...baseParticles, ...graphNodes];
      const projected: ProjectedNode[] = allPoints.map((p) => {
        const curX = p.originX + (p.x - p.originX) * assembledProgress;
        const curY = p.originY + (p.y - p.originY) * assembledProgress;
        const curZ = p.originZ + (p.z - p.originZ) * assembledProgress;

        // Apply 3D Rotations
        const cosY = Math.cos(rotation.yaw);
        const sinY = Math.sin(rotation.yaw);
        const x1 = curX * cosY - curZ * sinY;
        const z1 = curZ * cosY + curX * sinY;

        const cosX = Math.cos(rotation.pitch);
        const sinX = Math.sin(rotation.pitch);
        const y2 = curY * cosX - z1 * sinX;
        const z2 = z1 * cosX + curY * sinX;

        // Perspective
        const fov = 420;
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

      projectedNodesRef.current = projected.filter((p) => p.isEntity);

      // Depth sort
      projected.sort((a, b) => b.zDepth - a.zDepth);

      // Draw wireframe latitude & longitude rings
      ctx.save();
      ctx.strokeStyle = 'rgba(14, 116, 144, 0.22)';
      ctx.lineWidth = 1;

      for (let lat = -60; lat <= 60; lat += 30) {
        ctx.beginPath();
        const rad = (lat * Math.PI) / 180;
        const ringR = 185 * Math.cos(rad) * zoom * assembledProgress;
        const ringY = 185 * Math.sin(rad);

        ctx.ellipse(
          cx,
          cy + ringY * Math.cos(rotation.pitch) * zoom,
          Math.max(1, ringR),
          Math.max(1, ringR * Math.abs(Math.sin(rotation.pitch))),
          0,
          0,
          Math.PI * 2,
        );
        ctx.stroke();
      }
      ctx.restore();

      // Find root node position
      const rootNode = projected.find((p) => p.isRoot);

      // Draw animated glowing vector beams from root to each discovered entity child
      if (rootNode) {
        const children = projected.filter((p) => p.isEntity && !p.isRoot);
        for (const child of children) {
          ctx.save();
          ctx.strokeStyle = 'rgba(34, 211, 238, 0.45)';
          ctx.lineWidth = 1.4;

          // Glowing curved connector
          ctx.beginPath();
          ctx.moveTo(rootNode.px, rootNode.py);
          ctx.lineTo(child.px, child.py);
          ctx.stroke();
          ctx.restore();
        }
      }

      // Draw Nodes and Particles
      for (const p of projected) {
        const alpha = Math.max(0.15, Math.min(1, (p.zDepth + 200) / 400));
        ctx.save();

        if (p.isEntity) {
          ctx.fillStyle = p.color;
          ctx.shadowColor = p.glowColor;
          ctx.shadowBlur = p.isRoot ? 20 : 12;

          ctx.beginPath();
          ctx.arc(p.px, p.py, p.radius * p.scale, 0, Math.PI * 2);
          ctx.fill();

          // Outer halo
          ctx.strokeStyle = p.glowColor;
          ctx.lineWidth = p.isRoot ? 2 : 1;
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
  }, [baseParticles, graphNodes, rotation, zoom, assembledProgress, isHovered, reduceMotion]);

  // Handle Raycasting / Node selection on canvas click
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const mouseY = ((e.clientY - rect.top) / rect.height) * canvas.height;

    // Check hit against projected entities
    for (const node of projectedNodesRef.current) {
      const dist = Math.hypot(node.px - mouseX, node.py - mouseY);
      if (dist <= node.radius * node.scale + 10) {
        setSelectedNode(node);
        return;
      }
    }
  };

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
      className="relative w-full h-[400px] sm:h-[480px] flex items-center justify-center overflow-hidden rounded border border-accent-cyan-dim/40 bg-bg-base select-none shadow-cyan-glow"
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
        width={760}
        height={480}
        onClick={handleCanvasClick}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* Top HUD Status */}
      <div className="absolute top-3 left-3 flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-mono uppercase bg-bg-surface/90 backdrop-blur-md border border-accent-cyan-dim/40 text-accent-cyan rounded shadow-cyan-glow">
          <span className="w-1.5 h-1.5 rounded-full bg-status-success animate-pulse" />
          <span>Entity Graph Globe // Live Topology</span>
        </div>
        {rootValue && (
          <span className="px-2.5 py-0.5 text-[10px] font-mono bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/40 rounded">
            Target: {rootValue}
          </span>
        )}
      </div>

      {/* Right Orbit Controls */}
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
            setRotation({ yaw: 0, pitch: 0.25 });
            setZoom(1);
          }}
          className="p-1.5 bg-bg-surface/85 border border-accent-cyan-dim/30 hover:border-accent-cyan text-text-secondary hover:text-accent-cyan rounded transition-colors"
          title="Reset View"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Selected Node Details Popover (v2.18 / v2.19) */}
      {selectedNode && (
        <div className="absolute bottom-12 right-4 z-20 w-80 bg-bg-surface/95 backdrop-blur-md border border-accent-cyan p-4 rounded shadow-cyan-glow text-left animate-fade-in">
          <div className="flex items-center justify-between border-b border-accent-cyan-dim/25 pb-2 mb-2.5">
            <div className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: selectedNode.color }}
              />
              <span className="text-[10px] font-mono uppercase font-bold text-accent-cyan">
                {selectedNode.isRoot ? 'Search Root' : `Source: ${selectedNode.sourceTool}`}
              </span>
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-text-muted hover:text-text-primary p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-1.5 font-mono">
            <div className="text-xs text-text-primary font-bold break-all">
              {selectedNode.value}
            </div>
            <div className="text-[11px] text-text-secondary">
              {selectedNode.label}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-bg-base border border-accent-cyan-dim/30 text-text-secondary uppercase">
                {selectedNode.type}
              </span>
              {selectedNode.confidence && (
                <span className="text-[9px] text-accent-cyan">
                  {Math.round(selectedNode.confidence * 100)}% Confidence
                </span>
              )}
            </div>
          </div>

          {/* Fan-Out Action */}
          {!selectedNode.isRoot && selectedNode.value && onNodeClick && (
            <button
              onClick={() => {
                onNodeClick(selectedNode.value!, (selectedNode.type as InputType) || 'username');
                setSelectedNode(null);
              }}
              className="w-full mt-3 py-1.5 bg-accent-cyan/20 border border-accent-cyan hover:bg-accent-cyan hover:text-bg-base text-accent-cyan font-mono text-[11px] font-semibold rounded flex items-center justify-center gap-1.5 transition-all shadow-cyan-glow"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Search This Entity (Fan-Out)</span>
            </button>
          )}
        </div>
      )}

      {/* Bottom Domain Color Legend */}
      <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 bg-bg-surface/85 backdrop-blur-md border border-accent-cyan-dim/20 rounded text-[10px] font-mono text-text-secondary">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#22d3ee]" />
            Search Root
          </span>
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
          Click any 3D node on the globe to inspect and fan-out
        </span>
      </div>
    </div>
  );
}
