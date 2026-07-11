import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { LOGO_SRC, BRAND_TEAL, BRAND_TEAL_DEEP } from '../../constants/branding';
import { useInscriptionFormateursOuverte } from '../../hooks/useInscriptionFormateursOuverte';

const navLinks = [
  { label: 'Mission', href: '#mission' },
  { label: 'Nehemiah Lab', href: '#nehemiah-lab' },
  { label: 'Programmes', href: '#programmes' },
  { label: 'Nouveautés', href: '#nouveautes' },
  { label: 'Galerie', href: '#galerie' },
  { label: 'Contact', href: '#contact' },
];

export default function SiteHeader() {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { ouverte: inscriptionsOuvertes } = useInscriptionFormateursOuverte();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const scrollTo = (href: string) => {
    setMobileOpen(false);
    if (href.startsWith('#')) {
      document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="sticky top-0 left-0 right-0 z-50 pt-[env(safe-area-inset-top)]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[60] focus:bg-white focus:text-[#004b57] focus:px-4 focus:py-2 focus:rounded-lg focus:font-semibold"
      >
        Aller au contenu principal
      </a>

      <nav
        className="border-b border-white/10 shadow-lg shadow-black/20"
        style={{ backgroundColor: BRAND_TEAL }}
      >
        <div className={`max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-4 transition-all duration-300 ${scrolled ? 'h-[64px]' : 'h-[72px]'}`}>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center shrink-0 group relative z-10"
          >
            <div className="p-1.5 rounded-xl bg-white/10 border border-white/15 group-hover:bg-white/15 transition-colors">
              <img src={LOGO_SRC} alt="Smart Kids Academy" className={`w-auto object-contain transition-all duration-300 ${scrolled ? 'h-9' : 'h-11'}`} />
            </div>
          </button>

          <div className="hidden lg:flex items-center gap-6">
            {navLinks.map((link) => (
              <button
                key={link.href}
                type="button"
                onClick={() => scrollTo(link.href)}
                className="text-sm font-medium text-white/85 hover:text-white transition-colors relative after:absolute after:-bottom-1 after:left-0 after:h-0.5 after:w-0 after:bg-white hover:after:w-full after:transition-all after:duration-300"
              >
                {link.label}
              </button>
            ))}
          </div>

          <div className="hidden sm:flex items-center gap-3 relative z-10">
            <Link
              to="/connexion"
              className="text-sm font-semibold text-white/90 hover:text-white px-4 py-2 rounded-full border border-white/35 hover:bg-white/10 transition-colors"
            >
              Connexion
            </Link>
            {inscriptionsOuvertes && (
              <Link
                to="/inscription-formateur"
                className="text-sm font-bold px-5 py-2.5 rounded-full bg-white text-[#004b57] hover:bg-white/95 transition-colors shadow-md"
              >
                Inscription
              </Link>
            )}
          </div>

          <button
            type="button"
            className="lg:hidden p-2 text-white/90 hover:text-white relative z-10"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Menu"
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              id="mobile-menu"
              className="lg:hidden border-t border-white/15 overflow-hidden"
              style={{ backgroundColor: BRAND_TEAL_DEEP }}
            >
              <div className="px-4 py-4 space-y-2">
                {navLinks.map((link, i) => (
                  <motion.button
                    key={link.href}
                    type="button"
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => scrollTo(link.href)}
                    className="block w-full text-left px-4 py-3 rounded-xl text-white/85 hover:bg-white/10 hover:text-white"
                  >
                    {link.label}
                  </motion.button>
                ))}
                <hr className="border-white/15 my-2" />
                <Link
                  to="/connexion"
                  onClick={() => setMobileOpen(false)}
                  className="block w-full text-left px-4 py-3 rounded-xl text-white/90 hover:bg-white/10"
                >
                  Connexion
                </Link>
                {inscriptionsOuvertes && (
                  <Link
                    to="/inscription-formateur"
                    onClick={() => setMobileOpen(false)}
                    className="block w-full text-center px-4 py-3 rounded-full bg-white text-[#004b57] font-bold"
                  >
                    Inscription
                  </Link>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </header>
  );
}
