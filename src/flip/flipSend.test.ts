import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { QueueItem } from '../types';

const { publish, publishFlip } = vi.hoisted(() => ({ publish: vi.fn(), publishFlip: vi.fn() }));
vi.mock('../lib/printBridge', () => ({
  printBridge: { publish, publishFlip, onStateChange: () => () => {}, getState: () => 'connected' },
}));

const mem = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, String(v)),
  removeItem: (k: string) => void mem.delete(k),
});

const item = (barcode: string, mode: QueueItem['TagMode'], extra: Partial<QueueItem> = {}): QueueItem =>
  ({
    Barcode: barcode,
    ProductName: `สินค้า ${barcode}`,
    NameFontSize: 12,
    TagMode: mode,
    DualStyle: 'A',
    OldPrice: '',
    Price: '25',
    Price2: '400',
    PriceOffsetX: 0,
    Size: '600 มล.',
    Unit: 'ขวด',
    Unit1: '',
    Unit2: 'ยกลัง',
    PackType: '',
    Ribbon: '',
    Mfg: '',
    Exp: '',
    Image: '',
    PrintQty: 1,
    PriceDiff: null,
    OosEta: '',
    OosReason: 'temp',
    Loc: '',
    Printed: '',
    Veg: '',
    HamperLabel: '',
    HamperNote: '',
    HamperGreet: '',
    HamperGreetCN: '',
    ...extra,
  }) as QueueItem;

async function stores() {
  const { useQueueStore } = await import('../store/queueStore');
  const { useFlipStore } = await import('./store');
  return { queue: useQueueStore, flip: useFlipStore };
}

describe('ส่งป้ายดำแดงจากมือถือ', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mem.clear();
    const { queue, flip } = await stores();
    queue.setState({ queue: [], history: [], pendingSendAt: null });
    flip.setState({ overrides: {}, groups: [], lastPrinted: {}, tagsPrinted: {} });
    flip.getState().updateSetting('sendKind', 'both');
  });

  it('คิวผสม: ป้ายทั่วไปส่งแบบเดิม, ป้ายดำแดงส่งเป็นงานแยก (flip) ตามชนิดที่ตั้ง', async () => {
    const { queue, flip } = await stores();
    flip.getState().setOverride('2', 'variant', 'narrow');
    flip.getState().updateSetting('sendKind', 'strips');
    queue.setState({ queue: [item('1', 'standard'), item('2', 'flip')] });

    await queue.getState().sendQueue();

    expect(publish).toHaveBeenCalledTimes(1);
    expect((publish.mock.calls[0][1] as QueueItem[]).map((i) => i.Barcode)).toEqual(['1']);
    expect(publishFlip).toHaveBeenCalledTimes(1);
    const sent = publishFlip.mock.calls[0][1];
    expect(sent.kind).toBe('strips');
    expect(sent.items).toHaveLength(1);
    expect(sent.items[0]).toMatchObject({ barcode: '2', variant: 'narrow' });
    expect(queue.getState().queue).toEqual([]);
    expect(queue.getState().history).toHaveLength(1);
    // ส่งแถบสำเร็จ → บันทึกเข้ารายการ "ต้องเปลี่ยนวันนี้" (ยังไม่ได้เปลี่ยนที่ชั้น)
    expect(flip.getState().lastPrinted['2']).toMatchObject({ placed: false, variant: 'narrow' });
    expect(flip.getState().tagsPrinted['2']).toBeUndefined();
  });

  it('ส่งป้ายดำแดงไม่สำเร็จ: คิวเหลือเฉพาะป้ายดำแดง (ป้ายทั่วไปไม่ออกซ้ำ)', async () => {
    const { queue } = await stores();
    publishFlip.mockRejectedValueOnce(new Error('offline'));
    queue.setState({ queue: [item('1', 'standard'), item('2', 'flip')] });

    await expect(queue.getState().sendQueue()).rejects.toThrow();

    expect(publish).toHaveBeenCalledTimes(1);
    expect(queue.getState().queue.map((i) => i.Barcode)).toEqual(['2']);
    expect(queue.getState().history).toHaveLength(0);
  });

  it('คิวมีแต่ป้ายดำแดง: ไม่ส่งงานป้ายทั่วไปเลย', async () => {
    const { queue } = await stores();
    queue.setState({ queue: [item('2', 'flip')] });
    await queue.getState().sendQueue();
    expect(publish).not.toHaveBeenCalled();
    expect(publishFlip).toHaveBeenCalledTimes(1);
  });

  it('สมาชิกกลุ่มหลายตัวในคิว รวมเป็นป้ายกลุ่ม 1 ใบ และบันทึกเป็นรายการเดียว', async () => {
    const { queue, flip } = await stores();
    flip.getState().upsertGroup({
      id: 'g1',
      name: 'น้ำหอมพกพา',
      size: '20 มล.',
      corner: 'ทุกกลิ่นราคาเดียว',
      slots: 3,
      members: [
        { barcode: 'a', label: 'กลิ่นเอ' },
        { barcode: 'b', label: 'กลิ่นบี' },
      ],
    });
    flip.getState().setOverride('a', 'variant', 'group');
    flip.getState().setOverride('a', 'groupId', 'g1');
    flip.getState().setOverride('b', 'variant', 'group');
    flip.getState().setOverride('b', 'groupId', 'g1');
    queue.setState({ queue: [item('a', 'flip', { PrintQty: 2 }), item('b', 'flip', { PrintQty: 3 })] });

    await queue.getState().sendQueue();

    const sent = publishFlip.mock.calls[0][1];
    expect(sent.items).toHaveLength(1);
    expect(sent.items[0]).toMatchObject({ barcode: 'group:g1', variant: 'group', qty: 3 });
    expect(sent.items[0].group.members).toHaveLength(2);
    expect(flip.getState().tagsPrinted['group:g1']).toBeDefined();
    expect(flip.getState().lastPrinted['group:g1']).toBeDefined();
  });
});
