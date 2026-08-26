'use client';

import { useState, useRef, useCallback } from 'react';

interface ParallaxTiltOptions {
  maxTilt?: number;
  perspective?: number;
  scale?: number;
  glare?: boolean;
}

export function useParallaxTilt({
  maxTilt = 7,
  perspective = 800,
  scale = 1.015,
  glare = true,
}: ParallaxTiltOptions = {}) {
  const [transform, setTransform] = useState<string>('');
  const [glarePosition, setGlarePosition] = useState<{ x: number; y: number; opacity: number }>({
    x: 50,
    y: 50,
    opacity: 0,
  });
  const ref = useRef<HTMLDivElement | null>(null);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const px = (x / rect.width - 0.5) * 2; // -1 to 1
      const py = (y / rect.height - 0.5) * 2; // -1 to 1

      const rotateY = px * maxTilt;
      const rotateX = -py * maxTilt;

      setTransform(
        `perspective(${perspective}px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(
          2,
        )}deg) scale3d(${scale}, ${scale}, ${scale})`,
      );

      if (glare) {
        setGlarePosition({
          x: Math.round((x / rect.width) * 100),
          y: Math.round((y / rect.height) * 100),
          opacity: 0.15,
        });
      }
    },
    [maxTilt, perspective, scale, glare],
  );

  const handleMouseLeave = useCallback(() => {
    setTransform(`perspective(${perspective}px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`);
    setGlarePosition((prev) => ({ ...prev, opacity: 0 }));
  }, [perspective]);

  return {
    ref,
    transform,
    glarePosition,
    onMouseMove: handleMouseMove,
    onMouseLeave: handleMouseLeave,
  };
}
