'use client';

import { useEffect, useRef } from 'react';

interface ScanlineOverlayProps {
  opacity?: number;
}

export function ScanlineOverlay({ opacity = 0.035 }: ScanlineOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(34, 211, 238, 0.4)';

      // Draw subtle horizontal scanlines
      for (let y = 0; y < canvas.height; y += 4) {
        ctx.fillRect(0, y, canvas.width, 1);
      }

      // Subtle cyber grid dots
      ctx.fillStyle = 'rgba(14, 116, 144, 0.25)';
      const gridSize = 40;
      for (let x = 0; x < canvas.width; x += gridSize) {
        for (let y = 0; y < canvas.height; y += gridSize) {
          ctx.fillRect(x, y, 1, 1);
        }
      }
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0 select-none mix-blend-screen"
      style={{ opacity }}
      aria-hidden="true"
    />
  );
}
