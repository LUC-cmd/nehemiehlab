import React from 'react';
import { motion } from 'framer-motion';
import { Users, TrendingUp, Network, Presentation, Sprout, Rocket, Globe, ArrowUp, Undo2, BookOpen } from 'lucide-react';
import SectionHeading from './SectionHeading';
import {
  NEHEMIAH_LAB,
  NEHEMIAH_OFFERINGS,
  ENTREPRENEUR_PATHWAYS,
} from '../../constants/branding';

const offeringIcons = [Users, TrendingUp, Network, Presentation];
const pathwayIcons = [Sprout, Rocket, Globe];

export default function NehemiahLabSection() {
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section id="nehemiah-lab" className="py-24 sm:py-28 lg:py-32 px-4 sm:px-6 lg:px-8 bg-slate-50 section-sep">
      <div className="max-w-7xl mx-auto relative">
        <SectionHeading
          badge={NEHEMIAH_LAB.name}
          title={NEHEMIAH_LAB.headline}
          description={NEHEMIAH_LAB.tagline}
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto text-center mb-16 sm:mb-20"
        >
          <p className="text-sm uppercase tracking-[0.2em] text-[#004b57] mb-6 font-semibold">
            {NEHEMIAH_LAB.orgLine}
          </p>
          <p className="text-slate-700 text-lg sm:text-xl leading-relaxed mb-5">{NEHEMIAH_LAB.intro}</p>
          <p className="text-slate-500 text-base sm:text-lg leading-relaxed max-w-3xl mx-auto">{NEHEMIAH_LAB.mission}</p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-7 mb-20 sm:mb-24">
          {NEHEMIAH_OFFERINGS.map((item, i) => {
            const Icon = offeringIcons[i];
            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="group p-7 sm:p-8 rounded-3xl border border-slate-200 bg-white hover:border-[#004b57]/40 hover:shadow-lg hover:shadow-[#004b57]/8 transition-all min-h-[240px]"
              >
                <div className="w-14 h-14 rounded-2xl bg-[#004b57]/10 border border-[#004b57]/25 flex items-center justify-center mb-6">
                  <Icon className="w-7 h-7 text-[#004b57]" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{item.title}</h3>
                <p className="text-slate-500 text-base leading-relaxed">{item.description}</p>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="rounded-3xl border border-[#004b57]/20 bg-gradient-to-br from-[#004b57]/08 via-white to-[#004b57]/05 p-8 sm:p-10 md:p-12 mb-20 sm:mb-24"
        >
          <p className="text-2xl md:text-3xl font-bold text-slate-900 leading-snug max-w-4xl">
            {NEHEMIAH_LAB.skaBridge}
          </p>
          <p className="mt-5 text-slate-500 text-lg max-w-3xl leading-relaxed">{NEHEMIAH_LAB.youthPriority}</p>
          <div className="mt-8 flex flex-col sm:flex-row sm:flex-wrap gap-4">
            <button
              type="button"
              onClick={() => scrollTo('mission')}
              className="inline-flex w-full sm:w-auto justify-center items-center gap-2 px-6 py-3.5 rounded-full border-2 border-[#004b57]/30 text-base font-medium text-[#004b57] hover:bg-[#004b57]/08 transition-colors"
            >
              <Undo2 className="w-5 h-5" />
              Retour mission
            </button>
            <button
              type="button"
              onClick={() => scrollTo('programmes')}
              className="inline-flex w-full sm:w-auto justify-center items-center gap-2 px-6 py-3.5 rounded-full border-2 border-[#004b57]/30 text-base font-medium text-[#004b57] hover:bg-[#004b57]/08 transition-colors"
            >
              <BookOpen className="w-5 h-5" />
              Voir programmes
            </button>
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="inline-flex w-full sm:w-auto justify-center items-center gap-2 px-6 py-3.5 rounded-full bg-[#004b57] text-white text-base font-semibold hover:bg-[#003840] transition-colors"
            >
              <ArrowUp className="w-5 h-5" />
              Retour en haut
            </button>
          </div>
        </motion.div>

        <SectionHeading
          badge="Parcours"
          title="Parcours d'accompagnement"
          description="Trois niveaux selon la maturité du projet."
          className="mb-14"
        />

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {ENTREPRENEUR_PATHWAYS.map((path, i) => {
            const Icon = pathwayIcons[i];
            return (
              <motion.article
                key={path.id}
                initial={{ opacity: 0, x: i === 1 ? 0 : i === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.55 }}
                whileHover={{ y: -4 }}
                className="p-8 sm:p-10 rounded-3xl border border-slate-200 bg-white min-h-[260px] hover:border-[#004b57]/30 hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-3 mb-5">
                  <span className="text-sm font-bold text-[#004b57] uppercase tracking-widest">
                    0{i + 1}
                  </span>
                  <Icon className="w-6 h-6 text-[#004b57]" />
                </div>
                <h4 className="text-xl sm:text-2xl font-bold text-slate-900 mb-4">{path.title}</h4>
                <p className="text-slate-500 text-base leading-relaxed">{path.description}</p>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
