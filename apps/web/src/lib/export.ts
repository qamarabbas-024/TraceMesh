import type { AggregatedReport } from '@tracemesh/shared';

/**
 * Export AggregatedReport as JSON file download
 */
export function exportReportJSON(report: AggregatedReport) {
  const jsonStr = JSON.stringify(report, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tracemesh-report-${report.root.value.replace(/[^a-zA-Z0-9_-]/g, '_')}-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export AggregatedReport as CSV file download
 */
export function exportReportCSV(report: AggregatedReport) {
  const headers = ['Source Tool', 'Entity Type', 'Value', 'Label', 'Confidence', 'Target Root', 'Timestamp'];
  const rows = report.entities.map((e) => [
    `"${e.sourceTool.replace(/"/g, '""')}"`,
    `"${e.type.replace(/"/g, '""')}"`,
    `"${e.value.replace(/"/g, '""')}"`,
    `"${e.label.replace(/"/g, '""')}"`,
    `"${e.confidence !== undefined ? Math.round(e.confidence * 100) + '%' : 'N/A'}"`,
    `"${report.root.value.replace(/"/g, '""')}"`,
    `"${report.createdAt}"`,
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tracemesh-intel-${report.root.value.replace(/[^a-zA-Z0-9_-]/g, '_')}-${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Trigger high-fidelity PDF report generation & printing
 */
export function exportReportPDF(report: AggregatedReport) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>TraceMesh OSINT Intel Report - ${report.root.value}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background: #0a0e14;
      color: #e8edf4;
      padding: 30px;
      margin: 0;
    }
    .header {
      border-bottom: 2px solid #22d3ee;
      padding-bottom: 15px;
      margin-bottom: 25px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .title {
      font-size: 24px;
      font-weight: 700;
      color: #22d3ee;
      letter-spacing: 1px;
      text-transform: uppercase;
      font-family: monospace;
    }
    .meta-box {
      background: #111826;
      border: 1px solid #0e7490;
      padding: 15px;
      border-radius: 4px;
      margin-bottom: 25px;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      font-family: monospace;
      font-size: 12px;
    }
    .meta-item {
      display: flex;
      flex-direction: column;
    }
    .meta-label {
      color: #9aa7bd;
      font-size: 10px;
      text-transform: uppercase;
    }
    .meta-val {
      font-weight: bold;
      color: #e8edf4;
      margin-top: 4px;
    }
    .section-title {
      font-size: 14px;
      font-weight: 600;
      text-transform: uppercase;
      font-family: monospace;
      color: #22d3ee;
      margin-bottom: 12px;
      border-bottom: 1px solid rgba(14, 116, 144, 0.4);
      padding-bottom: 4px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 25px;
      font-size: 12px;
      font-family: monospace;
    }
    th, td {
      padding: 10px;
      text-align: left;
      border-bottom: 1px solid #161f30;
    }
    th {
      background: #161f30;
      color: #22d3ee;
      font-weight: 600;
      text-transform: uppercase;
      font-size: 11px;
    }
    tr:nth-child(even) {
      background: rgba(17, 24, 38, 0.6);
    }
    .badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      background: rgba(34, 211, 238, 0.15);
      border: 1px solid rgba(34, 211, 238, 0.4);
      color: #22d3ee;
    }
    .footer {
      margin-top: 40px;
      border-top: 1px solid #161f30;
      padding-top: 10px;
      font-size: 10px;
      color: #5e6b82;
      text-align: center;
      font-family: monospace;
    }
    @media print {
      body {
        background: #fff;
        color: #000;
      }
      .title, th, .section-title {
        color: #0e7490;
      }
      .meta-box, tr:nth-child(even), th {
        background: #f1f5f9;
        border-color: #cbd5e1;
        color: #000;
      }
      .badge {
        background: #e0f2fe;
        border-color: #0284c7;
        color: #0369a1;
      }
      td, th {
        border-color: #e2e8f0;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="title">TraceMesh Intelligence Report</div>
      <div style="font-size: 11px; color: #9aa7bd; font-family: monospace; margin-top: 3px;">
        OSINT Aggregated Reconnaissance Dossier
      </div>
    </div>
    <div style="text-align: right; font-family: monospace; font-size: 11px; color: #9aa7bd;">
      <div>REF: ${report.runId}</div>
      <div>${new Date(report.createdAt).toUTCString()}</div>
    </div>
  </div>

  <div class="meta-box">
    <div class="meta-item">
      <span class="meta-label">Target Identifier</span>
      <span class="meta-val">${report.root.value}</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">Identifier Domain</span>
      <span class="meta-val">${report.root.type.toUpperCase()}</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">Correlated Nodes</span>
      <span class="meta-val">${report.entities.length} Discovered</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">Scan Latency</span>
      <span class="meta-val">${report.stats.durationMs}ms</span>
    </div>
  </div>

  <div class="section-title">Discovered Entity Correlation Map</div>
  <table>
    <thead>
      <tr>
        <th style="width: 15%;">Source Tool</th>
        <th style="width: 15%;">Entity Type</th>
        <th style="width: 40%;">Value / Link</th>
        <th style="width: 20%;">Label / Signature</th>
        <th style="width: 10%;">Confidence</th>
      </tr>
    </thead>
    <tbody>
      ${report.entities
        .map(
          (e) => `
        <tr>
          <td><span class="badge">${e.sourceTool}</span></td>
          <td>${e.type}</td>
          <td><strong>${e.value}</strong></td>
          <td>${e.label}</td>
          <td>${e.confidence !== undefined ? Math.round(e.confidence * 100) + '%' : '95%'}</td>
        </tr>
      `,
        )
        .join('')}
    </tbody>
  </table>

  <div class="section-title">Execution Module Telemetry</div>
  <table>
    <thead>
      <tr>
        <th>Module Name</th>
        <th>Status</th>
        <th>Duration</th>
        <th>Summary</th>
      </tr>
    </thead>
    <tbody>
      ${report.toolResults
        .map(
          (t) => `
        <tr>
          <td><strong>${t.displayName}</strong></td>
          <td><span class="badge">${t.status}</span></td>
          <td>${t.durationMs}ms</td>
          <td>${t.summary || t.error || 'Done'}</td>
        </tr>
      `,
        )
        .join('')}
    </tbody>
  </table>

  <div class="footer">
    TRACEMESH OSINT AGGREGATION PLATFORM • AUTOMATED INTELLIGENCE CORRELATION ENGINE • GENERATED LOCALLY
  </div>

  <script>
    window.onload = function() {
      setTimeout(() => {
        window.print();
      }, 500);
    };
  </script>
</body>
</html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
