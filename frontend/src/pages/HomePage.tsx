import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Code, Box, Cpu, LineChart, ArrowRight, ArrowUp } from 'lucide-react';
import SiteHeader from '../components/site/SiteHeader';
import SiteFooter from '../components/site/SiteFooter';
import PublicationsBanner from '../components/site/PublicationsBanner';
import NouveautesSection from '../components/site/NouveautesSection';
import GalerieSection from '../components/site/GalerieSection';
import HomeFallingGallery, { buildFallingPhotos, type FallingPhoto } from '../components/site/HomeFallingGallery';
import MissionSection from '../components/site/MissionSection';
import NehemiahLabSection from '../components/site/NehemiahLabSection';
import FloatingOrbs from '../components/site/FloatingOrbs';
import StatsBar from '../components/site/StatsBar';
import SectionHeading from '../components/site/SectionHeading';
import {
  HERO_IMAGE,
  SITE_INFO,
  PROGRAMS,
} from '../constants/branding';
import { useInscriptionFormateursOuverte } from '../hooks/useInscriptionFormateursOuverte';
import { siteService } from '../services/api';
import { mediaUrl } from '../utils/media';

const HERO_CARD_TRANSITION = { duration: 14, repeat: Infinity, ease: 'easeInOut' as const };
const HERO_HALO_TRANSITION = { duration: 25, repeat: Infinity, ease: 'linear' as const };
const techLetters = 'technologies'.split('');

const programIcons = { programmation: Code, modelisation: Box, electronique: Cpu, business: LineChart };
const programColors: Record<string, { color: string; shadow: string }> = {
  programmation: { color: 'from-blue-400 to-blue-600', shadow: 'shadow-blue-500/20' },
  modelisation: { color: 'from-purple-400 to-purple-600', shadow: 'shadow-purple-500/20' },
  electronique: { color: 'from-emerald-400 to-emerald-600', shadow: 'shadow-emerald-500/20' },
  business: { color: 'from-orange-400 to-orange-600', shadow: 'shadow-orange-500/20' },
};

const heroWords = ['Faites', 'entrer', 'votre', 'enfant', 'dans', 'le', 'monde', 'des'];

