import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../services/firebase';
import { useAuth } from './AuthContext';
import { Category, CategoryMember, CategoryRole, MemberStatus } from '../types';

interface CategoryContextType {
  categories: Category[];
  activeCategory: Category | null;
  activeMembership: CategoryMember | null;
  activeRole: CategoryRole;
  membershipStatus: MemberStatus | 'none';
  isCaptain: boolean;
  canEdit: boolean;
  isViewer: boolean;
  members: CategoryMember[];
  pendingRequests: CategoryMember[];
  loadingCategories: boolean;
  setActiveCategory: (cat: Category | null) => void;
  requestAccessToCategory: (categoryId: string) => Promise<void>;
  approveRequest: (categoryId: string, memberUid: string, role: CategoryRole) => Promise<void>;
  rejectRequest: (categoryId: string, memberUid: string) => Promise<void>;
  updateMemberRole: (categoryId: string, memberUid: string, newRole: CategoryRole) => Promise<void>;
  removeMember: (categoryId: string, memberUid: string) => Promise<void>;
  createCategory: (name: string, description: string, color: string) => Promise<string>;
  deleteCategory: (categoryId: string) => Promise<void>;
  seedInitialCategoriesIfEmpty: () => Promise<void>;
}

const CategoryContext = createContext<CategoryContextType | undefined>(undefined);

// Initial Default Categories for robotics teams
export const DEFAULT_INITIAL_CATEGORIES: Category[] = [
  {
    id: 'futebol-de-robos',
    name: 'Futebol de Robôs (VSSS)',
    description: 'Robôs autônomos muito rápidos com visão computacional aérea.',
    color: '#EDB23A',
  },
  {
    id: 'mini-sumo',
    name: 'Mini Sumô 500g',
    description: 'Robôs autônomos de 500g para ringue Dohyo.',
    color: '#FF6B6B',
  },
  {
    id: 'sumo-3kg',
    name: 'Sumô 3Kg RC & Auto',
    description: 'Categoria peso-pesado de robôs de combate e tração.',
    color: '#E67E22',
  },
  {
    id: 'simulacao-2d',
    name: 'Simulação 2D',
    description: 'Inteligência Artificial e simulação de agentes de futebol virtual.',
    color: '#7BC67E',
  },
];

