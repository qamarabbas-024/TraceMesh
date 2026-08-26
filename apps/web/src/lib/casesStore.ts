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
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveCase(caseFile: CaseFile): void {
  if (typeof window === 'undefined') return;
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
