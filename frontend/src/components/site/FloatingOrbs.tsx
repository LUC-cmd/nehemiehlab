import React from 'react';
import { motion } from 'framer-motion';

const orbs = [
  { size: 420, x: '72%', y: '-8%', color: 'rgba(0,75,87,0.22)', delay: 0 },
  { size: 340, x: '-12%', y: '55%', color: 'rgba(244,59,29,0.12)', delay: 1.2 },
  { size: 220, x: '45%', y: '78%', color: 'rgba(0,104,120,0.15)', delay: 2.4 },
];

export default function FloatingOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {orbs.map((orb, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full blur-[90px]"
          style={{
            width: orb.size,
            height: orb.size,
            left: orb.x,
            top: orb.y,
            background: orb.color,
          }}
          animate={{
            y: [0, -28, 12, 0],
            x: [0, 18, -10, 0],
            scale: [1, 1.06, 0.96, 1],
          }}
          transition={{
            duration: 14 + i * 2,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: orb.delay,
          }}
        />
      ))}
    </div>
  );
}
