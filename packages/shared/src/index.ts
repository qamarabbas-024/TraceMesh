export type InputType = 'email' | 'username' | 'phone' | 'image' | 'domain' | 'ip';

export type ToolTier = 'tier1' | 'tier2';

export interface HealthStatus {
  status: 'ok' | 'error';
  timestamp: string;
  uptime: number;
  service: string;
}
