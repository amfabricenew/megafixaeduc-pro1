import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { apiFetch } from '../utils/api';
import { Language, translations, frToEnPhrases, enToFrPhrases, translateText } from '../i18n/translations';

export type { Language };

interface TranslationContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (keyOrPhrase: string) => string;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

export const TranslationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('app_language');
      if (saved === 'en' || saved === 'fr') return saved;
    } catch {
      // ignore
    }
    return 'fr';
  });

  const languageRef = useRef<Language>(language);
  languageRef.current = language;

  const t = useCallback((keyOrPhrase: string): string => {
    if (!keyOrPhrase) return '';
    const currentLang = languageRef.current;
    if (currentLang === 'fr') {
      return translations.fr[keyOrPhrase] || enToFrPhrases[keyOrPhrase] || translateText(keyOrPhrase, 'fr');
    }
    // English mode
    if (translations.en[keyOrPhrase]) {
      return translations.en[keyOrPhrase];
    }
    if (frToEnPhrases[keyOrPhrase]) {
      return frToEnPhrases[keyOrPhrase];
    }
    return translateText(keyOrPhrase, 'en');
  }, []);

  const setLanguage = useCallback((newLang: Language) => {
    setLanguageState(newLang);
    languageRef.current = newLang;
    try {
      localStorage.setItem('app_language', newLang);
      document.documentElement.lang = newLang;
      window.dispatchEvent(new CustomEvent('appLanguageChanged', { detail: { language: newLang } }));

      // Sync with school info if authenticated
      const token = localStorage.getItem('token');
      if (token) {
        apiFetch('/api/school-info', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
          .then(res => res.json())
          .then(data => {
            if (data && data.langue !== newLang) {
              apiFetch('/api/school-info', {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ ...data, langue: newLang })
              }).catch(() => {});
            }
          })
          .catch(() => {});
      }
    } catch (e) {
      console.warn("Error saving language preference:", e);
    }
  }, []);

  // Sync document language attribute on language change
  useEffect(() => {
    try {
      document.documentElement.lang = language;
    } catch {}
  }, [language]);

  // Sync initial language from school info on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      apiFetch('/api/school-info', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data && data.langue && (data.langue === 'en' || data.langue === 'fr')) {
            const localLang = localStorage.getItem('app_language');
            if (!localLang) {
              setLanguageState(data.langue as Language);
              languageRef.current = data.langue as Language;
              localStorage.setItem('app_language', data.langue);
            }
          }
        })
        .catch(() => {});
    }

    const handleSchoolInfoChange = () => {
      const activeToken = localStorage.getItem('token');
      if (activeToken) {
        apiFetch('/api/school-info', {
          headers: { 'Authorization': `Bearer ${activeToken}` }
        })
          .then(res => res.json())
          .then(data => {
            if (data && data.langue && (data.langue === 'en' || data.langue === 'fr')) {
              setLanguageState(data.langue as Language);
              languageRef.current = data.langue as Language;
              localStorage.setItem('app_language', data.langue);
            }
          })
          .catch(() => {});
      }
    };

    window.addEventListener('schoolInfoChanged', handleSchoolInfoChange);
    return () => window.removeEventListener('schoolInfoChanged', handleSchoolInfoChange);
  }, []);

  // Comprehensive, ultra-smooth DOM Localization Engine
  // Translates all text nodes, options, placeholders, titles, and aria attributes across all screens and modals
  useEffect(() => {
    if (language !== 'en') {
      // Revert translated elements cleanly back to French
      try {
        const revertElement = (root: Node) => {
          const walker = document.createTreeWalker(
            root,
            NodeFilter.SHOW_TEXT,
            {
              acceptNode: (node: Node) => {
                const parent = node.parentElement;
                if (!parent) return NodeFilter.FILTER_REJECT;
                const tag = parent.tagName.toLowerCase();
                if (tag === 'script' || tag === 'style') return NodeFilter.FILTER_REJECT;
                return NodeFilter.FILTER_ACCEPT;
              }
            }
          );

          let node = walker.nextNode();
          while (node) {
            if ((node as any).__origFr) {
              node.nodeValue = (node as any).__origFr;
              delete (node as any).__origFr;
              delete (node as any).__megTrans;
            } else if ((node as any).__megTrans) {
              // Node was translated but origFr wasn't retained, use reverse dictionary
              const currentVal = node.nodeValue;
              if (currentVal) {
                const frVal = translateText(currentVal.trim(), 'fr');
                if (frVal !== currentVal.trim()) {
                  node.nodeValue = currentVal.replace(currentVal.trim(), frVal);
                }
              }
              delete (node as any).__megTrans;
            }
            node = walker.nextNode();
          }

          // Revert placeholders
          const inputs = document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('[data-orig-placeholder]');
          inputs.forEach((inp) => {
            if (inp.dataset.origPlaceholder) {
              inp.placeholder = inp.dataset.origPlaceholder;
              delete inp.dataset.origPlaceholder;
            }
            delete (inp as any).__megTrans;
          });

          // Revert titles
          const titled = document.querySelectorAll<HTMLElement>('[data-orig-title]');
          titled.forEach((el) => {
            if (el.dataset.origTitle) {
              el.title = el.dataset.origTitle;
              delete el.dataset.origTitle;
            }
            delete (el as any).__megTransTitle;
          });

          // Revert aria-labels
          const ariaEl = document.querySelectorAll<HTMLElement>('[data-orig-aria]');
          ariaEl.forEach((el) => {
            if (el.dataset.origAria) {
              el.setAttribute('aria-label', el.dataset.origAria);
              delete el.dataset.origAria;
            }
            delete (el as any).__megTransAria;
          });

          // Revert options
          const options = document.querySelectorAll<HTMLOptionElement>('option[data-orig-text]');
          options.forEach((opt) => {
            if (opt.dataset.origText) {
              opt.textContent = opt.dataset.origText;
              delete opt.dataset.origText;
            }
          });
        };

        if (document.body) {
          revertElement(document.body);
        }
      } catch (e) {
        console.warn("Revert translation error:", e);
      }
      return;
    }

    // English mode active: walk the tree and translate
    let timerId: any = null;
    let isTranslating = false;

    const translateElements = () => {
      if (isTranslating) return;
      isTranslating = true;
      try {
        if (!document.body) return;

        // 1. Translate inputs & textareas placeholders
        const inputs = document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input[placeholder], textarea[placeholder]');
        inputs.forEach((inp) => {
          if (inp.placeholder && !(inp as any).__megTrans) {
            const trimmed = inp.placeholder.trim();
            const trans = translateText(trimmed, 'en');
            if (trans !== trimmed) {
              if (!inp.dataset.origPlaceholder) {
                inp.dataset.origPlaceholder = inp.placeholder;
              }
              inp.placeholder = trans;
              (inp as any).__megTrans = true;
            }
          }
        });

        // 2. Translate titles and aria-labels
        const titled = document.querySelectorAll<HTMLElement>('[title]');
        titled.forEach((el) => {
          if (el.title && !(el as any).__megTransTitle) {
            const tVal = el.title.trim();
            const trans = translateText(tVal, 'en');
            if (trans !== tVal) {
              if (!el.dataset.origTitle) el.dataset.origTitle = el.title;
              el.title = trans;
              (el as any).__megTransTitle = true;
            }
          }
        });

        const ariaList = document.querySelectorAll<HTMLElement>('[aria-label]');
        ariaList.forEach((el) => {
          const aria = el.getAttribute('aria-label');
          if (aria && !(el as any).__megTransAria) {
            const aVal = aria.trim();
            const trans = translateText(aVal, 'en');
            if (trans !== aVal) {
              if (!el.dataset.origAria) el.dataset.origAria = aria;
              el.setAttribute('aria-label', trans);
              (el as any).__megTransAria = true;
            }
          }
        });

        // 3. Translate select <option> texts
        const options = document.querySelectorAll<HTMLOptionElement>('option');
        options.forEach((opt) => {
          const optText = opt.textContent;
          if (optText && !opt.dataset.origText) {
            const trimmed = optText.trim();
            const trans = translateText(trimmed, 'en');
            if (trans !== trimmed) {
              opt.dataset.origText = optText;
              opt.textContent = optText.replace(trimmed, trans);
            }
          }
        });

        // 4. Translate all text nodes in the document body
        const walker = document.createTreeWalker(
          document.body,
          NodeFilter.SHOW_TEXT,
          {
            acceptNode: (node: Node) => {
              if ((node as any).__megTrans) return NodeFilter.FILTER_REJECT;
              const parent = node.parentElement;
              if (!parent) return NodeFilter.FILTER_REJECT;
              const tag = parent.tagName.toLowerCase();
              if (
                tag === 'script' || 
                tag === 'style' || 
                tag === 'svg' || 
                tag === 'path' || 
                tag === 'code' || 
                tag === 'pre' ||
                tag === 'textarea' ||
                tag === 'input'
              ) {
                return NodeFilter.FILTER_REJECT;
              }
              const val = node.nodeValue;
              if (!val || val.trim().length === 0) return NodeFilter.FILTER_REJECT;
              return NodeFilter.FILTER_ACCEPT;
            }
          }
        );

        let currentNode = walker.nextNode();
        while (currentNode) {
          const val = currentNode.nodeValue;
          if (val) {
            const trimmed = val.trim();
            if (trimmed.length > 0) {
              const trans = translateText(trimmed, 'en');
              if (trans !== trimmed) {
                if (!(currentNode as any).__origFr) {
                  (currentNode as any).__origFr = val;
                }
                currentNode.nodeValue = val.replace(trimmed, trans);
                (currentNode as any).__megTrans = true;
              }
            }
          }
          currentNode = walker.nextNode();
        }
      } catch (err) {
        console.warn("DOM translation pass error:", err);
      } finally {
        isTranslating = false;
      }
    };

    const schedulePass = (delay = 60) => {
      if (timerId) clearTimeout(timerId);
      timerId = setTimeout(() => {
        translateElements();
      }, delay);
    };

    // Immediate and follow-up passes
    translateElements();
    schedulePass(80);
    schedulePass(300);

    // Route changes & custom events
    const handleNavigation = () => {
      schedulePass(50);
      schedulePass(250);
    };

    window.addEventListener('popstate', handleNavigation);
    window.addEventListener('hashchange', handleNavigation);
    window.addEventListener('pageChanged', handleNavigation);
    window.addEventListener('activeSpaceChanged', handleNavigation);

    // Mutation observer for dynamically inserted tabs, modals, tables, toasts
    const observer = new MutationObserver((mutations) => {
      let shouldTranslate = false;
      for (let i = 0; i < mutations.length; i++) {
        const mut = mutations[i];
        if (mut.addedNodes && mut.addedNodes.length > 0) {
          for (let j = 0; j < mut.addedNodes.length; j++) {
            const n = mut.addedNodes[j];
            if (n.nodeType === Node.ELEMENT_NODE || n.nodeType === Node.TEXT_NODE) {
              shouldTranslate = true;
              break;
            }
          }
        }
        if (shouldTranslate) break;
      }

      if (shouldTranslate) {
        schedulePass(80);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: false,
      characterData: false
    });

    return () => {
      if (timerId) clearTimeout(timerId);
      window.removeEventListener('popstate', handleNavigation);
      window.removeEventListener('hashchange', handleNavigation);
      window.removeEventListener('pageChanged', handleNavigation);
      window.removeEventListener('activeSpaceChanged', handleNavigation);
      observer.disconnect();
    };
  }, [language]);

  return (
    <TranslationContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </TranslationContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(TranslationContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
};
