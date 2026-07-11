import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { LOGO_MARK_SRC } from '../../constants/branding';

type Mark = {
  top: string;
  left: string;
  size: number;
  opacity: number;
  duration: number;
  delay: number;
};

function buildMarks(): Mark[] {
  const positions = [
    { top: '6%', left: '8%' },
    { top: '12%', left: '78%' },
    { top: '28%', left: '18%' },
    { top: '36%', left: '62%' },
    { top: '48%', left: '88%' },
    { top: '55%', left: '6%' },
    { top: '68%', left: '42%' },
    { top: '74%', left: '74%' },
    { top: '86%', left: '22%' },
    { top: '90%', left: '58%' },
    { top: '20%', left: '44%' },
    { top: '60%', left: '30%' },
  ];

  return positions.map((p, i) => ({
    top: p.top,
    left: p.left,
    size: 56 + ((i * 11) % 28),
    opacity: 0.04 + (i % 3) * 0.012,
    duration: 22 + (i % 5) * 4,
    delay: i * 0.6,
  }));
}

/** Logos SKA discrets en arrière-plan — ne doivent pas gêner la lecture */
export default function FloatingLogoMarks() {
  const marks = useMemo(() => buildMarks(), []);

  return (
    <div
      className="pointer-events-none select-none absolute inset-0 overflow-hidden z-[1]"
      aria-hidden
    >
      {marks.map((m, i) => (
        <motion.img
          key={i}
          src={LOGO_MARK_SRC}
          alt=""
          className="absolute object-contain"
          style={{
            top: m.top,
            left: m.left,
            width: m.size,
            height: m.size,
            opacity: m.opacity,
          }}
          animate={{
            y: [0, -10, 6, 0],
            x: [0, 6, -4, 0],
            rotate: [-3, 3, -3],
          }}
          transition={{
            duration: m.duration,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: m.delay,
          }}
        />
      ))}
      {/* Voile léger pour garder le texte lisible au-dessus */}
      <div className="absolute inset-0 bg-white/70" />
    </div>
  );
}
