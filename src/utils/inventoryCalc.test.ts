import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isBelowMin,
  calcSuggestedRestock,
  calcListTotals,
  generateInviteCode,
  exportInventoryToCsv,
  exportShoppingListToCsv,
} from './inventoryCalc.ts';

test('isBelowMin returns true when quantity is at or below minQuantity', () => {
  assert.equal(isBelowMin(2, 5), true, '2 is below 5');
  assert.equal(isBelowMin(5, 5), true, '5 is equal to min 5 (alert condition)');
  assert.equal(isBelowMin(6, 5), false, '6 is above 5');
  assert.equal(isBelowMin(0, 0), false, '0 min threshold should not trigger false alert');
});

test('calcSuggestedRestock computes minimum required replenishment', () => {
  assert.equal(calcSuggestedRestock(2, 10), 8, '10 - 2 = 8');
  assert.equal(calcSuggestedRestock(10, 10), 0, 'No restock needed if at minimum');
  assert.equal(calcSuggestedRestock(15, 10), 0, 'No restock needed if above minimum');
  assert.equal(calcSuggestedRestock(0, 5), 5, '5 needed if completely out of stock');
});

test('calcListTotals aggregates prices, totals and completion percentage', () => {
  const items = [
    { quantity: 2, estimatedPrice: 15.5, purchased: true },
    { quantity: 1, estimatedPrice: 20.0, purchased: false },
    { quantity: 4, estimatedPrice: 5.0, purchased: true },
  ];

  const result = calcListTotals(items);
  // Item 1: 2 * 15.5 = 31 (purchased)
  // Item 2: 1 * 20.0 = 20 (not purchased)
  // Item 3: 4 * 5.0 = 20 (purchased)
  // Total Estimated: 31 + 20 + 20 = 71
  // Total Purchased: 31 + 20 = 51
  // Purchased Count: 2 out of 3 = 67%
  assert.equal(result.totalEstimated, 71.0);
  assert.equal(result.totalPurchased, 51.0);
  assert.equal(result.purchasedCount, 2);
  assert.equal(result.totalCount, 3);
  assert.equal(result.progressPercent, 67);
});

test('calcListTotals handles empty list safely', () => {
  const result = calcListTotals([]);
  assert.equal(result.totalEstimated, 0);
  assert.equal(result.totalPurchased, 0);
  assert.equal(result.purchasedCount, 0);
  assert.equal(result.totalCount, 0);
  assert.equal(result.progressPercent, 0);
});

test('generateInviteCode produces 6-character valid uppercase code without ambiguous letters', () => {
  const code = generateInviteCode(6);
  assert.equal(code.length, 6);
  assert.match(code, /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/);
  // Ensure no confusable chars
  assert.equal(code.includes('0'), false);
  assert.equal(code.includes('O'), false);
  assert.equal(code.includes('1'), false);
  assert.equal(code.includes('I'), false);
});

test('exportInventoryToCsv generates well-formed CSV with headers and escaped values', () => {
  const csv = exportInventoryToCsv('Eletrônica', [
    {
      name: 'Resistor 10k "Ohm"',
      category: 'Passivos',
      quantity: 5,
      unit: 'un',
      minQuantity: 10,
      location: 'Gaveta 1',
      notes: 'Alta precisão',
      updatedByName: 'Carlos',
    },
  ]);

  assert.match(csv, /^Nome,Categoria,Quantidade/);
  assert.equal(csv.includes('"Resistor 10k ""Ohm"""'), true);
  assert.equal(csv.includes('"CRÍTICO / ABAIXO DO MÍNIMO"'), true);
});

test('exportShoppingListToCsv generates valid CSV with totals and purchase state', () => {
  const csv = exportShoppingListToCsv('Compras Robô', [
    {
      name: 'Motor N20 6V',
      quantity: 4,
      unit: 'un',
      estimatedPrice: 25.5,
      purchased: true,
      purchasedByName: 'Ana',
      link: 'https://exemplo.com/motor',
    },
  ]);

  assert.match(csv, /^Item,Quantidade/);
  assert.equal(csv.includes('"Motor N20 6V"'), true);
  assert.equal(csv.includes('"102.00"'), true);
  assert.equal(csv.includes('"SIM"'), true);
});
