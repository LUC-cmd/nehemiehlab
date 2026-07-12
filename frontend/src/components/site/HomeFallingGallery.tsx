import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import type { GaleriePhoto } from '../../types';
import { GALLERY_IMAGES } from '../../constants/branding';
import { mediaUrl } from '../../utils/media';

const MAX_PHOTOS = 10;
const SCATTER_S = 3;

export type FallingPhoto = { key: string; src: string; alt: string };

export function buildFallingPhotos(photos: GaleriePhoto[]): FallingPhoto[] {
  if (photos.length) {
    return photos
      .filter((p) => p.ordre !== 0 && p.imageUrl)
      .sort((a, b) => a.ordre - b.ordre)
      .slice(0, MAX_PHOTOS)
      .map((p) => ({
        key: String(p.id),
        src: mediaUrl(p.imageUrl!),
        alt: p.legende,
      }));
  }
  return GALLERY_IMAGES.slice(1, MAX_PHOTOS + 1).map((img) => ({
    key: img.src,
    src: img.src,
    alt: img.alt,
  }));
}

/** Directions aléatoires mais stables par photo (reproductible au refresh via clé) */
const EDGE_TARGETS = [
  { x: '-46vw', y: '-42vh', rot: -18 },
  { x: '44vw', y: '-40vh', rot: 14 },
  { x: '-48vw', y: '8vh', rot: 22 },
  { x: '46vw', y: '12vh', rot: -16 },
  { x: '-8vw', y: '-48vh', rot: 10 },
  { x: '10vw', y: '46vh', rot: -12 },
  { x: '-42vw', y: '44vh', rot: 20 },
  { x: '48vw', y: '-14vh', rot: -24 },
  { x: '-38vw', y: '-20vh', rot: 16 },
  { x: '40vw', y: '38vh', rot: -19 },
  { x: '50vw', y: '36vh', rot: 15 },
  { x: '-50vw', y: '-30vh', rot: -21 },
] as const;

function hashIndex(key: string, modulo: number) {
  let h = 0;
  for (let i = 0; i < key.length; i += 1) h = (h * 31 + key.charCodeAt(i)) % 9973;
  return h % modulo;
}

function centerOffset(index: number, total: number) {
  if (total <= 1) return { x: 0, y: 0, rot: 0 };
  const angle = (index / total) * Math.PI * 2;
  const radius = 6 + (index % 2) * 4;
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
    rot: (index % 2 === 0 ? 1 : -1) * (2 + (index % 3)),
  };
}

function scatterPlan(key: string, index: number, total: number) {
  const start = centerOffset(index, total);
  const target = EDGE_TARGETS[hashIndex(key, EDGE_TARGETS.length)];
  return { start, target };
}

type Props = {
  photos: FallingPhoto[];
  ready: boolean;
};

/** Départ au centre → dispersion vers les bords en 3 s → fin */
export default function HomeFallingGallery({ photos, ready }: Props) {
  const count = photos.length;
  const [playing, setPlaying] = useState(true);

  const plans = useMemo(
    () => photos.map((photo, index) => scatterPlan(photo.key, index, count)),
    [photos, count],
  );

  useEffect(() => {
    if (!ready || count === 0) return;
    setPlaying(true);
    const timer = window.setTimeout(() => setPlaying(false), SCATTER_S * 1000 + 60);
    return () => window.clearTimeout(timer);
  }, [ready, count, photos]);

  if (!ready || !playing || count === 0) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center overflow-hidden"
    >
      <motion.div
        className="absolute inset-0 bg-white/20"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0.35, 0.35, 0] }}
        transition={{ duration: SCATTER_S, times: [0, 0.15, 1], ease: 'easeOut' }}
      />

      {photos.map((photo, index) => {
        const { start, target } = plans[index];

        return (
          <motion.div
            key={photo.key}
            className="absolute left-1/2 top-1/2 w-[92px] sm:w-[108px] md:w-[118px] aspect-[4/3] -translate-x-1/2 -translate-y-1/2"
            style={{ zIndex: 10 + index }}
            initial={{
              x: start.x,
              y: start.y,
              rotate: start.rot,
              scale: 0.9,
              opacity: 1,
            }}
            animate={{
              x: target.x,
              y: target.y,
              rotate: target.rot,
              scale: 0.45,
              opacity: 0,
            }}
            transition={{
              duration: SCATTER_S,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <div className="home-gather-photo h-full w-full shadow-lg">
              <img src={photo.src} alt="" className="home-gather-photo__img" loading="eager" />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
