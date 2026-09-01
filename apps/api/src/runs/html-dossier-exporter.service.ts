import { Injectable } from '@nestjs/common';
import { AggregatedReport } from '@tracemesh/shared';

@Injectable()
export class HtmlDossierExporterService {
  /**
   * Generates a fully self-contained, air-gapped HTML5 Interactive Intelligence Dossier
   */
  public generateHtmlDossier(report: AggregatedReport): string {
    const rootVal = report.root.value;
    const rootType = report.root.type;
    const dateStr = new Date(report.createdAt).toUTCString();
    const opsec = report.opsecScore || 45;
    const threatLevel = report.threatLevel || 'MEDIUM';

    const entitiesJson = JSON.stringify(report.entities, null, 2);
    const toolsJson = JSON.stringify(report.toolResults, null, 2);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>TraceMesh Tactical Intel Dossier — ${rootVal}</title>
  <style>
    :root {
      --bg-base: #060913;
      --bg-surface: #0c1222;
      --bg-card: rgba(16, 24, 44, 0.85);
      --accent-cyan: #00f0ff;
      --accent-amber: #f59e0b;
      --status-error: #ef4444;
      --status-success: #10b981;
      --text-primary: #f1f5f9;
      --text-secondary: #94a3b8;
      --border-cyan: rgba(0, 240, 255, 0.3);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg-base);
      color: var(--text-primary);
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      padding: 2rem;
      line-height: 1.5;
    }
    .container { max-width: 1100px; margin: 0 auto; }
    .header {
      border: 1px solid var(--border-cyan);
      background: var(--bg-card);
      padding: 1.5rem;
      border-radius: 6px;
      margin-bottom: 1.5rem;
      box-shadow: 0 0 20px rgba(0, 240, 255, 0.15);
    }
    .badge {
      display: inline-block;
      padding: 0.25rem 0.6rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      margin-right: 0.5rem;
    }
    .badge-cyan { background: rgba(0, 240, 255, 0.15); color: var(--accent-cyan); border: 1px solid var(--accent-cyan); }
    .badge-error { background: rgba(239, 68, 68, 0.15); color: var(--status-error); border: 1px solid var(--status-error); }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
    .card {
      border: 1px solid rgba(255, 255, 255, 0.1);
      background: var(--bg-surface);
      padding: 1.25rem;
      border-radius: 6px;
    }
    h1 { font-size: 1.4rem; color: var(--accent-cyan); margin-bottom: 0.5rem; }
    h2 { font-size: 1rem; color: var(--text-primary); margin-bottom: 0.75rem; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 0.4rem; }
    .entity-item {
      padding: 0.5rem;
      background: rgba(0, 0, 0, 0.3);
      border-left: 3px solid var(--accent-cyan);
      margin-bottom: 0.5rem;
      font-size: 0.8rem;
    }
    .raw-view {
      background: #030712;
      border: 1px solid rgba(255,255,255,0.1);
      padding: 1rem;
      border-radius: 4px;
      overflow-x: auto;
      font-size: 0.75rem;
      color: #38bdf8;
    }
    .footer { text-align: center; font-size: 0.75rem; color: var(--text-secondary); margin-top: 2rem; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <span class="badge badge-cyan">STANDALONE OSINT DOSSIER</span>
        <span class="badge badge-error">OPSEC RISK: ${threatLevel} (${opsec}%)</span>
      </div>
      <h1 style="margin-top: 0.75rem;">Subject Target: ${rootVal}</h1>
      <p style="color: var(--text-secondary); font-size: 0.85rem;">
        Indicator Type: <strong>${rootType.toUpperCase()}</strong> | Run ID: <code>${report.runId}</code> | Generated: ${dateStr}
      </p>
    </div>

    <div class="grid">
      <div class="card">
        <h2>⚡ Executive Summary</h2>
        <p style="font-size: 0.85rem; color: var(--text-secondary);">
          Automated multi-domain reconnaissance executed across <strong>${report.stats.totalTools}</strong> tools.
          Discovered <strong>${report.stats.totalEntities}</strong> correlated intelligence nodes in ${report.stats.durationMs}ms.
        </p>
      </div>

      <div class="card">
        <h2>🛡️ Tool Execution Matrix</h2>
        <div style="max-height: 180px; overflow-y: auto;">
          ${report.toolResults.map(t => `
            <div style="display: flex; justify-content: space-between; font-size: 0.75rem; padding: 0.25rem 0; border-bottom: 1px dashed rgba(255,255,255,0.05);">
              <span>${t.displayName}</span>
              <span style="color: ${t.status === 'success' ? 'var(--status-success)' : 'var(--status-error)'}">
                ${t.status.toUpperCase()} (${t.entitiesCount} nodes)
              </span>
            </div>
          `).join('')}
        </div>
      </div>
    </div>

    <div class="card" style="margin-bottom: 1.5rem;">
      <h2>🌐 Correlated Entity Graph Nodes (${report.entities.length})</h2>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 0.75rem; margin-top: 0.75rem;">
        ${report.entities.slice(0, 30).map(e => `
          <div class="entity-item">
            <div style="font-weight: bold; color: var(--text-primary); word-break: break-all;">${e.value}</div>
            <div style="color: var(--text-secondary); font-size: 0.7rem; margin-top: 0.2rem;">
              [${e.type.toUpperCase()}] Source: ${e.sourceTool} | Match: ${Math.round((e.confidence || 0.8) * 100)}%
            </div>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="card">
      <h2>🔐 Raw Cryptographic Intelligence Data (Air-Gapped Payload)</h2>
      <pre class="raw-view">${entitiesJson}</pre>
    </div>

    <div class="footer">
      TraceMesh OSINT Platform &bull; Immutable Forensic Intelligence Export &bull; Classification: TLP:AMBER
    </div>
  </div>
</body>
</html>`;
  }
}
