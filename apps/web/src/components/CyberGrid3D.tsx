'use client';

import { useEffect, useRef } from 'react';

interface CyberGrid3DProps {
  opacity?: number;
  reduceMotion?: boolean;
}

export function CyberGrid3D({ opacity = 0.35, reduceMotion = false }: CyberGrid3DProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrame: number;
    let offset = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const w = canvas.width;
      const h = canvas.height;
      const horizonY = h * 0.48;

      if (!reduceMotion) {
        offset = (offset + 0.5) % 40;
      }

      // Vanishing point perspective grid floor
      const vpX = w / 2;
      const vpY = horizonY;

      ctx.strokeStyle = 'rgba(14, 116, 144, 0.22)';
      ctx.lineWidth = 1;

      // Perspective Rays radiating from vanishing point
      const numRays = 24;
      for (let i = -numRays; i <= numRays; i++) {
        const bottomX = vpX + i * (w / numRays) * 1.5;
        ctx.beginPath();
        ctx.moveTo(vpX, vpY);
        ctx.lineTo(bottomX, h);
        ctx.stroke();
      }

      // Horizontal Grid Lines with exponential perspective spacing
      const numLines = 14;
      for (let i = 0; i < numLines; i++) {
        const t = Math.pow((i + offset / 40) / numLines, 2.5);
        const y = horizonY + t * (h - horizonY);

        ctx.strokeStyle = `rgba(34, 211, 238, ${0.05 + t * 0.25})`;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Rising ambient energy particles
      ctx.fillStyle = 'rgba(34, 211, 238, 0.4)';
      for (let p = 0; p < 15; p++) {
        const px = (Math.sin(p * 123 + offset * 0.05) * 0.5 + 0.5) * w;
        const py = h - ((p * 45 + offset * 2) % (h - horizonY));
        ctx.beginPath();
        ctx.arc(px, py, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }

      animFrame = requestAnimationFrame(render);
    };

    render();
    return () => {
      cancelAnimationFrame(animFrame);
      window.removeEventListener('resize', resize);
    };
  }, [reduceMotion]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0 select-none"
      style={{ opacity }}
      aria-hidden="true"
    />
  );
}
