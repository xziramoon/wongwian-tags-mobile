import { describe, expect, it, vi } from 'vitest';

vi.mock('../lib/database', () => ({ database: { find: () => undefined, search: () => [], onChange: () => () => {} } }));

import type { QueueItem } from '../types';
import { CN_PRICE_CAP, CN_PRICE_PAD, DEFAULT_CN_SETTINGS, cnRed, cnVariant, nameSizeFor } from './config';
import { priceFit, type InkMetrics } from './priceFit';
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

describe('ป้ายจีน A4 · ช่องราคา (ขยายให้ใหญ่สุดตามขอบหมึกจริง)', () => {
  // ตัวเลขสมมติ "35": หมึกกว้าง 1.164em สูง 0.86em
  const m: InkMetrics = { adv: 1.228, abl: -0.03, abr: 1.194, asc: 0.8, desc: 0.06, fa: 1.16, fd: 0.29 };
  const px = (css: string) => {
    const n = [...css.matchAll(/calc\(\(100(cqw|cqh) - ([\d.]+)mm\) \/ ([\d.]+)\)/g)];
    return Object.fromEntries(n.map((x) => [x[1], { pad: Number(x[2]), div: Number(x[3]) }]));
  };
  it('ขนาดตัวเลข = min(กว้าง, สูง, เพดาน) จากช่องที่เหลือจริง (cqw/cqh) ไม่ใช่ค่าตายตัว', () => {
    const f = priceFit('sp', m, 1);
    expect(f.fontSize).toMatch(/^min\(calc\(\(100cqw - /);
    expect(f.fontSize).toContain('100cqh');
    expect(f.fontSize.endsWith(`${CN_PRICE_CAP}mm)`)).toBe(true);
  });
  it('เผื่อมุมเอียง -4° จากขอบหมึกจริง: กว้าง/สูงหลังเอียงมากกว่าหมึกเดิมนิดหน่อย', () => {
    const { cqw, cqh } = px(priceFit('sp', m, 1).fontSize);
    expect(cqw.div).toBeGreaterThan(1.164); // 1.164cos4 + 0.86sin4 ≈ 1.221
    expect(cqw.div).toBeLessThan(1.3);
    expect(cqh.div).toBeGreaterThan(0.86); // 1.164sin4 + 0.86cos4 ≈ 0.939
    expect(cqh.div).toBeLessThan(1);
  });
  it('บาทใต้ตัวเลข: หักความสูงบาท+ระยะห่างจากช่อง · บาทข้างตัวเลข (sl): หักความกว้างบาทแทน', () => {
    const under = px(priceFit('sp', m, 1).fontSize);
    expect(under.cqh.pad).toBeCloseTo(2 * CN_PRICE_PAD.y + 16.4 + 1.6, 3);
    expect(under.cqw.pad).toBeCloseTo(2 * CN_PRICE_PAD.x, 3);
    const beside = px(priceFit('sl', m, 1.72).fontSize); // "บาท" กว้าง 1.72em ที่ 19 มม.
    expect(beside.cqw.pad).toBeCloseTo(2 * CN_PRICE_PAD.x + 1.72 * 19 + 6.4, 3);
    expect(beside.cqh.pad).toBeCloseTo(2 * CN_PRICE_PAD.y, 3);
  });
  it('กล่องสูงเท่าตัวเลขที่เอียงแล้ว และเอียง -4° พร้อมขยับให้หมึกอยู่กลางกล่อง', () => {
    const f = priceFit('pl', m, 1);
    expect(f.lineHeight).toBeGreaterThan(0.86);
    expect(f.transform).toMatch(/^rotate\(-4deg\) translate\(/);
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
