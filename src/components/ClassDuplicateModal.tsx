import React, { useState, useMemo } from 'react';
import { AlertCircle, Check, X, Sparkles, Plus, School } from 'lucide-react';

interface ClassDuplicateModalProps {
  isOpen: boolean;
  onClose: () => void;
  baseClassName: string;
  onConfirmWithSuffix: (newClassName: string) => void;
  isSubmitting?: boolean;
}

export const ClassDuplicateModal: React.FC<ClassDuplicateModalProps> = ({
  isOpen,
  onClose,
  baseClassName,
  onConfirmWithSuffix,
  isSubmitting = false,
}) => {
  const [selectedSuffix, setSelectedSuffix] = useState<string>('A');
  const [customSuffix, setCustomSuffix] = useState<string>('');
  const [useSlashFormat, setUseSlashFormat] = useState<boolean>(false);

  const cleanBase = (baseClassName || '').trim();

  // Quick preset suggestions
  const presetLetters = ['A', 'B', 'C', 'D', '1', '2', '3', 'Rose', 'Bleu', 'Jaune'];

  // Calculate final class name preview
  const finalPreviewName = useMemo(() => {
    const activeSuffix = customSuffix.trim() ? customSuffix.trim() : selectedSuffix;
    if (!activeSuffix) return cleanBase;

    if (useSlashFormat) {
      return `${cleanBase}/${activeSuffix}`;
    }
    return `${cleanBase} ${activeSuffix}`;
  }, [cleanBase, selectedSuffix, customSuffix, useSlashFormat]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!finalPreviewName) return;
    onConfirmWithSuffix(finalPreviewName);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-amber-200 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-xs">
              <AlertCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold">Classe déjà existante</h3>
              <p className="text-xs text-amber-100 font-medium">
                Gestion des dédoublements et divisions de classes
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-950 space-y-1.5">
            <p className="font-bold text-amber-900 flex items-center gap-1.5">
              <School className="w-4 h-4 text-amber-600 shrink-0" />
              La classe « {cleanBase} » existe déjà pour cette année scolaire.
            </p>
            <p className="text-amber-800 leading-relaxed">
              Voulez-vous en créer une nouvelle avec un suffixe pour différencier les divisions (ex : <strong>{cleanBase} A</strong> ou <strong>{cleanBase}/A</strong>) ?
            </p>
          </div>

          {/* Quick preset chips */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Suffixes rapides suggérés :
            </label>
            <div className="flex flex-wrap gap-1.5">
              {presetLetters.map((letter) => {
                const isSelected = !customSuffix && selectedSuffix === letter;
                return (
                  <button
                    key={letter}
                    type="button"
                    onClick={() => {
                      setSelectedSuffix(letter);
                      setCustomSuffix('');
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                      isSelected
                        ? 'bg-amber-600 text-white shadow-xs scale-105'
                        : 'bg-slate-100 text-slate-700 hover:bg-amber-100 hover:text-amber-800'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                    {letter}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Format style toggle: Space vs Slash */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Format du séparateur :
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setUseSlashFormat(false)}
                className={`p-2.5 rounded-xl border text-xs font-bold text-left transition flex items-center justify-between ${
                  !useSlashFormat
                    ? 'border-amber-500 bg-amber-50/70 text-amber-950 shadow-xs'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>Espace : « {cleanBase} A »</span>
                {!useSlashFormat && <Check className="w-4 h-4 text-amber-600" />}
              </button>

              <button
                type="button"
                onClick={() => setUseSlashFormat(true)}
                className={`p-2.5 rounded-xl border text-xs font-bold text-left transition flex items-center justify-between ${
                  useSlashFormat
                    ? 'border-amber-500 bg-amber-50/70 text-amber-950 shadow-xs'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>Barre oblique : « {cleanBase}/A »</span>
                {useSlashFormat && <Check className="w-4 h-4 text-amber-600" />}
              </button>
            </div>
          </div>

          {/* Custom suffix field */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Ou personnaliser le suffixe :
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Ex: Section 1, Rose, Bis..."
                value={customSuffix}
                onChange={(e) => setCustomSuffix(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-hidden"
              />
            </div>
          </div>

          {/* Live Preview Box */}
          <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-xl p-4 shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider block">
              Aperçu du nouveau nom de la classe :
            </span>
            <div className="text-lg font-black text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{finalPreviewName}</span>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-100 transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !finalPreviewName}
              className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md transition flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {isSubmitting ? 'Création en cours...' : `Créer la classe « ${finalPreviewName} »`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
