'use client';

import { useEffect, useState, useRef } from 'react';

interface DecryptTextProps {
  text: string;
  className?: string;
  speed?: number; // ms per iteration
  triggerOnMount?: boolean;
}

const GLYPHS = '0123456789ABCDEF!@#$%^&*<>[]{}~/\\|';

export function DecryptText({
  text,
  className = '',
  speed = 35,
  triggerOnMount = true,
}: DecryptTextProps) {
  const [displayText, setDisplayText] = useState(text);
  const isRunningRef = useRef(false);

  const startDecryption = () => {
    if (isRunningRef.current) return;
    isRunningRef.current = true;

    let iteration = 0;
    const maxIterations = text.length;

    const interval = setInterval(() => {
      setDisplayText((prev) =>
        text
          .split('')
          .map((char, index) => {
            if (index < iteration) {
              return text[index];
            }
            if (char === ' ') return ' ';
            return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
          })
          .join(''),
      );

      if (iteration >= maxIterations) {
        clearInterval(interval);
        isRunningRef.current = false;
        setDisplayText(text);
      }

      iteration += 1 / 2.5;
    }, speed);
  };

  useEffect(() => {
    if (triggerOnMount) {
      startDecryption();
    }
  }, [text, triggerOnMount]);

  return (
    <span
      className={className}
      onMouseEnter={startDecryption}
      title="Hover to decrypt telemetry"
    >
      {displayText}
    </span>
  );
}
