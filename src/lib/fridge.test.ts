import { describe, expect, it } from 'vitest';
import { buildFridgeHTML, chunkSheets, fridgeDigitsSVG, fridgeFillDigits, fridgeSheetLayout } from './fridge';
import { DEFAULT_CONFIG } from '../constants';
import type { QueueItem } from '../types';

const filled = (svg: string) => (svg.match(/fill="#000"/g) || []).length;

describe('fridgeFillDigits', () => {
  it('fills whole-baht prices that fit', () => {
    expect(fridgeFillDigits('12', 3)).toBe('12');
    expect(fridgeFillDigits('135.00', 3)).toBe('135');
  });
  it('leaves blank instead of rounding or overflowing', () => {
    expect(fridgeFillDigits('12.50', 3)).toBe('');
    expect(fridgeFillDigits('1350', 3)).toBe('');
    expect(fridgeFillDigits('0', 3)).toBe('');
    expect(fridgeFillDigits('', 3)).toBe('');
  });
});

describe('fridgeDigitsSVG', () => {
  it('draws 7 hollow segments per digit', () => {
    const svg = fridgeDigitsSVG(3, '');
    expect((svg.match(/<rect /g) || []).length).toBe(21);
    expect(filled(svg)).toBe(0);
  });
  it('fills right-aligned segments for the value', () => {
    expect(filled(fridgeDigitsSVG(3, '12'))).toBe(2 + 5); // 1 = bc, 2 = abged
    expect(filled(fridgeDigitsSVG(3, '888'))).toBe(21);
    expect(filled(fridgeDigitsSVG(4, '135'))).toBe(2 + 5 + 5);
  });
});

describe('buildFridgeHTML', () => {
  const item = { ProductName: 'เต้าหู้ยี้ <ผสม> & เต้าเจี้ยว', Price: '135' } as QueueItem;
  it('escapes the name and only fills when enabled', () => {
    const off = buildFridgeHTML(item, DEFAULT_CONFIG);
    expect(off).toContain('เต้าหู้ยี้ &lt;ผสม&gt; &amp; เต้าเจี้ยว');
    expect(filled(off)).toBe(0);
    expect(filled(buildFridgeHTML(item, { ...DEFAULT_CONFIG, fridgeFill: true }))).toBe(12);
  });
  it('defaults to the line header and 3 digits', () => {
    const html = buildFridgeHTML(item, { ...DEFAULT_CONFIG, fridgeBar: 'bogus', fridgeDigits: 7 });
    expect(html).toContain('fr-line');
    expect((html.match(/<rect /g) || []).length).toBe(21);
  });
});

describe('fridgeSheetLayout', () => {
  it('fits 24 tags of 60x35 mm on A4', () => {
    expect(fridgeSheetLayout(DEFAULT_CONFIG)).toEqual({ cols: 3, rows: 8, perSheet: 24 });
  });
  it('adapts to other sizes and never returns 0', () => {
    expect(fridgeSheetLayout({ ...DEFAULT_CONFIG, fridgeW: 9, fridgeH: 5 })).toEqual({ cols: 2, rows: 5, perSheet: 10 });
    expect(fridgeSheetLayout({ ...DEFAULT_CONFIG, fridgeW: 30, fridgeH: 40 }).perSheet).toBe(1);
  });
  it('chunks tags into sheets', () => {
    expect(chunkSheets([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });
});
