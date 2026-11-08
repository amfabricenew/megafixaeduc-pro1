import React, { useState, useEffect, useCallback } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Play, 
  Pause, 
  Maximize2, 
  X, 
  Sparkles, 
  GraduationCap, 
  Building2, 
  Monitor, 
  Users,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../contexts/TranslationContext';
import logoOfficial from '../LOGO_MEGFIXAEDEUC_PRO.png';

// Generated school assets from public directory
const imgClassroom = '/images/students_uniform_class.jpg';
const imgAdminOffice = '/images/school_admin_office.jpg';
const imgCourtyard = '/images/students_courtyard.jpg';
const imgSecretariat = '/images/school_secretariat.jpg';
const imgComputerLab = '/images/students_computer_lab.jpg';

export interface SchoolSlide {
  id: string;
  image: string;
  title: string;
  category: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  tagColor: string;
}

export const SCHOOL_SLIDES: SchoolSlide[] = [
  {
    id: 'classroom',
    image: imgClassroom,
    title: 'Élèves en classe & Uniforme officiel',
    category: 'Vie Pédagogique',
    description: 'Apprenants attentifs en tenue scolaire officielle frappée de l\'écusson Mégafixa, encadrés dans un environnement d\'apprentissage moderne.',
    icon: GraduationCap,
    tagColor: 'bg-emerald-500'
  },
  {
    id: 'admin_office',
    image: imgAdminOffice,
    title: 'Direction & Personnel administratif',
    category: 'Administration & Gestion',
    description: 'Équipe de direction et intendants gérant en temps réel les notes, bulletins, inscriptions et statistiques sur ordinateurs.',
    icon: Building2,
    tagColor: 'bg-indigo-600'
  },
  {
    id: 'courtyard',
    image: imgCourtyard,
    title: 'Cadre scolaire & Cour de récréation',
    category: 'Vie Scolaire & Épanouissement',
    description: 'Élèves du primaire et du secondaire épanouis dans un cadre scolaire verdoyant, sécurisé et convivial.',
    icon: Users,
    tagColor: 'bg-amber-500'
  },
  {
    id: 'secretariat',
    image: imgSecretariat,
    title: 'Secrétariat & Accueil des usagers',
    category: 'Secrétariat Général',
    description: 'Accueil personnalisé des parents et partenaires, délivrance d\'attestations et encaissement sécurisé des scolarités.',
    icon: Building2,
    tagColor: 'bg-primary-600'
  },
  {
    id: 'computer_lab',
    image: imgComputerLab,
    title: 'Laboratoire informatique & Numérique éducatif',
    category: 'Innovation & Technologie',
    description: 'Formation aux technologies de l\'information et digitalisation des compétences sous la supervision d\'un enseignant qualifié.',
    icon: Monitor,
    tagColor: 'bg-cyan-600'
  }
];

interface SchoolCarouselProps {
  className?: string;
  autoPlayInterval?: number; // in ms, default 5000
  title?: string;
  subtitle?: string;
  compact?: boolean;
}

