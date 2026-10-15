import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CategoryProvider, useCategory } from './context/CategoryContext';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { OfflineIndicator } from './components/OfflineIndicator';
import { AuthScreens } from './components/AuthScreens';
import { CategoriesView } from './views/CategoriesView';
import { InventoryView } from './views/InventoryView';
import { ShoppingView } from './views/ShoppingView';
import { RequestsView } from './views/RequestsView';
import { ProfileView } from './views/ProfileView';
import { ActiveTab, Category } from './types';

const MainApp: React.FC = () => {
  const { user, loading } = useAuth();
  const { activeCategory, setActiveCategory, categories } = useCategory();

  const [activeTab, setActiveTab] = useState<ActiveTab>('inventory');

  // If user has no active category yet, default to categories tab
  useEffect(() => {
    if (!activeCategory && !loading && user && categories.length > 0) {
      setActiveTab('categories');
    }
  }, [activeCategory, loading, user, categories.length]);

  const handleSelectCategoryAndGoInventory = (category: Category) => {
    setActiveCategory(category);
    setActiveTab('inventory');
  };

  // Loading Screen
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-bull-bg text-bull-text">
        <div className="w-16 h-16 rounded-3xl bg-bull-surface border-2 border-bull-primary flex items-center justify-center p-3 shadow-2xl animate-pulse">
          <img src="/logo.svg" alt="BullStock" className="w-full h-full object-contain" />
        </div>
        <p className="mt-4 text-xs font-black uppercase tracking-widest text-bull-primary">
          Carregando BullStock...
        </p>
      </div>
    );
  }

  // Unauthenticated Screen (Login / Register without personal data)
  if (!user) {
    return <AuthScreens />;
  }

  return (
    <div className="min-h-screen bg-bull-bg text-bull-text flex flex-col transition-colors duration-200">
      {/* Top Navbar */}
      <Navbar
        onOpenCategories={() => setActiveTab('categories')}
        onOpenRequests={() => setActiveTab('requests')}
      />

      {/* Offline Status Badge */}
      <OfflineIndicator />

      {/* Main Content Area */}
      <main className="flex-1 pb-20">
        {activeTab === 'categories' && (
          <CategoriesView
            onSelectCategoryAndGoInventory={handleSelectCategoryAndGoInventory}
          />
        )}

        {activeTab === 'inventory' && (
          <InventoryView
            onGoCategories={() => setActiveTab('categories')}
          />
        )}

        {activeTab === 'shopping' && (
          <ShoppingView
            onGoCategories={() => setActiveTab('categories')}
          />
        )}

        {activeTab === 'requests' && (
          <RequestsView
            onGoCategories={() => setActiveTab('categories')}
          />
        )}

        {activeTab === 'profile' && (
          <ProfileView
            onGoCategories={() => setActiveTab('categories')}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CategoryProvider>
          <MainApp />
        </CategoryProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
