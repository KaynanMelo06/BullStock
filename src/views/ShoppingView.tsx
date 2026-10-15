import React, { useState, useEffect } from 'react';
import {
  collection,
  doc,
  query,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  serverTimestamp,
  getDocs,
  runTransaction,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../services/firebase';
import { useCategory } from '../context/CategoryContext';
import { useAuth } from '../context/AuthContext';
import { ShoppingList, ShoppingItem, InventoryItem, Inventory } from '../types';
import { ConfirmModal } from '../components/ConfirmModal';
import { ApprovalGate } from '../components/ApprovalGate';
import {
  calcListTotals,
  formatCurrencyBRL,
  exportShoppingListToCsv,
  calcSuggestedRestock,
  isBelowMin,
} from '../utils/inventoryCalc';
import {
  ShoppingBag,
  Plus,
  CheckCircle2,
  Circle,
  ExternalLink,
  Download,
  Trash2,
  CheckCheck,
  Sparkles,
  Layers,
  X,
  AlertCircle,
  Check,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

interface ShoppingViewProps {
  onGoCategories?: () => void;
}

export const ShoppingView: React.FC<ShoppingViewProps> = ({ onGoCategories = () => {} }) => {
  const { activeCategory, membershipStatus, canEdit } = useCategory();
  const { user, username, isDemoUser } = useAuth();

  // Shopping lists in the active category
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [activeList, setActiveList] = useState<ShoppingList | null>(null);
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Available inventories for restocking & finishing purchases
  const [availableInventories, setAvailableInventories] = useState<Inventory[]>([]);

  // Modals state
  const [isCreateListOpen, setIsCreateListOpen] = useState(false);
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<ShoppingItem | null>(null);
  const [listToDelete, setListToDelete] = useState<ShoppingList | null>(null);

  // Forms
  const [newListName, setNewListName] = useState('');
  const [itemName, setItemName] = useState('');
  const [itemQuantity, setItemQuantity] = useState(1);
  const [itemUnit, setItemUnit] = useState('un');
  const [itemPrice, setItemPrice] = useState<number | ''>('');
  const [itemLink, setItemLink] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Restock candidates state
  const [restockCandidates, setRestockCandidates] = useState<
    Array<{
      inventoryId: string;
      inventoryName: string;
      itemId: string;
      name: string;
      currentQuantity: number;
      minQuantity: number;
      suggestedQuantity: number;
      unit: string;
      selected: boolean;
    }>
  >([]);

  // Finish purchase transfer state (item-by-item selection)
  const [transferItems, setTransferItems] = useState<
    Array<{
      shoppingItemId: string;
      name: string;
      quantity: number;
      unit: string;
      inventoryId: string;
      inventoryItemId?: string;
      willAdd: boolean;
    }>
  >([]);

  // 1. Listen to shopping lists in active category
  useEffect(() => {
    if (!activeCategory || membershipStatus !== 'aprovado') {
      setLists([]);
      setActiveList(null);
      setItems([]);
      setLoading(false);
      return;
    }

    if (isDemoUser) {
      const demoLists: ShoppingList[] = [
        {
          id: 'list-compra-nacional',
          name: 'Compra de Componentes - Outubro',
          status: 'open',
          createdAt: new Date().toISOString(),
          createdByName: username || 'capitao_robo',
        },
        {
          id: 'list-pecas-torneadas',
          name: 'Usinagem de Rodas e Carcaça',
          status: 'finished',
          createdAt: new Date().toISOString(),
          createdByName: username || 'capitao_robo',
        },
      ];
      setLists(demoLists);
      setActiveList(demoLists[0]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const listsCol = collection(db, 'categories', activeCategory.id, 'shoppingLists');

    const unsubscribe = onSnapshot(
      listsCol,
      (snapshot) => {
        const loaded: ShoppingList[] = [];
        snapshot.forEach((snap) => {
          loaded.push({ id: snap.id, ...(snap.data() as Omit<ShoppingList, 'id'>) });
        });

        // If no list exists and canEdit, create initial one
        if (loaded.length === 0 && canEdit) {
          const defaultListRef = doc(collection(db, 'categories', activeCategory.id, 'shoppingLists'));
          setDoc(defaultListRef, {
            name: 'Lista de Compras Geral',
            status: 'open',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            createdBy: user?.uid,
            createdByName: username,
          }).catch(() => {});
        }

        setLists(loaded);
        if (!activeList && loaded.length > 0) {
          setActiveList(loaded[0]);
        } else if (activeList && !loaded.some((l) => l.id === activeList.id)) {
          setActiveList(loaded[0] || null);
        }
        setLoading(false);
      },
      (err) => {
        console.warn('Erro ao carregar listas de compras:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [activeCategory?.id, membershipStatus, isDemoUser]);

  // 2. Listen to items in active shopping list
  useEffect(() => {
    if (!activeCategory || !activeList || membershipStatus !== 'aprovado') {
      setItems([]);
      return;
    }

    if (isDemoUser) {
      const demoItems: ShoppingItem[] = [
        {
          id: 'shop-item-1',
          name: 'Bateria LiPo 3S 1500mAh 100C',
          quantity: 3,
          unit: 'un',
          estimatedPrice: 185.0,
          link: 'https://exemplo.com.br/bateria',
          purchased: false,
        },
        {
          id: 'shop-item-2',
          name: 'Módulo ESP32-WROOM-32D',
          quantity: 3,
          unit: 'un',
          estimatedPrice: 32.5,
          purchased: true,
          purchasedByUsername: username || 'capitao_robo',
        },
        {
          id: 'shop-item-3',
          name: 'Parafusos M3x10mm Inox (100un)',
          quantity: 1,
          unit: 'pacote',
          estimatedPrice: 22.0,
          purchased: false,
        },
      ];
      setItems(demoItems);
      return;
    }

    const itemsCol = collection(
      db,
      'categories',
      activeCategory.id,
      'shoppingLists',
      activeList.id,
      'items'
    );

    const unsubscribe = onSnapshot(
      itemsCol,
      (snapshot) => {
        const loaded: ShoppingItem[] = [];
        snapshot.forEach((snap) => {
          loaded.push({ id: snap.id, ...(snap.data() as Omit<ShoppingItem, 'id'>) });
        });
        setItems(loaded);
      },
      (err) => {
        handleFirestoreError(
          err,
          OperationType.LIST,
          `categories/${activeCategory.id}/shoppingLists/${activeList.id}/items`
        );
      }
    );

    return () => unsubscribe();
  }, [activeCategory?.id, activeList?.id, membershipStatus, isDemoUser]);

  // Load inventories to allow restocking & purchase finish
  useEffect(() => {
    if (!activeCategory || membershipStatus !== 'aprovado') return;

    if (isDemoUser) {
      setAvailableInventories([
        { id: 'inv-eletronica', name: 'Eletrônica' },
        { id: 'inv-mecanica', name: 'Mecânica' },
      ]);
      return;
    }

    const invCol = collection(db, 'categories', activeCategory.id, 'inventories');
    getDocs(invCol)
      .then((snap) => {
        const invs: Inventory[] = [];
        snap.forEach((d) => invs.push({ id: d.id, ...(d.data() as Omit<Inventory, 'id'>) }));
        setAvailableInventories(invs);
      })
      .catch(() => {});
  }, [activeCategory?.id, membershipStatus, isDemoUser]);

  // If user is pending or rejected, show approval gate!
  if (membershipStatus !== 'aprovado') {
    return <ApprovalGate onGoCategories={onGoCategories} />;
  }

  // Toggle purchased status in real-time
  const handleTogglePurchased = async (item: ShoppingItem) => {
    if (!activeCategory || !activeList || !canEdit) return;

    const newPurchased = !item.purchased;

    if (isDemoUser) {
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id
            ? {
                ...i,
                purchased: newPurchased,
                purchasedByUsername: newPurchased ? username : undefined,
              }
            : i
        )
      );
      return;
    }

    const itemRef = doc(
      db,
      'categories',
      activeCategory.id,
      'shoppingLists',
      activeList.id,
      'items',
      item.id
    );

    try {
      await updateDoc(itemRef, {
        purchased: newPurchased,
        purchasedAt: newPurchased ? serverTimestamp() : null,
        purchasedBy: newPurchased ? user?.uid : null,
        purchasedByUsername: newPurchased ? username : null,
      });
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.UPDATE,
        `categories/${activeCategory.id}/shoppingLists/${activeList.id}/items/${item.id}`
      );
    }
  };

  // Create new shopping list
  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCategory || !newListName.trim() || !canEdit) return;

    if (isDemoUser) {
      const newList: ShoppingList = {
        id: 'list-' + Date.now(),
        name: newListName.trim(),
        status: 'open',
        createdAt: new Date().toISOString(),
        createdByName: username,
      };
      setLists((prev) => [newList, ...prev]);
      setActiveList(newList);
      setNewListName('');
      setIsCreateListOpen(false);
      return;
    }

    try {
      const listsCol = collection(db, 'categories', activeCategory.id, 'shoppingLists');
      const docRef = await addDoc(listsCol, {
        name: newListName.trim(),
        status: 'open',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: user?.uid,
        createdByName: username,
      });
      setActiveList({ id: docRef.id, name: newListName.trim(), status: 'open' });
      setNewListName('');
      setIsCreateListOpen(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `categories/${activeCategory.id}/shoppingLists`);
    }
  };

  // Add individual item to shopping list
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCategory || !activeList || !canEdit) return;
    if (!itemName.trim()) return;

    setIsSubmitting(true);

    const payload: Partial<ShoppingItem> = {
      name: itemName.trim(),
      quantity: Number(itemQuantity) || 1,
      unit: itemUnit.trim() || 'un',
      estimatedPrice: itemPrice === '' ? undefined : Number(itemPrice),
      link: itemLink.trim() || undefined,
      purchased: false,
    };

    if (isDemoUser) {
      const newItem: ShoppingItem = {
        id: 'demo-shop-' + Date.now(),
        name: itemName.trim(),
        quantity: Number(itemQuantity) || 1,
        unit: itemUnit.trim() || 'un',
        estimatedPrice: itemPrice === '' ? undefined : Number(itemPrice),
        link: itemLink.trim() || undefined,
        purchased: false,
      };
      setItems((prev) => [...prev, newItem]);
      setItemName('');
      setItemQuantity(1);
      setItemPrice('');
      setItemLink('');
      setIsAddItemOpen(false);
      setIsSubmitting(false);
      return;
    }

    try {
      const itemsCol = collection(
        db,
        'categories',
        activeCategory.id,
        'shoppingLists',
        activeList.id,
        'items'
      );
      await addDoc(itemsCol, payload);

      setItemName('');
      setItemQuantity(1);
      setItemPrice('');
      setItemLink('');
      setIsAddItemOpen(false);
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.CREATE,
        `categories/${activeCategory.id}/shoppingLists/${activeList.id}/items`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete item from shopping list
  const handleDeleteItem = async () => {
    if (!activeCategory || !activeList || !itemToDelete || !canEdit) return;

    if (isDemoUser) {
      setItems((prev) => prev.filter((i) => i.id !== itemToDelete.id));
      setItemToDelete(null);
      return;
    }

    try {
      await deleteDoc(
        doc(
          db,
          'categories',
          activeCategory.id,
          'shoppingLists',
          activeList.id,
          'items',
          itemToDelete.id
        )
      );
      setItemToDelete(null);
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.DELETE,
        `categories/${activeCategory.id}/shoppingLists/${activeList.id}/items/${itemToDelete.id}`
      );
    }
  };

  // Open "Adicionar itens abaixo do mínimo" modal
  const handleOpenRestockModal = async () => {
    if (!activeCategory || !activeList) return;

    if (isDemoUser) {
      setRestockCandidates([
        {
          inventoryId: 'inv-eletronica',
          inventoryName: 'Eletrônica',
          itemId: 'item-esp32',
          name: 'Módulo ESP32-WROOM-32D',
          currentQuantity: 2,
          minQuantity: 5,
          suggestedQuantity: 3,
          unit: 'un',
          selected: true,
        },
        {
          inventoryId: 'inv-eletronica',
          inventoryName: 'Eletrônica',
          itemId: 'item-sensor-linha',
          name: 'Array Sensor de Linha QTR-8A',
          currentQuantity: 1,
          minQuantity: 2,
          suggestedQuantity: 1,
          unit: 'un',
          selected: true,
        },
      ]);
      setIsRestockModalOpen(true);
      return;
    }

    try {
      const candidates: Array<{
        inventoryId: string;
        inventoryName: string;
        itemId: string;
        name: string;
        currentQuantity: number;
        minQuantity: number;
        suggestedQuantity: number;
        unit: string;
        selected: boolean;
      }> = [];

      const invCol = collection(db, 'categories', activeCategory.id, 'inventories');
      const invSnap = await getDocs(invCol);

      for (const invDoc of invSnap.docs) {
        const invData = invDoc.data();
        const itemsCol = collection(
          db,
          'categories',
          activeCategory.id,
          'inventories',
          invDoc.id,
          'items'
        );
        const itemSnap = await getDocs(itemsCol);

        itemSnap.forEach((itDoc) => {
          const it = itDoc.data() as InventoryItem;
          if (isBelowMin(it.quantity, it.minQuantity)) {
            const suggested = calcSuggestedRestock(it.quantity, it.minQuantity);
            candidates.push({
              inventoryId: invDoc.id,
              inventoryName: invData.name || 'Geral',
              itemId: itDoc.id,
              name: it.name,
              currentQuantity: it.quantity,
              minQuantity: it.minQuantity,
              suggestedQuantity: suggested,
              unit: it.unit,
              selected: true,
            });
          }
        });
      }

      setRestockCandidates(candidates);
      setIsRestockModalOpen(true);
    } catch (err) {
      console.error('Erro ao analisar estoque mínimo:', err);
    }
  };

  // Confirm auto-adding low stock items to shopping list
  const handleConfirmRestock = async () => {
    if (!activeCategory || !activeList) return;

    const toAdd = restockCandidates.filter((c) => c.selected);

    if (isDemoUser) {
      const newDemoItems: ShoppingItem[] = toAdd.map((cand) => ({
        id: 'shop-auto-' + Math.random().toString(36).substring(2, 7),
        name: cand.name,
        quantity: cand.suggestedQuantity,
        unit: cand.unit,
        purchased: false,
        inventoryItemId: cand.itemId,
        inventoryId: cand.inventoryId,
      }));
      setItems((prev) => [...prev, ...newDemoItems]);
      setIsRestockModalOpen(false);
      return;
    }

    try {
      const itemsCol = collection(
        db,
        'categories',
        activeCategory.id,
        'shoppingLists',
        activeList.id,
        'items'
      );

      for (const cand of toAdd) {
        await addDoc(itemsCol, {
          name: cand.name,
          quantity: cand.suggestedQuantity,
          unit: cand.unit,
          purchased: false,
          inventoryItemId: cand.itemId,
          inventoryId: cand.inventoryId,
        });
      }

      setIsRestockModalOpen(false);
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.CREATE,
        `categories/${activeCategory.id}/shoppingLists/${activeList.id}/items`
      );
    }
  };

  // Open "Finalizar Compra" modal
  const handleOpenFinishModal = () => {
    const purchasedItems = items.filter((i) => i.purchased);
    if (purchasedItems.length === 0) {
      alert('Nenhum item marcado como comprado nesta lista.');
      return;
    }

    const defaultInvId = availableInventories[0]?.id || '';
    setTransferItems(
      purchasedItems.map((pi) => ({
        shoppingItemId: pi.id,
        name: pi.name,
        quantity: pi.quantity,
        unit: pi.unit,
        inventoryId: pi.inventoryId || defaultInvId,
        inventoryItemId: pi.inventoryItemId,
        willAdd: true,
      }))
    );

    setIsFinishModalOpen(true);
  };

  // Confirm finishing purchase and transferring quantities to inventories
  const handleConfirmFinishPurchase = async () => {
    if (!activeCategory || !activeList) return;

    if (isDemoUser) {
      // Mark list finished in demo
      setActiveList({ ...activeList, status: 'finished' });
      setLists((prev) =>
        prev.map((l) => (l.id === activeList.id ? { ...l, status: 'finished' } : l))
      );
      setIsFinishModalOpen(false);
      alert('Compra finalizada com sucesso! Quantidades integradas ao estoque.');
      return;
    }

    try {
      // Process transfer items
      for (const t of transferItems) {
        if (!t.willAdd || !t.inventoryId) continue;

        // If item is already linked to inventory
        if (t.inventoryItemId) {
          const itemRef = doc(
            db,
            'categories',
            activeCategory.id,
            'inventories',
            t.inventoryId,
            'items',
            t.inventoryItemId
          );
          await runTransaction(db, async (txn) => {
            const snap = await txn.get(itemRef);
            if (snap.exists()) {
              const currentQty = (snap.data() as InventoryItem).quantity || 0;
              const newQty = currentQty + t.quantity;
              txn.update(itemRef, {
                quantity: newQty,
                updatedAt: serverTimestamp(),
                updatedBy: user?.uid,
                updatedByUsername: username,
              });

              const histRef = doc(
                collection(
                  db,
                  'categories',
                  activeCategory.id,
                  'inventories',
                  t.inventoryId,
                  'items',
                  t.inventoryItemId!,
                  'history'
                )
              );
              txn.set(histRef, {
                itemId: t.inventoryItemId,
                previousQuantity: currentQty,
                newQuantity: newQty,
                delta: t.quantity,
                reason: `Compra finalizada (${activeList.name})`,
                userId: user?.uid,
                username,
                timestamp: serverTimestamp(),
              });
            }
          });
        } else {
          // Create new item in that inventory
          const newDocRef = await addDoc(
            collection(db, 'categories', activeCategory.id, 'inventories', t.inventoryId, 'items'),
            {
              name: t.name,
              quantity: t.quantity,
              unit: t.unit,
              minQuantity: 1,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
              updatedBy: user?.uid,
              updatedByUsername: username,
            }
          );

          await addDoc(
            collection(
              db,
              'categories',
              activeCategory.id,
              'inventories',
              t.inventoryId,
              'items',
              newDocRef.id,
              'history'
            ),
            {
              itemId: newDocRef.id,
              previousQuantity: 0,
              newQuantity: t.quantity,
              delta: t.quantity,
              reason: `Entrada via compra finalizada (${activeList.name})`,
              userId: user?.uid,
              username,
              timestamp: serverTimestamp(),
            }
          );
        }
      }

      // Mark shopping list as finished
      const listRef = doc(db, 'categories', activeCategory.id, 'shoppingLists', activeList.id);
      await updateDoc(listRef, {
        status: 'finished',
        updatedAt: serverTimestamp(),
      });

      setIsFinishModalOpen(false);
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.WRITE,
        `categories/${activeCategory.id}/shoppingLists/${activeList.id}`
      );
    }
  };

  // Export shopping list to CSV
  const handleExportCsv = () => {
    if (!activeList || items.length === 0) return;
    const csvContent = exportShoppingListToCsv(activeList.name, items);
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `compras_${activeList.name.toLowerCase().replace(/\s+/g, '_')}_${
      new Date().toISOString().split('T')[0]
    }.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const totals = calcListTotals(items);
  const purchasedCount = items.filter((i) => i.purchased).length;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Category & List Carousel Header */}
      <div className="bg-bull-surface border border-bull-border rounded-3xl p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-bull-border/40">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-bull-primary uppercase tracking-wider mb-1">
              <span
                className="w-2.5 h-2.5 rounded-full shadow"
                style={{ backgroundColor: activeCategory?.color || '#EDB23A' }}
              />
              <span>{activeCategory?.name}</span>
            </div>
            <h1 className="text-xl font-black text-bull-text">Listas de Compras da Equipe</h1>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {canEdit && (
              <>
                <button
                  onClick={() => setIsCreateListOpen(true)}
                  className="py-2 px-3 rounded-xl bg-bull-surface-elevated hover:brightness-110 border border-bull-border text-bull-text font-bold text-xs flex items-center gap-1.5 transition"
                >
                  <Plus className="w-3.5 h-3.5 text-bull-primary" />
                  <span>Nova Lista</span>
                </button>

                <button
                  onClick={() => setIsAddItemOpen(true)}
                  className="py-2 px-3.5 rounded-xl bg-bull-primary hover:brightness-110 active:scale-95 text-bull-on-primary font-bold text-xs flex items-center gap-1.5 shadow-lg transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Adicionar Item</span>
                </button>
              </>
            )}

            {items.length > 0 && (
              <button
                onClick={handleExportCsv}
                title="Exportar para CSV"
                className="p-2 rounded-xl bg-bull-surface-elevated border border-bull-border text-bull-text hover:text-bull-primary transition"
              >
                <Download className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Lists Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pt-3 scrollbar-none">
          {lists.map((lst) => {
            const isSelected = activeList?.id === lst.id;
            return (
              <button
                key={lst.id}
                onClick={() => setActiveList(lst)}
                className={`py-2 px-4 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
                  isSelected
                    ? 'bg-bull-primary text-bull-on-primary shadow-md'
                    : 'bg-bull-surface-elevated text-bull-text hover:text-bull-primary border border-bull-border'
                }`}
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>{lst.name}</span>
                {lst.status === 'finished' && (
                  <span className="text-[10px] bg-bull-success/20 text-bull-success px-1.5 py-0.2 rounded font-black">
                    Concluída
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* METRICS & SMART ACTIONS BANNER */}
      {activeList && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Estimated Total Card */}
          <div className="p-4 rounded-2xl bg-bull-surface border border-bull-border shadow-md">
            <span className="text-[10px] font-bold text-bull-text-muted uppercase tracking-wider">
              Total Estimado
            </span>
            <p className="text-xl font-black text-bull-text mt-0.5">
              {formatCurrencyBRL(totals.totalEstimated)}
            </p>
            <span className="text-[11px] text-bull-text-muted">
              {items.length} {items.length === 1 ? 'item previsto' : 'itens previstos'}
            </span>
          </div>

          {/* Purchased Total Card */}
          <div className="p-4 rounded-2xl bg-bull-surface border border-bull-border shadow-md">
            <span className="text-[10px] font-bold text-bull-text-muted uppercase tracking-wider">
              Total Comprado
            </span>
            <p className="text-xl font-black text-bull-success mt-0.5">
              {formatCurrencyBRL(totals.totalPurchased)}
            </p>
            <span className="text-[11px] text-bull-success font-semibold">
              {purchasedCount} de {items.length} itens marcados
            </span>
          </div>

          {/* Smart Automation Buttons */}
          <div className="p-3 rounded-2xl bg-bull-surface border border-bull-border shadow-md flex flex-col justify-center gap-2">
            {canEdit && (
              <>
                <button
                  onClick={handleOpenRestockModal}
                  className="w-full py-2 px-3 rounded-xl bg-bull-surface-elevated hover:brightness-110 border border-bull-primary/50 text-bull-primary font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition"
                >
                  <Sparkles className="w-3.5 h-3.5 text-bull-primary" />
                  <span>Adicionar Itens Abaixo do Mínimo</span>
                </button>

                <button
                  onClick={handleOpenFinishModal}
                  disabled={purchasedCount === 0 || activeList.status === 'finished'}
                  className="w-full py-2 px-3 rounded-xl bg-bull-primary hover:brightness-110 active:scale-95 text-bull-on-primary font-black text-xs flex items-center justify-center gap-1.5 shadow-md transition disabled:opacity-40"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Finalizar Compra</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ITEMS LIST */}
      {items.length === 0 ? (
        /* Empty state with gold illustration over wine background (Constitutional Mandate) */
        <div className="bg-bull-surface border border-bull-border rounded-3xl p-12 text-center shadow-xl space-y-4">
          <div className="w-24 h-24 mx-auto rounded-3xl bg-bull-surface-elevated border border-bull-primary/40 flex items-center justify-center text-bull-primary shadow-xl">
            <ShoppingBag className="w-12 h-12" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-black text-bull-text">Lista de compras vazia</h3>
            <p className="text-xs text-bull-text-muted max-w-sm mx-auto leading-relaxed">
              Adicione os componentes que a equipe precisa comprar ou clique em "Adicionar Itens Abaixo do Mínimo" para importar peças em falta.
            </p>
          </div>
          {canEdit && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setIsAddItemOpen(true)}
                className="py-2.5 px-4 rounded-2xl bg-bull-primary text-bull-on-primary font-bold text-xs shadow-lg hover:brightness-110 active:scale-95 transition inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar Item Manual</span>
              </button>
              <button
                onClick={handleOpenRestockModal}
                className="py-2.5 px-4 rounded-2xl bg-bull-surface-elevated border border-bull-border text-bull-text font-bold text-xs hover:border-bull-primary transition inline-flex items-center gap-1.5"
              >
                <Sparkles className="w-4 h-4 text-bull-primary" />
                <span>Puxar do Estoque Crítico</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-bull-surface border border-bull-border rounded-3xl p-4 shadow-xl space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                item.purchased
                  ? 'bg-bull-surface-elevated/60 border-bull-success/30 opacity-80'
                  : 'bg-bull-surface-elevated border-bull-border hover:border-bull-primary/40'
              }`}
            >
              {/* Checkbox & Item details */}
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => handleTogglePurchased(item)}
                  disabled={!canEdit}
                  className="p-1 rounded-xl text-bull-primary hover:scale-110 active:scale-95 transition disabled:opacity-60"
                >
                  {item.purchased ? (
                    <CheckCircle2 className="w-6 h-6 text-bull-success" />
                  ) : (
                    <Circle className="w-6 h-6 text-bull-text-muted hover:text-bull-primary" />
                  )}
                </button>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p
                      className={`text-sm font-black truncate ${
                        item.purchased
                          ? 'line-through text-bull-text-muted'
                          : 'text-bull-text'
                      }`}
                    >
                      {item.name}
                    </p>
                    {item.link && (
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-bull-primary hover:underline shrink-0"
                        title="Ver link do produto"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-bull-text-muted mt-0.5">
                    <span className="font-bold text-bull-primary">
                      Qtd: {item.quantity} {item.unit}
                    </span>
                    {item.estimatedPrice !== undefined && item.estimatedPrice > 0 && (
                      <>
                        <span>•</span>
                        <span>Estimado: {formatCurrencyBRL(item.estimatedPrice)}</span>
                      </>
                    )}
                    {item.purchased && item.purchasedByUsername && (
                      <>
                        <span>•</span>
                        <span className="text-bull-success">Comprado por @{item.purchasedByUsername}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Delete action */}
              {canEdit && (
                <button
                  onClick={() => setItemToDelete(item)}
                  title="Excluir da lista"
                  className="p-1.5 rounded-lg text-bull-text-muted hover:text-bull-alert transition shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* MODAL: ADD ITEM */}
      {isAddItemOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-bull-surface border border-bull-border rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-bull-border/40">
              <h3 className="text-base font-black text-bull-text">Adicionar Item à Lista</h3>
              <button
                onClick={() => setIsAddItemOpen(false)}
                className="text-bull-text-muted hover:text-bull-text text-xl font-bold"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleAddItem} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-bull-text-muted mb-1">
                  Nome do Componente *
                </label>
                <input
                  type="text"
                  required
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="ex.: Bateria LiPo 3S 1500mAh"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-bull-surface-elevated border border-bull-border text-bull-text text-xs focus:outline-none focus:border-bull-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-bull-text-muted mb-1">
                    Quantidade *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={itemQuantity}
                    onChange={(e) => setItemQuantity(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-bull-surface-elevated border border-bull-border text-bull-text text-xs focus:outline-none focus:border-bull-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-bull-text-muted mb-1">
                    Unidade
                  </label>
                  <input
                    type="text"
                    value={itemUnit}
                    onChange={(e) => setItemUnit(e.target.value)}
                    placeholder="un, m, kg, pacote..."
                    className="w-full px-3 py-2 rounded-xl bg-bull-surface-elevated border border-bull-border text-bull-text text-xs focus:outline-none focus:border-bull-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-bull-text-muted mb-1">
                  Preço Estimado Unitário (R$, opcional)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={itemPrice}
                  onChange={(e) =>
                    setItemPrice(e.target.value === '' ? '' : Number(e.target.value))
                  }
                  placeholder="0,00"
                  className="w-full px-3 py-2 rounded-xl bg-bull-surface-elevated border border-bull-border text-bull-text text-xs focus:outline-none focus:border-bull-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-bull-text-muted mb-1">
                  Link de Compra / Fornecedor (opcional)
                </label>
                <input
                  type="url"
                  value={itemLink}
                  onChange={(e) => setItemLink(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 rounded-xl bg-bull-surface-elevated border border-bull-border text-bull-text text-xs focus:outline-none focus:border-bull-primary"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddItemOpen(false)}
                  className="px-4 py-2 rounded-xl border border-bull-border text-xs font-bold text-bull-text"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-bull-primary text-bull-on-primary font-black text-xs shadow-lg"
                >
                  Adicionar à Lista
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: AUTO-RESTOCK LOW INVENTORY ITEMS */}
      {isRestockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-bull-surface border border-bull-border rounded-3xl p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-bull-border/40">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-bull-primary" />
                <h3 className="text-base font-black text-bull-text">Itens Abaixo do Mínimo</h3>
              </div>
              <button
                onClick={() => setIsRestockModalOpen(false)}
                className="text-bull-text-muted hover:text-bull-text text-xl font-bold"
              >
                ×
              </button>
            </div>

            <p className="text-xs text-bull-text-muted">
              Identificamos os seguintes componentes com estoque crítico nos inventários de {activeCategory?.name || 'sua categoria'}. A quantidade sugerida repõe até o estoque mínimo.
            </p>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {restockCandidates.length === 0 ? (
                <div className="py-8 text-center text-bull-text-muted">
                  <Check className="w-8 h-8 mx-auto mb-2 text-bull-success" />
                  <p className="text-xs font-bold text-bull-text">Nenhum item abaixo do mínimo!</p>
                  <p className="text-[11px] text-bull-text-muted mt-0.5">
                    Todos os itens dos inventários estão com quantidades adequadas.
                  </p>
                </div>
              ) : (
                restockCandidates.map((cand, idx) => (
                  <div
                    key={cand.itemId}
                    onClick={() => {
                      setRestockCandidates((prev) =>
                        prev.map((c, i) => (i === idx ? { ...c, selected: !c.selected } : c))
                      );
                    }}
                    className={`p-3 rounded-2xl border cursor-pointer transition flex items-center justify-between gap-3 text-xs ${
                      cand.selected
                        ? 'bg-bull-surface-elevated border-bull-primary text-bull-text'
                        : 'bg-bull-surface border-bull-border text-bull-text-muted opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={cand.selected}
                        onChange={() => {}}
                        className="rounded text-bull-primary focus:ring-bull-primary"
                      />
                      <div>
                        <p className="font-bold">{cand.name}</p>
                        <p className="text-[10px] text-bull-text-muted">
                          {cand.inventoryName} • Atual: {cand.currentQuantity} • Mínimo: {cand.minQuantity}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-black text-bull-primary text-sm">
                        +{cand.suggestedQuantity} {cand.unit}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-bull-border/40 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsRestockModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-bull-border text-xs font-bold text-bull-text"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmRestock}
                disabled={restockCandidates.length === 0}
                className="px-5 py-2 rounded-xl bg-bull-primary text-bull-on-primary font-black text-xs shadow-lg disabled:opacity-50"
              >
                Adicionar à Lista de Compras
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: FINALIZAR COMPRA (INTEGRAR AO INVENTÁRIO ITEM A ITEM) */}
      {isFinishModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-bull-surface border border-bull-border rounded-3xl p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-bull-border/40">
              <div className="flex items-center gap-2">
                <CheckCheck className="w-5 h-5 text-bull-success" />
                <h3 className="text-base font-black text-bull-text">Finalizar Compra</h3>
              </div>
              <button
                onClick={() => setIsFinishModalOpen(false)}
                className="text-bull-text-muted hover:text-bull-text text-xl font-bold"
              >
                ×
              </button>
            </div>

            <p className="text-xs text-bull-text-muted">
              Deseja somar as quantidades dos itens comprados diretamente aos inventários da categoria? Escolha item a item ou desmarque os que preferir pular:
            </p>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {transferItems.map((item, idx) => (
                <div
                  key={item.shoppingItemId}
                  className={`p-3 rounded-2xl border transition flex flex-col gap-2 text-xs ${
                    item.willAdd
                      ? 'bg-bull-surface-elevated border-bull-success/60'
                      : 'bg-bull-surface border-bull-border opacity-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={item.willAdd}
                        onChange={(e) => {
                          const val = e.target.checked;
                          setTransferItems((prev) =>
                            prev.map((it, i) => (i === idx ? { ...it, willAdd: val } : it))
                          );
                        }}
                        className="rounded text-bull-success focus:ring-bull-success"
                      />
                      <span className="font-bold text-bull-text">{item.name}</span>
                    </label>

                    <span className="font-black text-bull-success text-sm">
                      +{item.quantity} {item.unit}
                    </span>
                  </div>

                  {item.willAdd && availableInventories.length > 0 && (
                    <div className="flex items-center gap-2 pt-1 border-t border-bull-border/30">
                      <span className="text-[11px] text-bull-text-muted">Destino:</span>
                      <select
                        value={item.inventoryId}
                        onChange={(e) => {
                          const newInv = e.target.value;
                          setTransferItems((prev) =>
                            prev.map((it, i) => (i === idx ? { ...it, inventoryId: newInv } : it))
                          );
                        }}
                        className="px-2 py-1 rounded-lg bg-bull-surface border border-bull-border text-bull-text text-xs cursor-pointer focus:outline-none focus:border-bull-primary"
                      >
                        {availableInventories.map((inv) => (
                          <option key={inv.id} value={inv.id}>
                            {inv.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-bull-border/40 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsFinishModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-bull-border text-xs font-bold text-bull-text"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmFinishPurchase}
                className="px-5 py-2 rounded-xl bg-bull-success text-white font-black text-xs shadow-lg hover:brightness-110 active:scale-95 transition"
              >
                Confirmar e Integrar ao Estoque
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE LIST MODAL */}
      {isCreateListOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-bull-surface border border-bull-border rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-black text-bull-text">Criar Nova Lista de Compras</h3>
            <form onSubmit={handleCreateList} className="space-y-3.5">
              <input
                type="text"
                required
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="ex.: Compra de Componentes - Outubro"
                className="w-full px-3.5 py-2.5 rounded-xl bg-bull-surface-elevated border border-bull-border text-bull-text text-xs focus:outline-none focus:border-bull-primary"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateListOpen(false)}
                  className="px-4 py-2 rounded-xl border border-bull-border text-xs font-bold text-bull-text"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-bull-primary text-bull-on-primary text-xs font-bold shadow-lg"
                >
                  Criar Lista
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM MODALS */}
      <ConfirmModal
        isOpen={!!itemToDelete}
        title="Remover Item"
        message={`Deseja remover "${itemToDelete?.name}" desta lista de compras?`}
        confirmText="Remover"
        isDanger={true}
        onConfirm={handleDeleteItem}
        onCancel={() => setItemToDelete(null)}
      />
    </div>
  );
};
