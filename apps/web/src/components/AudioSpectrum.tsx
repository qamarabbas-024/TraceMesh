'use client';

import { useEffect, useState } from 'react';
import { soundFx } from '@/lib/soundFx';

interface AudioSpectrumProps {
  barCount?: number;
  height?: number;
}

export function AudioSpectrum({ barCount = 10, height = 16 }: AudioSpectrumProps) {
  const [bars, setBars] = useState<number[]>(() => new Array(barCount).fill(2));
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    setIsMuted(soundFx.isMuted());
    const interval = setInterval(() => {
      setIsMuted(soundFx.isMuted());
      if (soundFx.isMuted()) {
        setBars(new Array(barCount).fill(2));
        return;
      }

      setBars(
        Array.from({ length: barCount }, () => {
          return Math.floor(Math.random() * (height - 4)) + 3;
        }),
      );
    }, 120);

    return () => clearInterval(interval);
  }, [barCount, height]);

  return (
    <div
      className="flex items-end gap-0.5 px-2 py-1 bg-bg-surface-raised/80 border border-accent-cyan-dim/30 rounded"
      style={{ height: height + 8 }}
      title="Live Audio & Signal Frequency Telemetry"
      suppressHydrationWarning
    >
      {bars.map((barHeight, idx) => (
        <span
          key={idx}
          className="w-1 rounded-sm bg-accent-cyan transition-all duration-100 shadow-cyan-glow"
          style={{
            height: `${barHeight}px`,
            opacity: isMuted ? 0.2 : 0.4 + (barHeight / height) * 0.6,
          }}
        />
      ))}
    </div>
  );
}
