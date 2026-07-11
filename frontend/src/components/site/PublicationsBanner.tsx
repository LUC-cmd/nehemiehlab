import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Megaphone, ChevronRight, Image, Video, FileText } from 'lucide-react';
import { siteService } from '../../services/api';
import type { Publication } from '../../types';
import PublicationModal from './PublicationModal';
import { mediaUrl } from '../../utils/media';

export default function PublicationsBanner() {
  const [publications, setPublications] = useState<Publication[]>([]);
  const [selected, setSelected] = useState<Publication | null>(null);

  useEffect(() => {
    siteService.getPublications()
      .then((r) => setPublications(r.data))
      .catch(() => {});
  }, []);

  if (publications.length === 0) return null;

  const typeIcon = (type: Publication['type']) => {
    if (type === 'IMAGE') return <Image className="w-4 h-4" />;
    if (type === 'VIDEO') return <Video className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  return (
    <>
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="py-8 px-4 sm:px-6 bg-gradient-to-r from-[#004b57]/08 to-[#004b57]/03 section-sep"
      >
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-2 mb-5">
            <Megaphone className="w-5 h-5 text-[#004b57]" />
            <h3 className="text-base sm:text-lg font-bold text-slate-900">Annonces &amp; actualités du Directeur</h3>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {publications.map((pub, index) => (
              <motion.button
                key={pub.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08 }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                type="button"
                onClick={() => setSelected(pub)}
                className="group text-left rounded-2xl overflow-hidden border border-slate-200 bg-white hover:border-[#004b57]/40 hover:shadow-md transition-all"
              >
                {pub.type === 'IMAGE' && (pub.mediaUrl || pub.lienExterne) ? (
                  <div className="aspect-[16/9] overflow-hidden">
                    <img
                      src={mediaUrl(pub.mediaUrl || pub.lienExterne)}
                      alt=""
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                ) : (
                  <div className="aspect-[16/9] flex items-center justify-center bg-gradient-to-br from-[#004b57]/12 to-[#004b57]/05">
                    <span className="p-4 rounded-2xl bg-[#004b57]/10 text-[#004b57]">{typeIcon(pub.type)}</span>
                  </div>
                )}
                <div className="p-4 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{pub.titre}</p>
                    {pub.description && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{pub.description}</p>
                    )}
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-[#004b57] shrink-0 transition-colors" />
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </motion.section>

      {selected && (
        <PublicationModal publication={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
