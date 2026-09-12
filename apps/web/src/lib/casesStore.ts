import type { DiscoveredEntity, AggregatedReport } from '@tracemesh/shared';

export interface CaseFile {
  id: string;
  name: string;
  codename: string;
  createdAt: string;
  notes: string;
  tags: string[];
  pinnedEntities: DiscoveredEntity[];
  runs: AggregatedReport[];
}

const STORAGE_KEY = 'tracemesh_cases_store';

export function getCases(): CaseFile[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Sanitize and ensure proper CaseFile shape
    return parsed.filter(
      (c) => c && typeof c === 'object' && typeof c.id === 'string' && typeof c.name === 'string',
    ).map((c) => ({
      id: c.id,
      name: String(c.name || 'Untitled Case'),
      codename: String(c.codename || 'OP-0000'),
      createdAt: typeof c.createdAt === 'string' ? c.createdAt : new Date().toISOString(),
      notes: typeof c.notes === 'string' ? c.notes : '',
      tags: Array.isArray(c.tags) ? c.tags.map(String) : ['active-investigation'],
      pinnedEntities: Array.isArray(c.pinnedEntities) ? c.pinnedEntities : [],
      runs: Array.isArray(c.runs) ? c.runs : [],
    }));
  } catch (err) {
    console.warn('Failed to parse cases from storage:', err);
    return [];
  }
}

export function saveCase(caseFile: CaseFile): void {
  if (typeof window === 'undefined' || !caseFile || !caseFile.id) return;
  try {
    const cases = getCases();
    const idx = cases.findIndex((c) => c.id === caseFile.id);
    if (idx >= 0) {
      cases[idx] = caseFile;
    } else {
      cases.unshift(caseFile);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cases));
  } catch (err) {
    console.error('Failed to save case:', err);
  }
}

export function createNewCase(name: string, codename?: string): CaseFile {
  const newCase: CaseFile = {
    id: `case_${Date.now()}`,
    name,
    codename: codename || `OP-${Math.floor(1000 + Math.random() * 9000)}`,
    createdAt: new Date().toISOString(),
    notes: '',
    tags: ['active-investigation'],
    pinnedEntities: [],
    runs: [],
  };
  saveCase(newCase);
  return newCase;
}

export function deleteCase(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const cases = getCases().filter((c) => c.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cases));
  } catch {}
}
