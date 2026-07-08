import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Code, 
  Box, 
  Cpu, 
  LineChart, 
  ArrowRight, 
  Sparkles,
  GraduationCap,
  Users
} from 'lucide-react';

const programs = [
  {
    id: 1,
    title: 'Programmation',
    description: 'Apprendre à coder avec Scratch, Python et créer des jeux et applications interactives.',
    icon: Code,
    color: 'from-blue-400 to-blue-600',
    shadow: 'shadow-blue-500/20'
  },
  {
    id: 2,
    title: 'Modélisation 3D',
    description: 'Donner vie à son imagination en concevant des objets en trois dimensions.',
    icon: Box,
    color: 'from-purple-400 to-purple-600',
    shadow: 'shadow-purple-500/20'
  },
  {
    id: 3,
    title: 'Électronique',
    description: 'Comprendre les circuits, utiliser des composants et construire des robots.',
    icon: Cpu,
    color: 'from-green-400 to-green-600',
    shadow: 'shadow-green-500/20'
  },
  {
    id: 4,
    title: 'Business',
    description: 'Développer l\'esprit d\'entreprise, le leadership et la gestion de projet dès le plus jeune âge.',
    icon: LineChart,
    color: 'from-orange-400 to-orange-600',
    shadow: 'shadow-orange-500/20'
  }
];

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0f0c22] text-white overflow-hidden font-sans">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0f0c22]/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#F43B1D] to-orange-400 flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight leading-none">
                SMART <span className="text-[#F43B1D]">KIDS</span>
              </h1>
              <span className="text-xs text-gray-400 font-medium tracking-widest uppercase">Academy</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/connexion')}
              className="text-gray-300 hover:text-white font-medium transition-colors hidden sm:block"
            >
              Connexion
            </button>
            <button 
              onClick={() => navigate('/inscription-formateur')}
              className="px-6 py-2.5 rounded-full bg-gradient-to-r from-[#F43B1D] to-orange-500 text-white font-bold hover:shadow-lg hover:shadow-orange-500/30 hover:-translate-y-0.5 transition-all"
            >
              Inscription
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-6">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-[#F43B1D]/20 to-purple-500/20 rounded-full blur-[120px] opacity-50 pointer-events-none" />
        
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8 backdrop-blur-sm">
              <span className="flex h-2 w-2 rounded-full bg-[#F43B1D] animate-pulse"></span>
              <span className="text-sm font-medium text-gray-300">Un programme de Nehemiah Lab</span>
            </div>
            
            <h2 className="text-5xl lg:text-7xl font-black leading-[1.1] mb-6">
              Éveiller le <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F43B1D] to-orange-400">génie</span><br />
              en chaque enfant
            </h2>
            
            <p className="text-lg lg:text-xl text-gray-400 mb-10 leading-relaxed max-w-xl">
              Découvrez la Smart Kids Academy, un environnement d'apprentissage innovant où les enfants développent les compétences de demain à travers des projets pratiques et ludiques.
            </p>
            
            <div className="flex flex-wrap items-center gap-4">
              <button 
                onClick={() => navigate('/inscription-formateur')}
                className="px-8 py-4 rounded-full bg-white text-[#0f0c22] font-bold text-lg hover:bg-gray-100 hover:scale-105 transition-all flex items-center gap-2"
              >
                Rejoindre l'académie
                <ArrowRight className="w-5 h-5" />
              </button>
              <button 
                onClick={() => navigate('/connexion')}
                className="px-8 py-4 rounded-full border border-white/20 text-white font-bold text-lg hover:bg-white/5 transition-all"
              >
                Portail Administration
              </button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative"
          >
            <div className="aspect-square lg:aspect-[4/5] rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl relative">
              <img 
                src="https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=2022&auto=format&fit=crop" 
                alt="Enfants apprenant à coder" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0f0c22] via-[#0f0c22]/20 to-transparent" />
              
              {/* Floating badges */}
              <div className="absolute bottom-10 left-10 right-10 flex gap-4">
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex-1">
                  <div className="text-3xl font-black text-white mb-1">500+</div>
                  <div className="text-sm text-gray-400 font-medium">Jeunes formés</div>
                </div>
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex-1">
                  <div className="text-3xl font-black text-[#F43B1D] mb-1">100%</div>
                  <div className="text-sm text-gray-400 font-medium">Pratique</div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Programs Section */}
      <section className="py-24 bg-[#14102c] relative border-y border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h3 className="text-4xl font-bold mb-6">Nos Domaines d'Apprentissage</h3>
            <p className="text-gray-400 text-lg">
              Des parcours adaptés pour stimuler la créativité, la logique et l'esprit critique de vos enfants.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {programs.map((program, index) => (
              <motion.div
                key={program.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className={`bg-white/5 border border-white/10 rounded-3xl p-8 hover:bg-white/10 transition-colors group cursor-default`}
              >
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${program.color} flex items-center justify-center mb-6 shadow-lg ${program.shadow} group-hover:scale-110 transition-transform`}>
                  <program.icon className="w-7 h-7 text-white" />
                </div>
                <h4 className="text-xl font-bold mb-3">{program.title}</h4>
                <p className="text-gray-400 leading-relaxed text-sm">
                  {program.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-[#0a0816]">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#F43B1D]" />
            <span className="font-bold">Smart Kids Academy</span>
          </div>
          <div className="flex items-center gap-6 text-gray-400 text-sm">
            <a href="https://ska.nehemiahlab.com" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">
              ska.nehemiahlab.com
            </a>
            <span>+228 97 25 53 53</span>
          </div>
          <p className="text-gray-500 text-sm">
            © {new Date().getFullYear()} Nehemiah Lab. Tous droits réservés.
          </p>
        </div>
      </footer>
    </div>
  );
}
