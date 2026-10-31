import { describe, expect, it } from 'vitest';
import { buildHamperHTML, hamperPrice, hamperSheetLayout, hamperText } from './hamper';
import { printRank } from './fridge';
import { DEFAULT_CONFIG } from '../constants';
import type { QueueItem } from '../types';

const base = { ProductName: 'ซุปไก่สกัดแบรนด์', Price: '1095', Barcode: '8850999333444' } as QueueItem;

describe('hamperPrice', () => {
  it('adds thousands separators and keeps satang', () => {
    expect(hamperPrice('1095')).toBe('1,095');
    expect(hamperPrice('12500')).toBe('12,500');
    expect(hamperPrice('899.5')).toBe('899.50');
    expect(hamperPrice('')).toBe('');
    expect(hamperPrice('0')).toBe('');
  });
});

describe('hamperText', () => {
  it('blank = default, "-" = hidden', () => {
    expect(hamperText('', 'กระเช้าของขวัญ')).toBe('กระเช้าของขวัญ');
    expect(hamperText(' - ', 'กระเช้าของขวัญ')).toBe('');
    expect(hamperText('กระเช้าปีใหม่', 'x')).toBe('กระเช้าปีใหม่');
  });
});

describe('buildHamperHTML', () => {
  it('shows defaults, price on both faces and the barcode', () => {
    const html = buildHamperHTML(base, DEFAULT_CONFIG);
    expect(html).toContain('กระเช้าของขวัญ');
    expect(html).toContain('สวัสดีปีใหม่');
    expect(html).toContain('恭贺新禧');
    expect((html.match(/1,095/g) || []).length).toBe(2);
    expect(html).toContain('data-barcode="8850999333444"');
    expect(html).not.toContain('hp-sale');
    expect(html).not.toContain('hp-note');
  });
  it('uses the editable texts, escapes them and hides with "-"', () => {
    const html = buildHamperHTML(
      { ...base, HamperLabel: 'กระเช้า <ปีใหม่>', HamperNote: '12 ขวด & ถุงหิ้ว', HamperGreet: 'สุขสันต์วันตรุษจีน', HamperGreetCN: '-' },
      DEFAULT_CONFIG,
    );
    expect(html).toContain('กระเช้า &lt;ปีใหม่&gt;');
    expect(html).toContain('12 ขวด &amp; ถุงหิ้ว');
    expect(html).toContain('สุขสันต์วันตรุษจีน');
    expect(html).not.toContain('hp-greet-cn');
  });
  it('sale badge + struck old price only when old price is higher', () => {
    const sale = buildHamperHTML({ ...base, OldPrice: '1250' }, DEFAULT_CONFIG);
    expect(sale).toContain('ลดพิเศษ');
    expect(sale).toContain('<del>1,250</del>');
    expect(buildHamperHTML({ ...base, OldPrice: '900' }, DEFAULT_CONFIG)).not.toContain('<del>');
    expect(buildHamperHTML({ ...base, Ribbon: 'ขายดี' }, DEFAULT_CONFIG)).toContain('ขายดี');
  });
  it('mono class follows the print-mono setting', () => {
    expect(buildHamperHTML(base, { ...DEFAULT_CONFIG, printMono: true })).toContain('hamper-tag hp-mono');
  });
});

describe('hamperSheetLayout / printRank', () => {
  it('fits 3 fold strips of 6.5 x 19 cm on A4', () => {
    expect(hamperSheetLayout(DEFAULT_CONFIG)).toEqual({ cols: 3, rows: 1, perSheet: 3 });
  });
  it('orders hamper sheets after fridge sheets and before the oos strips', () => {
    expect(printRank('standard')).toBeLessThan(printRank('fridge'));
    expect(printRank('fridge')).toBeLessThan(printRank('hamper'));
    expect(printRank('hamper')).toBeLessThan(printRank('oos'));
  });
});
