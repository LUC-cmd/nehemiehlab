export type QuizQuestion = {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
};

/** Quiz de validation pédagogique — 3 questions par module SKA (n° d'ordre 1 à 4). */
export const SKA_QUIZ_BY_ORDER: Record<number, QuizQuestion[]> = {
  1: [
    {
      id: 's1',
      question: 'Dans Scratch, une boucle « répéter » sert à…',
      options: ['Exécuter des blocs plusieurs fois', 'Supprimer un sprite', 'Changer la couleur du fond'],
      correctIndex: 0,
    },
    {
      id: 's2',
      question: 'Un sprite est…',
      options: ['Un personnage ou objet programmable', 'Un fichier Excel', 'Un câble USB'],
      correctIndex: 0,
    },
    {
      id: 's3',
      question: 'Pour tester un programme Scratch, on utilise…',
      options: ['Le drapeau vert', 'Le bouton imprimer', 'Le clavier F12'],
      correctIndex: 0,
    },
  ],
  2: [
    {
      id: 'e1',
      question: 'Une résistance sert principalement à…',
      options: ['Limiter le courant', 'Amplifier le son', 'Stocker des données'],
      correctIndex: 0,
    },
    {
      id: 'e2',
      question: 'Sur Arduino, une LED a besoin de…',
      options: ['Une résistance en série', 'Un moteur pas à pas', 'Un écran tactile'],
      correctIndex: 0,
    },
    {
      id: 'e3',
      question: 'Un capteur mesure…',
      options: ['Une grandeur physique (lumière, distance…)', 'La vitesse Internet', 'Le nom de l\'élève'],
      correctIndex: 0,
    },
  ],
  3: [
    {
      id: 'r1',
      question: 'Avant de programmer un robot, il faut…',
      options: ['Vérifier l\'assemblage mécanique', 'Effacer la carte SD', 'Désactiver le Wi-Fi'],
      correctIndex: 0,
    },
    {
      id: 'r2',
      question: 'Un robot qui ne va pas droit peut avoir…',
      options: ['Un problème de roue ou de calibration', 'Trop de mémoire RAM', 'Un écran cassé'],
      correctIndex: 0,
    },
    {
      id: 'r3',
      question: 'La sécurité en atelier robotique implique…',
      options: ['Couper l\'alimentation avant manipulation', 'Courir dans la salle', 'Mélanger les piles'],
      correctIndex: 0,
    },
  ],
  4: [
    {
      id: 'p1',
      question: 'En cas de situation préoccupante avec un enfant, le formateur doit…',
      options: ['Signaler selon le protocole SKA', 'Publier sur les réseaux sociaux', 'Ignorer l\'incident'],
      correctIndex: 0,
    },
    {
      id: 'p2',
      question: 'Une posture bienveillante, c\'est…',
      options: ['Écouter, encourager et respecter', 'Crier pour se faire entendre', 'Comparer les enfants entre eux'],
      correctIndex: 0,
    },
    {
      id: 'p3',
      question: 'Les soft skills incluent…',
      options: ['Communication et travail d\'équipe', 'Piratage informatique', 'Vente de matériel'],
      correctIndex: 0,
    },
  ],
};

export function quizForModuleOrder(numeroOrdre: number): QuizQuestion[] {
  return SKA_QUIZ_BY_ORDER[numeroOrdre] ?? SKA_QUIZ_BY_ORDER[1];
}
