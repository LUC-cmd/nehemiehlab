import React from 'react';
import { motion } from 'framer-motion';
import CountUp from 'react-countup';
import { useInView } from 'react-intersection-observer';
import { STATS } from '../../constants/branding';

export default function StatsBar() {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.3 });

  return (
    <section ref={ref} className="relative py-20 sm:py-24 px-6 section-sep overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-[#004b57]/08 via-transparent to-[#004b57]/05 pointer-events-none" />
      <div className="max-w-7xl mx-auto relative">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {STATS.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.12, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="text-center group"
            >
              <div className="text-5xl sm:text-6xl font-black text-slate-900 mb-3 tabular-nums">
                {inView ? (
                  <CountUp end={stat.value} duration={2.2} delay={i * 0.15} />
                ) : (
                  '0'
                )}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#004b57] to-[#006878]">
                  {stat.suffix}
                </span>
              </div>
              <div className="text-base text-slate-500 font-medium group-hover:text-slate-700 transition-colors">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
