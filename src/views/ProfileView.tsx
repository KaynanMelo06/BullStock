import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCategory } from '../context/CategoryContext';
import { useTheme } from '../context/ThemeContext';
import { ConfirmModal } from '../components/ConfirmModal';
import {
  User,
  Shield,
  Layers,
  Moon,
  Sun,
  LogOut,
  Lock,
  CheckCircle,
  Clock,
  Sparkles,
  Info,
  Crown,
} from 'lucide-react';

interface ProfileViewProps {
  onGoCategories?: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ onGoCategories = () => {} }) => {
  const { user, userDoc, username, logout, isSuperadmin, claimSuperadmin } = useAuth();
  const { categories, activeCategory, setActiveCategory, activeMembership } = useCategory();
  const { theme, toggleTheme } = useTheme();

  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [claimStatus, setClaimStatus] = useState<string | null>(null);

  const handleClaimSuperadmin = async () => {
    try {
      await claimSuperadmin();
      setClaimStatus('Você foi registrado como Superadmin com sucesso!');
    } catch (err: any) {
      setClaimStatus(err.message || 'Erro ao registrar superadmin.');
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Profile Header */}
      <div className="bg-bull-surface border border-bull-border rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex items-center gap-4">
          {/* Bull Badge Avatar */}
          <div className="w-16 h-16 rounded-3xl bg-bull-surface-elevated border-2 border-bull-primary flex items-center justify-center p-2 shadow-lg shrink-0">
            <img src="/logo.svg" alt="BullStock" className="w-full h-full object-contain" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-bull-text truncate">@{username}</h1>
              {isSuperadmin && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-bull-primary text-bull-on-primary shadow-sm">
                  <Crown className="w-3 h-3" />
                  Superadmin
                </span>
              )}
            </div>

            <p className="text-xs text-bull-text-muted mt-0.5">
              Identificador: <span className="font-mono text-[11px] text-bull-primary">{user?.uid.substring(0, 16)}...</span>
            </p>
          </div>
        </div>

        {/* Zero PII Notice */}
        <div className="mt-5 p-3 rounded-2xl bg-bull-surface-elevated border border-bull-primary/30 flex items-start gap-2.5">
          <Shield className="w-5 h-5 text-bull-primary shrink-0 mt-0.5" />
          <div className="text-xs text-bull-text leading-relaxed">
            <p className="font-bold text-bull-primary">Privacidade Total e Segurança</p>
            <p className="text-[11px] text-bull-text-muted mt-0.5">
              Sua conta opera sem coleta de dados pessoais: não guardamos seu e-mail real, nome civil, telefone ou fotos pessoais.
            </p>
          </div>
        </div>
      </div>

      {/* Password Notice Mandate */}
      <div className="p-4 rounded-3xl bg-bull-surface border border-bull-border shadow-md flex items-start gap-3">
        <Lock className="w-5 h-5 text-bull-primary shrink-0 mt-0.5" />
        <div>
          <h3 className="text-xs font-bold text-bull-text uppercase tracking-wider">
            Aviso Importante sobre Senhas
          </h3>
          <p className="text-xs text-bull-text-muted mt-1 leading-relaxed">
            ⚠️ <strong>Não há recuperação de senha.</strong> Como nenhuma informação de contato pessoal é exigida, certifique-se de guardar sua senha com atenção.
          </p>
        </div>
      </div>

      {/* Categories Participation Card */}
      <div className="bg-bull-surface border border-bull-border rounded-3xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-bull-primary" />
            <h2 className="text-base font-black text-bull-text">Minhas Categorias</h2>
          </div>
          <button
            onClick={onGoCategories}
            className="text-xs font-bold text-bull-primary hover:underline"
          >
            Gerenciar
          </button>
        </div>

        <div className="space-y-2">
          {categories.map((cat) => {
            const isSelected = activeCategory?.id === cat.id;
            return (
              <div
                key={cat.id}
                onClick={() => {
                  setActiveCategory(cat);
                }}
                className={`p-3 rounded-2xl border transition flex items-center justify-between gap-3 cursor-pointer ${
                  isSelected
                    ? 'bg-bull-surface-elevated border-bull-primary shadow'
                    : 'bg-bull-surface border-bull-border hover:border-bull-primary/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: cat.color || '#EDB23A' }}
                  />
                  <div>
                    <p className="font-bold text-xs text-bull-text">{cat.name}</p>
                    <p className="text-[10px] text-bull-text-muted">
                      {isSelected ? 'Categoria Ativa' : 'Clique para alternar'}
                    </p>
                  </div>
                </div>

                {isSelected && (
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-bull-primary text-bull-on-primary">
                    Ativa
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* App Preferences & Superadmin Tool */}
      <div className="bg-bull-surface border border-bull-border rounded-3xl p-5 shadow-xl space-y-4">
        <h2 className="text-base font-black text-bull-text">Configurações & Tema</h2>

        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-bull-surface-elevated border border-bull-border">
          <div>
            <p className="font-bold text-xs text-bull-text">Tema Visual</p>
            <p className="text-[11px] text-bull-text-muted">
              {theme === 'dark' ? 'Tema Escuro (Vinho & Dourado BullStock)' : 'Tema Claro'}
            </p>
          </div>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl bg-bull-surface border border-bull-border text-bull-primary hover:brightness-125 transition flex items-center gap-1.5"
          >
            {theme === 'dark' ? <Moon className="w-4 h-4 text-bull-primary" /> : <Sun className="w-4 h-4 text-bull-primary" />}
            <span className="text-xs font-bold text-bull-text capitalize">{theme}</span>
          </button>
        </div>

        {/* Superadmin Setup Button */}
        {!isSuperadmin && (
          <div className="p-3.5 rounded-2xl bg-bull-surface-elevated border border-bull-border flex items-center justify-between gap-3">
            <div>
              <p className="font-bold text-xs text-bull-text">Permissões de Administrador Geral</p>
              <p className="text-[11px] text-bull-text-muted">
                Caso este seja o primeiro acesso e ainda não haja superadmin configurado no Firestore.
              </p>
            </div>
            <button
              onClick={handleClaimSuperadmin}
              className="py-1.5 px-3 rounded-xl bg-bull-primary text-bull-on-primary text-xs font-bold hover:brightness-110 active:scale-95 transition shrink-0"
            >
              Registrar Superadmin
            </button>
          </div>
        )}
        {claimStatus && (
          <p className="text-xs text-bull-primary font-bold">{claimStatus}</p>
        )}
      </div>

      {/* Logout Action */}
      <div className="pt-2">
        <button
          onClick={() => setIsLogoutModalOpen(true)}
          className="w-full py-3 px-4 rounded-2xl bg-bull-surface hover:bg-bull-surface-elevated border border-bull-alert text-bull-alert font-bold text-xs flex items-center justify-center gap-2 transition active:scale-95 shadow-md"
        >
          <LogOut className="w-4 h-4 text-bull-alert" />
          <span>Sair da Minha Conta</span>
        </button>
      </div>

      {/* LOGOUT CONFIRM MODAL */}
      <ConfirmModal
        isOpen={isLogoutModalOpen}
        title="Encerrar Sessão"
        message="Tem certeza que deseja sair do BullStock? Você precisará digitar seu nome de usuário e senha para entrar novamente."
        confirmText="Sim, Sair"
        cancelText="Permanecer Conectado"
        isDanger={true}
        onConfirm={async () => {
          setIsLogoutModalOpen(false);
          await logout();
        }}
        onCancel={() => setIsLogoutModalOpen(false)}
      />
    </div>
  );
};
