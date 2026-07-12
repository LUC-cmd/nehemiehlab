import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { siteService } from '../../services/api';
import type { GaleriePhoto } from '../../types';
import { GALLERY_IMAGES } from '../../constants/branding';
import { mediaUrl } from '../../utils/media';
import SectionHeading from './SectionHeading';
import AppLoader from '../ui/AppLoader';

export default function GalerieSection() {
  const [photos, setPhotos] = useState<GaleriePhoto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    siteService
      .getGalerie()
      .then((r) => setPhotos(r.data))
      .catch(() => setPhotos([]))
      .finally(() => setLoading(false));
  }, []);

  const items = photos.length
    ? photos
        .filter((p) => p.ordre !== 0)
        .map((p) => ({
          key: String(p.id),
          src: p.imageUrl ? mediaUrl(p.imageUrl) : '',
          alt: p.legende,
        }))
        .filter((item) => item.src)
    : GALLERY_IMAGES.slice(1).map((img) => ({ key: img.src, src: img.src, alt: img.alt }));

  return (
    <section id="galerie" className="py-24 sm:py-28 lg:py-32 px-4 sm:px-6 lg:px-8 section-sep">
      <div className="max-w-7xl mx-auto">
        <SectionHeading
          badge="Galerie"
          title="La vie de l'académie"
          description="Ateliers, mentorat et projets en images."
        />

        {loading ? (
          <AppLoader variant="page" message="Chargement de la galerie…" />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
            {items.map((img, index) => (
              <motion.div
                key={img.key}
                initial={{ opacity: 0, y: 24, scale: 0.93 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08, duration: 0.55 }}
                whileHover={{ y: -8, rotateX: 2, rotateY: -2, boxShadow: '0 22px 50px rgba(0, 0, 0, 0.38)' }}
                className="aspect-[4/3] rounded-3xl overflow-hidden border border-slate-200 group relative perspective-1000 shadow-sm"
              >
                <div className="absolute inset-0 gallery-shimmer opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-20" />
                <motion.img
                  src={img.src}
                  alt={img.alt}
                  className="w-full h-full object-cover saturate-105 group-hover:saturate-125"
                  whileHover={{ scale: 1.13 }}
                  transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-end p-6 z-30">
                  <p className="text-base text-white/95 font-medium translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                    {img.alt}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
