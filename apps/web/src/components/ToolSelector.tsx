'use client';

import { useState, useEffect, useMemo } from 'react';
import type { ToolDTO, InputType } from '@tracemesh/shared';
import { detectInputType } from '@/lib/detector';
import {
  Search,
  CheckSquare,
  Square,
  Shield,
  Layers,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Terminal,
  AlertCircle,
  RefreshCw,
  Star,
  Filter,
  Activity,
  Zap,
  Radio,
} from 'lucide-react';

const SUPPORTED_INPUT_TYPES: { type: InputType; label: string }[] = [
  { type: 'email', label: 'Email' },
  { type: 'username', label: 'Username' },
  { type: 'phone', label: 'Phone' },
  { type: 'image', label: 'Image' },
  { type: 'domain', label: 'Domain' },
  { type: 'ip', label: 'IP Address' },
];

interface ToolSelectorProps {
  onRun?: (inputValue: string, inputType: InputType, selectedToolIds: string[]) => void;
}

export function ToolSelector({ onRun }: ToolSelectorProps) {
  const [inputValue, setInputValue] = useState('');
  const [manualInputType, setManualInputType] = useState<InputType | null>(null);
  const [tools, setTools] = useState<ToolDTO[]>([]);
  const [selectedToolIds, setSelectedToolIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [updatingToolId, setUpdatingToolId] = useState<string | null>(null);
  const [toolSearchQuery, setToolSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  // Load favorites from localStorage
  useEffect(() => {
    try {
      const savedFavs = localStorage.getItem('tracemesh_tool_favorites');
      if (savedFavs) {
        setFavorites(new Set(JSON.parse(savedFavs)));
      }
    } catch {}
  }, []);

  const toggleFavorite = (e: React.MouseEvent, toolId: string) => {
    e.stopPropagation();
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(toolId)) next.delete(toolId);
      else next.add(toolId);
      try {
        localStorage.setItem('tracemesh_tool_favorites', JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  };

  // Auto-detect input type unless manually selected
  const detectedType = useMemo(() => {
    return manualInputType || detectInputType(inputValue);
  }, [inputValue, manualInputType]);

  // Fetch tools from API
  const fetchTools = async () => {
    setLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${apiUrl}/tools`, { cache: 'no-store' });
      if (res.ok) {
        const data: ToolDTO[] = await res.json();
        setTools(data);
      }
    } catch (err) {
      console.error('Failed to fetch tools:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTools();
  }, []);

  // Filter tools matching input type, category, and search query, with favorites sorted first
  const matchingTools = useMemo(() => {
    return tools
      .filter((t) => {
        const matchesInput = t.inputTypes.includes(detectedType);
        const matchesCategory = categoryFilter === 'all' || t.category === categoryFilter;
        const matchesSearch =
          !toolSearchQuery ||
          t.displayName.toLowerCase().includes(toolSearchQuery.toLowerCase()) ||
          t.name.toLowerCase().includes(toolSearchQuery.toLowerCase()) ||
          t.description.toLowerCase().includes(toolSearchQuery.toLowerCase());
        return matchesInput && matchesCategory && matchesSearch;
      })
      .sort((a, b) => {
        const aFav = favorites.has(a.id) ? 1 : 0;
        const bFav = favorites.has(b.id) ? 1 : 0;
        return bFav - aFav;
      });
  }, [tools, detectedType, categoryFilter, toolSearchQuery, favorites]);

  // Auto-select all matching tools on type change if none currently selected
  useEffect(() => {
    if (matchingTools.length > 0) {
      setSelectedToolIds(new Set(matchingTools.map((t) => t.id)));
    }
  }, [detectedType, tools]);

  const toggleTool = (toolId: string) => {
    setSelectedToolIds((prev) => {
      const next = new Set(prev);
      if (next.has(toolId)) next.delete(toolId);
      else next.add(toolId);
      return next;
    });
  };

  const isAllSelected = matchingTools.length > 0 && selectedToolIds.size === matchingTools.length;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedToolIds(new Set());
    } else {
      setSelectedToolIds(new Set(matchingTools.map((t) => t.id)));
    }
  };

  const handleUpdateTool = async (e: React.MouseEvent, toolId: string) => {
    e.stopPropagation();
    setUpdatingToolId(toolId);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${apiUrl}/tools/${toolId}/update`, {
        method: 'POST',
      });
      if (res.ok) {
        await fetchTools();
      }
    } catch (err) {
      console.error('Failed to update tool:', err);
    } finally {
      setUpdatingToolId(null);
    }
  };

  return (
    <div className="w-full max-w-3xl space-y-5 text-left font-mono">
      {/* Category Filter Switcher Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-accent-cyan-dim/20 pb-2">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-[11px] uppercase tracking-wider text-text-secondary mr-1 flex items-center gap-1">
            <Radio className="w-3 h-3 text-accent-cyan" />
            Domain:
          </span>
          {SUPPORTED_INPUT_TYPES.map(({ type, label }) => {
            const isActive = detectedType === type;
            return (
              <button
                key={type}
                onClick={() => {
                  setManualInputType(type);
                  setCategoryFilter('all');
                }}
                className={`px-3 py-1 rounded transition-all text-xs font-mono uppercase tracking-wider ${
                  isActive
                    ? 'bg-accent-cyan text-bg-base font-bold shadow-cyan-glow'
                    : 'bg-bg-surface border border-accent-cyan-dim/30 text-text-secondary hover:text-text-primary hover:border-accent-cyan'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {manualInputType && (
          <button
            onClick={() => setManualInputType(null)}
            className="text-[10px] text-text-muted hover:text-accent-cyan underline transition-colors"
          >
            Auto-Detect
          </button>
        )}
      </div>

      {/* Primary Cyber Input Surface */}
      <div className="flex items-center gap-3 p-2 bg-bg-surface/90 border border-accent-cyan-dim/40 rounded-lg shadow-cyan-glow focus-within:border-accent-cyan focus-within:shadow-cyan-glow-heavy transition-all">
        <div className="pl-3 text-accent-cyan">
          <Terminal className="w-5 h-5" />
        </div>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            if (manualInputType) setManualInputType(null);
          }}
          placeholder={`Enter target ${detectedType} (e.g. ${
            detectedType === 'email'
              ? 'target@organization.com'
              : detectedType === 'username'
              ? 'octocat'
              : detectedType === 'ip'
              ? '1.1.1.1'
              : detectedType === 'phone'
              ? '+14155552671'
              : detectedType === 'domain'
              ? 'github.com'
              : 'image url / hash'
          })...`}
          className="flex-1 bg-transparent border-none outline-none text-text-primary placeholder:text-text-muted font-mono text-sm py-2"
        />

        {/* Live Detected Tag */}
        <div className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-mono uppercase bg-bg-surface-raised border border-accent-cyan-dim/40 text-accent-cyan rounded">
          <Sparkles className="w-3 h-3 text-accent-cyan" />
          <span>{detectedType}</span>
        </div>

        {/* Launch Execution Button */}
        <button
          onClick={() => onRun && onRun(inputValue, detectedType, Array.from(selectedToolIds))}
          disabled={!inputValue.trim() || selectedToolIds.size === 0}
          className="flex items-center gap-2 px-5 py-2.5 bg-accent-cyan text-bg-base font-bold text-xs uppercase tracking-wider font-mono rounded hover:bg-cyan-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-cyan-glow"
        >
          <span>Run Intel</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Available Modules Grid */}
      <div className="border border-accent-cyan-dim/40 bg-bg-surface/85 backdrop-blur-md p-5 rounded space-y-4 shadow-cyan-glow">
        {/* Header with Search and Select All */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-accent-cyan-dim/20 pb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-accent-cyan" />
            <span className="text-xs uppercase tracking-wider font-mono text-accent-cyan font-semibold">
              Available Intelligence Modules ({matchingTools.length})
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Filter */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-bg-surface-raised border border-accent-cyan-dim/30 rounded text-xs font-mono text-text-primary">
              <Search className="w-3.5 h-3.5 text-accent-cyan-dim" />
              <input
                type="text"
                value={toolSearchQuery}
                onChange={(e) => setToolSearchQuery(e.target.value)}
                placeholder="Filter tools..."
                className="bg-transparent border-none outline-none text-xs w-28 sm:w-36 text-text-primary placeholder:text-text-muted"
              />
            </div>

            <button
              onClick={toggleSelectAll}
              disabled={matchingTools.length === 0}
              className="flex items-center gap-1.5 text-xs font-mono text-text-secondary hover:text-accent-cyan transition-colors disabled:opacity-50 shrink-0"
            >
              {isAllSelected ? (
                <CheckSquare className="w-4 h-4 text-accent-cyan" />
              ) : (
                <Square className="w-4 h-4 text-text-muted" />
              )}
              <span>
                {isAllSelected ? 'Deselect All' : 'Select All'} ({selectedToolIds.size}/
                {matchingTools.length})
              </span>
            </button>
          </div>
        </div>

        {/* Tool Cards List */}
        {loading ? (
          <div className="py-8 text-center text-xs font-mono text-text-secondary">
            <div className="inline-block w-6 h-6 border-2 border-accent-cyan border-t-transparent rounded-full animate-spin mb-2" />
            <p>Querying tool registry...</p>
          </div>
        ) : matchingTools.length === 0 ? (
          <div className="py-6 text-center text-xs font-mono text-text-muted">
            No active tools matching query &apos;{toolSearchQuery}&apos; for &apos;{detectedType}&apos;.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {matchingTools.map((tool) => {
              const isSelected = selectedToolIds.has(tool.id);
              const isFav = favorites.has(tool.id);
              return (
                <div
                  key={tool.id}
                  onClick={() => toggleTool(tool.id)}
                  className={`p-4 rounded border transition-all cursor-pointer select-none text-left flex flex-col justify-between relative group ${
                    isSelected
                      ? 'bg-bg-surface-raised border-accent-cyan shadow-cyan-glow'
                      : 'bg-bg-surface-raised/40 border-accent-cyan-dim/30 hover:border-accent-cyan/60'
                  }`}
                >
                  {/* Top Right Controls (Favorite Star & Update Badge) */}
                  <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                    {tool.updateAvailable && (
                      <div
                        className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-accent-amber/15 border border-accent-amber/60 text-accent-amber text-[9px] font-mono uppercase"
                        title="Update Available from upstream repository"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-accent-amber animate-pulse" />
                        <span>Update</span>
                      </div>
                    )}
                    <button
                      onClick={(e) => toggleFavorite(e, tool.id)}
                      className={`p-1 rounded hover:bg-bg-base transition-colors ${
                        isFav ? 'text-accent-amber' : 'text-text-muted hover:text-text-secondary'
                      }`}
                      title={isFav ? 'Unfavorite tool' : 'Favorite tool (pins to top)'}
                    >
                      <Star className={`w-3.5 h-3.5 ${isFav ? 'fill-accent-amber' : ''}`} />
                    </button>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2 pr-16">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center ${
                            isSelected
                              ? 'border-accent-cyan bg-accent-cyan/20 text-accent-cyan'
                              : 'border-accent-cyan-dim/40 bg-bg-surface text-transparent'
                          }`}
                        >
                          <CheckSquare className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-semibold text-xs text-text-primary uppercase tracking-wider font-mono">
                          {tool.displayName}
                        </span>
                      </div>
                    </div>

                    <p className="text-[11px] text-text-secondary leading-relaxed mb-3 line-clamp-2 font-mono">
                      {tool.description}
                    </p>
                  </div>

                  {/* Card Telemetry Footer & Execution Waveform */}
                  <div className="pt-2 border-t border-accent-cyan-dim/15 flex items-center justify-between text-[10px] text-text-muted font-mono">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-bg-base text-accent-cyan border border-accent-cyan-dim/30 uppercase text-[9px]">
                        {tool.executionType}
                      </span>
                      <span>v{tool.trackedVersion}</span>
                    </div>

                    {/* Animated execution waveform */}
                    <div className="flex items-center gap-0.5">
                      <span className="w-0.5 h-2 bg-accent-cyan-dim animate-pulse" />
                      <span className="w-0.5 h-3.5 bg-accent-cyan animate-pulse delay-75" />
                      <span className="w-0.5 h-2.5 bg-accent-cyan-dim animate-pulse delay-150" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
