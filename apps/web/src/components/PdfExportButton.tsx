'use client';

import React, { useState } from 'react';

interface PdfExportButtonProps {
  runId: string;
}

export const PdfExportButton: React.FC<PdfExportButtonProps> = ({ runId }) => {
  const [downloading, setDownloading] = useState(false);

  const handleExportPdf = () => {
    setDownloading(true);
    const pdfUrl = `http://localhost:3001/runs/${runId}/export/pdf`;
    const win = window.open(pdfUrl, '_blank');
    if (win) {
      win.focus();
    }
    setTimeout(() => setDownloading(false), 1500);
  };

  return (
    <button
      onClick={handleExportPdf}
      disabled={downloading}
      className="flex items-center space-x-2 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded font-mono text-xs transition-colors shadow-[0_0_15px_rgba(245,158,11,0.1)]"
    >
      <span>📄</span>
      <span>{downloading ? 'GENERATING PDF...' : 'EXECUTIVE PDF BRIEF'}</span>
    </button>
  );
};
