import React from 'react';
import { motion } from 'framer-motion';
import { LOGO_SRC, BRAND_TEAL, PAGE_BG } from '../../constants/branding';

export type AppLoaderVariant = 'fullPage' | 'page' | 'overlay' | 'inline' | 'button';
export type AppLoaderTone = 'light' | 'brand';

export interface AppLoaderProps {
  variant?: AppLoaderVariant;
  tone?: AppLoaderTone;
  message?: string;
  /** Texte accessible pour lecteurs d'écran */
  label?: string;
  className?: string;
}

function LoaderMark({ size = 'md' }: { size?: 'md' | 'lg' }) {
  const cardClass = size === 'lg' ? 'ska-loader-logo-card-lg' : 'ska-loader-logo-card-md';
  const logoClass = size === 'lg' ? 'h-14 sm:h-[4.25rem]' : 'h-10 sm:h-11';

  return (
    <div className={`ska-loader-mark ${size === 'lg' ? 'ska-loader-mark-lg' : 'ska-loader-mark-md'}`} aria-hidden>
      <span className="ska-loader-ring" />
      <div className={`ska-loader-logo-card ${cardClass}`}>
        <img
          src={LOGO_SRC}
          alt=""
          className={`${logoClass} w-auto max-w-full object-contain`}
        />
      </div>
    </div>
  );
}

export default function AppLoader({
  variant = 'page',
  tone = 'light',
  message = 'Chargement…',
  label = 'Chargement en cours',
  className = '',
}: AppLoaderProps) {
  if (variant === 'button' || variant === 'inline') {
    return (
      <span
        className={`ska-loader-inline ${className}`}
        role="status"
        aria-label={label}
      />
    );
  }

  const toneClass = tone === 'brand' ? 'ska-loader-tone-brand' : '';

  const content = (
    <motion.div
      initial={{ opacity: 0, y: variant === 'overlay' ? 0 : 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      className={`ska-loader-panel ${variant === 'overlay' ? 'ska-loader-panel-overlay' : ''} ${toneClass} ${className}`}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <LoaderMark size={variant === 'fullPage' ? 'lg' : 'md'} />
      {message ? <p className="ska-loader-message">{message}</p> : null}
      <div className="ska-loader-progress" aria-hidden>
        <span className="ska-loader-progress-bar" />
      </div>
    </motion.div>
  );

  if (variant === 'fullPage') {
    return (
      <div
        className={`ska-loader-fullpage ${tone === 'brand' ? 'ska-loader-fullpage-brand' : ''}`}
        style={{ backgroundColor: tone === 'brand' ? BRAND_TEAL : PAGE_BG }}
      >
        <div
          className="ska-loader-fullpage-glow"
          style={{
            background: tone === 'brand'
              ? 'radial-gradient(circle at 50% 38%, rgba(255,255,255,0.1) 0%, transparent 65%)'
              : `radial-gradient(circle at 50% 38%, ${BRAND_TEAL}14 0%, transparent 65%)`,
          }}
        />
        {content}
      </div>
    );
  }

  if (variant === 'overlay') {
    return (
      <div className="ska-loader-overlay-shell">
        <div className="ska-loader-overlay-backdrop" />
        {content}
      </div>
    );
  }

  return <div className="ska-loader-page">{content}</div>;
}

/** Spinner compact pour boutons (remplace Loader2) */
export function ButtonSpinner({ className = 'w-4 h-4' }: { className?: string }) {
  return <AppLoader variant="button" message="" label="Chargement" className={className} />;
}

/** Barre de progression fine en haut de l'écran lors des changements de route */
export function RouteProgressBar({ active }: { active: boolean }) {
  return (
    <div className={`route-progress ${active ? 'route-progress-active' : ''}`} aria-hidden>
      <div className="route-progress-bar" />
    </div>
  );
}
