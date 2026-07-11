import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { BRAND_TEAL, BRAND_TEAL_DEEP, BRAND_TEAL_LIGHT, LOGO_SRC } from '../../constants/branding';

interface AuthShellProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  maxWidthClass?: string;
  navLinks?: Array<{ to: string; label: string; primary?: boolean }>;
}

/** Fond teal (header/footer) + carte blanche contrastée pour Connexion / Inscription */
export default function AuthShell({
  children,
  title,
  subtitle,
  maxWidthClass = 'max-w-lg',
  navLinks = [{ to: '/', label: "Retour à l'accueil" }],
}: AuthShellProps) {
  return (
    <div
      className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center px-4 py-10"
      style={{
        background: `linear-gradient(155deg, ${BRAND_TEAL_DEEP} 0%, ${BRAND_TEAL} 48%, ${BRAND_TEAL_LIGHT} 100%)`,
      }}
    >
      {/* Atmosphère */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -right-24 w-[28rem] h-[28rem] rounded-full bg-white/10 blur-[100px]" />
        <div className="absolute -bottom-40 -left-28 w-[32rem] h-[32rem] rounded-full bg-black/20 blur-[110px]" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.55) 1px, transparent 0)',
            backgroundSize: '28px 28px',
          }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className={`relative z-10 w-full ${maxWidthClass}`}
      >
        {/* Navigation sur fond teal */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          {navLinks.map((link) =>
            link.primary ? (
              <Link
                key={link.to + link.label}
                to={link.to}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white text-[#004b57] text-sm font-semibold shadow-lg shadow-black/15 hover:bg-white/95 hover:-translate-y-0.5 transition-all"
              >
                {link.label}
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <Link
                key={link.to + link.label}
                to={link.to}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-white/35 bg-white/10 text-white text-sm font-medium backdrop-blur-sm hover:bg-white/20 hover:border-white/55 transition-all group"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                {link.label}
              </Link>
            ),
          )}
        </div>

        {/* Carte formulaire */}
        <div className="rounded-3xl bg-white border border-white/60 shadow-2xl shadow-black/25 p-6 sm:p-8">
          <div className="text-center mb-7">
            <div className="inline-flex p-2 rounded-2xl bg-[#004b57]/08 border border-[#004b57]/15 mb-4">
              <img src={LOGO_SRC} alt="Smart Kids Academy" className="h-14 sm:h-16 rounded-lg" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2 tracking-tight">{title}</h1>
            <p className="text-slate-500 text-sm sm:text-base leading-relaxed max-w-md mx-auto">{subtitle}</p>
          </div>
          {children}
        </div>
      </motion.div>
    </div>
  );
}
