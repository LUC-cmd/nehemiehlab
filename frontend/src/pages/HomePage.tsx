import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import CountUp from 'react-countup';
import toast from 'react-hot-toast';
import {
  ChevronDown, ChevronRight, Menu, X, ArrowRight,
  Rocket, Users, Target, Award, MapPin, Mail, Phone,
  Facebook, Linkedin, Twitter, Instagram,
  CheckCircle, Star, TrendingUp, Lightbulb, Globe
} from 'lucide-react';

// ============================================================
//  Données
// ============================================================
const programmes = [
  {
    id: 1,
    nom: 'Genesis Program',
    icon: <Lightbulb className="w-8 h-8" />,
    image: 'http://nehemiahlab.com/assets/img/resource/4.jpg',
    description: 'Le programme ultime pour faire germer tes idées entrepreneuriales ! Acquiers les fondamentaux de l\'innovation et prépare le terrain pour concrétiser ton projet.',
    avantages: ['Culture startup solide', 'Fondamentaux de l\'innovation', 'Méthodologie Lean Startup', 'Mentorat individuel'],
    couleur: 'from-accent-gold to-primary-600',
  },
  {
    id: 2,
    nom: 'Founders Program',
    icon: <Rocket className="w-8 h-8" />,
    image: 'http://nehemiahlab.com/assets/img/resource/2.jpg',
    description: 'Donne vie à ton projet d\'entreprise en passant de la simple idée à une concrétisation tangible. Crée un produit novateur et trouve tes premiers clients.',
    avantages: ['De l\'idée au produit', 'Validation marché', 'Premiers clients', 'Structure juridique'],
    couleur: 'from-primary-500 to-accent-crimson',
  },
  {
    id: 3,
    nom: 'Go Big Program',
    icon: <Globe className="w-8 h-8" />,
    image: 'http://nehemiahlab.com/assets/img/resource/1.jpg',
    description: 'Prépare-toi à conquérir les marchés internationaux et devenir un champion mondial de ton secteur. Ce programme propulsera ton entreprise vers de nouvelles dimensions.',
    avantages: ['Expansion internationale', 'Levée de fonds', 'Scale-up stratégique', 'Demo Day investisseurs'],
    couleur: 'from-accent-crimson to-primary-900',
  },
];

const faqs = [
  {
    q: 'Qui peut postuler aux programmes Nehemiah Lab ?',
    r: 'Les jeunes de 18 à 35 ans issus du programme Compassion au Togo peuvent postuler. Nous sélectionnons les profils les plus motivés et ambitieux deux fois par an.',
  },
  {
    q: 'Combien de temps dure chaque programme ?',
    r: 'Le Genesis Program dure 3 mois, le Founders Program 6 mois, et le Go Big Program 12 mois. Chaque programme est conçu pour un accompagnement progressif et intensif.',
  },
  {
    q: 'Est-ce que les programmes sont payants ?',
    r: 'Non ! Nos programmes sont entièrement gratuits pour les participants sélectionnés. Nehemiah Lab est soutenu par des partenaires et investisseurs engagés dans le développement de la jeunesse togolaise.',
  },
  {
    q: 'Comment se déroule le processus de sélection ?',
    r: 'Le processus comprend une candidature en ligne, un pitch de l\'idée devant un jury, et un entretien individuel. Nous cherchons des jeunes avec de l\'ambition, de la résilience et une idée innovante.',
  },
  {
    q: 'Que se passe-t-il après le programme ?',
    r: 'Les startups les plus prometteuses sont présentées lors d\'un Demo Day devant des investisseurs. Vous intégrez aussi notre réseau d\'alumni et continuez à bénéficier de notre suivi.',
  },
  {
    q: 'Puis-je postuler si j\'ai déjà une entreprise en cours ?',
    r: 'Absolument ! Si votre entreprise est dans ses premières phases et que vous souhaitez l\'accélérer, le Founders ou Go Big Program est fait pour vous.',
  },
];

