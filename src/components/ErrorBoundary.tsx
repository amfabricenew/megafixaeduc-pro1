import React from 'react';
import { RefreshCw, AlertCircle, Home, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  inline?: boolean;
  key?: React.Key;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  showDetails: boolean;
}

export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    (this as any).state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.warn('[MégafixaEduc] Incident intercepté par ErrorBoundary:', error, errorInfo);
    (this as any).setState({ errorInfo });
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    const currentChildren = (this as any).props?.children;
    if (currentChildren !== prevProps.children && (this as any).state?.hasError) {
      (this as any).setState({ hasError: false, error: null, errorInfo: null });
    }
  }

  handleReset = () => {
    (this as any).setState({ hasError: false, error: null, errorInfo: null });
  };

  handleReload = () => {
    try {
      sessionStorage.removeItem('last_chunk_reload');
      sessionStorage.removeItem('megafixa_preload_reload');
    } catch (e) {}
    window.location.reload();
  };

  handleGoHome = () => {
    (this as any).setState({ hasError: false, error: null, errorInfo: null });
    try {
      sessionStorage.removeItem('last_chunk_reload');
    } catch (e) {}
    window.location.href = '/accueil';
  };

  render() {
    const { hasError, error, showDetails } = (this as any).state || {};
    const { inline, children } = (this as any).props || {};

    if (hasError) {
      if (inline) {
        return (
          <div className="p-8 my-6 bg-white rounded-3xl border border-slate-200/80 shadow-sm text-center max-w-2xl mx-auto space-y-4">
            <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <AlertCircle size={28} />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-800">
                Affichage momentanément indisponible
              </h3>
              <p className="text-sm text-slate-600 max-w-md mx-auto">
                Ce module a rencontré une interruption. Vos données locales restent sécurisées et intactes.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-sm font-semibold rounded-xl transition-all shadow-sm cursor-pointer"
              >
                <RotateCcw size={16} />
                Réessayer ce module
              </button>
              <button
                type="button"
                onClick={this.handleReload}
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition-all cursor-pointer"
              >
                <RefreshCw size={16} />
                Actualiser
              </button>
              <button
                type="button"
                onClick={this.handleGoHome}
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition-all cursor-pointer"
              >
                <Home size={16} />
                Tableau de bord
              </button>
            </div>

            {error && (
              <div className="pt-2 border-t border-slate-100 text-left">
                <button
                  type="button"
                  onClick={() => (this as any).setState({ showDetails: !showDetails })}
                  className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 mx-auto cursor-pointer"
                >
                  {showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  <span>{showDetails ? "Masquer les détails" : "Détails techniques"}</span>
                </button>
                {showDetails && (
                  <div className="mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono text-slate-600 overflow-x-auto max-h-36">
                    <p className="font-semibold text-rose-600">{error.name}: {error.message}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      }

      return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center p-4">
          <div className="bg-white max-w-lg w-full p-8 rounded-3xl border border-slate-200 shadow-xl text-center space-y-6">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner border border-emerald-100">
              <AlertCircle size={32} />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-slate-800">
                MégafixaEduc Pro
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
                L'application fonctionne en toute sécurité en mode local. Une interruption momentanée a été interceptée sans impact sur vos données.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={this.handleGoHome}
                className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-xl transition-all shadow-md shadow-emerald-600/20 text-sm"
              >
                <Home size={18} />
                Retourner à l'accueil
              </button>
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-semibold rounded-xl transition-all text-sm border border-slate-200"
              >
                <RefreshCw size={18} />
                Actualiser
              </button>
            </div>

            {error && (
              <div className="pt-2 border-t border-slate-100 text-left">
                <button
                  type="button"
                  onClick={() => (this as any).setState({ showDetails: !showDetails })}
                  className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 mx-auto"
                >
                  {showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  <span>{showDetails ? "Masquer les détails" : "Détails techniques"}</span>
                </button>
                {showDetails && (
                  <div className="mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono text-slate-600 overflow-x-auto max-h-36">
                    <p className="font-semibold text-rose-600">{error.name}: {error.message}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return children;
  }
}

