import React, { createContext, useContext, useState, useCallback } from 'react';
import { AlertTriangle, HelpCircle, Trash2, Info, X } from 'lucide-react';

export interface ConfirmOptions {
  title?: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info' | 'primary';
  icon?: 'trash' | 'warning' | 'help' | 'info';
}

type ConfirmFunction = (options: ConfirmOptions | string) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFunction>(async () => false);

export const useConfirm = () => useContext(ConfirmContext);

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [resolveRef, setResolveRef] = useState<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions | string): Promise<boolean> => {
    return new Promise((resolve) => {
      const parsedOptions: ConfirmOptions = typeof opts === 'string'
        ? { message: opts }
        : opts;
      setOptions(parsedOptions);
      setResolveRef(() => resolve);
    });
  }, []);

  const handleConfirm = () => {
    if (resolveRef) resolveRef(true);
    setOptions(null);
    setResolveRef(null);
  };

  const handleCancel = () => {
    if (resolveRef) resolveRef(false);
    setOptions(null);
    setResolveRef(null);
  };

  const variant = options?.variant || (options?.icon === 'trash' ? 'danger' : 'primary');

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {options && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn"
          onClick={handleCancel}
        >
          <div 
            className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-md w-full p-6 space-y-5 animate-scaleUp overflow-hidden relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header / Icon */}
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-2xl shrink-0 ${
                variant === 'danger'
                  ? 'bg-red-100 text-red-600'
                  : variant === 'warning'
                  ? 'bg-amber-100 text-amber-600'
                  : variant === 'info'
                  ? 'bg-blue-100 text-blue-600'
                  : 'bg-emerald-100 text-emerald-600'
              }`}>
                {variant === 'danger' || options.icon === 'trash' ? (
                  <Trash2 size={24} />
                ) : variant === 'warning' || options.icon === 'warning' ? (
                  <AlertTriangle size={24} />
                ) : variant === 'info' || options.icon === 'info' ? (
                  <Info size={24} />
                ) : (
                  <HelpCircle size={24} />
                )}
              </div>

              <div className="flex-1 space-y-1 pr-6">
                <h3 className="text-lg font-black text-slate-900 leading-snug">
                  {options.title || "Confirmation"}
                </h3>
                <div className="text-sm font-medium text-slate-600 whitespace-pre-line leading-relaxed">
                  {options.message}
                </div>
              </div>

              <button
                type="button"
                onClick={handleCancel}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleCancel}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                {options.cancelText || "Annuler"}
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className={`px-5 py-2.5 text-xs font-bold text-white rounded-xl shadow-md transition-all cursor-pointer ${
                  variant === 'danger'
                    ? 'bg-red-600 hover:bg-red-700 active:bg-red-800 shadow-red-200'
                    : variant === 'warning'
                    ? 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800 shadow-amber-200'
                    : variant === 'info'
                    ? 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 shadow-blue-200'
                    : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 shadow-emerald-200'
                }`}
              >
                {options.confirmText || "Confirmer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};
