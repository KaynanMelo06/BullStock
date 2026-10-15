import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  isDanger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  isDestructive = false,
  isDanger = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;
  const isDangerous = isDestructive || isDanger;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150"
    >
      <div className="w-full max-w-sm rounded-3xl bg-bull-surface border border-bull-border p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl ${
                isDangerous
                  ? 'bg-bull-surface-elevated text-bull-alert border border-bull-alert/40'
                  : 'bg-bull-surface-elevated text-bull-primary border border-bull-primary/40'
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 id="confirm-modal-title" className="text-base font-black text-bull-text">
              {title}
            </h3>
          </div>
          <button
            onClick={onCancel}
            aria-label="Fechar confirmação"
            className="rounded-lg p-1 text-bull-text-muted hover:text-bull-text transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="mt-3 text-xs text-bull-text-muted leading-relaxed">
          {message}
        </p>

        <div className="mt-6 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-bull-border bg-bull-surface-elevated px-4 py-2 text-xs font-bold text-bull-text hover:brightness-110 active:scale-95 transition"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-xl px-4 py-2 text-xs font-black shadow-lg active:scale-95 transition ${
              isDangerous
                ? 'bg-bull-alert text-white hover:brightness-110'
                : 'bg-bull-primary text-bull-on-primary hover:brightness-110'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
