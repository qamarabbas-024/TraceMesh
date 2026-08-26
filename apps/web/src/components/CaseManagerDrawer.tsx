'use client';

import { useState, useEffect } from 'react';
import {
  Briefcase,
  Plus,
  Trash2,
  FolderOpen,
  Pin,
  X,
  FileText,
  Shield,
  Tag,
  Clock,
  ArrowRight,
} from 'lucide-react';
import {
  type CaseFile,
  getCases,
  saveCase,
  createNewCase,
  deleteCase,
} from '@/lib/casesStore';
import type { InputType } from '@tracemesh/shared';

interface CaseManagerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectEntity: (value: string, type: InputType) => void;
}

export function CaseManagerDrawer({
  isOpen,
  onClose,
  onSelectEntity,
}: CaseManagerDrawerProps) {
  const [cases, setCases] = useState<CaseFile[]>([]);
  const [selectedCase, setSelectedCase] = useState<CaseFile | null>(null);
  const [newCaseName, setNewCaseName] = useState('');
  const [newCaseCodename, setNewCaseCodename] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const loadAllCases = () => {
    const list = getCases();
    setCases(list);
    if (!selectedCase && list.length > 0) {
      setSelectedCase(list[0]);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadAllCases();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCaseName.trim()) return;
    const created = createNewCase(newCaseName.trim(), newCaseCodename.trim() || undefined);
    setNewCaseName('');
    setNewCaseCodename('');
    setIsCreating(false);
    loadAllCases();
    setSelectedCase(created);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteCase(id);
    const remaining = getCases();
    setCases(remaining);
    if (selectedCase?.id === id) {
      setSelectedCase(remaining[0] || null);
    }
  };

  const handleNotesChange = (notes: string) => {
    if (!selectedCase) return;
    const updated = { ...selectedCase, notes };
    setSelectedCase(updated);
    saveCase(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-bg-base/70 backdrop-blur-sm animate-fade-in font-mono">
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      <div className="relative w-full max-w-xl h-full bg-bg-surface/95 border-l border-accent-cyan/60 p-6 flex flex-col justify-between shadow-cyan-glow-heavy z-10 overflow-y-auto">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-accent-cyan-dim/30 pb-3">
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-accent-cyan" />
              <span className="text-xs font-bold uppercase tracking-wider text-text-primary">
                Tactical Case Dossier Manager
              </span>
            </div>

            <button
              onClick={onClose}
              className="p-1 text-text-muted hover:text-text-primary transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Case Selector Tabs & New Case Trigger */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] text-text-secondary uppercase">Active Operations:</span>
            <button
              onClick={() => setIsCreating(!isCreating)}
              className="flex items-center gap-1 px-2 py-1 text-[10px] bg-accent-cyan/15 border border-accent-cyan/50 text-accent-cyan rounded hover:bg-accent-cyan hover:text-bg-base transition-all"
            >
              <Plus className="w-3 h-3" />
              <span>New Case</span>
            </button>
          </div>

          {isCreating && (
            <form onSubmit={handleCreate} className="p-3 bg-bg-surface-raised border border-accent-cyan rounded space-y-2">
              <input
                type="text"
                value={newCaseName}
                onChange={(e) => setNewCaseName(e.target.value)}
                placeholder="Case Name (e.g. Operation Shadow Ghost)"
                className="w-full p-2 bg-bg-base border border-accent-cyan-dim/30 rounded text-xs text-text-primary placeholder:text-text-muted outline-none"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCaseCodename}
                  onChange={(e) => setNewCaseCodename(e.target.value)}
                  placeholder="Codename (optional e.g. OP-9402)"
                  className="flex-1 p-2 bg-bg-base border border-accent-cyan-dim/30 rounded text-xs text-text-primary placeholder:text-text-muted outline-none"
                />
                <button
                  type="submit"
                  className="px-3 py-2 bg-accent-cyan text-bg-base font-bold text-xs rounded uppercase"
                >
                  Create
                </button>
              </div>
            </form>
          )}

          {/* Case List Horizontal Carousel */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {cases.map((c) => {
              const isSelected = selectedCase?.id === c.id;
              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedCase(c)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded border text-xs cursor-pointer shrink-0 transition-all ${
                    isSelected
                      ? 'bg-accent-cyan text-bg-base font-bold border-accent-cyan shadow-cyan-glow'
                      : 'bg-bg-surface-raised border-accent-cyan-dim/30 text-text-secondary hover:border-accent-cyan/50'
                  }`}
                >
                  <span>{c.codename}</span>
                  <button
                    onClick={(e) => handleDelete(e, c.id)}
                    className="hover:text-status-error ml-1"
                    title="Delete case"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Active Case Details */}
          {selectedCase ? (
            <div className="space-y-4 pt-2">
              <div className="p-3.5 bg-bg-surface-raised border border-accent-cyan-dim/30 rounded space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-accent-cyan uppercase">
                    {selectedCase.name}
                  </span>
                  <span className="text-[10px] text-text-secondary">
                    {new Date(selectedCase.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1 pt-1">
                  {selectedCase.tags.map((t, idx) => (
                    <span
                      key={idx}
                      className="text-[9px] px-1.5 py-0.5 rounded bg-bg-base border border-accent-cyan-dim/30 text-text-secondary uppercase"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              </div>

              {/* Pinned Evidence Nodes */}
              <div className="p-3 bg-bg-surface-raised border border-accent-cyan-dim/25 rounded space-y-2">
                <div className="flex items-center justify-between text-[10px] uppercase font-bold text-text-secondary">
                  <span className="flex items-center gap-1.5">
                    <Pin className="w-3 h-3 text-accent-cyan" />
                    <span>Pinned Target Nodes ({selectedCase.pinnedEntities.length})</span>
                  </span>
                </div>

                {selectedCase.pinnedEntities.length === 0 ? (
                  <p className="text-[11px] text-text-muted italic">
                    No nodes pinned to this case yet. Click pin on any entity card during recon.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {selectedCase.pinnedEntities.map((e, idx) => (
                      <div
                        key={idx}
                        className="p-2 bg-bg-base border border-accent-cyan-dim/20 rounded flex items-center justify-between text-xs"
                      >
                        <span className="text-text-primary truncate">{e.value}</span>
                        <button
                          onClick={() => onSelectEntity(e.value, (e.type as InputType) || 'username')}
                          className="text-accent-cyan hover:underline text-[10px] flex items-center gap-1"
                        >
                          <span>Scan</span>
                          <ArrowRight className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Analyst Intelligence Notes */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-text-secondary">
                  Analyst Operational Notes:
                </label>
                <textarea
                  rows={6}
                  value={selectedCase.notes}
                  onChange={(e) => handleNotesChange(e.target.value)}
                  placeholder="Record investigation hypotheses, correlation links, and cross-source evidence notes here..."
                  className="w-full p-3 bg-bg-base border border-accent-cyan-dim/30 rounded text-xs text-text-primary placeholder:text-text-muted focus:border-accent-cyan outline-none resize-none leading-relaxed"
                />
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-text-muted">
              No active case files. Click &apos;New Case&apos; to create an investigation dossier.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-accent-cyan-dim/30 flex justify-between items-center text-[10px] text-text-muted">
          <span>TraceMesh Tactical Case Manager</span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-bg-surface-raised border border-accent-cyan-dim/40 hover:border-accent-cyan text-text-primary rounded"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
