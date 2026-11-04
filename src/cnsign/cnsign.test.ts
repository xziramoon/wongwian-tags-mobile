import { describe, expect, it, vi } from 'vitest';

vi.mock('../lib/database', () => ({ database: { find: () => undefined, search: () => [], onChange: () => () => {} } }));

import type { QueueItem } from '../types';
import { CN_PRICE_BOX, DEFAULT_CN_SETTINGS, cnRed, cnVariant, nameSizeFor, priceSizeFor } from './config';
import { cnPageCount, fromQueueItem, queueToCnData, splitByOrient } from './data';

const item = (over: Partial<QueueItem> = {}): QueueItem =>
  ({
    Barcode: '8850144000013',
    ProductName: 'น้ำปลาทิพรส 700 มล.',
    Unit: 'ขวด',
    Unit2: '',
    PackType: '',
    Price: '35',
    Price2: '',
    Size: '',
    TagMode: 'cnsign',
    PrintQty: 1,
    ...over,
  }) as QueueItem;

describe('ป้ายจีน A4 · รหัสแบบ', () => {
  it('จับคู่สไตล์ × แนวกระดาษเป็น 4 แบบ', () => {
    expect(cnVariant('strip', 'portrait')).toBe('sp');
    expect(cnVariant('strip', 'landscape')).toBe('sl');
    expect(cnVariant('plaque', 'portrait')).toBe('pp');
    expect(cnVariant('plaque', 'landscape')).toBe('pl');
  });
});

describe('ป้ายจีน A4 · ขนาดชื่อตามจำนวนตัวอักษร (ตารางในสเปก)', () => {
  const name = (n: number) => 'ก'.repeat(n);
  it.each([
    ['sp', 12, 21], ['sp', 13, 18], ['sp', 20, 18], ['sp', 21, 15.3], ['sp', 30, 15.3], ['sp', 31, 12.7],
    ['sl', 16, 20], ['sl', 17, 17], ['sl', 24, 17], ['sl', 34, 14.3], ['sl', 35, 12.2],
    ['pl', 10, 19], ['pl', 18, 16.4], ['pl', 28, 13.8], ['pl', 29, 11.6],
    ['pp', 14, 22], ['pp', 22, 19], ['pp', 32, 16.4], ['pp', 33, 13.8],
  ] as const)('%s ชื่อ %i ตัว = %f มม.', (v, n, size) => {
    expect(nameSizeFor(v, name(n))).toBe(size);
  });
});

describe('ป้ายจีน A4 · ช่องราคา', () => {
  const fitSpy = vi.fn((_t: string, _f: string, _w: number, _maxW: number, maxS: number, _minS: number) => maxS);
  it('ส่ง maxW/maxH/minH ตามแบบ ด้วยฟอนต์ Potta One', () => {
    (['sp', 'sl', 'pl', 'pp'] as const).forEach((v) => {
      fitSpy.mockClear();
      priceSizeFor(v, 'น้ำปลา', '35', fitSpy);
      const b = CN_PRICE_BOX[v];
      expect(fitSpy).toHaveBeenCalledWith('35', "'Potta One',cursive", 400, b.maxW, b.maxH, b.minH);
    });
  });
  it('แถบตั้งแนวนอน: ชื่อเกิน 24 ตัว maxH ลดเหลือ 87 มม. (ชื่อกิน 2 บรรทัด)', () => {
    fitSpy.mockClear();
    priceSizeFor('sl', 'ก'.repeat(25), '35', fitSpy);
    expect(fitSpy.mock.calls[0][4]).toBe(87);
    fitSpy.mockClear();
    priceSizeFor('sl', 'ก'.repeat(24), '35', fitSpy);
    expect(fitSpy.mock.calls[0][4]).toBe(106);
  });
});

describe('ป้ายจีน A4 · ข้อมูลจากคิว', () => {
  const cfg = { branchLabel: '' };
  it('ราคาปลีกใส่จุลภาค · ไม่มีราคายกลัง = ซ่อนบรรทัดยกลัง (packPrice ว่าง)', () => {
    const d = fromQueueItem(item({ Price: '1250' }), DEFAULT_CN_SETTINGS, cfg);
    expect(d).toMatchObject({ price: '1,250', packPrice: '', branch: 'สาขาวงเวียน', barcode: '8850144000013' });
    expect(fromQueueItem(item({ Price2: '0' }), DEFAULT_CN_SETTINGS, cfg).packPrice).toBe('');
  });
  it('ยกลัง: ใช้ Unit2 (ว่าง = "ยกลัง") + PackType', () => {
    expect(fromQueueItem(item({ Price2: '399' }), DEFAULT_CN_SETTINGS, cfg)).toMatchObject({ packLabel: 'ยกลัง', packPrice: '399' });
    expect(fromQueueItem(item({ Price2: '399', Unit2: 'ลัง', PackType: '12 ขวด' }), DEFAULT_CN_SETTINGS, cfg).packLabel).toBe('ลัง 12 ขวด');
  });
  it('ขนาด: Size ว่าง → ดึงจากชื่อ', () => {
    expect(fromQueueItem(item({ ProductName: 'น้ำปลาทิพรส 700 มล.' }), DEFAULT_CN_SETTINGS, cfg).size).toContain('700');
    expect(fromQueueItem(item({ Size: '5 กก.' }), DEFAULT_CN_SETTINGS, cfg).size).toBe('5 กก.');
  });
  it('สไตล์/แนวต่อใบ ว่าง = ใช้ค่าตั้งต้นจาก settings', () => {
    const s = { ...DEFAULT_CN_SETTINGS, style: 'plaque' as const, orient: 'landscape' as const };
    expect(fromQueueItem(item(), s, cfg)).toMatchObject({ style: 'plaque', orient: 'landscape' });
    expect(fromQueueItem(item({ CnStyle: 'strip', CnOrient: 'portrait' }), s, cfg)).toMatchObject({ style: 'strip', orient: 'portrait' });
  });
  it('เลือกเฉพาะป้ายจีน · แยกงานตามแนวกระดาษ · นับแผ่นตาม PrintQty', () => {
    const list = queueToCnData(
      [item({ PrintQty: 2 }), item({ TagMode: 'standard' }), item({ CnOrient: 'landscape', PrintQty: 3 })],
      DEFAULT_CN_SETTINGS,
      cfg,
    );
    expect(list).toHaveLength(2);
    const g = splitByOrient(list);
    expect(g.portrait).toHaveLength(1);
    expect(g.landscape).toHaveLength(1);
    expect(cnPageCount(list)).toBe(5);
  });
});

describe('ป้ายจีน A4 · ขาว-ดำ', () => {
  it('mono = สีแดงเป็นดำ', () => {
    expect(cnRed({ ...DEFAULT_CN_SETTINGS, mono: true })).toBe('#111111');
    expect(cnRed({ ...DEFAULT_CN_SETTINGS, mono: false })).toBe(DEFAULT_CN_SETTINGS.red);
  });
});
