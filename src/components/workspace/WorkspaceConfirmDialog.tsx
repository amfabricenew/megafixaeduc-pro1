import React from 'react';
import { AlertTriangle, Check, X, ShieldAlert } from 'lucide-react';

interface WorkspaceConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  affectedItemsCount?: number;
  affectedItemLabel?: string;
  confirmLabel?: string;
  isDestructive?: boolean;
  isProcessing?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const WorkspaceConfirmDialog: React.FC<WorkspaceConfirmDialogProps> = ({
  isOpen,
  title,
  description,
  affectedItemsCount,
  affectedItemLabel,
  confirmLabel = 'Confirmer l\'opération',
  isDestructive = false,
  isProcessing = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden transform transition-all">
        {/* Header Bar */}
        <div className={`p-4 flex items-center gap-3 ${isDestructive ? 'bg-rose-50 border-b border-rose-100' : 'bg-amber-50 border-b border-amber-100'}`}>
          <div className={`p-2.5 rounded-xl ${isDestructive ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>
            {isDestructive ? <ShieldAlert size={22} /> : <AlertTriangle size={22} />}
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-base leading-snug">
              {title}
            </h3>
            <span className="text-xs text-slate-500 font-medium">
              Confirmation obligatoire Google Workspace
            </span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4">
          <p className="text-sm text-slate-600 leading-relaxed">
            {description}
          </p>

          {affectedItemsCount !== undefined && affectedItemsCount > 0 && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 flex items-center justify-between">
              <span className="font-medium text-slate-500">Éléments concernés :</span>
              <span className="font-bold text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-sm">
                {affectedItemsCount} {affectedItemLabel || 'élément(s)'}
              </span>
            </div>
          )}

          <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-100 text-[11px] text-indigo-700 leading-normal flex items-start gap-2">
            <span className="text-indigo-500 font-bold">•</span>
            <span>
              Cette action synchronise directement vos données avec votre compte Google personnel ou d'établissement avec votre accord explicite.
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            disabled={isProcessing}
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            <X size={15} />
            Annuler
          </button>
          <button
            type="button"
            disabled={isProcessing}
            onClick={onConfirm}
            className={`px-5 py-2 rounded-xl text-sm font-semibold text-white shadow-md transition-all flex items-center gap-2 ${
              isDestructive
                ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-200'
                : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
            } disabled:opacity-50`}
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Traitement...</span>
              </>
            ) : (
              <>
                <Check size={16} />
                <span>{confirmLabel}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
