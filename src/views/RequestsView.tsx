import React, { useState } from 'react';
import { useCategory } from '../context/CategoryContext';
import { useAuth } from '../context/AuthContext';
import { CategoryRole, CategoryMember } from '../types';
import {
  UserCheck,
  UserX,
  Clock,
  Shield,
  Layers,
  CheckCircle,
  AlertCircle,
  Users,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';

interface RequestsViewProps {
  onGoCategories?: () => void;
}

export const RequestsView: React.FC<RequestsViewProps> = ({ onGoCategories = () => {} }) => {
  const {
    activeCategory,
    pendingRequests,
    members,
    isCaptain,
    approveRequest,
    rejectRequest,
    updateMemberRole,
    removeMember,
  } = useCategory();
  const { user, isSuperadmin } = useAuth();

  const [selectedRole, setSelectedRole] = useState<Record<string, CategoryRole>>({});
  const [processingUid, setProcessingUid] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  if (!activeCategory) {
    return (
      <div className="p-8 text-center text-bull-text-muted">
        <Layers className="w-12 h-12 mx-auto mb-3 text-bull-primary opacity-60" />
        <p className="font-bold text-bull-text">Selecione uma categoria primeiro.</p>
      </div>
    );
  }

  if (!isCaptain && !isSuperadmin) {
    return (
      <div className="p-8 text-center max-w-md mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-bull-surface border border-bull-border flex items-center justify-center mx-auto mb-4 text-bull-alert">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-black text-bull-text mb-2">Acesso Restrito ao Capitão</h2>
        <p className="text-xs text-bull-text-muted leading-relaxed">
          Apenas capitães da categoria <strong>{activeCategory.name}</strong> ou superadmins podem aprovar solicitações e gerenciar membros.
        </p>
      </div>
    );
  }

  const handleApprove = async (member: CategoryMember) => {
    setProcessingUid(member.uid);
    setFeedbackMsg(null);
    const roleToAssign = selectedRole[member.uid] || 'membro';
    try {
      await approveRequest(activeCategory.id, member.uid, roleToAssign);
      setFeedbackMsg({
        text: `Usuário @${member.username} aprovado como ${roleToAssign === 'membro' ? 'Membro' : 'Visualizador'}!`,
        type: 'success',
      });
    } catch (err: any) {
      setFeedbackMsg({ text: err.message || 'Erro ao aprovar solicitação.', type: 'error' });
    } finally {
      setProcessingUid(null);
    }
  };

  const handleReject = async (member: CategoryMember) => {
    setProcessingUid(member.uid);
    setFeedbackMsg(null);
    try {
      await rejectRequest(activeCategory.id, member.uid);
      setFeedbackMsg({ text: `Solicitação de @${member.username} recusada.`, type: 'success' });
    } catch (err: any) {
      setFeedbackMsg({ text: err.message || 'Erro ao recusar solicitação.', type: 'error' });
    } finally {
      setProcessingUid(null);
    }
  };

  const approvedMembers = members.filter((m) => m.status === 'aprovado');

  const formatDate = (val: any) => {
    if (!val) return 'Recentemente';
    if (typeof val === 'string') {
      try {
        return new Date(val).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
      } catch {
        return val;
      }
    }
    if (val.toDate) {
      return val.toDate().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    }
    return 'Recentemente';
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="bg-bull-surface border border-bull-border rounded-3xl p-5 shadow-xl">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-bull-surface-elevated border border-bull-primary/40 flex items-center justify-center text-bull-primary">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-bull-primary uppercase tracking-wider">
                Gestão da Categoria
              </span>
              <h1 className="text-xl font-black text-bull-text">{activeCategory.name}</h1>
            </div>
          </div>
          <div className="text-right">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-bull-primary/10 text-bull-primary border border-bull-primary/30">
              <Shield className="w-3.5 h-3.5" />
              {isSuperadmin ? 'Superadmin' : 'Capitão'}
            </span>
          </div>
        </div>
      </div>

      {/* Feedback banner */}
      {feedbackMsg && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-lg ${
            feedbackMsg.type === 'success'
              ? 'bg-bull-surface border border-bull-success text-bull-success'
              : 'bg-bull-surface border border-bull-alert text-bull-alert'
          }`}
        >
          {feedbackMsg.type === 'success' ? (
            <CheckCircle className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{feedbackMsg.text}</span>
          <button onClick={() => setFeedbackMsg(null)} className="ml-auto font-bold px-1">
            ×
          </button>
        </div>
      )}

      {/* SECTION 1: PENDING REQUESTS */}
      <div className="bg-bull-surface border border-bull-border rounded-3xl p-5 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-black text-bull-text flex items-center gap-2">
              <span>Solicitações Pendentes</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-black bg-bull-primary text-bull-on-primary">
                {pendingRequests.length}
              </span>
            </h2>
          </div>
          <span className="text-xs text-bull-text-muted">Aguardando aprovação</span>
        </div>

        {pendingRequests.length === 0 ? (
          <div className="py-8 text-center text-bull-text-muted border border-dashed border-bull-border/60 rounded-2xl">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-bull-success opacity-80" />
            <p className="text-xs font-bold text-bull-text">Nenhuma solicitação pendente no momento.</p>
            <p className="text-[11px] text-bull-text-muted mt-0.5">
              Novos pedidos de acesso para {activeCategory.name} aparecerão aqui.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingRequests.map((req) => {
              const currentRoleChoice = selectedRole[req.uid] || 'membro';
              const isBusy = processingUid === req.uid;

              return (
                <div
                  key={req.uid}
                  className="p-4 rounded-2xl bg-bull-surface-elevated border border-bull-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-bull-primary/20 text-bull-primary border border-bull-primary/40 flex items-center justify-center font-black text-sm">
                      {req.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-bull-text">@{req.username}</p>
                      <div className="flex items-center gap-1.5 text-[11px] text-bull-text-muted mt-0.5">
                        <Clock className="w-3 h-3 text-bull-primary" />
                        <span>Solicitado em: {formatDate(req.requestedAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Role picker and action buttons */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {/* Role dropdown */}
                    <select
                      value={currentRoleChoice}
                      onChange={(e) =>
                        setSelectedRole((prev) => ({
                          ...prev,
                          [req.uid]: e.target.value as CategoryRole,
                        }))
                      }
                      disabled={isBusy}
                      className="px-2.5 py-1.5 text-xs font-semibold rounded-xl bg-bull-surface border border-bull-border text-bull-text focus:outline-none focus:border-bull-primary cursor-pointer"
                    >
                      <option value="membro">Membro (Edição)</option>
                      <option value="visualizador">Visualizador (Leitura)</option>
                    </select>

                    {/* Approve button */}
                    <button
                      onClick={() => handleApprove(req)}
                      disabled={isBusy}
                      className="px-3 py-1.5 rounded-xl bg-bull-primary hover:brightness-110 active:scale-95 text-bull-on-primary font-bold text-xs flex items-center gap-1.5 shadow transition disabled:opacity-50"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Aprovar</span>
                    </button>

                    {/* Reject button */}
                    <button
                      onClick={() => handleReject(req)}
                      disabled={isBusy}
                      className="px-3 py-1.5 rounded-xl bg-bull-surface hover:bg-bull-surface-elevated border border-bull-alert text-bull-alert font-bold text-xs flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50"
                    >
                      <UserX className="w-3.5 h-3.5 text-bull-alert" />
                      <span>Recusar</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 2: APPROVED MEMBERS & ROLE MANAGEMENT */}
      <div className="bg-bull-surface border border-bull-border rounded-3xl p-5 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-black text-bull-text">Membros Aprovados</h2>
            <p className="text-xs text-bull-text-muted">
              Você pode alterar papéis, promover a capitão ou remover membros.
            </p>
          </div>
          <span className="text-xs font-bold text-bull-primary">{approvedMembers.length} membros</span>
        </div>

        <div className="space-y-2.5">
          {approvedMembers.map((m) => {
            const isMe = m.uid === user?.uid;
            return (
              <div
                key={m.uid}
                className="p-3.5 rounded-2xl bg-bull-surface-elevated border border-bull-border flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-bull-surface border border-bull-primary/30 flex items-center justify-center font-bold text-bull-primary text-xs">
                    {m.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-bull-text">@{m.username}</span>
                      {isMe && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-bull-primary/20 text-bull-primary font-bold">
                          Você
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-bull-text-muted">
                      Aprovado em: {formatDate(m.approvedAt)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Role selector */}
                  <select
                    value={m.role}
                    onChange={(e) => updateMemberRole(activeCategory.id, m.uid, e.target.value as CategoryRole)}
                    disabled={isMe && !isSuperadmin}
                    className="px-2.5 py-1 text-xs font-semibold rounded-xl bg-bull-surface border border-bull-border text-bull-text focus:outline-none focus:border-bull-primary cursor-pointer disabled:opacity-70"
                  >
                    <option value="capitao">👑 Capitão</option>
                    <option value="membro">✏️ Membro</option>
                    <option value="visualizador">👁️ Visualizador</option>
                  </select>

                  {/* Remove button */}
                  {!isMe && (
                    <button
                      onClick={() => {
                        if (confirm(`Deseja remover @${m.username} desta categoria?`)) {
                          removeMember(activeCategory.id, m.uid);
                        }
                      }}
                      title="Remover da categoria"
                      className="p-1.5 rounded-lg text-bull-alert hover:bg-bull-surface transition"
                    >
                      <UserX className="w-4 h-4 text-bull-alert" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
