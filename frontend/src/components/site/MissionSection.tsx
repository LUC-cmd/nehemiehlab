import React from 'react';
import { motion } from 'framer-motion';
import { Lightbulb, Rocket, Target } from 'lucide-react';
import SectionHeading from './SectionHeading';
import { MISSION_BLOCKS, PILLARS } from '../../constants/branding';

const missionIcons = [Lightbulb, Rocket, Target];

export default function MissionSection() {
  return (
    <section id="mission" className="py-24 sm:py-28 lg:py-32 px-4 sm:px-6 lg:px-8 relative section-sep">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#004b57]/[0.06] to-transparent pointer-events-none" />
      <div className="max-w-7xl mx-auto relative">
        <SectionHeading
          badge="Notre mission"
          title="Ce que nous faisons avec les enfants"
          description="Un apprentissage pratique, progressif et encadré, pour développer des compétences utiles dès maintenant."
        />

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 mb-20 sm:mb-24">
          {MISSION_BLOCKS.map((block, i) => {
            const Icon = missionIcons[i];
            return (
              <motion.div
                key={block.title}
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ delay: i * 0.12, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -6 }}
                className="p-8 sm:p-10 rounded-3xl border border-slate-200 bg-white hover:border-[#004b57]/40 hover:shadow-lg hover:shadow-[#004b57]/8 transition-all min-h-[260px]"
              >
                <motion.div
                  whileHover={{ rotate: 12, scale: 1.1 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                  className="w-14 h-14 rounded-2xl bg-[#004b57]/10 border border-[#004b57]/25 flex items-center justify-center mb-6"
                >
                  <Icon className="w-7 h-7 text-[#004b57]" />
                </motion.div>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-4">{block.title}</h3>
                <p className="text-slate-500 text-base leading-relaxed">{block.description}</p>
              </motion.div>
            );
          })}
        </div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {PILLARS.map((pillar, i) => (
            <motion.div
              key={pillar.title}
              initial={{ opacity: 0, x: -16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.15 + i * 0.1, duration: 0.5 }}
              className="flex gap-5 p-7 sm:p-8 rounded-2xl border border-slate-200 border-l-[3px] border-l-[#004b57] bg-white hover:shadow-md transition-all"
            >
              <span className="text-3xl font-black text-[#004b57]/30 shrink-0">0{i + 1}</span>
              <div>
                <h4 className="text-lg sm:text-xl font-semibold text-slate-900 mb-3">{pillar.title}</h4>
                <p className="text-slate-500 text-base leading-relaxed">{pillar.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
