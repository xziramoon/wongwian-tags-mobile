import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../constants';
import type { QueueItem } from '../types';
import type { FlipData } from '../flip/data';
import { countFlipPages, flowSheets, paperSheets } from './paper';

const q = (mode: QueueItem['TagMode'], qty: number) => ({ TagMode: mode, PrintQty: qty }) as QueueItem;
const flip = (variant: FlipData['variant'], qty = 1): FlipData =>
  ({ barcode: 'x', name: 'x', size: '', price: '1', pack: '', label: '', corner: '', footer: '', lot: '', qty, variant }) as FlipData;

describe('นับกระดาษ', () => {
  it('ไม่มีป้าย = 0 แผ่น', () => {
    expect(paperSheets([], DEFAULT_CONFIG)).toBe(0);
  });

  it('ป้ายปกติ 12 ใบ (5.4 × 4 ซม.) ใช้ 1 แผ่น', () => {
    expect(flowSheets([q('standard', 12)], DEFAULT_CONFIG)).toBe(1);
  });

  it('ป้ายปกติจำนวนมากขึ้นหน้าใหม่', () => {
    expect(flowSheets([q('standard', 200)], DEFAULT_CONFIG)).toBeGreaterThan(1);
  });

  it('ป้ายตู้แช่ได้แผ่นตารางของตัวเอง แยกจากป้ายปกติ', () => {
    const one = paperSheets([q('standard', 5), q('fridge', 1)], DEFAULT_CONFIG);
    expect(one).toBe(2);
  });

  it('ป้ายดำแดง: 15 ใบเต็ม ตัวป้าย 14 ใบ/แผ่น (2 แผ่น) + แถบ 18 ใบ/แผ่น (1 แผ่น)', () => {
    expect(countFlipPages([flip('full', 15)], 'both')).toBe(3);
    expect(countFlipPages([flip('full', 15)], 'tags')).toBe(2);
    expect(countFlipPages([flip('full', 15)], 'strips')).toBe(1);
  });

  it('ป้ายแคบ 28 ใบ/แผ่น (ตัวป้าย) และรวมเข้ายอดกระดาษ', () => {
    expect(countFlipPages([flip('narrow', 28)], 'tags')).toBe(1);
    expect(countFlipPages([flip('narrow', 29)], 'tags')).toBe(2);
    expect(paperSheets([q('standard', 3)], DEFAULT_CONFIG, 2)).toBe(3);
  });
});
