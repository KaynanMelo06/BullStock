import React from 'react';
import { ActiveTab } from '../types';
import { Layers, ShoppingBag, User, UserCheck, Grid } from 'lucide-react';
import { useCategory } from '../context/CategoryContext';
import { useAuth } from '../context/AuthContext';

interface BottomNavProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  inventoryAlertCount?: number;
  pendingShoppingCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  inventoryAlertCount = 0,
  pendingShoppingCount = 0,
}) => {
  const { isCaptain, pendingRequests } = useCategory();
  const { isSuperadmin } = useAuth();

  const showRequestsTab = isCaptain || isSuperadmin;

  const tabs: Array<{
    id: ActiveTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
    badgeColor?: string;
  }> = [
    {
      id: 'categories',
      label: 'Categorias',
      icon: Grid,
    },
    {
      id: 'inventory',
      label: 'Inventário',
      icon: Layers,
      badge: inventoryAlertCount > 0 ? inventoryAlertCount : undefined,
      badgeColor: 'bg-bull-alert text-white',
    },
    {
      id: 'shopping',
      label: 'Compras',
      icon: ShoppingBag,
      badge: pendingShoppingCount > 0 ? pendingShoppingCount : undefined,
      badgeColor: 'bg-bull-primary text-bull-on-primary',
    },
    ...(showRequestsTab
      ? [
          {
            id: 'requests' as ActiveTab,
            label: 'Solicitações',
            icon: UserCheck,
            badge: pendingRequests.length > 0 ? pendingRequests.length : undefined,
            badgeColor: 'bg-bull-alert text-white',
          },
        ]
      : []),
    {
      id: 'profile',
      label: 'Perfil',
      icon: User,
    },
  ];

  return (
    <nav
      aria-label="Navegação Principal"
      className="fixed bottom-0 left-0 right-0 z-40 bg-bull-surface/95 backdrop-blur-md border-t border-bull-border pb-[env(safe-area-inset-bottom)] shadow-2xl"
    >
      <div
        className={`max-w-md mx-auto grid h-16 px-1`}
        style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              aria-label={`Ir para ${tab.label}`}
              className={`relative flex flex-col items-center justify-center gap-1 transition-all duration-200 select-none ${
                isActive
                  ? 'text-bull-primary font-bold'
                  : 'text-bull-text-muted hover:text-bull-text font-medium'
              }`}
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-transform duration-200 ${
                    isActive ? 'scale-110 stroke-[2.4]' : 'scale-100 stroke-[1.8]'
                  }`}
                />
                {tab.badge !== undefined && (
                  <span
                    className={`absolute -top-1.5 -right-2.5 min-w-[17px] h-[17px] px-1 rounded-full flex items-center justify-center text-[10px] font-black leading-none shadow-sm ${tab.badgeColor}`}
                  >
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] tracking-tight">{tab.label}</span>
              {isActive && (
                <span className="absolute bottom-1 w-6 h-0.5 rounded-full bg-bull-primary animate-in fade-in zoom-in-75 duration-150" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
