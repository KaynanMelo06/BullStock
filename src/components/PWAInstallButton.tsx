import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Share2, X, PlusSquare } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already installed as standalone PWA, suppress
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        aria-label="Instalar BullStock no dispositivo"
        className="inline-flex items-center gap-1.5 rounded-xl bg-bull-primary px-3 py-1.5 text-xs font-black text-bull-on-primary shadow-sm hover:brightness-110 active:scale-95 transition"
      >
        <Download className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Instalar App</span>
        <span className="sm:hidden">Instalar</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          aria-label="Instruções para instalar BullStock no iPhone ou iPad"
          className="inline-flex items-center gap-1.5 rounded-xl border border-bull-border bg-bull-surface px-2.5 py-1.5 text-xs font-bold text-bull-text shadow-sm hover:bg-bull-surface-elevated transition"
        >
          <Download className="w-3.5 h-3.5 text-bull-primary" />
          <span>Instalar no iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-3xl bg-bull-surface p-6 shadow-2xl border border-bull-border">
              <div className="flex items-center justify-between pb-3 border-b border-bull-border/40">
                <h3 className="text-base font-black text-bull-text flex items-center gap-2">
                  <Download className="w-5 h-5 text-bull-primary" />
                  Instalar no iPhone / iPad
                </h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="rounded-lg p-1 text-bull-text-muted hover:text-bull-text"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-4 space-y-3 text-xs text-bull-text-muted">
                <div className="flex items-start gap-3 p-2.5 rounded-2xl bg-bull-surface-elevated border border-bull-border">
                  <div className="p-2 rounded-xl bg-bull-surface text-bull-primary shrink-0">
                    <Share2 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-bull-text">1. Toque em Compartilhar</p>
                    <p className="text-[11px] text-bull-text-muted">Na barra inferior do navegador Safari.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded-2xl bg-bull-surface-elevated border border-bull-border">
                  <div className="p-2 rounded-xl bg-bull-surface text-bull-success shrink-0">
                    <PlusSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-bull-text">2. Adicionar à Tela de Início</p>
                    <p className="text-[11px] text-bull-text-muted">Role para baixo e selecione esta opção.</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-6 w-full rounded-2xl bg-bull-primary py-2.5 text-xs font-black text-bull-on-primary hover:brightness-110 active:scale-95 transition"
              >
                Entendi
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
