import React, { useState } from 'react';
import { useCategory } from '../context/CategoryContext';
import { useAuth } from '../context/AuthContext';
import { Category, CategoryMember } from '../types';
import { ConfirmModal } from '../components/ConfirmModal';
import {
  Layers,
  Plus,
  Shield,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  ChevronRight,
  ArrowRight,
  Trash2,
  Users,
  Sparkles,
} from 'lucide-react';

interface CategoriesViewProps {
  onSelectCategoryAndGoInventory: (category: Category) => void;
  openCreateModalTrigger?: boolean;
  onResetCreateModalTrigger?: () => void;
}

export const CategoriesView: React.FC<CategoriesViewProps> = ({
  onSelectCategoryAndGoInventory,
  openCreateModalTrigger,
  onResetCreateModalTrigger,
}) => {
  const {
    categories,
    activeCategory,
    setActiveCategory,
    requestAccessToCategory,
    createCategory,
    deleteCategory,
    activeMembership,
  } = useCategory();
  const { user, username, isSuperadmin } = useAuth();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [newCatColor, setNewCatColor] = useState('#EDB23A');
  const [catToDelete, setCatToDelete] = useState<Category | null>(null);
  const [requestingCatId, setRequestingCatId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  React.useEffect(() => {
    if (openCreateModalTrigger) {
      setIsCreateOpen(true);
      onResetCreateModalTrigger?.();
    }
  }, [openCreateModalTrigger, onResetCreateModalTrigger]);

  const handleRequestAccess = async (cat: Category) => {
    setRequestingCatId(cat.id);
    setFeedback(null);
    try {
      await requestAccessToCategory(cat.id);
      setActiveCategory(cat);
      setFeedback(`Solicitação enviada para o capitão de ${cat.name}!`);
    } catch (err: any) {
      setFeedback(err.message || 'Erro ao solicitar acesso.');
    } finally {
      setRequestingCatId(null);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      const newId = await createCategory(newCatName.trim(), newCatDesc.trim(), newCatColor);
      setIsCreateOpen(false);
      setNewCatName('');
      setNewCatDesc('');
      setFeedback('Categoria criada com sucesso!');
    } catch (err: any) {
      alert('Erro ao criar categoria: ' + err.message);
    }
  };

  const handleDeleteCategory = async () => {
    if (!catToDelete) return;
    try {
      await deleteCategory(catToDelete.id);
      setCatToDelete(null);
      setFeedback('Categoria excluída com sucesso.');
    } catch (err: any) {
      alert('Erro ao excluir categoria: ' + err.message);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-bull-surface border border-bull-border rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-bull-primary font-bold text-xs uppercase tracking-wider mb-1">
              <Layers className="w-4 h-4" />
              <span>Categorias da Equipe</span>
            </div>
            <h1 className="text-2xl font-black text-bull-text">Minhas Categorias de Robótica</h1>
            <p className="text-xs text-bull-text-muted mt-1 max-w-xl">
              Cada categoria possui inventários e listas de compras dedicados. O acesso é aprovado pelo capitão de cada categoria.
            </p>
          </div>

          {isSuperadmin && (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="py-2.5 px-4 rounded-2xl bg-bull-primary hover:brightness-110 active:scale-95 text-bull-on-primary font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition self-start sm:self-auto shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Categoria</span>
            </button>
          )}
        </div>

        {isSuperadmin && (
          <div className="mt-4 pt-3 border-t border-bull-border/40 flex items-center gap-2 text-[11px] text-bull-primary font-bold">
            <Shield className="w-3.5 h-3.5 text-bull-primary" />
            <span>Painel Superadmin: Você tem acesso irrestrito para gerenciar todas as categorias.</span>
          </div>
        )}
      </div>

      {feedback && (
        <div className="p-3.5 rounded-2xl bg-bull-surface border border-bull-primary text-xs font-bold text-bull-primary flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-bull-primary" />
            <span>{feedback}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="font-bold px-1">
            ×
          </button>
        </div>
      )}

      {/* Grid of Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {categories.map((cat) => {
          const isActive = activeCategory?.id === cat.id;
          const isCurrentCategoryMember = isActive && activeMembership?.status === 'aprovado';
          const isCurrentPending = isActive && activeMembership?.status === 'pendente';
          const isCurrentRejected = isActive && activeMembership?.status === 'recusado';

          return (
            <div
              key={cat.id}
              className={`rounded-3xl p-5 border transition-all relative flex flex-col justify-between ${
                isActive
                  ? 'bg-bull-surface-elevated border-bull-primary shadow-xl ring-1 ring-bull-primary/50'
                  : 'bg-bull-surface border-bull-border hover:border-bull-primary/60'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center text-bull-on-primary font-black text-sm shadow"
                      style={{ backgroundColor: cat.color || '#EDB23A' }}
                    >
                      {cat.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h2 className="text-base font-black text-bull-text flex items-center gap-2">
                        <span>{cat.name}</span>
                        {isActive && (
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-bull-primary text-bull-on-primary">
                            Ativa
                          </span>
                        )}
                      </h2>
                      <span className="text-[11px] text-bull-text-muted">
                        ID: {cat.id}
                      </span>
                    </div>
                  </div>

                  {isSuperadmin && (
                    <button
                      onClick={() => setCatToDelete(cat)}
                      title="Excluir categoria (Superadmin)"
                      className="p-1.5 rounded-lg text-bull-alert hover:bg-bull-surface transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <p className="text-xs text-bull-text-muted mt-2 line-clamp-2">
                  {cat.description || 'Categoria da equipe de robótica.'}
                </p>
              </div>

              {/* Status and Action */}
              <div className="mt-5 pt-4 border-t border-bull-border/40 flex items-center justify-between gap-2">
                <div>
                  {isActive && (
                    <div>
                      {isSuperadmin ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-bull-primary">
                          <Shield className="w-3.5 h-3.5" />
                          Acesso Superadmin
                        </span>
                      ) : isCurrentCategoryMember ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-bull-success">
                          <CheckCircle className="w-3.5 h-3.5" />
                          {activeMembership?.role === 'capitao'
                            ? '👑 Capitão'
                            : activeMembership?.role === 'membro'
                            ? '✏️ Membro'
                            : '👁️ Visualizador'}
                        </span>
                      ) : isCurrentPending ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-bull-primary">
                          <Clock className="w-3.5 h-3.5" />
                          Aguardando capitão
                        </span>
                      ) : isCurrentRejected ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-bull-alert">
                          <XCircle className="w-3.5 h-3.5" />
                          Solicitação recusada
                        </span>
                      ) : (
                        <span className="text-[11px] text-bull-text-muted">Não solicitado</span>
                      )}
                    </div>
                  )}
                  {!isActive && (
                    <span className="text-[11px] text-bull-text-muted">Alternar para ver status</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {isActive ? (
                    <button
                      onClick={() => onSelectCategoryAndGoInventory(cat)}
                      className="py-1.5 px-3.5 rounded-xl bg-bull-primary hover:brightness-110 active:scale-95 text-bull-on-primary font-bold text-xs flex items-center gap-1.5 shadow transition"
                    >
                      <span>Acessar</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setActiveCategory(cat);
                        setFeedback(`Categoria alterada para ${cat.name}.`);
                      }}
                      className="py-1.5 px-3 rounded-xl bg-bull-surface hover:bg-bull-surface-elevated border border-bull-border text-bull-text font-bold text-xs transition"
                    >
                      Selecionar
                    </button>
                  )}

                  {/* If user has no access or was rejected, provide explicit request button */}
                  {(!isCurrentCategoryMember && !isSuperadmin) && (
                    <button
                      onClick={() => handleRequestAccess(cat)}
                      disabled={requestingCatId === cat.id}
                      className="py-1.5 px-2.5 rounded-xl bg-bull-surface border border-bull-primary/50 text-bull-primary font-bold text-xs hover:bg-bull-primary/10 transition"
                    >
                      {isCurrentPending ? 'Reenviar Pedido' : 'Pedir Acesso'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* CREATE CATEGORY MODAL (Superadmin) */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-bull-surface border border-bull-border rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-bull-primary text-bull-on-primary font-bold">
                  <Plus className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-black text-bull-text">Criar Nova Categoria</h3>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-bull-text-muted hover:text-bull-text text-xl font-bold px-2"
              >
                ×
              </button>
            </div>

            <p className="text-xs text-bull-text-muted">
              Crie uma categoria oficial para a equipe (ex.: Futebol de Robôs, Mini Sumô, Simulação 2D).
            </p>

            <form onSubmit={handleCreateCategory} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-bull-text-muted mb-1">
                  Nome da Categoria
                </label>
                <input
                  type="text"
                  required
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="ex.: Futebol de Robôs (VSSS)"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-bull-surface-elevated border border-bull-border text-bull-text text-sm focus:outline-none focus:border-bull-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-bull-text-muted mb-1">
                  Descrição
                </label>
                <textarea
                  rows={2}
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  placeholder="Objetivo da categoria, robôs ou especificações..."
                  className="w-full px-3.5 py-2 rounded-xl bg-bull-surface-elevated border border-bull-border text-bull-text text-sm focus:outline-none focus:border-bull-primary resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-bull-text-muted mb-1">
                  Cor da Identidade
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={newCatColor}
                    onChange={(e) => setNewCatColor(e.target.value)}
                    className="w-10 h-10 rounded-xl bg-transparent border-0 cursor-pointer p-0"
                  />
                  <input
                    type="text"
                    value={newCatColor}
                    onChange={(e) => setNewCatColor(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-bull-surface-elevated border border-bull-border text-bull-text text-xs font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-bull-border text-xs font-bold text-bull-text hover:bg-bull-surface-elevated transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-bull-primary text-bull-on-primary font-bold text-xs hover:brightness-110 active:scale-95 transition shadow-lg"
                >
                  Criar Categoria
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      <ConfirmModal
        isOpen={!!catToDelete}
        title="Excluir Categoria"
        message={`Tem certeza que deseja excluir a categoria "${catToDelete?.name}"? Todos os inventários e listas de compras dela serão removidos permanentemente.`}
        confirmText="Sim, Excluir"
        cancelText="Cancelar"
        isDanger={true}
        onConfirm={handleDeleteCategory}
        onCancel={() => setCatToDelete(null)}
      />
    </div>
  );
};
