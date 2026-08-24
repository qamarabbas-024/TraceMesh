export type InputType = 'email' | 'username' | 'phone' | 'image' | 'domain' | 'ip';

export type ToolTier = 'tier1' | 'tier2';

export type ExecutionType = 'edge' | 'container' | 'link';

export type ToolCategory =
  | 'email'
  | 'username'
  | 'phone'
  | 'image'
  | 'domain'
  | 'ip'
  | 'framework'
  | 'reputation';

export interface HealthStatus {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  uptime: number;
  service: string;
  version: string;
  database: {
    status: 'connected' | 'disconnected';
    latencyMs?: number;
  };
}

export interface ToolDTO {
  id: string;
  name: string;
  displayName: string;
  description: string;
  category: ToolCategory | string;
  inputTypes: InputType[];
  tier: ToolTier;
  executionType: ExecutionType;
  sourceUrl?: string | null;
  trackedVersion: string;
  lastCheckedCommit?: string | null;
  updateAvailable: boolean;
  license?: string | null;
  maintenanceStatus: 'active' | 'deprecated' | 'unverified';
  inputSchema?: Record<string, any> | null;
  outputSchema?: Record<string, any> | null;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateToolDTO {
  name: string;
  displayName: string;
  description: string;
  category: ToolCategory | string;
  inputTypes: InputType[];
  tier?: ToolTier;
  executionType?: ExecutionType;
  sourceUrl?: string;
  trackedVersion?: string;
  license?: string;
  maintenanceStatus?: 'active' | 'deprecated' | 'unverified';
  inputSchema?: Record<string, any>;
  outputSchema?: Record<string, any>;
  isEnabled?: boolean;
}

export interface DiscoveredEntity {
  type: InputType | 'platform' | 'breach' | 'record' | 'metadata';
  value: string;
  label: string;
  sourceTool: string;
  confidence?: number;
  metadata?: Record<string, any>;
}

export interface NormalizedResult {
  status: 'success' | 'error' | 'running';
  summary: string;
  entities: DiscoveredEntity[];
  raw?: any;
  error?: string;
  durationMs?: number;
}

export interface BatchRunRequest {
  inputValue: string;
  inputType: InputType;
  toolIds: string[];
  bypassCache?: boolean;
}

export interface AggregatedReport {
  runId: string;
  root: {
    value: string;
    type: InputType;
  };
  entities: DiscoveredEntity[];
  toolResults: {
    toolId: string;
    toolName: string;
    displayName: string;
    status: 'success' | 'error' | 'timeout';
    durationMs: number;
    summary: string;
    entitiesCount: number;
    error?: string;
  }[];
  stats: {
    totalTools: number;
    successCount: number;
    errorCount: number;
    totalEntities: number;
    durationMs: number;
    cached: boolean;
  };
  createdAt: string;
}
