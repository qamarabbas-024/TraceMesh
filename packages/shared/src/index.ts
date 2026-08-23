export type InputType = 'email' | 'username' | 'phone' | 'image' | 'domain' | 'ip';

export type ToolTier = 'tier1' | 'tier2';

export type ExecutionType = 'edge' | 'container' | 'link';

export type ToolCategory = 'email' | 'username' | 'phone' | 'image' | 'domain' | 'ip' | 'framework' | 'reputation';

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
