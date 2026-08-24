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

  // Filter tools matching the current input type
  const matchingTools = useMemo(() => {
    return tools.filter((t) => t.inputTypes.includes(detectedType));
  }, [tools, detectedType]);

  // Auto-select all matching tools when input type changes or first loads
  useEffect(() => {
    if (matchingTools.length > 0) {
      setSelectedToolIds(new Set(matchingTools.map((t) => t.id)));
    } else {
      setSelectedToolIds(new Set());
    }
  }, [matchingTools]);

  const toggleTool = (toolId: string) => {
    setSelectedToolIds((prev) => {
      const next = new Set(prev);
      if (next.has(toolId)) {
        next.delete(toolId);
      } else {
        next.add(toolId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedToolIds.size === matchingTools.length) {
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
      await fetch(`${apiUrl}/tools/${toolId}/update`, { method: 'POST' });
      await fetchTools();
    } catch (err) {
      console.error('Failed to update tool:', err);
    } finally {
      setUpdatingToolId(null);
    }
  };

  const isAllSelected = matchingTools.length > 0 && selectedToolIds.size === matchingTools.length;

  const handleInputChange = (val: string) => {
    setInputValue(val);
    setManualInputType(null); // Reset manual override on fresh typing
  };

  return (
    <div className="w-full max-w-3xl space-y-6">
      {/* Domain / Input Type Switcher Tabs */}
      <div className="flex flex-wrap items-center justify-center gap-1.5 p-1 bg-bg-surface border border-accent-cyan-dim/30 rounded">
        {SUPPORTED_INPUT_TYPES.map(({ type, label }) => {
          const isActive = detectedType === type;
          return (
            <button
              key={type}
              onClick={() => setManualInputType(type)}
              className={`px-3 py-1.5 text-xs font-mono tracking-wider uppercase transition-all rounded ${
                isActive
                  ? 'bg-accent-cyan text-bg-base font-semibold shadow-cyan-glow'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-surface-raised'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Main HUD Search / Command Bar */}
      <div className="relative border border-accent-cyan-dim/60 bg-bg-surface/90 backdrop-blur-md p-2 rounded shadow-cyan-glow flex items-center gap-3">
        <div className="pl-3 text-accent-cyan">
          <Terminal className="w-5 h-5" />
        </div>

        <input
          type="text"
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder={`Enter ${detectedType} identifier (e.g. ${
            detectedType === 'email'
              ? 'target@domain.com'
              : detectedType === 'username'
              ? 'johndoe'
              : detectedType === 'ip'
              ? '8.8.8.8'
              : detectedType === 'phone'
              ? '+14155552671'
              : detectedType === 'domain'
              ? 'example.com'
              : 'image url / hash'
          })...`}
          className="flex-1 bg-transparent border-none outline-none text-text-primary placeholder:text-text-secondary font-mono text-sm py-2"
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
          className="flex items-center gap-2 px-5 py-2.5 bg-accent-cyan text-bg-base font-semibold text-xs uppercase tracking-wider font-mono rounded hover:bg-cyan-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-cyan-glow"
        >
          <span>Run Intel</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Matching Tools Section */}
      <div className="border border-accent-cyan-dim/40 bg-bg-surface/85 backdrop-blur-md p-5 rounded space-y-4">
        {/* Header with Select All */}
        <div className="flex items-center justify-between border-b border-accent-cyan-dim/20 pb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-accent-cyan" />
            <span className="text-xs uppercase tracking-wider font-mono text-accent-cyan font-semibold">
              Available Modules ({matchingTools.length})
            </span>
          </div>

          <button
            onClick={toggleSelectAll}
            disabled={matchingTools.length === 0}
            className="flex items-center gap-1.5 text-xs font-mono text-text-secondary hover:text-accent-cyan transition-colors disabled:opacity-50"
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

        {/* Tool Cards List */}
        {loading ? (
          <div className="py-8 text-center text-xs font-mono text-text-secondary">
            <div className="inline-block w-6 h-6 border-2 border-accent-cyan border-t-transparent rounded-full animate-spin mb-2" />
            <p>Querying tool registry...</p>
          </div>
        ) : matchingTools.length === 0 ? (
          <div className="py-6 text-center text-xs font-mono text-text-muted">
            No active tools registered for input type &apos;{detectedType}&apos; yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {matchingTools.map((tool) => {
              const isSelected = selectedToolIds.has(tool.id);
              return (
                <div
                  key={tool.id}
                  onClick={() => toggleTool(tool.id)}
                  className={`p-4 rounded border transition-all cursor-pointer select-none text-left flex flex-col justify-between relative ${
                    isSelected
                      ? 'bg-bg-surface-raised border-accent-cyan shadow-cyan-glow'
                      : 'bg-bg-surface-raised/40 border-accent-cyan-dim/30 hover:border-accent-cyan-dim'
                  }`}
                >
                  {/* Amber dot for update available (DESIGN.md Section 4) */}
                  {tool.updateAvailable && (
                    <div
                      className="absolute top-2.5 right-2.5 flex items-center gap-1 px-1.5 py-0.5 rounded bg-accent-amber/15 border border-accent-amber/60 text-accent-amber text-[9px] font-mono uppercase"
                      title="Update Available from upstream repository"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-accent-amber animate-pulse" />
                      <span>Update</span>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-2 pr-12">
                      <div className="flex items-center gap-2">
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-accent-cyan shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-text-muted shrink-0" />
                        )}
                        <span className="text-sm font-semibold text-text-primary tracking-wide">
                          {tool.displayName}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-bg-base border border-accent-cyan-dim/30 text-accent-cyan uppercase">
                          {tool.category}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-bg-base text-text-muted uppercase">
                          {tool.tier}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed mb-3">
                      {tool.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-accent-cyan-dim/10 text-[10px] font-mono text-text-muted">
                    <div className="flex items-center gap-2">
                      <span>v{tool.trackedVersion}</span>
                      {tool.updateAvailable && (
                        <button
                          onClick={(e) => handleUpdateTool(e, tool.id)}
                          disabled={updatingToolId === tool.id}
                          className="flex items-center gap-1 text-accent-amber hover:underline"
                        >
                          <RefreshCw className={`w-3 h-3 ${updatingToolId === tool.id ? 'animate-spin' : ''}`} />
                          <span>Re-pull</span>
                        </button>
                      )}
                    </div>

                    {tool.sourceUrl && (
                      <span className="flex items-center gap-1 text-accent-cyan-dim hover:text-accent-cyan">
                        <span>Repo</span>
                        <ExternalLink className="w-3 h-3" />
                      </span>
                    )}
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
