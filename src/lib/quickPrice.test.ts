import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanPrice, isValidPrice, makeQuickItem, pressKey, type KeypadKey } from './quickPrice';

const mem = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, String(v)),
  removeItem: (k: string) => void mem.delete(k),
});

const press = (keys: KeypadKey[], start = '') => keys.reduce((p, k) => pressKey(p, k), start);

describe('แป้นกดราคา', () => {
  it('กดเลขต่อกันเป็นราคา', () => {
    expect(press(['3', '5'])).toBe('35');
    expect(press(['1', '2', '5', '0'])).toBe('1250');
  });

  it('ไม่มีเลข 0 นำหน้า: 0 แล้วกดเลขอื่น = แทนที่', () => {
    expect(press(['0', '5'])).toBe('5');
    expect(press(['0', '0', '0'])).toBe('0');
  });

  it('จุดทศนิยม: จุดแรกได้ จุดที่สองไม่ได้ และกดจุดก่อนมีเลข = 0.', () => {
    expect(press(['1', '2', '.', '5'])).toBe('12.5');
    expect(press(['1', '.', '2', '.', '5'])).toBe('1.25');
    expect(press(['.', '5'])).toBe('0.5');
  });

  it('สตางค์ไม่เกิน 2 หลัก และจำนวนเต็มไม่เกิน 6 หลัก', () => {
    expect(press(['1', '.', '2', '5', '9'])).toBe('1.25');
    expect(press(['1', '2', '3', '4', '5', '6', '7'])).toBe('123456');
  });

  it('ลบทีละตัว / ล้างทั้งหมด', () => {
    expect(press(['back'], '35')).toBe('3');
    expect(press(['back'], '')).toBe('');
    expect(press(['clear'], '1250')).toBe('');
  });

  it('ราคาที่ปริ้นได้ต้องมากกว่า 0 และตัดจุดค้างท้าย', () => {
    expect(isValidPrice('')).toBe(false);
    expect(isValidPrice('0')).toBe(false);
    expect(isValidPrice('0.')).toBe(false);
    expect(isValidPrice('0.5')).toBe(true);
    expect(cleanPrice('35.')).toBe('35');
    expect(cleanPrice('35.5')).toBe('35.5');
  });
});

describe('ป้ายที่กดราคาเอง', () => {
  beforeEach(() => mem.clear());

  it('สร้างรายการไม่มีบาร์โค้ด ใช้ราคา/ชื่อ/หน่วย/จำนวนที่กด', () => {
    const item = makeQuickItem({ price: '35.', name: ' น้ำปลา ', unit: '', mode: 'standard', qty: 3, config: { globalNameSz: 0 } });
    expect(item).toMatchObject({ Barcode: '', ProductName: 'น้ำปลา', Price: '35', Unit: 'ชิ้น', TagMode: 'standard', PrintQty: 3 });
  });

  it('จำนวนขั้นต่ำ 1 ใบ และใช้ขนาดชื่อที่ตั้งทั้งร้านถ้ามี', () => {
    const item = makeQuickItem({ price: '10', name: 'x', unit: 'ขวด', mode: 'large', qty: 0, config: { globalNameSz: 18 } });
    expect(item.PrintQty).toBe(1);
    expect(item.NameFontSize).toBe(18);
    expect(item.Unit).toBe('ขวด');
  });

  it('ป้ายกดราคาคนละราคาไม่ถูกรวมเป็นใบเดียว (บาร์โค้ดว่างเหมือนกัน) แต่ราคา/ชื่อเดียวกันรวมจำนวน', async () => {
    const { useQueueStore } = await import('../store/queueStore');
    const mk = (price: string, name: string, qty: number) =>
      makeQuickItem({ price, name, unit: 'ชิ้น', mode: 'standard', qty, config: { globalNameSz: 0 } });
    useQueueStore.setState({ queue: [] });
    const add = useQueueStore.getState().addItem;
    add(mk('35', '', 1));
    add(mk('45', '', 1));
    add(mk('35', '', 2));
    add(mk('35', 'น้ำปลา', 1));
    const q = useQueueStore.getState().queue;
    expect(q.map((i) => [i.ProductName, i.Price, i.PrintQty])).toEqual([
      ['', '35', 3],
      ['', '45', 1],
      ['น้ำปลา', '35', 1],
    ]);
  });

  it('ป้ายตู้แช่เปล่า (ไม่มีชื่อ ไม่มีราคา) ยังรวมจำนวนเหมือนเดิม', async () => {
    const { useQueueStore } = await import('../store/queueStore');
    useQueueStore.setState({ queue: [] });
    useQueueStore.getState().addBlankFridge(24);
    useQueueStore.getState().addBlankFridge(24);
    const q = useQueueStore.getState().queue;
    expect(q).toHaveLength(1);
    expect(q[0].PrintQty).toBe(48);
  });
});
