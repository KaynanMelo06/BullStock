/**
 * Pure logic calculations and utilities for BullStock.
 * Decoupled from UI components for unit testing with Node 22 test runner.
 */

export interface ShoppingItemMath {
  quantity: number;
  estimatedPrice?: number;
  purchased: boolean;
}

export interface InventoryItemMath {
  id?: string;
  name: string;
  quantity: number;
  minQuantity: number;
  unit: string;
  category?: string;
}

/**
 * Checks if an item stock is at or below the minimum safe threshold.
 */
export function isBelowMin(quantity: number, minQuantity: number): boolean {
  if (minQuantity <= 0) return false;
  return quantity <= minQuantity;
}

/**
 * Calculates suggested replenishment quantity to reach minimum stock level.
 * Returns at least 1 if below min, otherwise 0.
 */
export function calcSuggestedRestock(quantity: number, minQuantity: number): number {
  if (quantity >= minQuantity) return 0;
  const diff = minQuantity - quantity;
  return Math.max(1, Math.ceil(diff));
}

/**
 * Calculates financial and count totals for a shopping list.
 */
export function calcListTotals(items: ShoppingItemMath[]): {
  totalEstimated: number;
  totalPurchased: number;
  purchasedCount: number;
  totalCount: number;
  progressPercent: number;
} {
  let totalEstimated = 0;
  let totalPurchased = 0;
  let purchasedCount = 0;
  const totalCount = items.length;

  for (const item of items) {
    const qty = Math.max(0, Number(item.quantity) || 0);
    const unitPrice = Math.max(0, Number(item.estimatedPrice) || 0);
    const itemTotal = qty * unitPrice;

    totalEstimated += itemTotal;
    if (item.purchased) {
      purchasedCount += 1;
      totalPurchased += itemTotal;
    }
  }

  const progressPercent = totalCount > 0 ? Math.round((purchasedCount / totalCount) * 100) : 0;

  return {
    totalEstimated: Math.round(totalEstimated * 100) / 100,
    totalPurchased: Math.round(totalPurchased * 100) / 100,
    purchasedCount,
    totalCount,
    progressPercent,
  };
}

/**
 * Generates an uppercase 6-character alphanumeric invite code.
 * Excludes easily confusable characters (0, O, 1, I).
 */
export function generateInviteCode(length = 6): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < length; i++) {
    const randIndex = Math.floor(Math.random() * chars.length);
    result += chars[randIndex];
  }
  return result;
}

/**
 * Formats Brazilian currency (BRL).
 */
export function formatCurrencyBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Exports inventory items to RFC4180 compliant CSV string.
 */
export function exportInventoryToCsv(inventoryName: string, items: Array<{
  name: string;
  category?: string;
  quantity: number;
  unit: string;
  minQuantity: number;
  location?: string;
  notes?: string;
  updatedByName?: string;
}>): string {
  const headers = ['Nome', 'Categoria', 'Quantidade', 'Unidade', 'Quantidade Mínima', 'Status', 'Localização', 'Observações', 'Última Atualização Por'];
  
  const escapeCsv = (str: string | number | undefined | null) => {
    if (str === undefined || str === null) return '""';
    const s = String(str).replace(/"/g, '""');
    return `"${s}"`;
  };

  const rows = items.map(item => {
    const status = isBelowMin(item.quantity, item.minQuantity) ? 'CRÍTICO / ABAIXO DO MÍNIMO' : 'NORMAL';
    return [
      escapeCsv(item.name),
      escapeCsv(item.category || 'Geral'),
      escapeCsv(item.quantity),
      escapeCsv(item.unit),
      escapeCsv(item.minQuantity),
      escapeCsv(status),
      escapeCsv(item.location || '-'),
      escapeCsv(item.notes || ''),
      escapeCsv(item.updatedByName || '-'),
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\r\n');
}

/**
 * Exports shopping list items to RFC4180 compliant CSV string.
 */
export function exportShoppingListToCsv(listName: string, items: Array<{
  name: string;
  quantity: number;
  unit: string;
  estimatedPrice?: number;
  purchased: boolean;
  link?: string;
  purchasedByName?: string;
}>): string {
  const headers = ['Item', 'Quantidade', 'Unidade', 'Preço Unitário Estimado (R$)', 'Total Estimado (R$)', 'Comprado', 'Comprado Por', 'Link'];
  
  const escapeCsv = (str: string | number | undefined | null) => {
    if (str === undefined || str === null) return '""';
    const s = String(str).replace(/"/g, '""');
    return `"${s}"`;
  };

  const rows = items.map(item => {
    const unitPrice = Number(item.estimatedPrice) || 0;
    const total = (Number(item.quantity) || 0) * unitPrice;
    return [
      escapeCsv(item.name),
      escapeCsv(item.quantity),
      escapeCsv(item.unit),
      escapeCsv(unitPrice.toFixed(2)),
      escapeCsv(total.toFixed(2)),
      escapeCsv(item.purchased ? 'SIM' : 'NÃO'),
      escapeCsv(item.purchasedByName || '-'),
      escapeCsv(item.link || ''),
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\r\n');
}
