'use client';

import { useState } from 'react';
import type { DiscoveredEntity, InputType } from '@tracemesh/shared';
import { UploadCloud, FileText, Sparkles, X, ArrowRight, Check, Search, Terminal } from 'lucide-react';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectEntity: (value: string, type: InputType) => void;
}

export function ImportModal({ isOpen, onClose, onSelectEntity }: ImportModalProps) {
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [extractedEntities, setExtractedEntities] = useState<DiscoveredEntity[]>([]);
  const [hasParsed, setHasParsed] = useState(false);

  if (!isOpen) return null;

  const handleParse = async () => {
    if (!inputText.trim()) return;
    setLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const isJSON = inputText.trim().startsWith('{') || inputText.trim().startsWith('[');
      const endpoint = isJSON ? '/import/chat' : '/import/text';
      const body = isJSON ? JSON.parse(inputText) : { text: inputText };

      const res = await fetch(`${apiUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        setExtractedEntities(data.entities || []);
        setHasParsed(true);
      }
    } catch (err) {
      console.error('Import parse error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg-overlay backdrop-blur-sm animate-fade-in text-left select-none">
      <div className="w-full max-w-2xl max-h-[85vh] bg-bg-surface border border-accent-cyan-dim/40 rounded p-6 shadow-cyan-glow flex flex-col justify-between overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-accent-cyan-dim/25 pb-4 mb-4">
          <div className="flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-accent-cyan" />
            <h2 className="text-sm font-mono uppercase tracking-widest text-accent-cyan font-bold">
              Intelligence Transcript & Chat Importer
            </h2>
          </div>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Input Textarea */}
        <div className="space-y-4 flex-1 overflow-y-auto pr-1">
          <div>
            <label className="block text-[11px] font-mono uppercase text-text-secondary mb-1.5">
              Paste Chat Transcript, Telegram Log, or LLM JSON Export
            </label>
            <textarea
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                setHasParsed(false);
              }}
              rows={5}
              placeholder={`Paste unformatted intelligence notes or chat logs here...\nExample: Contacted @cyberhawk via email target@example.com, IP address was 192.168.1.1 and site is target-recon.org`}
              className="w-full p-3 bg-bg-surface-raised border border-accent-cyan-dim/30 rounded focus:border-accent-cyan outline-none text-xs font-mono text-text-primary placeholder:text-text-muted resize-none leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-text-muted">
              Auto-extracts emails, usernames, IPs, domains, and phone identifiers
            </span>
            <button
              onClick={handleParse}
              disabled={!inputText.trim() || loading}
              className="flex items-center gap-1.5 px-4 py-2 bg-accent-cyan text-bg-base font-semibold font-mono text-xs uppercase tracking-wider rounded hover:bg-cyan-300 transition-all disabled:opacity-40 shadow-cyan-glow"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-bg-base border-t-transparent rounded-full animate-spin" />
                  <span>Extracting...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Extract Entities</span>
                </>
              )}
            </button>
          </div>

          {/* Parsed Entities Stream */}
          {hasParsed && (
            <div className="p-4 bg-bg-surface-raised/70 border border-accent-cyan-dim/30 rounded space-y-3">
              <div className="flex items-center justify-between border-b border-accent-cyan-dim/20 pb-2">
                <span className="text-xs font-mono uppercase text-accent-cyan font-semibold">
                  Discovered Target Identifiers ({extractedEntities.length})
                </span>
                <span className="text-[10px] font-mono text-text-muted">
                  Click any node to populate search
                </span>
              </div>

              {extractedEntities.length === 0 ? (
                <div className="py-4 text-center text-xs font-mono text-text-muted">
                  No recognizable OSINT entities detected in provided text.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1">
                  {extractedEntities.map((e, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-bg-base/90 border border-accent-cyan-dim/25 rounded flex items-center justify-between text-xs font-mono"
                    >
                      <div className="space-y-0.5 overflow-hidden pr-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-accent-cyan/15 border border-accent-cyan/40 text-accent-cyan uppercase">
                            {e.type}
                          </span>
                          <span className="text-text-primary font-semibold truncate">{e.value}</span>
                        </div>
                        <div className="text-[10px] text-text-secondary truncate">{e.label}</div>
                      </div>

                      <button
                        onClick={() => {
                          onSelectEntity(e.value, e.type as InputType);
                          onClose();
                        }}
                        className="flex items-center gap-1 px-3 py-1 bg-accent-cyan/20 border border-accent-cyan hover:bg-accent-cyan hover:text-bg-base text-accent-cyan text-[11px] font-semibold rounded transition-all shrink-0 shadow-cyan-glow"
                      >
                        <span>Investigate</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-accent-cyan-dim/20 text-center text-[10px] font-mono text-text-muted">
          Import Pipeline v3.37 • NLP Entity Extraction & Instant Investigation Dispatch
        </div>
      </div>
    </div>
  );
}
