'use client';

import React, { useState } from 'react';

interface PdfExportButtonProps {
  runId: string;
}

export const PdfExportButton: React.FC<PdfExportButtonProps> = ({ runId }) => {
  const [downloading, setDownloading] = useState(false);

  const handleExportPdf = async () => {
    setDownloading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const pdfUrl = `${apiUrl}/runs/${runId}/export/pdf`;
      const token = typeof window !== 'undefined' ? localStorage.getItem('tracemesh_token') : null;
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(pdfUrl, { headers });
      if (!res.ok) {
        throw new Error(`Export failed with HTTP ${res.status}`);
      }
      const htmlText = await res.text();
      const blob = new Blob([htmlText], { type: 'text/html' });
      const blobUrl = URL.createObjectURL(blob);
      const win = window.open(blobUrl, '_blank');
      if (win) {
        win.focus();
      }
    } catch (err) {
      console.error('PDF Briefing download error:', err);
    } finally {
      setDownloading(false);
    }
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
