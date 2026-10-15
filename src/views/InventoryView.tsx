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
  orderBy,
  runTransaction,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../services/firebase';
import { useCategory } from '../context/CategoryContext';
import { useAuth } from '../context/AuthContext';
import { Inventory, InventoryItem, ItemHistory } from '../types';
import { ConfirmModal } from '../components/ConfirmModal';
import { ApprovalGate } from '../components/ApprovalGate';
import { isBelowMin, exportInventoryToCsv } from '../utils/inventoryCalc';
import { compressImageToBase64 } from '../utils/imageCompressor';
import {
  Layers,
  Plus,
  Search,
  AlertTriangle,
  Download,
  History,
  Trash2,
  Edit2,
  Camera,
  X,
  Package,
  MapPin,
  Clock,
  User as UserIcon,
  Filter,
  ArrowUpDown,
  Tag,
  Check,
  Maximize2,
  Boxes,
} from 'lucide-react';

const COMMON_UNITS = ['un', 'm', 'cm', 'kg', 'g', 'l', 'ml', 'rolo', 'pacote', 'caixa', 'kit'];

interface InventoryViewProps {
  onGoCategories?: () => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({ onGoCategories = () => {} }) => {
  const { activeCategory, membershipStatus, canEdit, isViewer } = useCategory();
  const { user, username, isDemoUser } = useAuth();

  // Selected inventory tab inside category
  const [inventories, setInventories] = useState<Inventory[]>([]);
  const [activeInventory, setActiveInventory] = useState<Inventory | null>(null);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Search, filter, sort
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'name' | 'quantity' | 'alert' | 'updatedAt'>('name');
  const [showOnlyAlerts, setShowOnlyAlerts] = useState(false);

  // Modals
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedItemHistory, setSelectedItemHistory] = useState<InventoryItem | null>(null);
  const [historyLogs, setHistoryLogs] = useState<ItemHistory[]>([]);
  const [isCreateInvModalOpen, setIsCreateInvModalOpen] = useState(false);
  const [newInvName, setNewInvName] = useState('');
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);
  const [invToDelete, setInvToDelete] = useState<Inventory | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  // Item form states
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formQuantity, setFormQuantity] = useState(0);
  const [formUnit, setFormUnit] = useState('un');
  const [formMinQuantity, setFormMinQuantity] = useState(0);
  const [formLocation, setFormLocation] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formPhoto, setFormPhoto] = useState<string>('');
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Listen to inventories in active category
  useEffect(() => {
    if (!activeCategory || membershipStatus !== 'aprovado') {
      setInventories([]);
      setActiveInventory(null);
      setItems([]);
      setLoading(false);
      return;
    }

    if (isDemoUser) {
      const demoInvs: Inventory[] = [
        { id: 'inv-eletronica', name: 'Eletrônica', description: 'Placas, sensores e atuadores' },
        { id: 'inv-mecanica', name: 'Mecânica e Fixação', description: 'Parafusos, engrenagens e eixos' },
        { id: 'inv-ferramentas', name: 'Ferramentas', description: 'Ferros de solda, alicates e multímetros' },
      ];
      setInventories(demoInvs);
      setActiveInventory(demoInvs[0]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const invCol = collection(db, 'categories', activeCategory.id, 'inventories');

    const unsubscribe = onSnapshot(
      invCol,
      (snapshot) => {
        const loaded: Inventory[] = [];
        snapshot.forEach((docSnap) => {
          loaded.push({ id: docSnap.id, ...(docSnap.data() as Omit<Inventory, 'id'>) });
        });

        // Ensure there is at least an initial inventory
        if (loaded.length === 0 && canEdit) {
          const defaultRef = doc(collection(db, 'categories', activeCategory.id, 'inventories'));
          setDoc(defaultRef, {
            name: 'Geral',
            description: 'Inventário padrão',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }).catch(() => {});
        }

        setInventories(loaded);
        if (!activeInventory && loaded.length > 0) {
          setActiveInventory(loaded[0]);
        } else if (activeInventory && !loaded.some((i) => i.id === activeInventory.id)) {
          setActiveInventory(loaded[0] || null);
        }
        setLoading(false);
      },
      (error) => {
        console.warn('Erro ao escutar inventários:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [activeCategory?.id, membershipStatus, isDemoUser]);

  // 2. Listen to items in active inventory
  useEffect(() => {
    if (!activeCategory || !activeInventory || membershipStatus !== 'aprovado') {
      setItems([]);
      return;
    }

    if (isDemoUser) {
      const demoItems: InventoryItem[] = [
        {
          id: 'item-esp32',
          name: 'Módulo ESP32-WROOM-32D',
          category: 'Microcontroladores',
          quantity: 2,
          unit: 'un',
          minQuantity: 5,
          location: 'Bancada 2 - Gaveta A',
          notes: 'Frequência de 240MHz, Wi-Fi e Bluetooth BLE integrados.',
          updatedAt: new Date().toISOString(),
          updatedBy: 'demo-uid',
          updatedByUsername: 'capitao_robo',
        },
        {
          id: 'item-driver-ponte-h',
          name: 'Driver de Motor Ponte H TB6612FNG',
          category: 'Drivers',
          quantity: 8,
          unit: 'un',
          minQuantity: 3,
          location: 'Gaveteiro Eletrônica 03',
          notes: 'Capacidade 1.2A constante por canal, pico de 3.2A.',
          updatedAt: new Date().toISOString(),
          updatedBy: 'demo-uid',
          updatedByUsername: 'lucas_eletronica',
        },
        {
          id: 'item-sensor-linha',
          name: 'Array Sensor de Linha QTR-8A',
          category: 'Sensores',
          quantity: 1,
          unit: 'un',
          minQuantity: 2,
          location: 'Armário A1',
          notes: 'Utilizado no Mini Sumô e Seguidor de Linha.',
          updatedAt: new Date().toISOString(),
          updatedBy: 'demo-uid',
          updatedByUsername: 'beatriz_mecanica',
        },
      ];
      setItems(demoItems);
      return;
    }

    const itemsCol = collection(
      db,
      'categories',
      activeCategory.id,
      'inventories',
      activeInventory.id,
      'items'
    );

    const unsubscribe = onSnapshot(
      itemsCol,
      (snapshot) => {
        const loaded: InventoryItem[] = [];
        snapshot.forEach((snap) => {
          loaded.push({ id: snap.id, ...(snap.data() as Omit<InventoryItem, 'id'>) });
        });
        setItems(loaded);
      },
      (error) => {
        handleFirestoreError(
          error,
          OperationType.LIST,
          `categories/${activeCategory.id}/inventories/${activeInventory.id}/items`
        );
      }
    );

    return () => unsubscribe();
  }, [activeCategory?.id, activeInventory?.id, membershipStatus, isDemoUser]);

  // If user is pending or not approved in this category, show the approval gate!
  if (membershipStatus !== 'aprovado') {
    return <ApprovalGate onGoCategories={onGoCategories} />;
  }

  // Quick adjust quantity (+1 / -1) with history log
  const handleQuickAdjust = async (item: InventoryItem, delta: number) => {
    if (!activeCategory || !activeInventory || !canEdit) return;
    const newQty = Math.max(0, item.quantity + delta);
    if (newQty === item.quantity) return;

    if (isDemoUser) {
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, quantity: newQty, updatedByUsername: username } : i))
      );
      return;
    }

    const itemRef = doc(
      db,
      'categories',
      activeCategory.id,
      'inventories',
      activeInventory.id,
      'items',
      item.id
    );
    const historyCol = collection(
      db,
      'categories',
      activeCategory.id,
      'inventories',
      activeInventory.id,
      'items',
      item.id,
      'history'
    );

    try {
      await runTransaction(db, async (txn) => {
        txn.update(itemRef, {
          quantity: newQty,
          updatedAt: serverTimestamp(),
          updatedBy: user?.uid,
          updatedByUsername: username,
        });

        const newHistRef = doc(historyCol);
        txn.set(newHistRef, {
          itemId: item.id,
          previousQuantity: item.quantity,
          newQuantity: newQty,
          delta,
          reason: delta > 0 ? 'Ajuste rápido (+)' : 'Ajuste rápido (-)',
          userId: user?.uid,
          username,
          timestamp: serverTimestamp(),
        });
      });
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.UPDATE,
        `categories/${activeCategory.id}/inventories/${activeInventory.id}/items/${item.id}`
      );
    }
  };

  // Open item modal for creation or editing
  const handleOpenItemModal = (item?: InventoryItem) => {
    if (item) {
      setEditingItem(item);
      setFormName(item.name);
      setFormCategory(item.category || '');
      setFormQuantity(item.quantity);
      setFormUnit(item.unit);
      setFormMinQuantity(item.minQuantity);
      setFormLocation(item.location || '');
      setFormNotes(item.notes || '');
      setFormPhoto(item.photo || '');
    } else {
      setEditingItem(null);
      setFormName('');
      setFormCategory('');
      setFormQuantity(1);
      setFormUnit('un');
      setFormMinQuantity(1);
      setFormLocation('');
      setFormNotes('');
      setFormPhoto('');
    }
    setPhotoError(null);
    setIsItemModalOpen(true);
  };

  // Handle Photo input & compression
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoError(null);
    setIsCompressing(true);

    try {
      const base64 = await compressImageToBase64(file, 600, 0.65);
      setFormPhoto(base64);
    } catch (err: any) {
      setPhotoError(err.message || 'Falha ao comprimir foto.');
    } finally {
      setIsCompressing(false);
    }
  };

  // Save Item (Create or Update)
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCategory || !activeInventory || !canEdit) return;
    if (!formName.trim()) return;

    setIsSubmitting(true);

    const payload: Partial<InventoryItem> = {
      name: formName.trim(),
      category: formCategory.trim() || undefined,
      quantity: Number(formQuantity),
      unit: formUnit.trim() || 'un',
      minQuantity: Number(formMinQuantity),
      location: formLocation.trim() || undefined,
      notes: formNotes.trim() || undefined,
      photo: formPhoto || undefined,
      updatedAt: serverTimestamp(),
      updatedBy: user?.uid,
      updatedByUsername: username,
    };

    if (isDemoUser) {
      if (editingItem) {
        setItems((prev) =>
          prev.map((i) =>
            i.id === editingItem.id
              ? {
                  ...i,
                  ...payload,
                  updatedAt: new Date().toISOString(),
                  updatedByUsername: username,
                }
              : i
          )
        );
      } else {
        const newItem: InventoryItem = {
          id: 'demo-item-' + Date.now(),
          name: formName.trim(),
          category: formCategory.trim() || undefined,
          quantity: Number(formQuantity),
          unit: formUnit.trim() || 'un',
          minQuantity: Number(formMinQuantity),
          location: formLocation.trim() || undefined,
          notes: formNotes.trim() || undefined,
          photo: formPhoto || undefined,
          updatedAt: new Date().toISOString(),
          updatedBy: 'demo-uid',
          updatedByUsername: username,
        };
        setItems((prev) => [newItem, ...prev]);
      }
      setIsSubmitting(false);
      setIsItemModalOpen(false);
      return;
    }

    try {
      if (editingItem) {
        const itemRef = doc(
          db,
          'categories',
          activeCategory.id,
          'inventories',
          activeInventory.id,
          'items',
          editingItem.id
        );

        const delta = Number(formQuantity) - editingItem.quantity;
        await runTransaction(db, async (txn) => {
          txn.update(itemRef, payload);
          if (delta !== 0) {
            const histRef = doc(
              collection(
                db,
                'categories',
                activeCategory.id,
                'inventories',
                activeInventory.id,
                'items',
                editingItem.id,
                'history'
              )
            );
            txn.set(histRef, {
              itemId: editingItem.id,
              previousQuantity: editingItem.quantity,
              newQuantity: Number(formQuantity),
              delta,
              reason: 'Edição de item',
              userId: user?.uid,
              username,
              timestamp: serverTimestamp(),
            });
          }
        });
      } else {
        const itemsCol = collection(
          db,
          'categories',
          activeCategory.id,
          'inventories',
          activeInventory.id,
          'items'
        );
        const docRef = await addDoc(itemsCol, {
          ...payload,
          createdAt: serverTimestamp(),
        });

        // Initial history entry
        const histCol = collection(
          db,
          'categories',
          activeCategory.id,
          'inventories',
          activeInventory.id,
          'items',
          docRef.id,
          'history'
        );
        await addDoc(histCol, {
          itemId: docRef.id,
          previousQuantity: 0,
          newQuantity: Number(formQuantity),
          delta: Number(formQuantity),
          reason: 'Item cadastrado',
          userId: user?.uid,
          username,
          timestamp: serverTimestamp(),
        });
      }
      setIsItemModalOpen(false);
    } catch (err) {
      handleFirestoreError(
        err,
        editingItem ? OperationType.UPDATE : OperationType.CREATE,
        `categories/${activeCategory.id}/inventories/${activeInventory.id}/items`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete item
  const handleDeleteItem = async () => {
    if (!activeCategory || !activeInventory || !itemToDelete || !canEdit) return;

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
          'inventories',
          activeInventory.id,
          'items',
          itemToDelete.id
        )
      );
      setItemToDelete(null);
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.DELETE,
        `categories/${activeCategory.id}/inventories/${activeInventory.id}/items/${itemToDelete.id}`
      );
    }
  };

  // Open item movement history modal
  const handleOpenHistoryModal = (item: InventoryItem) => {
    setSelectedItemHistory(item);
    setIsHistoryModalOpen(true);

    if (isDemoUser) {
      setHistoryLogs([
        {
          id: 'hist-1',
          itemId: item.id,
          previousQuantity: 0,
          newQuantity: item.quantity,
          delta: item.quantity,
          reason: 'Entrada inicial no estoque',
          userId: 'demo-uid',
          username: item.updatedByUsername || 'capitao_robo',
          timestamp: item.updatedAt,
        },
      ]);
      return;
    }

    if (!activeCategory || !activeInventory) return;

    const histCol = collection(
      db,
      'categories',
      activeCategory.id,
      'inventories',
      activeInventory.id,
      'items',
      item.id,
      'history'
    );
    const q = query(histCol, orderBy('timestamp', 'desc'));

    onSnapshot(q, (snapshot) => {
      const logs: ItemHistory[] = [];
      snapshot.forEach((snap) => {
        logs.push({ id: snap.id, ...(snap.data() as Omit<ItemHistory, 'id'>) });
      });
      setHistoryLogs(logs);
    });
  };

  // Create new inventory tab
  const handleCreateInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCategory || !newInvName.trim() || !canEdit) return;

    if (isDemoUser) {
      const newInv: Inventory = {
        id: 'inv-' + Date.now(),
        name: newInvName.trim(),
        description: 'Inventário personalizado',
      };
      setInventories((prev) => [...prev, newInv]);
      setActiveInventory(newInv);
      setNewInvName('');
      setIsCreateInvModalOpen(false);
      return;
    }

    try {
      const invCol = collection(db, 'categories', activeCategory.id, 'inventories');
      const docRef = await addDoc(invCol, {
        name: newInvName.trim(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setActiveInventory({ id: docRef.id, name: newInvName.trim() });
      setNewInvName('');
      setIsCreateInvModalOpen(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `categories/${activeCategory.id}/inventories`);
    }
  };

  // Delete an inventory
  const handleDeleteInventory = async () => {
    if (!activeCategory || !invToDelete || !canEdit) return;

    if (isDemoUser) {
      setInventories((prev) => prev.filter((i) => i.id !== invToDelete.id));
      setActiveInventory(inventories.find((i) => i.id !== invToDelete.id) || null);
      setInvToDelete(null);
      return;
    }

    try {
      await deleteDoc(doc(db, 'categories', activeCategory.id, 'inventories', invToDelete.id));
      setInvToDelete(null);
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.DELETE,
        `categories/${activeCategory.id}/inventories/${invToDelete.id}`
      );
    }
  };

  // Export inventory to CSV
  const handleExportCsv = () => {
    if (!activeInventory || items.length === 0) return;
    const csvContent = exportInventoryToCsv(activeInventory.name, items);
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `inventario_${activeInventory.name.toLowerCase().replace(/\s+/g, '_')}_${
      new Date().toISOString().split('T')[0]
    }.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Extract all categories / tags from items
  const availableTags = React.useMemo(() => {
    const set = new Set<string>();
    items.forEach((item) => {
      if (item.category && item.category.trim()) {
        set.add(item.category.trim());
      }
    });
    return Array.from(set);
  }, [items]);

  // Filtered & sorted items
  const filteredItems = React.useMemo(() => {
    return items
      .filter((item) => {
        const matchesSearch =
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (item.location && item.location.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (item.notes && item.notes.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesTag = selectedTag === 'ALL' || item.category === selectedTag;
        const matchesAlert = !showOnlyAlerts || isBelowMin(item.quantity, item.minQuantity);

        return matchesSearch && matchesTag && matchesAlert;
      })
      .sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        if (sortBy === 'quantity') return b.quantity - a.quantity;
        if (sortBy === 'alert') {
          const aAlert = isBelowMin(a.quantity, a.minQuantity) ? 1 : 0;
          const bAlert = isBelowMin(b.quantity, b.minQuantity) ? 1 : 0;
          return bAlert - aAlert;
        }
        return (b.updatedAt || '').localeCompare(a.updatedAt || '');
      });
  }, [items, searchQuery, selectedTag, showOnlyAlerts, sortBy]);

  const alertCount = items.filter((i) => isBelowMin(i.quantity, i.minQuantity)).length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Category Header & Inventory Tabs */}
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
            <h1 className="text-xl font-black text-bull-text">Inventários da Categoria</h1>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {canEdit && (
              <>
                <button
                  onClick={() => setIsCreateInvModalOpen(true)}
                  className="py-2 px-3 rounded-xl bg-bull-surface-elevated hover:brightness-110 border border-bull-border text-bull-text font-bold text-xs flex items-center gap-1.5 transition"
                >
                  <Plus className="w-3.5 h-3.5 text-bull-primary" />
                  <span>Novo Inventário</span>
                </button>

                <button
                  onClick={() => handleOpenItemModal()}
                  className="py-2 px-3.5 rounded-xl bg-bull-primary hover:brightness-110 active:scale-95 text-bull-on-primary font-bold text-xs flex items-center gap-1.5 shadow-lg transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Adicionar Peça</span>
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

        {/* Sub-Inventories Carousel Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pt-3 scrollbar-none">
          {inventories.map((inv) => {
            const isSelected = activeInventory?.id === inv.id;
            return (
              <div key={inv.id} className="relative group shrink-0">
                <button
                  onClick={() => setActiveInventory(inv)}
                  className={`py-2 px-4 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                    isSelected
                      ? 'bg-bull-primary text-bull-on-primary shadow-md'
                      : 'bg-bull-surface-elevated text-bull-text hover:text-bull-primary border border-bull-border'
                  }`}
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>{inv.name}</span>
                </button>

                {isSelected && inventories.length > 1 && canEdit && (
                  <button
                    onClick={() => setInvToDelete(inv)}
                    className="absolute -top-1 -right-1 p-0.5 rounded-full bg-bull-alert text-white shadow opacity-0 group-hover:opacity-100 transition"
                    title="Excluir este inventário"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-bull-surface border border-bull-border rounded-2xl p-3 shadow-md space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-2.5">
          {/* Search Box */}
          <div className="relative flex-1 w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-bull-primary">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por peça, localização ou notas..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-bull-surface-elevated border border-bull-border text-bull-text placeholder:text-bull-text-muted/50 text-xs focus:outline-none focus:border-bull-primary"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
            {/* Tag Selector */}
            {availableTags.length > 0 && (
              <select
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
                className="px-2.5 py-2 rounded-xl bg-bull-surface-elevated border border-bull-border text-bull-text text-xs focus:outline-none focus:border-bull-primary cursor-pointer"
              >
                <option value="ALL">Todas as Tags</option>
                {availableTags.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            )}

            {/* Sort Order */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-2.5 py-2 rounded-xl bg-bull-surface-elevated border border-bull-border text-bull-text text-xs focus:outline-none focus:border-bull-primary cursor-pointer"
            >
              <option value="name">Nome (A-Z)</option>
              <option value="alert">Críticos Primeiro</option>
              <option value="quantity">Maior Quantidade</option>
              <option value="updatedAt">Atualização Recente</option>
            </select>

            {/* Critical Stock Badge Toggle */}
            <button
              onClick={() => setShowOnlyAlerts(!showOnlyAlerts)}
              className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                showOnlyAlerts
                  ? 'bg-bull-alert text-white shadow-md'
                  : 'bg-bull-surface-elevated border border-bull-border text-bull-text hover:border-bull-alert'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-bull-alert" />
              <span>Estoque Crítico ({alertCount})</span>
            </button>
          </div>
        </div>
      </div>

      {/* ITEMS LIST / GRID */}
      {filteredItems.length === 0 ? (
        /* Empty State with Gold illustration over Wine Background (Constitutional Mandate) */
        <div className="bg-bull-surface border border-bull-border rounded-3xl p-12 text-center shadow-xl space-y-4">
          <div className="w-24 h-24 mx-auto rounded-3xl bg-bull-surface-elevated border border-bull-primary/40 flex items-center justify-center text-bull-primary shadow-xl">
            <Boxes className="w-12 h-12" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-black text-bull-text">Nenhum item encontrado</h3>
            <p className="text-xs text-bull-text-muted max-w-sm mx-auto leading-relaxed">
              {searchQuery || selectedTag !== 'ALL' || showOnlyAlerts
                ? 'Nenhuma peça corresponde aos filtros selecionados. Tente ajustar a busca.'
                : 'Este inventário ainda não possui componentes cadastrados. Comece adicionando o primeiro item.'}
            </p>
          </div>
          {canEdit && (
            <button
              onClick={() => handleOpenItemModal()}
              className="mt-2 py-2.5 px-5 rounded-2xl bg-bull-primary text-bull-on-primary font-bold text-xs shadow-lg hover:brightness-110 active:scale-95 transition inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Cadastrar Primeiro Item</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => {
            const isAlert = isBelowMin(item.quantity, item.minQuantity);

            return (
              <div
                key={item.id}
                className={`rounded-3xl p-4 border transition-all flex flex-col justify-between shadow-lg relative ${
                  isAlert
                    ? 'bg-bull-surface border-bull-alert/60 ring-1 ring-bull-alert/40'
                    : 'bg-bull-surface border-bull-border hover:border-bull-primary/50'
                }`}
              >
                <div>
                  {/* Photo or Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      {item.photo ? (
                        <div
                          onClick={() => setPreviewPhoto(item.photo || null)}
                          className="w-14 h-14 rounded-2xl overflow-hidden border border-bull-border cursor-pointer shrink-0 relative group shadow"
                        >
                          <img
                            src={item.photo}
                            alt={item.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                            <Maximize2 className="w-4 h-4 text-white" />
                          </div>
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-2xl bg-bull-surface-elevated border border-bull-border flex items-center justify-center text-bull-primary shrink-0 shadow">
                          <Package className="w-6 h-6" />
                        </div>
                      )}

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {item.category && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-bull-surface-elevated text-bull-primary border border-bull-border">
                              {item.category}
                            </span>
                          )}
                          {isAlert && (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-bull-alert text-white shadow-sm flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              Abaixo do Mínimo
                            </span>
                          )}
                        </div>
                        <h4 className="font-black text-sm text-bull-text mt-1 leading-snug break-words">
                          {item.name}
                        </h4>
                      </div>
                    </div>

                    {/* Actions Menu */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenHistoryModal(item)}
                        title="Ver histórico de movimentações"
                        className="p-1.5 rounded-lg text-bull-text-muted hover:text-bull-primary hover:bg-bull-surface-elevated transition"
                      >
                        <History className="w-4 h-4" />
                      </button>

                      {canEdit && (
                        <>
                          <button
                            onClick={() => handleOpenItemModal(item)}
                            title="Editar item"
                            className="p-1.5 rounded-lg text-bull-text-muted hover:text-bull-primary hover:bg-bull-surface-elevated transition"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setItemToDelete(item)}
                            title="Excluir item"
                            className="p-1.5 rounded-lg text-bull-text-muted hover:text-bull-alert hover:bg-bull-surface-elevated transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Notes & Location */}
                  <div className="space-y-1 mb-4 text-xs text-bull-text-muted">
                    {item.location && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-bull-primary shrink-0" />
                        <span className="truncate">{item.location}</span>
                      </div>
                    )}
                    {item.notes && (
                      <p className="line-clamp-2 italic text-[11px] text-bull-text-muted/80">
                        "{item.notes}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Bottom Row: Quantity Badge and Fast +/- */}
                <div className="pt-3 border-t border-bull-border/40 flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-baseline gap-1.5">
                      <span
                        className={`text-2xl font-black ${
                          isAlert ? 'text-bull-alert' : 'text-bull-text'
                        }`}
                      >
                        {item.quantity}
                      </span>
                      <span className="text-xs text-bull-text-muted font-bold">{item.unit}</span>
                    </div>
                    <span className="text-[10px] text-bull-text-muted">
                      Mínimo: {item.minQuantity} {item.unit}
                    </span>
                  </div>

                  {/* Quick Adjust Buttons */}
                  {canEdit && (
                    <div className="flex items-center gap-1.5 bg-bull-surface-elevated p-1 rounded-2xl border border-bull-border shadow-inner">
                      <button
                        onClick={() => handleQuickAdjust(item, -1)}
                        disabled={item.quantity <= 0}
                        title="Diminuir 1"
                        className="w-8 h-8 rounded-xl bg-bull-surface hover:brightness-125 active:scale-95 text-bull-text font-black text-sm flex items-center justify-center transition disabled:opacity-40"
                      >
                        -1
                      </button>
                      <button
                        onClick={() => handleQuickAdjust(item, 1)}
                        title="Aumentar 1"
                        className="w-8 h-8 rounded-xl bg-bull-primary hover:brightness-110 active:scale-95 text-bull-on-primary font-black text-sm flex items-center justify-center transition shadow"
                      >
                        +1
                      </button>
                    </div>
                  )}
                </div>

                {/* Footer with updater info (Zero PII, username only) */}
                <div className="mt-2 text-[10px] text-bull-text-muted/70 flex items-center justify-between">
                  <span>Atualizado por: @{item.updatedByUsername || 'membro'}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT ITEM MODAL */}
      {isItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <div className="w-full max-w-lg bg-bull-surface border border-bull-border rounded-3xl p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-bull-border/40">
              <h3 className="text-lg font-black text-bull-text">
                {editingItem ? 'Editar Peça / Componente' : 'Cadastrar Nova Peça'}
              </h3>
              <button
                onClick={() => setIsItemModalOpen(false)}
                className="text-bull-text-muted hover:text-bull-text text-xl font-bold"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-bull-text-muted mb-1">
                  Nome da Peça *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="ex.: Módulo ESP32, Bateria LiPo 3S 1500mAh"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-bull-surface-elevated border border-bull-border text-bull-text text-xs focus:outline-none focus:border-bull-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-bull-text-muted mb-1">
                    Categoria / Tag
                  </label>
                  <input
                    type="text"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    placeholder="ex.: Sensores, Motores, Baterias"
                    className="w-full px-3 py-2 rounded-xl bg-bull-surface-elevated border border-bull-border text-bull-text text-xs focus:outline-none focus:border-bull-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-bull-text-muted mb-1">
                    Localização no Lab
                  </label>
                  <input
                    type="text"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    placeholder="ex.: Bancada 2, Gaveta 3"
                    className="w-full px-3 py-2 rounded-xl bg-bull-surface-elevated border border-bull-border text-bull-text text-xs focus:outline-none focus:border-bull-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-bull-text-muted mb-1">
                    Quantidade Atual *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={formQuantity}
                    onChange={(e) => setFormQuantity(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-bull-surface-elevated border border-bull-border text-bull-text text-xs focus:outline-none focus:border-bull-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-bull-text-muted mb-1">
                    Unidade *
                  </label>
                  <select
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl bg-bull-surface-elevated border border-bull-border text-bull-text text-xs focus:outline-none focus:border-bull-primary cursor-pointer"
                  >
                    {COMMON_UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-bull-text-muted mb-1">
                    Quantidade Mínima *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={formMinQuantity}
                    onChange={(e) => setFormMinQuantity(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-bull-surface-elevated border border-bull-border text-bull-text text-xs focus:outline-none focus:border-bull-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-bull-text-muted mb-1">
                  Observações
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Especificações técnicas, pinagem, compatibilidade..."
                  className="w-full px-3 py-2 rounded-xl bg-bull-surface-elevated border border-bull-border text-bull-text text-xs focus:outline-none focus:border-bull-primary resize-none"
                />
              </div>

              {/* Photo Upload with client-side compression */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-bull-text-muted mb-1">
                  Foto da Peça (Comprimida no cliente)
                </label>

                {formPhoto ? (
                  <div className="relative w-28 h-28 rounded-2xl overflow-hidden border border-bull-border shadow">
                    <img src={formPhoto} alt="Prévia" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setFormPhoto('')}
                      className="absolute top-1 right-1 p-1 rounded-full bg-bull-alert text-white shadow"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center p-4 rounded-2xl border-2 border-dashed border-bull-border/70 hover:border-bull-primary cursor-pointer bg-bull-surface-elevated transition">
                    <Camera className="w-6 h-6 text-bull-primary mb-1" />
                    <span className="text-xs font-bold text-bull-text">Tirar ou Enviar Foto</span>
                    <span className="text-[10px] text-bull-text-muted">
                      Comprimida automaticamente sem uso de armazenamento externo
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoSelect}
                      className="hidden"
                    />
                  </label>
                )}
                {isCompressing && (
                  <p className="text-[11px] text-bull-primary font-bold mt-1">Comprimindo imagem...</p>
                )}
                {photoError && (
                  <p className="text-[11px] text-bull-alert font-bold mt-1">{photoError}</p>
                )}
              </div>

              <div className="pt-3 border-t border-bull-border/40 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsItemModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-bull-border text-xs font-bold text-bull-text hover:bg-bull-surface-elevated transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || isCompressing}
                  className="px-5 py-2 rounded-xl bg-bull-primary text-bull-on-primary font-black text-xs hover:brightness-110 active:scale-95 transition shadow-lg disabled:opacity-50"
                >
                  {isSubmitting ? 'Salvando...' : editingItem ? 'Salvar Alterações' : 'Cadastrar Peça'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ITEM MOVEMENT HISTORY MODAL */}
      {isHistoryModalOpen && selectedItemHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-bull-surface border border-bull-border rounded-3xl p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-bull-border/40">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-bull-primary" />
                <h3 className="text-base font-black text-bull-text">Histórico de Movimentações</h3>
              </div>
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="text-bull-text-muted hover:text-bull-text text-xl font-bold"
              >
                ×
              </button>
            </div>

            <div>
              <p className="font-bold text-xs text-bull-text">{selectedItemHistory.name}</p>
              <p className="text-[11px] text-bull-text-muted">
                Quantidade atual: {selectedItemHistory.quantity} {selectedItemHistory.unit}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {historyLogs.length === 0 ? (
                <p className="text-xs text-bull-text-muted text-center py-6">
                  Nenhum registro de movimentação encontrado.
                </p>
              ) : (
                historyLogs.map((log) => {
                  const isPositive = log.delta > 0;
                  return (
                    <div
                      key={log.id}
                      className="p-3 rounded-2xl bg-bull-surface-elevated border border-bull-border flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-black ${
                              isPositive ? 'text-bull-success' : 'text-bull-alert'
                            }`}
                          >
                            {isPositive ? `+${log.delta}` : log.delta} {selectedItemHistory.unit}
                          </span>
                          <span className="text-bull-text-muted text-[11px]">({log.reason})</span>
                        </div>
                        <p className="text-[10px] text-bull-text-muted mt-0.5">
                          Por: @{log.username || 'membro'}
                        </p>
                      </div>
                      <span className="text-[10px] text-bull-text-muted">
                        {log.timestamp ? 'Registrado' : 'Agora'}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            <button
              onClick={() => setIsHistoryModalOpen(false)}
              className="w-full py-2.5 rounded-xl bg-bull-surface-elevated border border-bull-border text-bull-text text-xs font-bold hover:brightness-110"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* CREATE INVENTORY MODAL */}
      {isCreateInvModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-bull-surface border border-bull-border rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-black text-bull-text">Criar Novo Inventário</h3>
            <p className="text-xs text-bull-text-muted">
              Adicione uma subdivisão para a categoria (ex.: Eletrônica, Peças Mecânicas, Ferramentas).
            </p>

            <form onSubmit={handleCreateInventory} className="space-y-3.5">
              <input
                type="text"
                required
                value={newInvName}
                onChange={(e) => setNewInvName(e.target.value)}
                placeholder="ex.: Ferramentas Manuais"
                className="w-full px-3.5 py-2.5 rounded-xl bg-bull-surface-elevated border border-bull-border text-bull-text text-xs focus:outline-none focus:border-bull-primary"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateInvModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-bull-border text-xs font-bold text-bull-text"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-bull-primary text-bull-on-primary text-xs font-bold shadow-lg"
                >
                  Criar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FULL PHOTO PREVIEW MODAL */}
      {previewPhoto && (
        <div
          onClick={() => setPreviewPhoto(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md cursor-pointer animate-in fade-in"
        >
          <div className="max-w-xl max-h-[80vh] overflow-hidden rounded-3xl border border-bull-border p-2 bg-bull-surface shadow-2xl">
            <img src={previewPhoto} alt="Prévia Ampliada" className="w-full h-full object-contain rounded-2xl" />
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODALS */}
      <ConfirmModal
        isOpen={!!itemToDelete}
        title="Excluir Peça"
        message={`Deseja excluir "${itemToDelete?.name}" do inventário? Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
        isDanger={true}
        onConfirm={handleDeleteItem}
        onCancel={() => setItemToDelete(null)}
      />

      <ConfirmModal
        isOpen={!!invToDelete}
        title="Excluir Inventário"
        message={`Deseja excluir o inventário "${invToDelete?.name}"?`}
        confirmText="Excluir"
        isDanger={true}
        onConfirm={handleDeleteInventory}
        onCancel={() => setInvToDelete(null)}
      />
    </div>
  );
};
