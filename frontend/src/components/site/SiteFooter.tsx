import React from 'react';
import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin, Clock, ArrowRight } from 'lucide-react';
import { LOGO_SRC, BRAND_TEAL, BRAND_TEAL_DEEP, PAGE_BG, SITE_INFO, PROGRAMS, NEHEMIAH_LAB } from '../../constants/branding';
import { useInscriptionFormateursOuverte } from '../../hooks/useInscriptionFormateursOuverte';

interface Props {
  onContactClick?: () => void;
}

export default function SiteFooter({ onContactClick }: Props) {
  const { ouverte: inscriptionsOuvertes } = useInscriptionFormateursOuverte();

  const scrollContact = () => {
    if (onContactClick) onContactClick();
    else document.getElementById('contact-details')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <footer id="contact" className="relative z-20 overflow-hidden">
      {/* CTA — fond page (distinct du pied teal) */}
      <div
        className="relative py-16 sm:py-20 px-4 sm:px-6 overflow-hidden section-sep-top"
        style={{ backgroundColor: PAGE_BG }}
      >
        <div className="absolute inset-0 opacity-[0.12] bg-[radial-gradient(circle_at_50%_0%,rgba(0,75,87,0.35),transparent_55%)]" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <img src={LOGO_SRC} alt="Smart Kids Academy" className="h-16 sm:h-20 mx-auto mb-7 sm:mb-8 rounded-xl shadow-2xl" />
          <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mb-4 tracking-tight">
            {SITE_INFO.tagline}
          </h3>
          <p className="text-slate-500 text-base sm:text-lg leading-relaxed mb-8 sm:mb-10 max-w-2xl mx-auto">
            {SITE_INFO.heroSubtitle}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {inscriptionsOuvertes ? (
              <Link
                to="/inscription-formateur"
                className="inline-flex w-full sm:w-auto justify-center items-center gap-2 px-6 sm:px-8 py-3.5 sm:py-4 rounded-full bg-[#004b57] text-white font-bold hover:bg-[#003840] hover:scale-[1.02] transition-all shadow-xl shadow-[#004b57]/25"
              >
                Devenir formateur
                <ArrowRight className="w-5 h-5" />
              </Link>
            ) : (
              <Link
                to="/connexion"
                className="inline-flex w-full sm:w-auto justify-center items-center gap-2 px-6 sm:px-8 py-3.5 sm:py-4 rounded-full bg-[#004b57] text-white font-bold hover:bg-[#003840] hover:scale-[1.02] transition-all shadow-xl shadow-[#004b57]/25"
              >
                Se connecter
                <ArrowRight className="w-5 h-5" />
              </Link>
            )}
            <button
              type="button"
              onClick={scrollContact}
              className="inline-flex w-full sm:w-auto justify-center items-center gap-2 px-6 sm:px-8 py-3.5 sm:py-4 rounded-full border-2 border-[#004b57]/35 text-[#004b57] font-semibold hover:bg-[#004b57]/08 transition-all"
            >
              Nous contacter
            </button>
          </div>
        </div>
      </div>

      {/* Pied de page — teal charte (distinct du contenu) */}
      <div id="contact-details" style={{ backgroundColor: BRAND_TEAL }} className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-14 sm:pt-16 pb-10">
          <div className="grid md:grid-cols-2 lg:grid-cols-12 gap-12 lg:gap-8">
            <div className="lg:col-span-4">
              <img src={LOGO_SRC} alt="Smart Kids Academy" className="h-14 w-auto rounded-lg mb-5" />
              <p className="text-white/75 text-sm leading-relaxed mb-4">
                Smart Kids Academy est un programme de <span className="text-white font-medium">{SITE_INFO.parentOrg}</span>.
                {NEHEMIAH_LAB.tagline} — nous préparons la jeunesse togolaise aux métiers et compétences de demain.
              </p>
              <p className="text-xs text-white/50 uppercase tracking-widest font-semibold">
                Éducation · Innovation · Excellence
              </p>
            </div>

            <div className="lg:col-span-3">
              <h4 className="text-white font-semibold mb-5 text-xs uppercase tracking-[0.15em]">
                Programmes
              </h4>
              <ul className="space-y-3">
                {PROGRAMS.map((p) => (
                  <li key={p.id} className="text-white/70 text-sm flex items-start gap-2.5">
                    <span className="w-1 h-1 rounded-full bg-white mt-2 shrink-0" />
                    <span>{p.title}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="lg:col-span-3">
              <h4 className="text-white font-semibold mb-5 text-xs uppercase tracking-[0.15em]">
                Contact
              </h4>
              <ul className="space-y-4 text-sm">
                <li className="flex items-start gap-3 text-white/70">
                  <MapPin className="w-4 h-4 text-white shrink-0 mt-0.5" />
                  {SITE_INFO.address}
                </li>
                <li>
                  <a
                    href={`tel:${SITE_INFO.phone.replace(/\s/g, '')}`}
                    className="flex items-center gap-3 text-white/70 hover:text-white transition-colors"
                  >
                    <Phone className="w-4 h-4 text-white shrink-0" />
                    {SITE_INFO.phone}
                  </a>
                </li>
                <li>
                  <a
                    href={`tel:${SITE_INFO.phoneAlt.replace(/\s/g, '')}`}
                    className="flex items-center gap-3 text-white/70 hover:text-white transition-colors pl-7 text-xs"
                  >
                    {SITE_INFO.phoneAlt}
                  </a>
                </li>
                <li>
                  <a
                    href={`mailto:${SITE_INFO.email}`}
                    className="flex items-center gap-3 text-white/70 hover:text-white transition-colors"
                  >
                    <Mail className="w-4 h-4 text-white shrink-0" />
                    {SITE_INFO.email}
                  </a>
                </li>
                <li className="flex items-center gap-3 text-white/70">
                  <Clock className="w-4 h-4 text-white shrink-0" />
                  {SITE_INFO.hours}
                </li>
              </ul>
            </div>

            <div className="lg:col-span-2">
              <h4 className="text-white font-semibold mb-5 text-xs uppercase tracking-[0.15em]">
                Au Togo
              </h4>
              <div className="flex flex-wrap gap-2">
                {SITE_INFO.regions.map((r) => (
                  <span
                    key={r}
                    className="px-3 py-1.5 rounded-lg text-xs bg-white/10 border border-white/15 text-white/85"
                  >
                    {r}
                  </span>
                ))}
              </div>
              <div className="mt-6 flex flex-col gap-2">
                <Link to="/connexion" className="text-sm text-white/80 hover:text-white underline-offset-2 hover:underline">
                  Connexion
                </Link>
                {inscriptionsOuvertes && (
                  <Link to="/inscription-formateur" className="text-sm text-white/80 hover:text-white underline-offset-2 hover:underline">
                    Inscription formateur
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 pb-[env(safe-area-inset-bottom)]" style={{ backgroundColor: BRAND_TEAL_DEEP }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/55">
            <p className="text-center sm:text-left">© {new Date().getFullYear()} {SITE_INFO.parentOrg} · Smart Kids Academy. Tous droits réservés.</p>
            <p className="text-white/40 text-center sm:text-right">Plateforme de gestion &amp; site officiel SKA</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