const temoignages = [
  {
    nom: 'Koffi Amewudah',
    role: 'Fondateur de AgriTech Togo',
    programme: 'Founders Program',
    texte: 'Nehemiah Lab m\'a donné les outils, le réseau et la confiance pour transformer mon idée en une vraie entreprise. Aujourd\'hui, je gère une équipe de 5 personnes !',
    avatar: '👨🏾‍💼',
    note: 5,
  },
  {
    nom: 'Abla Mensah',
    role: 'CEO de CleanWater Solutions',
    programme: 'Go Big Program',
    texte: 'Le mentorat et l\'accès aux investisseurs ont tout changé pour moi. En 6 mois, j\'ai levé mes premiers fonds et étendu mon activité dans 3 villes du Togo.',
    avatar: '👩🏾‍💼',
    note: 5,
  },
  {
    nom: 'Edem Kodjovi',
    role: 'Co-fondateur de EduConnect',
    programme: 'Genesis Program',
    texte: 'Le Genesis Program m\'a aidé à clarifier ma vision et valider mon marché avant d\'investir du temps et de l\'argent. Une expérience inestimable !',
    avatar: '👨🏾‍🎓',
    note: 5,
  },
];

// ============================================================
//  Composants Utilitaires
// ============================================================
function AnimatedSection({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function StatCard({ value, label, suffix = '' }: { value: number; label: string; suffix?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  return (
    <div ref={ref} className="text-center">
      <div className="text-4xl md:text-5xl font-bold text-gray-900 mb-2">
        {inView ? <CountUp end={value} duration={2.5} suffix={suffix} /> : '0'}
      </div>
      <div className="text-gray-600 font-medium">{label}</div>
    </div>
  );
}

// ============================================================
//  Navbar
// ============================================================
function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const links = [
    { label: 'Accueil', href: '#accueil' },
    { label: 'Qui sommes-nous', href: '#a-propos' },
    { label: 'Programmes', href: '#nos-programmes' },
    { label: 'FAQ', href: '#faq' },
    { label: 'Contact', href: '#contact' },
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? 'bg-primary-600 shadow-xl' : 'bg-primary-500 shadow-md'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <a href="#accueil" className="flex items-center gap-3">
            <img src="http://nehemiahlab.com/assets/img/logo.png" alt="Nehemiah Lab" className="h-10 brightness-0 invert" />
          </a>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            {links.map((l) => (
              <a key={l.href} href={l.href}
                className="text-white/90 hover:text-white font-medium transition-colors duration-200 text-sm">
                {l.label}
              </a>
            ))}
          </div>

          {/* CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link to="/connexion"
              className="bg-white text-primary-600 hover:bg-gray-100 text-sm py-2.5 px-5 rounded-xl font-bold transition-all duration-200 flex items-center gap-2 shadow-sm">
              <span>Portail Administration</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Mobile toggle */}
          <button onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 text-white rounded-lg hover:bg-white/10 transition-colors">
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden bg-primary-600 border-t border-primary-700 px-4 py-6 space-y-3"
        >
          {links.map((l) => (
            <a key={l.href} href={l.href}
              onClick={() => setMobileOpen(false)}
              className="block px-4 py-3 text-white/90 hover:text-white hover:bg-primary-700 rounded-xl font-medium transition-all">
              {l.label}
            </a>
          ))}
          <Link to="/connexion" onClick={() => setMobileOpen(false)}
            className="flex items-center gap-2 px-4 py-3 bg-white text-primary-600 rounded-xl font-bold">
            <span>Portail Administration</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      )}
    </nav>
  );
}

