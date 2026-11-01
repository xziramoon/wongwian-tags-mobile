import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./database', () => {
  const products: Record<string, { Barcode: string; ProductName: string; Unit: string; Price: string; Price2: string; Image: string; Size: string }> = {
    '111': { Barcode: '111', ProductName: 'น้ำปลา 700 มล.', Unit: 'ขวด', Price: '35', Price2: '', Image: '', Size: '700 มล.' },
    '222': { Barcode: '222', ProductName: 'ซีอิ๊วขาว', Unit: 'ขวด', Price: '29', Price2: '', Image: '', Size: '' },
  };
  return {
    MIN_QUERY_LENGTH: 2,
    SEARCH_RESULT_CAP: 50,
    database: { find: (c: string) => products[c], search: () => [], onChange: () => () => {}, sync: async () => [] },
  };
});

const mem = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, String(v)),
  removeItem: (k: string) => void mem.delete(k),
});

async function load() {
  const keep = await import('./scanKeep');
  const { useQueueStore } = await import('../store/queueStore');
  const { useUIStore } = await import('../store/uiStore');
  const { useOosStore } = await import('../store/oosStore');
  return { keep, queue: useQueueStore, ui: useUIStore, oos: useOosStore };
}

describe('สแกนแล้วเก็บเลย', () => {
  beforeEach(async () => {
    mem.clear();
    const { keep, queue, ui, oos } = await load();
    keep.resetKeepCooldown();
    queue.setState({ queue: [] });
    ui.setState({ scanMode: 'keep', lastTagMode: 'standard', lastKept: null, recentKept: [] });
    oos.setState({ records: {} });
  });

  it('โหมดขอดูก่อนทุกชิ้น: ไม่เก็บ ให้เปิดหน้าผลสแกนตามปกติ', async () => {
    const { keep, queue, ui } = await load();
    ui.setState({ scanMode: 'review' });
    expect(keep.tryKeepScan('111', 1000)).toBe('review');
    expect(queue.getState().queue).toHaveLength(0);
  });

  it('เจอสินค้า: เก็บเข้ารายการทันที 1 ใบ และจำเป็น lastKept', async () => {
    const { keep, queue, ui } = await load();
    expect(keep.tryKeepScan('111', 1000)).toBe('kept');
    expect(queue.getState().queue).toMatchObject([{ Barcode: '111', PrintQty: 1, TagMode: 'standard' }]);
    expect(ui.getState().lastKept).toMatchObject({ barcode: '111', name: 'น้ำปลา 700 มล.', price: '35', qty: 1 });
  });

  it('บาร์โค้ดเดิมยังอยู่ในกรอบ: ข้าม ไม่นับซ้ำ (ยังเห็นต่อเนื่องก็ข้ามต่อ)', async () => {
    const { keep, queue } = await load();
    expect(keep.tryKeepScan('111', 1000)).toBe('kept');
    expect(keep.tryKeepScan('111', 1500)).toBe('ignored');
    expect(keep.tryKeepScan('111', 2900)).toBe('ignored');
    expect(queue.getState().queue[0].PrintQty).toBe(1);
  });

  it('ยกออกจากบาร์โค้ดนานพอแล้วสแกนใหม่ = ใบเพิ่ม (จำนวนรวมเป็น 2)', async () => {
    const { keep, queue, ui } = await load();
    keep.tryKeepScan('111', 1000);
    expect(keep.tryKeepScan('111', 1000 + 3000)).toBe('kept');
    expect(queue.getState().queue[0].PrintQty).toBe(2);
    expect(ui.getState().lastKept?.qty).toBe(2);
  });

  it('สินค้าอื่นสแกนต่อทันทีได้ และชิ้นก่อนหน้าไปอยู่ใน "ก่อนหน้านี้"', async () => {
    const { keep, queue, ui } = await load();
    keep.tryKeepScan('111', 1000);
    expect(keep.tryKeepScan('222', 1200)).toBe('kept');
    expect(queue.getState().queue).toHaveLength(2);
    expect(ui.getState().recentKept).toEqual([{ name: 'น้ำปลา 700 มล.', price: '35' }]);
  });

  it('ใช้แบบป้ายที่เลือกไว้บนกล้อง', async () => {
    const { keep, queue, ui } = await load();
    ui.setState({ lastTagMode: 'dual' });
    keep.tryKeepScan('111', 1000);
    expect(queue.getState().queue[0].TagMode).toBe('dual');
  });

  it('ไม่พบสินค้าในชีต: ต้องเปิดหน้าผลสแกนให้กรอกเอง (ไม่เก็บเงียบ)', async () => {
    const { keep, queue } = await load();
    expect(keep.tryKeepScan('999', 1000)).toBe('review');
    expect(queue.getState().queue).toHaveLength(0);
  });

  it('สินค้าที่ลงทะเบียนว่าหมดไว้: ต้องเปิดหน้าให้เลือก ของเข้าแล้ว', async () => {
    const { keep, queue, oos } = await load();
    oos.setState({ records: { '111': { Barcode: '111', ProductName: 'น้ำปลา', since: 1, eta: '', reason: 'temp' } } });
    expect(keep.tryKeepScan('111', 1000)).toBe('review');
    expect(queue.getState().queue).toHaveLength(0);
  });
});
