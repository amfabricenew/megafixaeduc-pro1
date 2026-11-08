import React, { useState, useRef, useEffect } from 'react';
import { useTranslation, Language } from '../contexts/TranslationContext';
import { Globe, Check, ChevronDown } from 'lucide-react';

interface LanguageSelectorProps {
  variant?: 'pill' | 'dropdown' | 'cards' | 'minimal';
  className?: string;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ 
  variant = 'pill',
  className = '' 
}) => {
  const { language, setLanguage } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const languages: { code: Language; label: string; nameEn: string; flag: string; nativeName: string }[] = [
    { code: 'fr', label: 'FR', nameEn: 'Français', flag: '🇫🇷', nativeName: 'Français' },
    { code: 'en', label: 'EN', nameEn: 'English', flag: '🇬🇧', nativeName: 'English (US)' },
  ];

  const currentLang = languages.find(l => l.code === language) || languages[0];

  // Variant: Radio Cards (Ideal for Settings & School Info pages)
  if (variant === 'cards') {
    return (
      <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${className}`}>
        {languages.map(lang => {
          const isSelected = language === lang.code;
          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => setLanguage(lang.code)}
              className={`p-4 rounded-2xl border-2 text-left transition-all flex items-center justify-between group ${
                isSelected
                  ? 'border-indigo-600 bg-indigo-50/70 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <span className="text-2xl filter drop-shadow-xs">{lang.flag}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className={`text-sm font-bold ${isSelected ? 'text-indigo-900' : 'text-slate-800'}`}>
                      {lang.nativeName}
                    </h4>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                      isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {lang.label}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {lang.code === 'en' 
                      ? 'Display the entire system, menus, forms & reports in English' 
                      : 'Afficher tout le système, les menus et les formulaires en français'}
                  </p>
                </div>
              </div>

              <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all ${
                isSelected
                  ? 'bg-indigo-600 text-white'
                  : 'border-2 border-slate-300 text-transparent group-hover:border-slate-400'
              }`}>
                <Check size={14} className="stroke-[3]" />
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  // Variant: Minimal / Drawer menu list
  if (variant === 'minimal') {
    return (
      <div className={`flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 ${className}`}>
        {languages.map(lang => {
          const isSelected = language === lang.code;
          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => setLanguage(lang.code)}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                isSelected
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>{lang.flag}</span>
              <span>{lang.nativeName}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // Variant: Pill Switcher (One-click toggle between FR & EN)
  if (variant === 'pill') {
    return (
      <div className={`inline-flex items-center p-1 bg-slate-100/90 hover:bg-slate-200/90 border border-slate-200/80 rounded-xl transition-all shadow-2xs ${className}`}>
        {languages.map(lang => {
          const isSelected = language === lang.code;
          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => setLanguage(lang.code)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                isSelected
                  ? 'bg-white text-slate-900 shadow-xs scale-100'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title={lang.code === 'en' ? 'Switch application to English' : 'Passer l\'application en français'}
            >
              <span className="text-sm leading-none">{lang.flag}</span>
              <span className="text-[11px] font-black">{lang.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // Variant: Dropdown
  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-2xs transition-all cursor-pointer"
        title="Changer de langue / Switch language"
      >
        <Globe size={14} className="text-indigo-600 shrink-0" />
        <span className="text-sm">{currentLang.flag}</span>
        <span className="font-extrabold uppercase">{currentLang.label}</span>
        <ChevronDown size={14} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-48 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 py-1.5 overflow-hidden animate-in fade-in slide-in-from-top-1">
          <div className="px-3 py-1.5 text-[10px] uppercase font-black text-slate-400 tracking-wider border-b border-slate-100">
            {language === 'en' ? 'Display Language' : 'Langue d\'affichage'}
          </div>
          {languages.map(lang => {
            const isSelected = language === lang.code;
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => {
                  setLanguage(lang.code);
                  setIsOpen(false);
                }}
                className={`w-full px-3 py-2 text-left text-xs font-bold flex items-center justify-between transition-colors ${
                  isSelected
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base">{lang.flag}</span>
                  <div>
                    <span className="block leading-tight">{lang.nativeName}</span>
                    <span className="text-[10px] text-slate-400 font-normal">{lang.nameEn}</span>
                  </div>
                </div>
                {isSelected && <Check size={14} className="text-indigo-600 stroke-[3]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;
