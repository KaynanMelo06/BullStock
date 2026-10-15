import React from 'react';
import { useCategory } from '../context/CategoryContext';
import { useAuth } from '../context/AuthContext';
import { Clock, XCircle, ShieldAlert, ArrowRight, Layers, Sparkles } from 'lucide-react';

interface ApprovalGateProps {
  onGoCategories: () => void;
}

export const ApprovalGate: React.FC<ApprovalGateProps> = ({ onGoCategories }) => {
  const { activeCategory, activeMembership, membershipStatus, requestAccessToCategory } = useCategory();
  const { user } = useAuth();
  const [requesting, setRequesting] = React.useState(false);

  if (!activeCategory) {
    return (
      <div className="max-w-md mx-auto p-8 text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-bull-surface border border-bull-border flex items-center justify-center mx-auto text-bull-primary shadow-xl">
          <Layers className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-bull-text">Nenhuma Categoria Selecionada</h2>
        <p className="text-xs text-bull-text-muted">
          Escolha uma categoria da equipe para visualizar seus inventários e listas de compras.
        </p>
        <button
          onClick={onGoCategories}
          className="py-2.5 px-5 rounded-2xl bg-bull-primary text-bull-on-primary font-bold text-xs shadow-lg hover:brightness-110 active:scale-95 transition inline-flex items-center gap-2"
        >
          <span>Ver Categorias</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  const handleRequest = async () => {
    setRequesting(true);
    try {
      await requestAccessToCategory(activeCategory.id);
    } catch (err: any) {
      alert(err.message || 'Erro ao solicitar acesso.');
    } finally {
      setRequesting(false);
    }
  };

  if (membershipStatus === 'pendente') {
    return (
      <div className="max-w-md mx-auto px-4 py-12 text-center space-y-6">
        {/* Animated Gold Clock/Hourglass */}
        <div className="relative mx-auto w-24 h-24">
          <div className="absolute inset-0 rounded-full bg-bull-primary/10 animate-ping" />
          <div className="relative w-24 h-24 rounded-3xl bg-bull-surface border-2 border-bull-primary flex items-center justify-center text-bull-primary shadow-2xl">
            <Clock className="w-12 h-12" />
          </div>
        </div>

        <div className="space-y-2">
          <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-bull-primary/20 text-bull-primary border border-bull-primary/30">
            Aprovação Pendente
          </span>
          <h2 className="text-2xl font-black text-bull-text">
            Aguardando aprovação do capitão de {activeCategory.name}
          </h2>
          <p className="text-xs text-bull-text-muted leading-relaxed max-w-sm mx-auto">
            Sua solicitação de acesso foi enviada ao capitão da categoria. Assim que ele aprovar, você terá acesso imediato aos inventários e listas de compras.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-bull-surface border border-bull-border text-left space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-bull-text-muted">Categoria solicitada:</span>
            <span className="font-bold text-bull-text">{activeCategory.name}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-bull-text-muted">Status:</span>
            <span className="font-bold text-bull-primary">Pendente</span>
          </div>
        </div>

        <div className="pt-2 flex flex-col gap-2">
          <button
            onClick={onGoCategories}
            className="w-full py-3 px-4 rounded-2xl bg-bull-surface hover:bg-bull-surface-elevated border border-bull-border text-bull-text font-bold text-xs transition"
          >
            Trocar para Outra Categoria
          </button>
        </div>
      </div>
    );
  }

  if (membershipStatus === 'recusado') {
    return (
      <div className="max-w-md mx-auto px-4 py-12 text-center space-y-6">
        <div className="w-20 h-20 rounded-3xl bg-bull-surface border border-bull-alert flex items-center justify-center mx-auto text-bull-alert shadow-2xl">
          <XCircle className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-bull-alert/20 text-bull-alert border border-bull-alert/30">
            Solicitação Recusada
          </span>
          <h2 className="text-2xl font-black text-bull-text">
            Solicitação recusada
          </h2>
          <p className="text-xs text-bull-text-muted leading-relaxed max-w-sm mx-auto">
            O capitão da categoria {activeCategory.name} não aprovou a sua entrada. Você pode solicitar acesso a outra categoria da equipe.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
          <button
            onClick={onGoCategories}
            className="flex-1 py-3 px-4 rounded-2xl bg-bull-primary text-bull-on-primary font-bold text-xs shadow-lg hover:brightness-110 transition"
          >
            Escolher Outra Categoria
          </button>
          <button
            onClick={handleRequest}
            disabled={requesting}
            className="flex-1 py-3 px-4 rounded-2xl bg-bull-surface hover:bg-bull-surface-elevated border border-bull-border text-bull-text font-bold text-xs transition disabled:opacity-50"
          >
            {requesting ? 'Enviando...' : 'Pedir Novamente'}
          </button>
        </div>
      </div>
    );
  }

  // Not requested yet
  return (
    <div className="max-w-md mx-auto px-4 py-12 text-center space-y-6">
      <div className="w-20 h-20 rounded-3xl bg-bull-surface border border-bull-border flex items-center justify-center mx-auto text-bull-primary shadow-2xl">
        <ShieldAlert className="w-10 h-10" />
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-black text-bull-text">
          Acesso Restrito: {activeCategory.name}
        </h2>
        <p className="text-xs text-bull-text-muted leading-relaxed max-w-sm mx-auto">
          Você ainda não é membro aprovado desta categoria. Envie uma solicitação para o capitão autorizar sua participação.
        </p>
      </div>

      <div className="pt-2 flex flex-col gap-2.5">
        <button
          onClick={handleRequest}
          disabled={requesting}
          className="w-full py-3 px-4 rounded-2xl bg-bull-primary text-bull-on-primary font-bold text-xs shadow-lg hover:brightness-110 active:scale-95 transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          <span>{requesting ? 'Enviando Solicitação...' : 'Solicitar Acesso ao Capitão'}</span>
        </button>

        <button
          onClick={onGoCategories}
          className="w-full py-3 px-4 rounded-2xl bg-bull-surface hover:bg-bull-surface-elevated border border-bull-border text-bull-text font-bold text-xs transition"
        >
          Ver Todas as Categorias
        </button>
      </div>
    </div>
  );
};
