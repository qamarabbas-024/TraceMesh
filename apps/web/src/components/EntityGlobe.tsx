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
  Globe,
  Network,
  Maximize2,
  Filter,
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
  // 2D force simulation properties
  vx?: number;
  vy?: number;
  target2dX?: number;
  target2dY?: number;
}

const TOOL_COLORS: Record<string, string> = {
  sherlock: '#818cf8',
  holehe: '#34d399',
  exiftool: '#fb923c',
  maigret: '#a78bfa',
  phoneinfoga: '#38bdf8',
  domainrecon: '#22d3ee',
  subfinder: '#06b6d4',
  spiderfoot: '#eab308',
  theharvester: '#10b981',
  censys: '#6366f1',
  ahmia: '#ec4899',
  github_recon: '#38bdf8',
  crtsh: '#06b6d4',
  ipinfo: '#3b82f6',
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
  const [viewMode, setViewMode] = useState<'3d_globe' | '2d_tactical'>('3d_globe');
  const [selectedNode, setSelectedNode] = useState<ProjectedNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<ProjectedNode | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [rotation, setRotation] = useState({ yaw: 0, pitch: 0.25 });
  const [zoom, setZoom] = useState(1);
  const [assembledProgress, setAssembledProgress] = useState(reduceMotion ? 1 : 0);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const isDraggingRef = useRef(false);
  const prevMouseRef = useRef({ x: 0, y: 0 });
  const projectedNodesRef = useRef<ProjectedNode[]>([]);
  const panOffsetRef = useRef({ x: 0, y: 0 });

  // Base background sphere particles for 3D Globe
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

  // Filtered Entities
  const activeEntities = useMemo(() => {
    if (selectedFilter === 'all') return entities;
    return entities.filter(
      (e) => e.type === selectedFilter || e.sourceTool.toLowerCase() === selectedFilter.toLowerCase(),
    );
  }, [entities, selectedFilter]);

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
        target2dX: 0,
        target2dY: 0,
        radius: 8,
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
    activeEntities.forEach((entity, i) => {
      const phi = Math.acos(-1 + (2 * (i + 1)) / (activeEntities.length + 1));
      const theta = Math.sqrt((activeEntities.length + 1) * Math.PI) * phi;

      const x = radius * Math.cos(theta) * Math.sin(phi);
      const y = radius * Math.sin(theta) * Math.sin(phi);
      const z = radius * Math.cos(phi);

      // 2D Tactical Layout (Concentric spiral / clustered positioning)
      const angle2d = (i / Math.max(1, activeEntities.length)) * Math.PI * 2;
      const dist2d = 90 + (i % 3) * 55 + Math.floor(i / 6) * 20;
      const target2dX = Math.cos(angle2d) * dist2d;
      const target2dY = Math.sin(angle2d) * dist2d;

      const color = TOOL_COLORS[entity.sourceTool.toLowerCase()] || '#22d3ee';

      nodes.push({
        id: `entity-${i}`,
        x,
        y,
        z,
        originX: (Math.random() - 0.5) * 600,
        originY: (Math.random() - 0.5) * 600,
        originZ: (Math.random() - 0.5) * 600,
        target2dX,
        target2dY,
        radius: 5.5,
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
  }, [rootValue, rootType, activeEntities]);

  // Assembly animation on mount or target change
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
  }, [reduceMotion, rootValue, activeEntities]);

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

      // Ambient idle rotation for 3D globe (~20s per rotation per DESIGN.md)
      if (viewMode === '3d_globe' && !isHovered && !isDraggingRef.current && !reduceMotion) {
        setRotation((prev) => ({
          yaw: prev.yaw + 0.314 * delta,
          pitch: prev.pitch,
        }));
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const cx = canvas.width / 2 + panOffsetRef.current.x;
      const cy = canvas.height / 2 + panOffsetRef.current.y;

      if (viewMode === '3d_globe') {
        // --- 3D Globe Projection ---
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

        projected.sort((a, b) => b.zDepth - a.zDepth);
        projectedNodesRef.current = projected;

        // Draw 3D Latitude/Longitude Wireframe Rings
        ctx.strokeStyle = 'rgba(14, 116, 144, 0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, 185 * zoom, 0, Math.PI * 2);
        ctx.stroke();

        // Draw Vector Beams Connecting Root to Discovered Entities
        const rootNode = projected.find((p) => p.isRoot);
        if (rootNode) {
          projected.forEach((p) => {
            if (p.isEntity && !p.isRoot) {
              const alpha = Math.max(0.1, (p.zDepth + 200) / 400);
              ctx.strokeStyle = `rgba(34, 211, 238, ${alpha * 0.45})`;
              ctx.lineWidth = 1.2 * p.scale;
              ctx.setLineDash([4, 4]);

              ctx.beginPath();
              ctx.moveTo(rootNode.px, rootNode.py);
              ctx.quadraticCurveTo(cx, cy, p.px, p.py);
              ctx.stroke();
              ctx.setLineDash([]);
            }
          });
        }

        // Draw 3D Nodes
        projected.forEach((p) => {
          const isSelected = selectedNode?.id === p.id;
          const isHover = hoveredNode?.id === p.id;
          const r = Math.max(1, p.radius * p.scale * (isSelected ? 1.6 : isHover ? 1.3 : 1));

          ctx.beginPath();
          ctx.arc(p.px, p.py, r, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.fill();

          if (p.isEntity || isHover || isSelected) {
            ctx.strokeStyle = isSelected ? '#ffffff' : p.glowColor;
            ctx.lineWidth = isSelected ? 2 : 1.2;
            ctx.stroke();

            // Glow aura
            const gradient = ctx.createRadialGradient(p.px, p.py, r, p.px, p.py, r * 3);
            gradient.addColorStop(0, p.glowColor);
            gradient.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(p.px, p.py, r * 3, 0, Math.PI * 2);
            ctx.fill();
          }

          // Render Text Label for Hovered/Root Nodes
          if ((p.isRoot || isHover || isSelected) && p.value) {
            ctx.font = '10px "JetBrains Mono", monospace';
            ctx.fillStyle = isSelected ? '#22d3ee' : '#e8edf4';
            ctx.textAlign = 'center';
            const displayVal = p.value.length > 20 ? `${p.value.substring(0, 20)}...` : p.value;
            ctx.fillText(displayVal, p.px, p.py - r - 6);
          }
        });
      } else {
        // --- 2D Tactical Force-Directed Graph Mode ---
        const projected2d: ProjectedNode[] = graphNodes.map((p) => {
          const px = cx + (p.target2dX || 0) * zoom;
          const py = cy + (p.target2dY || 0) * zoom;
          return {
            ...p,
            px,
            py,
            scale: zoom,
            zDepth: 0,
          };
        });

        projectedNodesRef.current = projected2d;

        // Draw 2D Tactical Concentric Radar Circles
        [80, 150, 220].forEach((r) => {
          ctx.strokeStyle = 'rgba(14, 116, 144, 0.2)';
          ctx.lineWidth = 1;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.arc(cx, cy, r * zoom, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        });

        // Draw 2D Vector Edges from Root to Children
        const rootNode = projected2d.find((p) => p.isRoot);
        if (rootNode) {
          projected2d.forEach((p) => {
            if (p.isEntity && !p.isRoot) {
              ctx.strokeStyle = 'rgba(34, 211, 238, 0.4)';
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.moveTo(rootNode.px, rootNode.py);
              ctx.lineTo(p.px, p.py);
              ctx.stroke();
            }
          });
        }

        // Draw 2D Nodes
        projected2d.forEach((p) => {
          const isSelected = selectedNode?.id === p.id;
          const isHover = hoveredNode?.id === p.id;
          const r = Math.max(3, p.radius * zoom * (isSelected ? 1.5 : isHover ? 1.3 : 1));

          // Draw Category Halo Ring
          ctx.beginPath();
          ctx.arc(p.px, p.py, r + 4, 0, Math.PI * 2);
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 1;
          ctx.stroke();

          // Node Body
          ctx.beginPath();
          ctx.arc(p.px, p.py, r, 0, Math.PI * 2);
          ctx.fillStyle = isSelected ? '#ffffff' : p.color;
          ctx.fill();

          // Entity Label Banner
          if (p.value) {
            ctx.font = '11px "JetBrains Mono", monospace';
            ctx.fillStyle = isSelected ? '#22d3ee' : '#e8edf4';
            ctx.textAlign = 'center';
            const displayVal = p.value.length > 24 ? `${p.value.substring(0, 24)}...` : p.value;
            ctx.fillText(displayVal, p.px, p.py + r + 14);

            // Sub-label (source tool)
            ctx.font = '9px "JetBrains Mono", monospace';
            ctx.fillStyle = '#9aa7bd';
            ctx.fillText(p.sourceTool || p.type || '', p.px, p.py + r + 25);
          }
        });
      }

      animFrame = requestAnimationFrame(render);
    };

    animFrame = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrame);
  }, [
    baseParticles,
    graphNodes,
    assembledProgress,
    rotation,
    zoom,
    isHovered,
    reduceMotion,
    selectedNode,
    hoveredNode,
    viewMode,
  ]);

  // Mouse drag orbit & pan handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    prevMouseRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Raycasting / Hit Testing
    const hitRadius = 14;
    const hit = projectedNodesRef.current.find((p) => {
      if (!p.isEntity) return false;
      const dx = p.px - mouseX;
      const dy = p.py - mouseY;
      return Math.sqrt(dx * dx + dy * dy) < hitRadius;
    });

    setHoveredNode(hit || null);

    if (isDraggingRef.current) {
      const dx = e.clientX - prevMouseRef.current.x;
      const dy = e.clientY - prevMouseRef.current.y;
      prevMouseRef.current = { x: e.clientX, y: e.clientY };

      if (viewMode === '3d_globe') {
        setRotation((prev) => ({
          yaw: prev.yaw + dx * 0.008,
          pitch: Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, prev.pitch + dy * 0.008)),
        }));
      } else {
        panOffsetRef.current = {
          x: panOffsetRef.current.x + dx,
          y: panOffsetRef.current.y + dy,
        };
      }
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (hoveredNode && hoveredNode.isEntity) {
      setSelectedNode(hoveredNode);
    } else {
      setSelectedNode(null);
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomDelta = e.deltaY < 0 ? 1.08 : 0.92;
    setZoom((prev) => Math.max(0.4, Math.min(2.5, prev * zoomDelta)));
  };

  const resetView = () => {
    setRotation({ yaw: 0, pitch: 0.25 });
    setZoom(1);
    panOffsetRef.current = { x: 0, y: 0 };
    setSelectedNode(null);
  };

  return (
    <div
      className="relative w-full h-[460px] sm:h-[500px] border border-accent-cyan-dim/40 bg-bg-surface/85 backdrop-blur-md rounded overflow-hidden shadow-cyan-glow flex flex-col justify-between"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        isDraggingRef.current = false;
      }}
    >
      {/* Top HUD Controls & View Switcher Bar */}
      <div className="absolute top-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 border-b border-accent-cyan-dim/20 pb-2.5 bg-bg-surface/75 backdrop-blur-sm px-3 py-1.5 rounded">
        {/* Left: View Mode Toggle */}
        <div className="flex items-center gap-1.5 bg-bg-base/80 p-1 border border-accent-cyan-dim/30 rounded">
          <button
            onClick={() => setViewMode('3d_globe')}
            className={`flex items-center gap-1 px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider rounded transition-all ${
              viewMode === '3d_globe'
                ? 'bg-accent-cyan text-bg-base font-bold shadow-cyan-glow'
                : 'text-text-secondary hover:text-accent-cyan'
            }`}
          >
            <Globe className="w-3 h-3" />
            <span>3D Globe</span>
          </button>
          <button
            onClick={() => setViewMode('2d_tactical')}
            className={`flex items-center gap-1 px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider rounded transition-all ${
              viewMode === '2d_tactical'
                ? 'bg-accent-cyan text-bg-base font-bold shadow-cyan-glow'
                : 'text-text-secondary hover:text-accent-cyan'
            }`}
          >
            <Network className="w-3 h-3" />
            <span>2D Tactical Graph</span>
          </button>
        </div>

        {/* Right: Camera / Zoom Controls */}
        <div className="flex items-center gap-1 text-[10px] font-mono text-text-secondary">
          <button
            onClick={() => setZoom((prev) => Math.min(2.5, prev * 1.15))}
            className="p-1.5 hover:text-accent-cyan hover:bg-bg-base rounded transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoom((prev) => Math.max(0.4, prev * 0.85))}
            className="p-1.5 hover:text-accent-cyan hover:bg-bg-base rounded transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={resetView}
            className="p-1.5 hover:text-accent-cyan hover:bg-bg-base rounded transition-colors"
            title="Reset Coordinates"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Interactive Canvas */}
      <canvas
        ref={canvasRef}
        width={760}
        height={480}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={handleClick}
        onWheel={handleWheel}
      />

      {/* Selected Node Popover / Inspector Card */}
      {selectedNode && (
        <div className="absolute top-16 right-4 z-20 w-72 p-4 bg-bg-surface border border-accent-cyan rounded shadow-cyan-glow-heavy text-left animate-fade-in">
          <div className="flex items-center justify-between border-b border-accent-cyan-dim/30 pb-2 mb-2">
            <div className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: selectedNode.color }}
              />
              <span className="text-[10px] font-mono uppercase font-bold text-accent-cyan truncate">
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
            <div className="text-[11px] text-text-secondary leading-relaxed">
              {selectedNode.label}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-bg-base border border-accent-cyan-dim/30 text-text-secondary uppercase">
                {selectedNode.type}
              </span>
              {selectedNode.confidence && (
                <span className="text-[9px] text-accent-cyan font-semibold">
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
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#22d3ee]" />
            Root Target
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#818cf8]" />
            Sherlock / GitHub
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#34d399]" />
            Holehe
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#06b6d4]" />
            crt.sh / DNS
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#f43f5e]" />
            h8mail Breach
          </span>
        </div>
        <span className="text-text-muted hidden sm:inline">
          Toggle 3D Globe / 2D Tactical Graph • Click nodes to fan-out
        </span>
      </div>
    </div>
  );
}