export default function HomePage() {
  const { scrollY } = useScroll();
  const [showBackTop, setShowBackTop] = useState(false);
  const [heroImage, setHeroImage] = useState<string>(HERO_IMAGE);
  const [heroAlt, setHeroAlt] = useState('Atelier Smart Kids Academy');
  const [fallingPhotos, setFallingPhotos] = useState<FallingPhoto[]>([]);
  const [galerieReady, setGalerieReady] = useState(false);
  const { ouverte: inscriptionsOuvertes } = useInscriptionFormateursOuverte();
  const heroImageY = useTransform(scrollY, [0, 600], [0, 80]);
  const heroImageScale = useTransform(scrollY, [0, 600], [1, 1.08]);
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0.6]);

  useEffect(() => {
    const onScroll = () => setShowBackTop(window.scrollY > 720);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    let settled = false;

    const showFalling = (data: import('../types').GaleriePhoto[]) => {
      if (settled) return;
      settled = true;
      setFallingPhotos(buildFallingPhotos(data));
      setGalerieReady(true);
    };

    const fallbackTimer = window.setTimeout(() => showFalling([]), 350);

    siteService
      .getGalerie()
      .then((r) => {
        const heroPhoto = r.data.find((p) => p.ordre === 0) ?? r.data[0];
        if (heroPhoto?.imageUrl) {
          setHeroImage(mediaUrl(heroPhoto.imageUrl));
          if (heroPhoto.legende) setHeroAlt(heroPhoto.legende);
        }
        window.clearTimeout(fallbackTimer);
        showFalling(r.data);
      })
      .catch(() => {
        window.clearTimeout(fallbackTimer);
        showFalling([]);
      });

    return () => window.clearTimeout(fallbackTimer);
  }, []);

  useEffect(() => {
    document.title = 'Smart Kids Academy | Nehemiah Lab Togo';
    const description = document.querySelector('meta[name="description"]');
    if (description) {
      description.setAttribute(
        'content',
        "Smart Kids Academy accompagne les enfants et adolescents avec des formations pratiques en code, électronique, 3D et compétences d'avenir.",
      );
    }
  }, []);

  return (
    <div className="min-h-screen text-slate-900 font-sans antialiased bg-transparent">
      <SiteHeader />
      <main id="main-content" className="relative">
      {/* Hero */}
      <section className="relative pt-10 sm:pt-14 lg:pt-16 pb-20 sm:pb-24 lg:pb-32 px-4 sm:px-6 overflow-hidden">
        <FloatingOrbs />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#004b57]/12 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3 animate-float-slow" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#004b57]/08 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/4 animate-float-slow-reverse" />

        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-10 sm:gap-14 items-center relative z-10">
          <motion.div style={{ opacity: heroOpacity }}>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#004b57]/10 border border-[#004b57]/25 mb-8"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#004b57] opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#004b57]" />
              </span>
              <span className="text-sm font-medium text-[#004b57]">Programme {SITE_INFO.parentOrg}</span>
            </motion.div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl xl:text-[3.25rem] font-extrabold leading-[1.08] tracking-tight mb-5 sm:mb-6 text-slate-900">
              {heroWords.map((word, i) => (
                <motion.span
                  key={word}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 * i, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="inline-block mr-[0.28em]"
                >
                  {word}
                </motion.span>
              ))}
              <motion.span
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.72, duration: 0.5 }}
                className="relative inline-block align-baseline ml-[0.12em]"
              >
                <motion.span
                  className="relative z-10 inline-flex flex-wrap"
                  animate={{ scale: [1, 1.025, 1] }}
                  transition={{ delay: 1.4, duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
                >
                  {techLetters.map((letter, i) => (
                    <motion.span
                      key={`${letter}-${i}`}
                      initial={{ opacity: 0, y: 28, rotateX: -70 }}
                      animate={{ opacity: 1, y: 0, rotateX: 0 }}
                      transition={{
                        delay: 0.78 + i * 0.04,
                        duration: 0.48,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                      className="inline-block font-extrabold text-[#004b57] hero-tech-letter"
                      style={{ transformOrigin: 'bottom center' }}
                    >
                      {letter}
                    </motion.span>
                  ))}
                </motion.span>
                <motion.span
                  aria-hidden
                  className="absolute -bottom-1 left-0 right-0 h-[3px] rounded-full bg-gradient-to-r from-[#004b57] via-[#006878] to-[#004b57] origin-left"
                  initial={{ scaleX: 0, opacity: 0 }}
                  animate={{ scaleX: 1, opacity: 1 }}
                  transition={{ delay: 1.1, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                />
                <motion.span
                  aria-hidden
                  className="absolute -inset-x-1 -inset-y-0.5 rounded-md bg-[#004b57]/10 blur-md -z-10"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.7, 0.35, 0.7] }}
                  transition={{ delay: 1.2, duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                />
                <motion.span
                  aria-hidden
                  className="absolute inset-0 overflow-hidden rounded-sm pointer-events-none"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.15, duration: 0.35 }}
                >
                  <motion.span
                    className="absolute inset-y-0 w-[42%] bg-gradient-to-r from-transparent via-white/70 to-transparent skew-x-12"
                    animate={{ left: ['-48%', '160%'] }}
                    transition={{ duration: 2.2, repeat: Infinity, repeatDelay: 0.9, ease: 'easeInOut' }}
                  />
                </motion.span>
              </motion.span>
            </h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.85, duration: 0.6 }}
              className="text-base sm:text-lg text-slate-500 mb-8 sm:mb-10 leading-relaxed max-w-xl"
            >
              {SITE_INFO.heroSubtitle}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1, duration: 0.5 }}
              className="flex flex-wrap gap-3 sm:gap-4"
            >
              {inscriptionsOuvertes ? (
                <Link
                  to="/inscription-formateur"
                  className="w-full sm:w-auto justify-center px-6 sm:px-8 py-3.5 sm:py-4 rounded-full font-bold text-white bg-[#004b57] hover:bg-[#003840] transition-colors inline-flex items-center gap-2 shadow-lg shadow-[#004b57]/25"
                >
                  Rejoindre l'académie
                  <ArrowRight className="w-5 h-5" />
                </Link>
              ) : (
                <Link
                  to="/connexion"
                  className="w-full sm:w-auto justify-center px-6 sm:px-8 py-3.5 sm:py-4 rounded-full font-bold text-white bg-[#004b57] hover:bg-[#003840] transition-colors inline-flex items-center gap-2 shadow-lg shadow-[#004b57]/25"
                >
                  Se connecter
                  <ArrowRight className="w-5 h-5" />
                </Link>
              )}
              <button
                type="button"
                onClick={() => document.getElementById('programmes')?.scrollIntoView({ behavior: 'smooth' })}
                className="w-full sm:w-auto justify-center px-6 sm:px-8 py-3.5 sm:py-4 rounded-full font-semibold border-2 border-[#004b57]/35 text-[#004b57] hover:bg-[#004b57]/08 transition-all inline-flex items-center"
              >
                Découvrir les programmes
              </button>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.92, rotateY: -8 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
            transition={{ duration: 0.85, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            style={{ y: heroImageY, scale: heroImageScale }}
            className="relative perspective-1000"
          >
            <motion.div
              animate={{ rotateY: [-10, 10, -10], rotateZ: [0, 1.5, 0, -1.5, 0] }}
              transition={HERO_CARD_TRANSITION}
              style={{ transformStyle: 'preserve-3d' }}
              className="relative"
            >
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={HERO_HALO_TRANSITION}
                className="absolute -inset-3 rounded-[2.2rem] bg-gradient-to-br from-[#004b57]/35 via-transparent to-[#004b57]/15 opacity-70 blur-sm"
              />
              <div className="relative aspect-[4/5] max-h-[460px] sm:max-h-[560px] rounded-[2rem] overflow-hidden border border-slate-200 shadow-2xl shadow-slate-900/10">
                <img src={heroImage} alt={heroAlt} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#004b57]/80 via-[#004b57]/15 to-transparent" />
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.1, duration: 0.6 }}
                  className="absolute bottom-0 left-0 right-0 p-6"
                >
                  <div className="backdrop-blur-md bg-white/90 rounded-xl p-4 border border-white/60 shadow-lg">
                    <p className="text-sm text-[#004b57] font-medium">Smart Kids Academy</p>
                    <p className="text-slate-900 font-bold">{SITE_INFO.tagline}</p>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <HomeFallingGallery photos={fallingPhotos} ready={galerieReady} />

      <StatsBar />
      <PublicationsBanner />
      <MissionSection />
      <NehemiahLabSection />

      {/* Programmes */}
      <section id="programmes" className="py-24 sm:py-28 lg:py-32 px-4 sm:px-6 lg:px-8 section-sep bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <SectionHeading
            badge="Formations"
            title="Nos domaines d'apprentissage"
            description="Quatre pôles complémentaires pour une formation STEAM complète."
          />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-7">
            {PROGRAMS.map((program, index) => {
              const Icon = programIcons[program.id as keyof typeof programIcons];
              const style = programColors[program.id];
              return (
                <motion.article
                  key={program.id}
                  initial={{ opacity: 0, y: 32 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ delay: index * 0.1, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                  whileHover={{ y: -8, transition: { duration: 0.25 } }}
                  className="group p-8 sm:p-9 rounded-3xl border border-slate-200 bg-white hover:border-[#004b57]/30 hover:shadow-lg hover:shadow-[#004b57]/8 transition-all duration-300 min-h-[260px]"
                >
                  <motion.div
                    whileHover={{ rotate: [0, -8, 8, 0], scale: 1.08 }}
                    transition={{ duration: 0.5 }}
                    className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${style.color} flex items-center justify-center mb-7 shadow-lg ${style.shadow}`}
                  >
                    <Icon className="w-8 h-8 text-white" />
                  </motion.div>
                  <h3 className="text-xl font-bold mb-3 text-slate-900">{program.title}</h3>
                  <p className="text-slate-500 text-base leading-relaxed">{program.description}</p>
                </motion.article>
              );
            })}
          </div>
        </div>
      </section>

      <NouveautesSection />

      <GalerieSection />

      {showBackTop && (
        <motion.button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.97 }}
          className="fixed bottom-5 right-4 sm:bottom-6 sm:right-6 z-40 inline-flex items-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 rounded-full bg-[#004b57] text-white text-sm sm:text-base font-semibold shadow-xl shadow-[#004b57]/30"
        >
          <ArrowUp className="w-4 h-4" />
          <span className="hidden sm:inline">Retour en haut</span>
        </motion.button>
      )}
      </main>

      <SiteFooter />
    </div>
  );
}