export default function SchoolCarousel({
  className = '',
  autoPlayInterval = 5000,
  title = "Vie de l'Établissement & Administration",
  subtitle = "Immersion dans les salles de classe, le secrétariat et les espaces de travail de notre institution",
  compact = false
}: SchoolCarouselProps) {
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const nextSlide = useCallback(() => {
    setCurrentIndex(prev => (prev + 1) % SCHOOL_SLIDES.length);
  }, []);

  const prevSlide = useCallback(() => {
    setCurrentIndex(prev => (prev - 1 + SCHOOL_SLIDES.length) % SCHOOL_SLIDES.length);
  }, []);

  // Auto-play timer
  useEffect(() => {
    if (!isPlaying || isHovered) return;
    const timer = setInterval(() => {
      nextSlide();
    }, autoPlayInterval);
    return () => clearInterval(timer);
  }, [isPlaying, isHovered, autoPlayInterval, nextSlide]);

  // Keyboard navigation when fullscreen
  useEffect(() => {
    if (!isFullscreen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') nextSlide();
      if (e.key === 'ArrowLeft') prevSlide();
      if (e.key === 'Escape') setIsFullscreen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, nextSlide, prevSlide]);

  const activeSlide = SCHOOL_SLIDES[currentIndex];
  const IconComponent = activeSlide.icon;

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Header section if not compact */}
      {!compact && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary-100 dark:bg-primary-900/40 text-primary-800 dark:text-primary-300 rounded-full text-xs font-extrabold uppercase tracking-wider">
              <Sparkles size={14} className="text-primary-600" />
              {t("Galerie & Immersion Scolaire")}
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
              {t(title)}
            </h2>
            {subtitle && (
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                {t(subtitle)}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            {/* Play/pause toggle */}
            <button
              type="button"
              onClick={() => setIsPlaying(prev => !prev)}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
              title={isPlaying ? t("Mettre en pause le défilement") : t("Reprendre le défilement")}
              aria-label={isPlaying ? t("Pause") : t("Play")}
            >
              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            </button>

            {/* Slide counter */}
            <span className="px-3 py-1 text-xs font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-xl">
              {currentIndex + 1} / {SCHOOL_SLIDES.length}
            </span>
          </div>
        </div>
      )}

      {/* Main Carousel Frame */}
      <div 
        className={`relative rounded-3xl overflow-hidden shadow-xl border border-slate-200/80 dark:border-slate-800 bg-slate-950 group ${
          compact ? 'h-[280px] sm:h-[340px]' : 'h-[360px] sm:h-[440px] lg:h-[480px]'
        }`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSlide.id}
            initial={{ opacity: 0, scale: 1.03 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="absolute inset-0 w-full h-full"
          >
            <img
              src={activeSlide.image}
              alt={activeSlide.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover object-center"
            />
            {/* Gradient Overlay for high legibility */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-black/25 pointer-events-none" />
          </motion.div>
        </AnimatePresence>

        {/* Top Badges & App Brand Watermark */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10 pointer-events-none">
          {/* Official Logo Badge on Image */}
          <div className="flex items-center gap-2.5 px-3.5 py-2 bg-slate-950/80 backdrop-blur-md rounded-2xl border border-white/20 text-white shadow-xl pointer-events-auto group/badge">
            <div className="relative w-8 h-8 sm:w-9 sm:h-9 shrink-0 bg-white rounded-full p-0.5 shadow-md flex items-center justify-center overflow-hidden ring-2 ring-primary-500/40">
              <img 
                src={logoOfficial} 
                alt="Logo MégafixaEduc Pro" 
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/LOGO_MEGFIXAEDEUC_PRO.png';
                }}
              />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-black tracking-wide text-white leading-tight flex items-center gap-1.5">
                <span>Mégafixa<span className="text-amber-400">Educ</span></span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <span className="text-[9px] text-slate-300 font-semibold uppercase tracking-wider block leading-none mt-0.5">
                Solution Éducative Officielle
              </span>
            </div>
          </div>

          {/* Fullscreen & Category */}
          <div className="flex items-center gap-2 pointer-events-auto">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-white text-[11px] font-extrabold uppercase tracking-wider rounded-xl backdrop-blur-md border border-white/20 shadow-md ${activeSlide.tagColor}`}>
              <IconComponent size={13} />
              {activeSlide.category}
            </span>

            <button
              type="button"
              onClick={() => setIsFullscreen(true)}
              className="p-2 bg-black/50 hover:bg-black/80 text-white rounded-xl backdrop-blur-md border border-white/20 shadow-md transition-all"
              title="Agrandir en plein écran"
              aria-label="Plein écran"
            >
              <Maximize2 size={16} />
            </button>
          </div>
        </div>

        {/* Left / Right Chevron Controls */}
        <button
          type="button"
          onClick={prevSlide}
          className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 z-20 p-2.5 sm:p-3 rounded-2xl bg-black/40 hover:bg-black/80 text-white backdrop-blur-md border border-white/20 opacity-80 group-hover:opacity-100 hover:scale-105 active:scale-95 transition-all shadow-lg cursor-pointer"
          title="Image précédente"
          aria-label="Précédent"
        >
          <ChevronLeft size={22} />
        </button>

        <button
          type="button"
          onClick={nextSlide}
          className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 z-20 p-2.5 sm:p-3 rounded-2xl bg-black/40 hover:bg-black/80 text-white backdrop-blur-md border border-white/20 opacity-80 group-hover:opacity-100 hover:scale-105 active:scale-95 transition-all shadow-lg cursor-pointer"
          title="Image suivante"
          aria-label="Suivant"
        >
          <ChevronRight size={22} />
        </button>

        {/* Bottom Slide Content & Text Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-7 z-10 space-y-3 pointer-events-none">
          <div className="max-w-3xl space-y-1.5">
            <h3 className="text-lg sm:text-2xl font-black text-white tracking-tight drop-shadow-md flex items-center gap-2">
              <span>{t(activeSlide.title)}</span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed drop-shadow-sm line-clamp-2 sm:line-clamp-none max-w-2xl">
              {t(activeSlide.description)}
            </p>
          </div>

          {/* Dots Indicator */}
          <div className="flex items-center gap-2 pt-1 pointer-events-auto">
            {SCHOOL_SLIDES.map((slide, idx) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  currentIndex === idx 
                    ? 'w-8 bg-amber-400 shadow-md shadow-amber-400/40' 
                    : 'w-2 bg-white/40 hover:bg-white/70'
                }`}
                title={`Aller à la vue ${idx + 1} : ${slide.title}`}
                aria-label={`Vue ${idx + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Progress bar for autoplay */}
        {isPlaying && !isHovered && (
          <motion.div
            key={`progress-${currentIndex}`}
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: autoPlayInterval / 1000, ease: 'linear' }}
            className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-amber-400 via-primary-400 to-indigo-400 z-30 pointer-events-none"
          />
        )}
      </div>

      {/* Mini Thumbnails Strip */}
      <div className="grid grid-cols-5 gap-2 sm:gap-3 mt-3">
        {SCHOOL_SLIDES.map((slide, idx) => (
          <button
            key={slide.id}
            type="button"
            onClick={() => setCurrentIndex(idx)}
            className={`relative rounded-xl overflow-hidden h-14 sm:h-18 border-2 transition-all group ${
              currentIndex === idx 
                ? 'border-primary-600 ring-2 ring-primary-400/40 scale-[1.02] shadow-md' 
                : 'border-slate-200 dark:border-slate-800 opacity-60 hover:opacity-100'
            }`}
          >
            <img
              src={slide.image}
              alt={slide.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            />
            <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
            <div className="absolute bottom-1 left-1.5 right-1.5 hidden sm:flex items-center justify-between text-[10px] text-white font-bold drop-shadow-sm">
              <span className="truncate">{slide.category.split(' ')[0]}</span>
              {currentIndex === idx && <CheckCircle2 size={12} className="text-amber-400 shrink-0" />}
            </div>
          </button>
        ))}
      </div>

      {/* Fullscreen Lightbox Modal */}
      <AnimatePresence>
        {isFullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100000] bg-black/95 backdrop-blur-xl flex flex-col justify-between p-4 sm:p-8"
          >
            {/* Fullscreen Header */}
            <div className="flex items-center justify-between text-white pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <img 
                  src={logoOfficial} 
                  alt="Logo MégafixaEduc Pro" 
                  className="w-8 h-8 object-contain rounded-lg bg-white/10 p-1" 
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/LOGO_MEGFIXAEDEUC_PRO.png';
                  }}
                />
                <div>
                  <h4 className="font-extrabold text-base sm:text-lg text-white">
                    {activeSlide.title}
                  </h4>
                  <span className="text-xs text-amber-400 font-semibold uppercase tracking-wider">
                    {activeSlide.category} • Vue {currentIndex + 1} sur {SCHOOL_SLIDES.length}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsFullscreen(false)}
                className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                title="Fermer le plein écran"
                aria-label="Fermer"
              >
                <X size={24} />
              </button>
            </div>

            {/* Fullscreen Image View */}
            <div className="relative flex-1 flex items-center justify-center my-4 overflow-hidden">
              <div className="relative inline-block max-w-full max-h-[75vh]">
                <img
                  src={activeSlide.image}
                  alt={activeSlide.title}
                  referrerPolicy="no-referrer"
                  className="max-w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl border border-white/10"
                />

                {/* Logo Badge directly on the full-size image */}
                <div className="absolute top-4 left-4 flex items-center gap-2.5 px-3.5 py-1.5 bg-slate-950/80 backdrop-blur-md rounded-2xl border border-white/20 text-white shadow-2xl pointer-events-none">
                  <div className="w-7 h-7 bg-white rounded-full p-0.5 shadow-md flex items-center justify-center overflow-hidden">
                    <img src={logoOfficial} alt="MégafixaEduc Pro" className="w-full h-full object-contain" />
                  </div>
                  <span className="text-xs font-black tracking-wide text-white">Mégafixa<span className="text-amber-400">Educ</span></span>
                </div>
              </div>

              {/* Navigation arrows in fullscreen */}
              <button
                type="button"
                onClick={prevSlide}
                className="absolute left-2 sm:left-6 p-4 rounded-full bg-black/60 hover:bg-black/90 text-white backdrop-blur-md border border-white/20 transition-transform hover:scale-110 shadow-2xl"
                title="Précédent"
              >
                <ChevronLeft size={32} />
              </button>

              <button
                type="button"
                onClick={nextSlide}
                className="absolute right-2 sm:right-6 p-4 rounded-full bg-black/60 hover:bg-black/90 text-white backdrop-blur-md border border-white/20 transition-transform hover:scale-110 shadow-2xl"
                title="Suivant"
              >
                <ChevronRight size={32} />
              </button>
            </div>

            {/* Fullscreen Footer Description */}
            <div className="max-w-3xl mx-auto text-center space-y-1 text-slate-300">
              <p className="text-sm sm:text-base leading-relaxed">
                {activeSlide.description}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
