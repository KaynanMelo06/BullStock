import React, { useState } from 'react';
import { useCategory } from '../context/CategoryContext';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { PWAInstallButton } from './PWAInstallButton';
import {
  Sun,
  Moon,
  ChevronDown,
  Check,
  Shield,
  Edit3,
  Eye,
  Layers,
  UserCheck,
} from 'lucide-react';

interface NavbarProps {
  onOpenCategories: () => void;
  onOpenRequests?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenCategories,
  onOpenRequests,
}) => {
  const { categories, activeCategory, setActiveCategory, activeRole, isCaptain, pendingRequests, activeMembership } = useCategory();
  const { theme, toggleTheme } = useTheme();
  const { username, isSuperadmin } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const getRoleBadge = (role: string) => {
    if (isSuperadmin) {
      return (
        <span className="inline-flex items-center gap-1 rounded-lg bg-bull-primary/20 px-2 py-0.5 text-[10px] font-black text-bull-primary border border-bull-primary/40">
          <Shield className="w-2.5 h-2.5" /> Superadmin
        </span>
      );
    }
    switch (role) {
      case 'capitao':
        return (
          <span className="inline-flex items-center gap-1 rounded-lg bg-bull-primary/20 px-2 py-0.5 text-[10px] font-black text-bull-primary border border-bull-primary/40">
            <Shield className="w-2.5 h-2.5" /> Capitão
          </span>
        );
      case 'membro':
        return (
          <span className="inline-flex items-center gap-1 rounded-lg bg-bull-surface px-2 py-0.5 text-[10px] font-bold text-bull-text border border-bull-border">
            <Edit3 className="w-2.5 h-2.5 text-bull-primary" /> Membro
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-lg bg-bull-surface px-2 py-0.5 text-[10px] font-bold text-bull-text-muted border border-bull-border">
            <Eye className="w-2.5 h-2.5" /> Visualizador
          </span>
        );
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-bull-border bg-bull-surface/95 backdrop-blur-md shadow-md">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
        {/* Brand & Category Switcher */}
        <div className="flex items-center gap-3">
          {/* Bull Logo and Name */}
          <button
            onClick={onOpenCategories}
            className="flex items-center gap-2 group text-left transition"
          >
            <div className="w-8 h-8 rounded-xl bg-bull-surface-elevated border border-bull-primary/50 flex items-center justify-center p-1 shadow">
              <img src="/logo.svg" alt="BullStock" className="w-full h-full object-contain" />
            </div>
            <span className="font-black text-base tracking-tight text-bull-text hidden sm:inline">
              <span className="text-bull-primary">Bull</span>Stock
            </span>
          </button>

          <div className="h-4 w-px bg-bull-border hidden sm:block" />

          {/* Category Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              aria-expanded={isDropdownOpen}
              aria-label="Selecionar categoria"
              className="flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-bold bg-bull-surface-elevated hover:brightness-110 border border-bull-border text-bull-text transition max-w-[200px] sm:max-w-[280px]"
            >
              {activeCategory ? (
                <>
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                    style={{ backgroundColor: activeCategory.color || '#EDB23A' }}
                  />
                  <span className="truncate">{activeCategory.name}</span>
                  <span className="shrink-0">{getRoleBadge(activeRole)}</span>
                </>
              ) : (
                <span className="text-bull-text-muted">Selecionar Categoria</span>
              )}
              <ChevronDown className="w-3.5 h-3.5 text-bull-primary shrink-0 ml-0.5" />
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsDropdownOpen(false)}
                />
                <div className="absolute left-0 mt-1.5 w-72 rounded-2xl bg-bull-surface border border-bull-border shadow-2xl z-50 py-1.5 divide-y divide-bull-border/40 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-2 flex items-center justify-between">
                    <p className="text-[10px] font-black uppercase tracking-wider text-bull-text-muted">
                      Categorias ({categories.length})
                    </p>
                    <button
                      onClick={() => {
                        setIsDropdownOpen(false);
                        onOpenCategories();
                      }}
                      className="text-[10px] font-bold text-bull-primary hover:underline"
                    >
                      Ver todas
                    </button>
                  </div>

                  <div className="max-h-60 overflow-y-auto py-1">
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setActiveCategory(cat);
                          setIsDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 flex items-center justify-between text-xs font-semibold hover:bg-bull-surface-elevated transition ${
                          activeCategory?.id === cat.id
                            ? 'bg-bull-surface-elevated text-bull-primary font-black'
                            : 'text-bull-text'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate pr-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: cat.color || '#EDB23A' }}
                          />
                          <span className="truncate">{cat.name}</span>
                        </div>
                        {activeCategory?.id === cat.id && (
                          <Check className="w-4 h-4 text-bull-primary shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Requests Link in dropdown if Captain */}
                  {(isCaptain || isSuperadmin) && onOpenRequests && (
                    <div className="p-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsDropdownOpen(false);
                          onOpenRequests();
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-bull-primary hover:bg-bull-surface-elevated rounded-xl transition"
                      >
                        <div className="flex items-center gap-2">
                          <UserCheck className="w-4 h-4 text-bull-primary" />
                          <span>Solicitações de Entrada</span>
                        </div>
                        {pendingRequests.length > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-bull-alert text-white">
                            {pendingRequests.length}
                          </span>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right action controls */}
        <div className="flex items-center gap-2">
          {/* Quick Pending Requests button for captain */}
          {(isCaptain || isSuperadmin) && pendingRequests.length > 0 && onOpenRequests && (
            <button
              onClick={onOpenRequests}
              title={`${pendingRequests.length} solicitações aguardando aprovação`}
              className="relative p-2 rounded-xl bg-bull-surface-elevated border border-bull-alert text-bull-alert hover:brightness-110 transition flex items-center gap-1.5"
            >
              <UserCheck className="w-4 h-4" />
              <span className="text-[11px] font-black">{pendingRequests.length}</span>
            </button>
          )}

          {/* PWA Install Button */}
          <PWAInstallButton />

          {/* Theme Switcher */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
            className="p-2 rounded-xl text-bull-text-muted hover:text-bull-text hover:bg-bull-surface-elevated transition"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-bull-primary" /> : <Moon className="w-4 h-4 text-bull-text" />}
          </button>
        </div>
      </div>
    </header>
  );
};
