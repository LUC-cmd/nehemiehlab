import React from 'react';
import { motion } from 'framer-motion';

interface Props {
  badge: string;
  title: string;
  description?: string;
  className?: string;
}

export default function SectionHeading({ badge, title, description, className = '' }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
      className={`text-center max-w-4xl mx-auto mb-16 sm:mb-20 ${className}`}
    >
      <motion.span
        initial={{ opacity: 0, scale: 0.85 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="inline-block text-[#004b57] text-sm sm:text-base font-semibold uppercase tracking-[0.2em] mb-5"
      >
        {badge}
      </motion.span>
      <h2 className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6 text-slate-900 leading-[1.1]">
        {title}
      </h2>
      {description && (
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="text-slate-500 text-lg sm:text-xl leading-relaxed max-w-3xl mx-auto"
        >
          {description}
        </motion.p>
      )}
      <motion.div
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.25, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="h-0.5 w-20 mx-auto mt-10 bg-gradient-to-r from-transparent via-[#004b57] to-transparent origin-center"
      />
    </motion.div>
  );
}
