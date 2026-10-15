export type CategoryRole = 'capitao' | 'membro' | 'visualizador';
export type MemberStatus = 'pendente' | 'aprovado' | 'recusado';

export interface UserDoc {
  uid: string;
  username: string;
  createdAt?: any;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  color?: string;
  createdAt?: any;
  createdBy?: string;
}

export interface CategoryMember {
  uid: string;
  username: string;
  role: CategoryRole;
  status: MemberStatus;
  requestedAt?: any;
  approvedAt?: any;
  approvedBy?: string;
}

export interface SuperadminsDoc {
  uids: string[];
}

export interface Inventory {
  id: string;
  name: string;
  description?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface InventoryItem {
  id: string;
  name: string;
  category?: string; // tag
  quantity: number;
  unit: string;
  minQuantity: number;
  location?: string;
  notes?: string;
  photo?: string; // compressed base64 data URI
  updatedAt?: any;
  updatedBy?: string;
  updatedByUsername?: string;
}

export interface ItemHistory {
  id: string;
  itemId: string;
  previousQuantity: number;
  newQuantity: number;
  delta: number;
  reason: string;
  userId: string;
  username: string;
  timestamp?: any;
}

export interface ShoppingList {
  id: string;
  name: string;
  status: 'open' | 'finished';
  createdAt?: any;
  updatedAt?: any;
  createdBy?: string;
  createdByName?: string;
  totalEstimated?: number;
  totalPurchased?: number;
}

export interface ShoppingItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  estimatedPrice?: number;
  link?: string;
  purchased: boolean;
  purchasedAt?: any;
  purchasedBy?: string;
  purchasedByUsername?: string;
  inventoryItemId?: string;
  inventoryId?: string;
}

export type ActiveTab = 'categories' | 'inventory' | 'shopping' | 'requests' | 'profile';