// ============================================================
//  Section Hero
// ============================================================
function HeroSection() {
  return (
    <section id="accueil" className="relative min-h-screen flex items-center overflow-hidden bg-white">
      {/* Background décor - Soft Professional Glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary-500/5 rounded-full blur-3xl translate-x-1/2 -translate-y-1/4" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent-gold/5 rounded-full blur-3xl -translate-x-1/2 translate-y-1/4" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20 w-full">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Texte */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
            >
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500/10 border border-primary-500/20 rounded-full text-primary-600 text-sm font-semibold mb-6">
                <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
                Incubateur de Startups au Togo
              </span>

              <h1 className="text-4xl sm:text-5xl xl:text-6xl font-bold text-gray-900 leading-tight mb-6">
                Seras-tu le{' '}
                <span className="text-gradient">prochain CEO</span>
                {' '}du Togo ?
              </h1>

              <p className="text-gray-600 text-lg leading-relaxed mb-8 max-w-xl">
                Nehemiah Lab est un déclencheur de performances entrepreneuriales ambitieuses.
                Deux fois par an, nous sélectionnons les startups les plus prometteuses,
                portées par des jeunes talentueux.
              </p>

              <div className="flex flex-wrap gap-4">
                <a href="#nos-programmes" className="btn-primary">
                  Découvrir nos programmes
                  <ChevronRight className="w-5 h-5" />
                </a>
                <a href="#a-propos" className="btn-outline">
                  Qui sommes-nous ?
                </a>
              </div>

              {/* Mini stats */}
              <div className="flex gap-8 mt-12 pt-8 border-t border-gray-100">
                {[
                  { val: '3', label: 'Programmes' },
                  { val: '100+', label: 'Jeunes accompagnés' },
                  { val: '2x', label: 'Par an' },
                ].map((s) => (
                  <div key={s.label}>
                    <div className="text-2xl font-bold text-gray-900">{s.val}</div>
                    <div className="text-gray-500 text-sm">{s.label}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Image flottante */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative hidden lg:block"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary-500/10 to-transparent rounded-3xl" />
              <img
                src="http://nehemiahlab.com/assets/img/main-slider/content-image-7.png"
                alt="Entrepreneur"
                className="w-full max-w-lg mx-auto drop-shadow-2xl animate-float"
              />
              {/* Badges flottants */}
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                className="absolute top-8 -left-8 card-glass px-4 py-3 flex items-center gap-3 shadow-xl"
              >
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <div className="text-gray-900 text-sm font-bold">+85%</div>
                  <div className="text-gray-500 text-xs">Taux de réussite</div>
                </div>
              </motion.div>

              <motion.div
                animate={{ y: [0, 8, 0] }}
                transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut', delay: 1 }}
                className="absolute bottom-12 -right-6 card-glass px-4 py-3 flex items-center gap-3 shadow-xl"
              >
                <div className="w-10 h-10 rounded-full bg-primary-500/20 flex items-center justify-center">
                  <Award className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <div className="text-gray-900 text-sm font-bold">Demo Day</div>
                  <div className="text-gray-500 text-xs">Devant les investisseurs</div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-gray-400">
        <span className="text-xs font-medium">Défiler</span>
        <motion.div animate={{ y: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>
          <ChevronDown className="w-5 h-5" />
        </motion.div>
      </div>
    </section>
  );
}

// ============================================================
//  Section À Propos
// ============================================================
function AProposSection() {
  return (
    <section id="a-propos" className="py-24 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Image */}
          <AnimatedSection>
            <div className="relative">
              <div className="rounded-3xl overflow-hidden shadow-2xl">
                <img src="http://nehemiahlab.com/assets/img/home/2.jpg"
                  alt="Nehemiah Lab équipe" className="w-full h-80 object-cover" />
              </div>
              <div className="absolute -bottom-6 -right-6 card p-5 w-48 bg-white border border-gray-100 shadow-xl">
                <div className="text-3xl font-bold text-primary-600">5+</div>
                <div className="text-gray-600 text-sm mt-1">Années d'expérience en accompagnement</div>
              </div>
            </div>
          </AnimatedSection>

          {/* Contenu */}
          <AnimatedSection>
            <span className="badge bg-accent-mint/15 text-accent-mint border border-accent-mint/30 mb-4 inline-flex items-center gap-1">
              <Target className="w-3.5 h-3.5" />
              Notre mission
            </span>
            <h2 className="section-title mb-6 text-gray-900">
              Autonomiser les jeunes,{' '}
              <span className="text-gradient">un entrepreneur à la fois</span>
            </h2>
            <p className="text-gray-600 mb-5 leading-relaxed">
              Notre passion est de favoriser le développement économique et social des jeunes.
              Notre engagement est de créer un écosystème dynamique propice à l'éclosion de
              startups innovantes axées sur la transformation agricole et les technologies de pointe.
            </p>
            <p className="text-gray-600 mb-8 leading-relaxed">
              Nous croyons fermement que chaque jeune détient un potentiel prêt à être exploité.
              C'est pourquoi nous nous investissons pleinement pour aider ces talents à concrétiser
              leurs rêves en leur offrant des conseils avisés et un accès à un réseau d'experts chevronnés.
            </p>

            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: <Users className="w-5 h-5" />, label: 'Mentorat personnalisé', color: 'text-accent-gold' },
                { icon: <Rocket className="w-5 h-5" />, label: 'Accélération startup', color: 'text-accent-fiery' },
                { icon: <Target className="w-5 h-5" />, label: 'Accès au financement', color: 'text-accent-mint' },
                { icon: <Award className="w-5 h-5" />, label: 'Réseau d\'experts', color: 'text-primary-600' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-xl hover:border-primary-500/30 transition-all shadow-sm">
                  <div className={item.color}>{item.icon}</div>
                  <span className="text-gray-700 text-sm font-medium">{item.label}</span>
                </div>
              ))}
            </div>
          </AnimatedSection>
        </div>

        {/* Stats */}
        <div className="mt-24 grid grid-cols-2 md:grid-cols-4 gap-8 bg-white border border-primary-500/20 rounded-3xl p-10 shadow-lg">
          <StatCard value={100} label="Jeunes accompagnés" suffix="+" />
          <StatCard value={3} label="Programmes actifs" />
          <StatCard value={85} label="Taux de réussite" suffix="%" />
          <StatCard value={15} label="Mentors experts" suffix="+" />
        </div>
      </div>
    </section>
  );
}

// ============================================================
//  Section "Plus qu'un incubateur"
// ============================================================
function IncubateurSection() {
  const avantages = [
    'Des conseils d\'experts reconnus',
    'Un état d\'esprit conquérant',
    'Un réseau influent et actif',
    'Un Demo Day exclusif devant des investisseurs',
    'Des ressources pédagogiques premium',
    'Un suivi post-programme continu',
  ];

  return (
    <section className="py-24 relative overflow-hidden bg-primary-600">
      {/* High-impact Background */}
      <div className="absolute inset-0 z-0">
        <img 
          src="http://nehemiahlab.com/assets/img/resource/6.jpg" 
          alt="Background" 
          className="w-full h-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-primary-600 via-primary-500 to-accent-crimson opacity-90" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatedSection className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 drop-shadow-lg">
            Plus qu'un incubateur...
          </h2>
          <p className="text-white/90 text-lg max-w-2xl mx-auto drop-shadow-sm">
            Nous mettons à ta disposition tous les ingrédients nécessaires pour donner vie
            à une entreprise disruptive.
          </p>
        </AnimatedSection>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {avantages.map((av, i) => (
            <motion.div
              key={av}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="flex items-center gap-4 bg-white/15 backdrop-blur-md border border-white/30 rounded-2xl px-6 py-5 hover:bg-white/25 transition-all text-white shadow-lg"
            >
              <CheckCircle className="w-6 h-6 text-accent-mint shrink-0" />
              <span className="font-medium text-lg">{av}</span>
            </motion.div>
          ))}
        </div>

        <AnimatedSection className="text-center mt-16">
          <p className="text-white/90 text-xl font-medium mb-8">
            Rejoins-nous et laisse Nehemiah Lab catalyser ton potentiel entrepreneurial
            vers des sommets insoupçonnés.
          </p>
          <a href="#contact" className="inline-flex items-center gap-2 px-10 py-5 bg-white text-primary-600 font-extrabold rounded-2xl hover:bg-gray-100 transition-all shadow-2xl hover:-translate-y-1 text-lg">
            Candidater maintenant
            <ArrowRight className="w-6 h-6" />
          </a>
        </AnimatedSection>
      </div>
    </section>
  );
}

// ============================================================
//  Section Programmes
// ============================================================
function ProgrammesSection() {
  return (
    <section id="nos-programmes" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatedSection className="text-center mb-16">
          <span className="badge bg-primary-500/10 text-primary-600 border border-primary-500/30 mb-4 inline-flex">
            <Rocket className="w-3.5 h-3.5" />
            Nos Programmes
          </span>
          <h2 className="section-title mb-4 text-gray-900">
            Inspirer et révéler la{' '}
            <span className="text-gradient">prochaine génération</span>
          </h2>
          <p className="section-subtitle max-w-2xl mx-auto text-gray-600">
            Des programmes pensés pour les startups qui débutent avec de grandes ambitions,
            testés et recommandés par d'autres entrepreneurs.
          </p>
        </AnimatedSection>

        <div className="grid lg:grid-cols-3 gap-8">
          {programmes.map((prog, i) => (
            <motion.div
              key={prog.id}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="group card bg-white border-gray-200 hover:border-primary-500/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary-500/10"
            >
              {/* Image */}
              <div className="relative rounded-xl overflow-hidden mb-6 h-48">
                <img src={prog.image} alt={prog.nom}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className={`absolute inset-0 bg-gradient-to-t ${prog.couleur} opacity-60`} />
                <div className="absolute top-4 left-4 p-2.5 bg-white/15 backdrop-blur-sm rounded-xl text-white">
                  {prog.icon}
                </div>
              </div>

              <span className="badge bg-primary-500/10 text-primary-600 border border-primary-500/30 mb-3 inline-flex text-xs">Programme {i + 1}</span>
              <h3 className="text-xl font-bold text-gray-900 mb-3">{prog.nom}</h3>
              <p className="text-gray-600 text-sm leading-relaxed mb-5">{prog.description}</p>

              <ul className="space-y-2 mb-6">
                {prog.avantages.map((av) => (
                  <li key={av} className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-primary-500 shrink-0" />
                    {av}
                  </li>
                ))}
              </ul>

              <a href="#contact"
                className="w-full flex items-center justify-center gap-2 py-3 bg-primary-500/10 border border-primary-500/30 text-primary-600 rounded-xl font-semibold hover:bg-primary-500 hover:text-white hover:border-primary-500 transition-all duration-200">
                Rejoindre ce programme
                <ChevronRight className="w-4 h-4" />
              </a>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================
//  Section Témoignages
// ============================================================
function TemoignagesSection() {
  return (
    <section className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatedSection className="text-center mb-16">
          <span className="badge bg-primary-500/10 text-primary-600 border border-primary-500/30 mb-4 inline-flex">
            <Star className="w-3.5 h-3.5" />
            Témoignages
          </span>
          <h2 className="section-title mb-4 text-gray-900">
            Ils ont fait confiance à{' '}
            <span className="text-gradient">Nehemiah Lab</span>
          </h2>
          <p className="section-subtitle text-gray-600">Découvrez les success stories de nos entrepreneurs.</p>
        </AnimatedSection>

        <div className="grid md:grid-cols-3 gap-6">
          {temoignages.map((t, i) => (
            <motion.div
              key={t.nom}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm"
            >
              <div className="flex gap-1 mb-4">
                {Array.from({ length: t.note }).map((_, j) => (
                  <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-gray-600 text-sm leading-relaxed mb-6 italic">"{t.texte}"</p>
              <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                <div className="text-3xl">{t.avatar}</div>
                <div>
                  <div className="text-gray-900 font-semibold text-sm">{t.nom}</div>
                  <div className="text-gray-500 text-xs">{t.role}</div>
                  <span className="badge bg-primary-500/10 text-primary-600 border border-primary-500/30 mt-1 text-xs">{t.programme}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================
//  Section FAQ
// ============================================================
function FAQSection() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section id="faq" className="py-24 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatedSection className="text-center mb-16">
          <span className="badge bg-primary-500/10 text-primary-600 border border-primary-500/30 mb-4 inline-flex">
            <CheckCircle className="w-3.5 h-3.5" />
            Questions fréquentes
          </span>
          <h2 className="section-title mb-4 text-gray-900">
            Tout ce que vous devez <span className="text-gradient">savoir</span>
          </h2>
        </AnimatedSection>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="bg-white border border-gray-200 rounded-2xl p-6 cursor-pointer hover:border-primary-500/40 transition-all"
              onClick={() => setOpen(open === i ? null : i)}
            >
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-gray-900 font-semibold">{faq.q}</h3>
                <motion.div
                  animate={{ rotate: open === i ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="shrink-0 w-8 h-8 rounded-full bg-primary-500/10 border border-primary-500/20 flex items-center justify-center"
                >
                  <ChevronDown className="w-4 h-4 text-primary-600" />
                </motion.div>
              </div>
              {open === i && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 text-gray-600 text-sm leading-relaxed pt-4 border-t border-gray-100"
                >
                  {faq.r}
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================
//  Section Contact
// ============================================================
function ContactSection() {
  const [form, setForm] = useState({ nom: '', email: '', message: '' });
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    // Simulation envoi
    await new Promise((r) => setTimeout(r, 1500));
    setSending(false);
    setForm({ nom: '', email: '', message: '' });
    toast.success('Message envoyé ! Nous vous répondrons bientôt.');
  };

  return (
    <section id="contact" className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16">
          {/* Info */}
          <AnimatedSection>
            <span className="badge bg-primary-500/10 text-primary-600 border border-primary-500/30 mb-4 inline-flex">
              <Mail className="w-3.5 h-3.5" />
              Nous contacter
            </span>
            <h2 className="section-title mb-4 text-gray-900">
              Prêt à rejoindre l'aventure ?
            </h2>
            <p className="section-subtitle mb-10 text-gray-600">
              Remplissez le formulaire et nous vous répondrons dans les plus brefs délais.
            </p>

            <div className="space-y-5">
              {[
                { icon: <Mail className="w-5 h-5" />, label: 'Email', val: 'infos@nehemiahlab.com', href: 'mailto:infos@nehemiahlab.com' },
                { icon: <Phone className="w-5 h-5" />, label: 'Téléphone', val: '(+228) 97 25 53 53', href: 'tel:+22897255353' },
                { icon: <MapPin className="w-5 h-5" />, label: 'Localisation', val: 'Lomé, Togo', href: '#' },
              ].map((item) => (
                <a key={item.label} href={item.href}
                  className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-xl hover:border-primary-500/40 transition-all group shadow-sm">
                  <div className="w-10 h-10 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-primary-600 group-hover:bg-primary-500 group-hover:text-white transition-all">
                    {item.icon}
                  </div>
                  <div>
                    <div className="text-gray-500 text-xs">{item.label}</div>
                    <div className="text-gray-900 font-medium text-sm">{item.val}</div>
                  </div>
                </a>
              ))}
            </div>

            {/* Réseaux */}
            <div className="flex gap-4 mt-8">
              {[
                { icon: <Facebook className="w-5 h-5" />, href: 'https://web.facebook.com/NehemiahLab/' },
                { icon: <Linkedin className="w-5 h-5" />, href: 'https://www.linkedin.com/company/nehemiahlab/' },
                { icon: <Twitter className="w-5 h-5" />, href: 'https://twitter.com/NehemiahLab/' },
                { icon: <Instagram className="w-5 h-5" />, href: 'https://www.instagram.com/nehemiahlab/' },
              ].map((soc, i) => (
                <a key={i} href={soc.href} target="_blank" rel="noreferrer"
                  className="w-11 h-11 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-primary-500 hover:text-white hover:border-primary-500 transition-all shadow-sm">
                  {soc.icon}
                </a>
              ))}
            </div>
          </AnimatedSection>

          {/* Formulaire */}
          <AnimatedSection>
            <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl p-6 space-y-5 shadow-xl">
              <h3 className="text-gray-900 font-bold text-xl mb-2">Envoyer un message</h3>
              <div>
                <label className="label text-gray-700">Nom complet</label>
                <input type="text" required placeholder="Votre nom et prénom"
                  className="input-field bg-gray-50 border-gray-200 text-gray-900"
                  value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} />
              </div>
              <div>
                <label className="label text-gray-700">Adresse email</label>
                <input type="email" required placeholder="votre@email.com"
                  className="input-field bg-gray-50 border-gray-200 text-gray-900"
                  value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <label className="label text-gray-700">Message</label>
                <textarea rows={5} required placeholder="Votre message..."
                  className="input-field bg-gray-50 border-gray-200 text-gray-900 resize-none"
                  value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
              </div>
              <button type="submit" disabled={sending}
                className="btn-primary w-full justify-center disabled:opacity-60 disabled:cursor-not-allowed">
                {sending ? 'Envoi en cours...' : 'Envoyer le message'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}

// ============================================================
//  Google Maps
// ============================================================
function MapSection() {
  return (
    <section className="h-72">
      <iframe
        src="https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d15866.480768662834!2d1.2073065!3d6.1815615!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x102159ca229dc12f%3A0x2341a4f263ebc60b!2sNehemiah%20Lab!5e0!3m2!1sfr!2stg!4v1687608819683!5m2!1sfr!2stg"
        width="100%" height="100%" style={{ border: 0 }} allowFullScreen loading="lazy"
        referrerPolicy="no-referrer-when-downgrade" title="Localisation Nehemiah Lab"
      />
    </section>
  );
}

// ============================================================
//  Footer
// ============================================================
function Footer() {
  return (
    <footer className="bg-primary-500 text-white py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-3 gap-12 mb-12">
          {/* Logo + Description */}
          <div>
            <img src="http://nehemiahlab.com/assets/img/logo.png" alt="Nehemiah Lab" className="h-10 mb-4 brightness-0 invert" />
            <p className="text-white/80 text-sm leading-relaxed">
              Autonomiser les jeunes &amp; Soutenir les entrepreneurs togolais vers l'excellence.
            </p>
          </div>

          {/* Liens */}
          <div>
            <h5 className="text-white font-semibold mb-4">Liens utiles</h5>
            <ul className="space-y-2">
              {[
                { label: 'Accueil', href: '#accueil' },
                { label: 'Qui sommes-nous', href: '#a-propos' },
                { label: 'Nos programmes', href: '#nos-programmes' },
                { label: 'FAQ', href: '#faq' },
                { label: 'Contact', href: '#contact' },
              ].map((l) => (
                <li key={l.label}>
                  <a href={l.href}
                    className="text-white/80 hover:text-white text-sm transition-colors">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h5 className="text-white font-semibold mb-4">Contact</h5>
            <div className="space-y-3">
              <a href="mailto:infos@nehemiahlab.com"
                className="flex items-center gap-2 text-white/80 hover:text-white text-sm transition-colors">
                <Mail className="w-4 h-4" />
                infos@nehemiahlab.com
              </a>
              <a href="tel:+22897255353"
                className="flex items-center gap-2 text-white/80 hover:text-white text-sm transition-colors">
                <Phone className="w-4 h-4" />
                (+228) 97 25 53 53
              </a>
              <div className="flex items-center gap-2 text-white/80 text-sm">
                <MapPin className="w-4 h-4" />
                Lomé, Togo
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-white/20 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-white/60 text-sm">
            © {new Date().getFullYear()} Nehemiah Lab. Tous droits réservés.
          </p>
          <p className="text-white/60 text-sm">
            Conçu avec ❤️ pour la jeunesse togolaise
          </p>
        </div>
      </div>
    </footer>
  );
}

// ============================================================
//  Page principale
// ============================================================
export default function HomePage() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <HeroSection />
      <AProposSection />
      <IncubateurSection />
      <ProgrammesSection />
      <TemoignagesSection />
      <FAQSection />
      <ContactSection />
      <MapSection />
      <Footer />
    </div>
  );
}
