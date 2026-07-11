import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Calendar, Clock, CheckCircle2 } from 'lucide-react';
import { siteService } from '../../services/api';
import type { Actualite, ActualiteStatut } from '../../types';
import { mediaUrl } from '../../utils/media';
import SectionHeading from './SectionHeading';

const statutConfig: Record<ActualiteStatut, { label: string; className: string; icon: React.ReactNode }> = {
  EN_COURS: { label: 'En cours', className: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: <Clock className="w-3 h-3" /> },
  A_VENIR: { label: 'À venir', className: 'bg-sky-50 text-sky-700 border-sky-200', icon: <Calendar className="w-3 h-3" /> },
  TERMINE: { label: 'Terminé', className: 'bg-slate-100 text-slate-600 border-slate-200', icon: <CheckCircle2 className="w-3 h-3" /> },
};

export default function NouveautesSection() {
  const [actualites, setActualites] = useState<Actualite[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    siteService.getActualites()
      .then((r) => setActualites(r.data))
      .catch(() => {});
  }, []);

  return (
    <section id="nouveautes" className="py-24 sm:py-28 lg:py-32 px-4 sm:px-6 lg:px-8 bg-slate-50 section-sep">
      <div className="max-w-7xl mx-auto">
        <SectionHeading
          badge="Nouveautés"
          title="Activités en cours"
          description="Suivez les ateliers, événements et projets en cours à Smart Kids Academy."
        />

        {actualites.length === 0 ? (
          <div className="text-center py-16 rounded-2xl border border-dashed border-slate-300 text-slate-500">
            <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>Aucune activité publiée pour le moment. Revenez bientôt !</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {actualites.map((actu, index) => {
              const st = statutConfig[actu.statut] ?? statutConfig.EN_COURS;
              const isOpen = expanded === actu.id;
              return (
                <motion.article
                  key={actu.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.08 }}
                  whileHover={{ y: -6 }}
                  className="rounded-2xl border border-slate-200 bg-white overflow-hidden hover:border-[#004b57]/30 hover:shadow-lg hover:shadow-[#004b57]/8 transition-all group"
                >
                  {actu.imageUrl ? (
                    <div className="aspect-[16/10] overflow-hidden">
                      <img src={mediaUrl(actu.imageUrl)} alt="" className="w-full h-full object-cover group-hover:scale-105 group-hover:saturate-110 transition-transform duration-700" />
                    </div>
                  ) : (
                    <div className="aspect-[16/10] bg-gradient-to-br from-[#004b57]/15 to-[#004b57]/05 flex items-center justify-center">
                      <Sparkles className="w-12 h-12 text-[#004b57]/40" />
                    </div>
                  )}
                  <div className="p-5">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className={`badge border flex items-center gap-1 text-xs ${st.className}`}>
                        {st.icon} {st.label}
                      </span>
                      {actu.dateDebut && (
                        <span className="text-xs text-slate-400">
                          {new Date(actu.dateDebut).toLocaleDateString('fr-FR')}
                        </span>
                      )}
                    </div>
                    <h4 className="text-lg font-bold text-slate-900 mb-2">{actu.titre}</h4>
                    <p className="text-slate-500 text-sm line-clamp-3">{actu.resume || actu.contenu}</p>
                    {actu.contenu && actu.contenu.length > (actu.resume?.length ?? 0) && (
                      <button
                        type="button"
                        onClick={() => setExpanded(isOpen ? null : actu.id)}
                        className="mt-3 text-sm text-[#004b57] font-medium hover:underline"
                      >
                        {isOpen ? 'Réduire' : 'En savoir plus'}
                      </button>
                    )}
                    {isOpen && actu.contenu && (
                      <p className="mt-3 text-slate-600 text-sm leading-relaxed whitespace-pre-wrap border-t border-slate-200 pt-3">
                        {actu.contenu}
                      </p>
                    )}
                  </div>
                </motion.article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
