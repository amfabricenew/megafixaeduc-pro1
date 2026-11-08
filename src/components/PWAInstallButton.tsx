import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, X, Smartphone, Info, Share2, PlusSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-2 rounded-xl bg-primary-600 hover:bg-primary-500 px-4 py-2 text-xs font-black text-white shadow-lg transition-all active:scale-95 group"
      >
        <Download size={14} className="group-hover:translate-y-0.5 transition-transform" />
        <span>Installer l'Application</span>
      </button>
    );
  }

  // iOS Safari flow (beforeinstallprompt is not supported by WebKit)
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-xs font-black text-slate-700 hover:bg-slate-50 transition-all active:scale-95"
        >
          <Smartphone size={14} />
          <span>Installer (iPhone)</span>
        </button>

        <AnimatePresence>
          {showIOSGuide && (
            <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-slate-200"
              >
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-100 text-primary-600 rounded-xl flex items-center justify-center">
                      <Smartphone size={20} />
                    </div>
                    <h3 className="text-lg font-black text-slate-900">Installer sur iOS</h3>
                  </div>
                  <button
                    onClick={() => setShowIOSGuide(false)}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                  >
                    <X size={18} className="text-slate-500" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="flex gap-4 items-start">
                    <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">1</div>
                    <p className="text-sm text-slate-600">
                      Appuyez sur le bouton <strong>Partager</strong> <Share2 size={16} className="inline mx-1 text-primary-600" /> dans la barre d'outils de Safari.
                    </p>
                  </div>
                  <div className="flex gap-4 items-start">
                    <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">2</div>
                    <p className="text-sm text-slate-600">
                      Faites défiler vers le bas et appuyez sur <strong>Sur l'écran d'accueil</strong> <PlusSquare size={16} className="inline mx-1 text-primary-600" />.
                    </p>
                  </div>
                  <div className="flex gap-4 items-start">
                    <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">3</div>
                    <p className="text-sm text-slate-600">
                      Appuyez sur <strong>Ajouter</strong> en haut à droite.
                    </p>
                  </div>
                </div>

                <div className="mt-8 p-4 bg-primary-50 rounded-2xl border border-primary-100 flex gap-3 items-start">
                  <Info size={16} className="text-primary-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-primary-800 leading-relaxed">
                    Cela installera MégafixaEduc Pro sur votre écran d'accueil et permettra une utilisation plein écran et hors ligne.
                  </p>
                </div>

                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="mt-6 w-full rounded-2xl bg-slate-900 py-3.5 text-sm font-black text-white hover:bg-slate-800 transition-all shadow-lg"
                >
                  J'ai compris
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </>
    );
  }

  return null;
};
