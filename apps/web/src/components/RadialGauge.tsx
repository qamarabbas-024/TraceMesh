'use client';

import { useEffect, useRef } from 'react';

interface RadialGaugeProps {
  value: number; // 0 - 100
  size?: number;
  label?: string;
  threatLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export function RadialGauge({
  value,
  size = 110,
  label = 'OPSEC EXPOSURE',
  threatLevel = 'MEDIUM',
}: RadialGaugeProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const threatColor =
    threatLevel === 'CRITICAL'
      ? '#f43f5e'
      : threatLevel === 'HIGH'
      ? '#f59e0b'
      : threatLevel === 'MEDIUM'
      ? '#eab308'
      : '#34d399';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let start = Date.now();
    const duration = 800;
    let animFrame: number;

    const render = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(1, elapsed / duration);
      const easeVal = 1 - Math.pow(1 - progress, 3);
      const currentVal = value * easeVal;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const radius = size * 0.38;
      const strokeWidth = 6;

      // 1. Background Track Arc (270 degrees)
      const startAngle = Math.PI * 0.75;
      const endAngle = Math.PI * 2.25;

      ctx.beginPath();
      ctx.arc(cx, cy, radius, startAngle, endAngle);
      ctx.strokeStyle = '#161f30';
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = 'round';
      ctx.stroke();

      // 2. Active Fill Sweep
      const sweepAngle = startAngle + (currentVal / 100) * (endAngle - startAngle);
      ctx.beginPath();
      ctx.arc(cx, cy, radius, startAngle, sweepAngle);
      ctx.strokeStyle = threatColor;
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = 'round';
      ctx.shadowColor = threatColor;
      ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // 3. Center Metric Text
      ctx.font = 'bold 18px "JetBrains Mono", monospace';
      ctx.fillStyle = '#e8edf4';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${Math.round(currentVal)}%`, cx, cy - 2);

      // 4. Center Unit / Threat Label
      ctx.font = '8px "JetBrains Mono", monospace';
      ctx.fillStyle = threatColor;
      ctx.fillText(threatLevel, cx, cy + 14);

      if (progress < 1) {
        animFrame = requestAnimationFrame(render);
      }
    };

    render();
    return () => cancelAnimationFrame(animFrame);
  }, [value, size, threatLevel, threatColor]);

  return (
    <div className="flex flex-col items-center justify-center font-mono">
      <canvas ref={canvasRef} width={size} height={size} />
      <span className="text-[9px] uppercase tracking-wider text-text-secondary mt-1">
        {label}
      </span>
    </div>
  );
}