export const CategoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, username, isSuperadmin, isDemoUser } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategoryState] = useState<Category | null>(null);
  const [activeMembership, setActiveMembership] = useState<CategoryMember | null>(null);
  const [members, setMembers] = useState<CategoryMember[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  // Set active category and sync to localStorage
  const setActiveCategory = (cat: Category | null) => {
    setActiveCategoryState(cat);
    if (cat) {
      localStorage.setItem('bullstock_active_category_id', cat.id);
    } else {
      localStorage.removeItem('bullstock_active_category_id');
    }
  };

  // Seed initial categories if Firestore collection is completely empty
  const seedInitialCategoriesIfEmpty = async () => {
    try {
      const snap = await getDocs(collection(db, 'categories'));
      if (snap.empty) {
        console.log('BullStock: Inicializando categorias padrão...');
        const batch = writeBatch(db);
        for (const cat of DEFAULT_INITIAL_CATEGORIES) {
          const catRef = doc(db, 'categories', cat.id);
          batch.set(catRef, {
            name: cat.name,
            description: cat.description,
            color: cat.color,
            createdAt: serverTimestamp(),
            createdBy: user?.uid || 'sistema',
          });
          // Also create initial "Geral" inventory
          const invRef = doc(collection(db, 'categories', cat.id, 'inventories'));
          batch.set(invRef, {
            name: 'Inventário Geral',
            description: 'Componentes e peças da categoria',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
        await batch.commit();
      }
    } catch (e) {
      console.warn('BullStock: Verificação de seed:', e);
    }
  };

  // 1. Listen to all categories in Firestore (readable by any authenticated user)
  useEffect(() => {
    if (!user) {
      setCategories([]);
      setActiveCategoryState(null);
      setActiveMembership(null);
      setMembers([]);
      setLoadingCategories(false);
      return;
    }

    if (isDemoUser) {
      setCategories(DEFAULT_INITIAL_CATEGORIES);
      const savedId = localStorage.getItem('bullstock_active_category_id');
      const found = DEFAULT_INITIAL_CATEGORIES.find((c) => c.id === savedId) || DEFAULT_INITIAL_CATEGORIES[0];
      setActiveCategoryState(found);
      setActiveMembership({
        uid: user.uid,
        username: username || 'capitao_robo',
        role: 'capitao',
        status: 'aprovado',
      });
      setMembers([
        {
          uid: user.uid,
          username: username || 'capitao_robo',
          role: 'capitao',
          status: 'aprovado',
        },
        {
          uid: 'demo-membro-1',
          username: 'lucas_eletronica',
          role: 'membro',
          status: 'aprovado',
        },
        {
          uid: 'demo-membro-2',
          username: 'beatriz_mecanica',
          role: 'visualizador',
          status: 'aprovado',
        },
        {
          uid: 'demo-pendente-1',
          username: 'rodrigo_calouro',
          role: 'membro',
          status: 'pendente',
          requestedAt: new Date(Date.now() - 3600000).toISOString(),
        },
      ]);
      setLoadingCategories(false);
      return;
    }

    setLoadingCategories(true);
    const catCol = collection(db, 'categories');

    const unsubscribe = onSnapshot(
      catCol,
      (snapshot) => {
        const loaded: Category[] = [];
        snapshot.forEach((snap) => {
          loaded.push({ id: snap.id, ...(snap.data() as Omit<Category, 'id'>) });
        });

        if (loaded.length === 0) {
          // If empty in database, trigger initial seeding
          seedInitialCategoriesIfEmpty();
        }

        setCategories(loaded);

        // Keep or restore active category
        const savedId = localStorage.getItem('bullstock_active_category_id');
        let current = loaded.find((c) => c.id === savedId) || null;
        if (!current && loaded.length > 0) {
          current = loaded[0];
        }
        setActiveCategoryState(current);
        setLoadingCategories(false);
      },
      (error) => {
        console.error('Erro ao listar categorias:', error);
        setLoadingCategories(false);
      }
    );

    return () => unsubscribe();
  }, [user, isDemoUser]);

  // 2. Listen to active category membership of the current user
  useEffect(() => {
    if (!user || !activeCategory) {
      setActiveMembership(null);
      return;
    }

    if (isDemoUser) return;

    const myMemberRef = doc(db, 'categories', activeCategory.id, 'members', user.uid);
    const unsubMyMember = onSnapshot(
      myMemberRef,
      (snap) => {
        if (snap.exists()) {
          setActiveMembership(snap.data() as CategoryMember);
        } else {
          setActiveMembership(null);
        }
      },
      (err) => {
        // User may not have member doc yet (status none)
        setActiveMembership(null);
      }
    );

    return () => unsubMyMember();
  }, [user?.uid, activeCategory?.id, isDemoUser]);

  // 3. Listen to members of active category (if user is approved member or superadmin)
  useEffect(() => {
    if (!user || !activeCategory) {
      setMembers([]);
      return;
    }

    if (isDemoUser) return;

    // Only fetch members list if approved or superadmin
    const isApprovedOrSuper = isSuperadmin || activeMembership?.status === 'aprovado';
    if (!isApprovedOrSuper) {
      setMembers([]);
      return;
    }

    const membersCol = collection(db, 'categories', activeCategory.id, 'members');
    const unsubMembers = onSnapshot(
      membersCol,
      (snapshot) => {
        const mList: CategoryMember[] = [];
        snapshot.forEach((snap) => {
          mList.push({ ...(snap.data() as CategoryMember), uid: snap.id });
        });
        setMembers(mList);
      },
      (err) => {
        console.warn('Erro ao carregar membros da categoria:', err);
      }
    );

    return () => unsubMembers();
  }, [user?.uid, activeCategory?.id, activeMembership?.status, isSuperadmin, isDemoUser]);

  // Derived permissions
  const membershipStatus: MemberStatus | 'none' = useMemo(() => {
    if (isSuperadmin) return 'aprovado';
    if (!activeMembership) return 'none';
    return activeMembership.status;
  }, [isSuperadmin, activeMembership]);

  const isCaptain = useMemo(() => {
    if (isSuperadmin) return true;
    return activeMembership?.status === 'aprovado' && activeMembership?.role === 'capitao';
  }, [isSuperadmin, activeMembership]);

  const canEdit = useMemo(() => {
    if (isSuperadmin) return true;
    return (
      activeMembership?.status === 'aprovado' &&
      (activeMembership?.role === 'capitao' || activeMembership?.role === 'membro')
    );
  }, [isSuperadmin, activeMembership]);

  const isViewer = useMemo(() => {
    if (isSuperadmin) return false;
    return activeMembership?.status === 'aprovado' && activeMembership?.role === 'visualizador';
  }, [isSuperadmin, activeMembership]);

  const activeRole: CategoryRole = useMemo(() => {
    if (isSuperadmin) return 'capitao';
    return activeMembership?.role || 'visualizador';
  }, [isSuperadmin, activeMembership]);

  const pendingRequests = useMemo(() => {
    return members.filter((m) => m.status === 'pendente');
  }, [members]);

  // User requests access to a category
  const requestAccessToCategory = async (categoryId: string) => {
    if (!user) throw new Error('Usuário não autenticado.');
    const memberRef = doc(db, 'categories', categoryId, 'members', user.uid);

    if (isDemoUser) {
      const pending: CategoryMember = {
        uid: user.uid,
        username: username || 'usuario',
        role: 'membro',
        status: 'pendente',
        requestedAt: new Date().toISOString(),
      };
      setActiveMembership(pending);
      return;
    }

    try {
      await setDoc(memberRef, {
        uid: user.uid,
        username: username || 'usuario',
        role: 'membro',
        status: 'pendente',
        requestedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `categories/${categoryId}/members/${user.uid}`);
    }
  };

  // Captain approves request
  const approveRequest = async (categoryId: string, memberUid: string, role: CategoryRole) => {
    if (isDemoUser) {
      setMembers((prev) =>
        prev.map((m) =>
          m.uid === memberUid
            ? { ...m, status: 'aprovado', role, approvedAt: new Date().toISOString() }
            : m
        )
      );
      return;
    }

    try {
      const memberRef = doc(db, 'categories', categoryId, 'members', memberUid);
      await updateDoc(memberRef, {
        status: 'aprovado',
        role,
        approvedAt: serverTimestamp(),
        approvedBy: user?.uid,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `categories/${categoryId}/members/${memberUid}`);
    }
  };

  // Captain rejects request
  const rejectRequest = async (categoryId: string, memberUid: string) => {
    if (isDemoUser) {
      setMembers((prev) => prev.filter((m) => m.uid !== memberUid));
      return;
    }

    try {
      const memberRef = doc(db, 'categories', categoryId, 'members', memberUid);
      await deleteDoc(memberRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `categories/${categoryId}/members/${memberUid}`);
    }
  };

  // Captain updates existing member role
  const updateMemberRole = async (categoryId: string, memberUid: string, newRole: CategoryRole) => {
    if (isDemoUser) {
      setMembers((prev) =>
        prev.map((m) => (m.uid === memberUid ? { ...m, role: newRole } : m))
      );
      return;
    }

    try {
      const memberRef = doc(db, 'categories', categoryId, 'members', memberUid);
      await updateDoc(memberRef, { role: newRole });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `categories/${categoryId}/members/${memberUid}`);
    }
  };

  // Remove member from category
  const removeMember = async (categoryId: string, memberUid: string) => {
    if (isDemoUser) {
      setMembers((prev) => prev.filter((m) => m.uid !== memberUid));
      return;
    }

    try {
      const memberRef = doc(db, 'categories', categoryId, 'members', memberUid);
      await deleteDoc(memberRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `categories/${categoryId}/members/${memberUid}`);
    }
  };

  // Superadmin creates category
  const createCategory = async (name: string, description: string, color: string): Promise<string> => {
    const slug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') + '-' + Math.random().toString(36).substring(2, 6);

    if (isDemoUser) {
      const newCat: Category = {
        id: slug,
        name,
        description,
        color: color || '#EDB23A',
        createdAt: new Date().toISOString(),
      };
      setCategories((prev) => [...prev, newCat]);
      setActiveCategory(newCat);
      return slug;
    }

    const batch = writeBatch(db);
    const catRef = doc(db, 'categories', slug);
    batch.set(catRef, {
      name,
      description,
      color: color || '#EDB23A',
      createdAt: serverTimestamp(),
      createdBy: user?.uid,
    });

    // Initial starter inventory
    const invRef = doc(collection(db, 'categories', slug, 'inventories'));
    batch.set(invRef, {
      name: 'Inventário Geral',
      description: 'Inventário inicial da categoria',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    try {
      await batch.commit();
      const created: Category = {
        id: slug,
        name,
        description,
        color: color || '#EDB23A',
      };
      setActiveCategory(created);
      return slug;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `categories/${slug}`);
    }
  };

  // Superadmin deletes category
  const deleteCategory = async (categoryId: string) => {
    if (isDemoUser) {
      setCategories((prev) => prev.filter((c) => c.id !== categoryId));
      if (activeCategory?.id === categoryId) {
        const remaining = categories.filter((c) => c.id !== categoryId);
        setActiveCategory(remaining.length > 0 ? remaining[0] : null);
      }
      return;
    }

    try {
      await deleteDoc(doc(db, 'categories', categoryId));
      if (activeCategory?.id === categoryId) {
        const remaining = categories.filter((c) => c.id !== categoryId);
        setActiveCategory(remaining.length > 0 ? remaining[0] : null);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `categories/${categoryId}`);
    }
  };

  return (
    <CategoryContext.Provider
      value={{
        categories,
        activeCategory,
        activeMembership,
        activeRole,
        membershipStatus,
        isCaptain,
        canEdit,
        isViewer,
        members,
        pendingRequests,
        loadingCategories,
        setActiveCategory,
        requestAccessToCategory,
        approveRequest,
        rejectRequest,
        updateMemberRole,
        removeMember,
        createCategory,
        deleteCategory,
        seedInitialCategoriesIfEmpty,
      }}
    >
      {children}
    </CategoryContext.Provider>
  );
};

export function useCategory() {
  const ctx = useContext(CategoryContext);
  if (!ctx) throw new Error('useCategory must be used within CategoryProvider');
  return ctx;
}
