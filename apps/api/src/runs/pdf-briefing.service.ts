import { Injectable, Logger } from '@nestjs/common';
import { AggregatedReport } from '@tracemesh/shared';

@Injectable()
export class PdfBriefingService {
  private readonly logger = new Logger(PdfBriefingService.name);

  /**
   * Generates a high-resolution, print-ready Executive Intelligence PDF/HTML Document
   */
  public generatePdfBriefing(report: AggregatedReport): string {
    const root = report.root.value;
    const type = report.root.type.toUpperCase();
    const date = new Date(report.createdAt).toUTCString();
    const opsec = report.opsecScore || 45;
    const threatLevel = report.threatLevel || 'MEDIUM';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>TraceMesh Executive Briefing — ${root}</title>
  <style>
    @page { size: A4; margin: 15mm; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #111827;
      line-height: 1.4;
      padding: 10px;
    }
    .tlp-header {
      background: #f59e0b;
      color: #000;
      text-align: center;
      font-weight: 800;
      font-size: 11pt;
      padding: 4px;
      letter-spacing: 2px;
      margin-bottom: 20px;
      border-radius: 3px;
    }
    .header-table {
      width: 100%;
      border-bottom: 2px solid #00f0ff;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .title { font-size: 20pt; font-weight: 800; color: #0f172a; }
    .subtitle { font-size: 10pt; color: #64748b; margin-top: 4px; }
    .grid { display: flex; gap: 15px; margin-bottom: 20px; }
    .metric-card {
      flex: 1;
      border: 1px solid #e2e8f0;
      background: #f8fafc;
      padding: 10px;
      border-radius: 4px;
    }
    .metric-card h4 { margin: 0; font-size: 8pt; color: #64748b; text-transform: uppercase; }
    .metric-card .val { font-size: 14pt; font-weight: 700; color: #0f172a; margin-top: 4px; }
    h3 { font-size: 12pt; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-top: 20px; margin-bottom: 8px; color: #1e293b; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 9pt; }
    th { background: #f1f5f9; text-align: left; padding: 6px; border: 1px solid #cbd5e1; font-weight: 600; }
    td { padding: 5px 6px; border: 1px solid #e2e8f0; }
    .footer {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      text-align: center;
      font-size: 8pt;
      color: #94a3b8;
      border-top: 1px solid #e2e8f0;
      padding-top: 6px;
    }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body onload="window.print()">
  <div class="tlp-header">TLP:AMBER &bull; STRICTLY CONFIDENTIAL OSINT DOSSIER</div>

  <table class="header-table">
    <tr>
      <td>
        <div class="title">TraceMesh Executive Threat Brief</div>
        <div class="subtitle">Target Indicator: <strong>${root}</strong> (${type}) &bull; Run ID: <code>${report.runId}</code></div>
      </td>
      <td style="text-align: right; vertical-align: bottom;">
        <div class="subtitle">Generated: ${date}</div>
      </td>
    </tr>
  </table>

  <div class="grid">
    <div class="metric-card">
      <h4>Identified Indicators</h4>
      <div class="val">${report.stats.totalEntities} Nodes</div>
    </div>
    <div class="metric-card">
      <h4>Active Runners</h4>
      <div class="val">${report.stats.totalTools} Tools</div>
    </div>
    <div class="metric-card">
      <h4>OPSEC Risk Level</h4>
      <div class="val" style="color: #dc2626;">${threatLevel} (${opsec}%)</div>
    </div>
    <div class="metric-card">
      <h4>Duration</h4>
      <div class="val">${report.stats.durationMs} ms</div>
    </div>
  </div>

  <h3>Correlated Discovered Footprint</h3>
  <table>
    <thead>
      <tr>
        <th style="width: 25%;">Category</th>
        <th style="width: 45%;">Discovered Value</th>
        <th style="width: 20%;">Source Tool</th>
        <th style="width: 10%;">Confidence</th>
      </tr>
    </thead>
    <tbody>
      ${report.entities.slice(0, 25).map(e => `
        <tr>
          <td><strong>${e.type.toUpperCase()}</strong></td>
          <td style="word-break: break-all;">${e.value}</td>
          <td>${e.sourceTool}</td>
          <td>${Math.round((e.confidence || 0.8) * 100)}%</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="footer">
    TraceMesh Tactical OSINT Intelligence Platform &bull; Automated Forensic Extraction &bull; Page 1 of 1
  </div>
</body>
</html>`;
  }
}
