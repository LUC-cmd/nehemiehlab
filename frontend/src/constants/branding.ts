/** Assets Smart Kids Academy — fichiers dans /public/assets/images/ */

export const LOGO_SRC = '/assets/images/smart-kids-logo.png';
/** Petit logo pour animations d'arrière-plan (accueil) */
export const LOGO_MARK_SRC = '/assets/images/ska-logo-mark.png';

export const GALLERY_IMAGES = [
  { src: '/assets/images/hero-atelier-scratch.png', alt: 'Enfants apprenant la programmation Scratch' },
  { src: '/assets/images/galerie-groupe.png', alt: 'Groupe Smart Kids Academy devant la bannière' },
  { src: '/assets/images/galerie-formation.png', alt: 'Session de formation avec un formateur' },
  { src: '/assets/images/galerie-classe.png', alt: 'Atelier en classe avec ordinateurs portables' },
  { src: '/assets/images/galerie-mentorat.png', alt: 'Accompagnement des élèves sur ordinateur' },
  { src: '/assets/images/galerie-apprentissage.png', alt: 'Apprentissage collaboratif à Smart Kids Academy' },
] as const;

export const HERO_IMAGE = GALLERY_IMAGES[0].src;

/** Couleurs de marque (charte Smart Kids Academy) */
export const BRAND_TEAL = '#004b57';
export const BRAND_TEAL_DEEP = '#003840';
export const BRAND_TEAL_LIGHT = '#006878';
export const BRAND_ORANGE = '#F43B1D';
export const BRAND_WHITE = '#ffffff';
/** Fond des pages (hors en-tête / pied de page) — thème clair professionnel */
export const PAGE_BG = '#ffffff';
export const PAGE_BG_SOFT = '#f4f7f8';
export const PAGE_TEXT = '#0f172a';
export const PAGE_MUTED = '#64748b';

/** Infos & contenus Smart Kids Academy (source : communication officielle SKA) */
export const SITE_INFO = {
  phone: '+228 97 25 53 53',
  phoneAlt: '+228 97 22 55 63',
  email: 'contact@nehemiahlab.com',
  address: 'Lomé, Togo',
  regions: ['Maritime', 'Plateaux', 'Centrale', 'Kara', 'Savanes'],
  hours: 'Lun – Sam : 8h – 18h',
  tagline: 'Révéler le potentiel de chaque enfant',
  heroTitle: 'Faites entrer votre enfant dans le monde des technologies',
  heroSubtitle:
    'Nous proposons un cadre d\'apprentissage pratique et motivant pour aider chaque enfant à développer ses talents technologiques et humains.',
  parentOrg: 'Nehemiah Lab',
} as const;

/** Trois piliers pédagogiques */
export const PILLARS = [
  {
    title: 'Technologies & innovation',
    description:
      'Les enfants découvrent le code, l\'électronique et la 3D à travers des ateliers concrets, adaptés à leur âge.',
  },
  {
    title: 'Esprit entrepreneurial',
    description:
      'Ils apprennent à transformer une idée en mini-projet, à la présenter clairement et à avancer avec méthode.',
  },
  {
    title: 'Compétences transversales',
    description:
      'Nous renforçons la confiance, l\'esprit d\'équipe et la résolution de problèmes dans la vie courante.',
  },
] as const;

/** Axes mission (inspirés du site officiel SKA) */
export const MISSION_BLOCKS = [
  {
    title: 'Éveiller le génie latent',
    description:
      'Offrir un cadre où chaque enfant apprend à son rythme et révèle ses capacités.',
  },
  {
    title: 'Explorer les nouvelles technologies',
    description:
      'Faire découvrir tôt les outils numériques qui comptent déjà dans les métiers d\'aujourd\'hui.',
  },
  {
    title: 'Conquérir le futur dès maintenant',
    description:
      'Préparer les enfants et adolescents à un futur exigeant avec des bases solides et utiles.',
  },
] as const;

/** Programmes détaillés */
export const PROGRAMS = [
  {
    id: 'programmation',
    title: 'Programmation',
    description: 'Scratch, Python, création de jeux et d\'applications — apprendre à coder en s\'amusant.',
  },
  {
    id: 'electronique',
    title: 'Électronique',
    description: 'Circuits, capteurs, robots et projets concrets pour comprendre le monde connecté.',
  },
  {
    id: 'modelisation',
    title: 'Modélisation 3D',
    description: 'Conception et impression 3D pour donner vie aux idées et prototyper rapidement.',
  },
  {
    id: 'business',
    title: 'Business',
    description: 'Leadership, gestion de projet et micro-entreprise — préparer les leaders de demain.',
  },
] as const;

/** Chiffres clés affichés (CountUp au scroll) */
export const STATS = [
  { value: 500, suffix: '+', label: 'Jeunes formés' },
  { value: 100, suffix: '%', label: 'Pratique' },
  { value: 4, suffix: '', label: 'Domaines clés' },
  { value: 5, suffix: '', label: 'Régions couvertes' },
] as const;

/** Contenu Nehemiah Lab (source : nehemiahlab.com — intégré sur site SKA, sans lien externe) */
export const NEHEMIAH_LAB = {
  name: 'Nehemiah Lab',
  orgLine: 'Nehemiah Youth Empowerment · Églises Partenaire de Compassion',
  tagline: "Un accompagnement sérieux pour les jeunes porteurs d'idée",
  headline: 'Du projet à la mise en oeuvre',
  intro:
    'Deux fois par an, Nehemiah Lab sélectionne des projets et accompagne les jeunes dans leur progression, étape par étape.',
  mission:
    'L\'accompagnement se fait sur le terrain : clarifier l\'idée, tester la solution, organiser l\'activité et viser des premiers résultats concrets.',
  youthPriority:
    'La jeunesse togolaise est une vraie force. Le programme apporte de la méthode, un suivi technique et des mises en relation utiles.',
  skaBridge:
    'Smart Kids Academy prépare les plus jeunes en amont pour qu\'ils puissent, plus tard, rejoindre naturellement ce parcours.',
} as const;

export const NEHEMIAH_OFFERINGS = [
  {
    title: 'Mentorat',
    description: 'Un suivi régulier avec des mentors sur les décisions importantes du projet.',
  },
  {
    title: 'Méthodes startup',
    description: 'Des outils pratiques pour passer de l\'idée à un projet bien structuré.',
  },
  {
    title: 'Réseau',
    description: 'Une mise en relation avec des partenaires techniques, entrepreneurs et financeurs.',
  },
  {
    title: 'Journée de démonstration',
    description: 'Une journée de présentation des projets devant des partenaires et investisseurs.',
  },
] as const;

/** Parcours entrepreneur Nehemiah Lab (pour les jeunes plus avancés) */
export const ENTREPRENEUR_PATHWAYS = [
  {
    id: 'genesis',
    title: 'Genesis Program',
    description:
      'Pour clarifier une idée et poser les bases du projet : problème, solution et premiers tests.',
  },
  {
    id: 'founders',
    title: 'Founders Program',
    description:
      'Pour transformer une idée en offre claire, construire le produit et trouver les premiers clients.',
  },
  {
    id: 'gobig',
    title: 'Go Big Program',
    description:
      'Pour accélérer une startup déjà lancée et l\'aider à se développer sur de nouveaux marchés.',
  },
] as const;
