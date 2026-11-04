import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../lib/database', () => ({
  database: { find: () => undefined, search: () => [], onChange: () => () => {}, sync: async () => [] },
}));

const publish = vi.fn(async () => {});
const publishFlip = vi.fn(async () => {});
const publishCnSign = vi.fn(async () => {});
vi.mock('../lib/printBridge', () => ({
  printBridge: { publish, publishFlip, publishCnSign, reconnect: () => {}, onStateChange: () => () => {} },
}));

const mem = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, String(v)),
  removeItem: (k: string) => void mem.delete(k),
});

import type { QueueItem } from '../types';

const item = (over: Partial<QueueItem> = {}): QueueItem =>
  ({
    Barcode: '8850144000013',
    ProductName: 'น้ำปลาทิพรส',
    Unit: 'ขวด',
    Unit2: '',
    PackType: '',
    Price: '35',
    Price2: '399',
    Size: '700 มล.',
    TagMode: 'cnsign',
    PrintQty: 1,
    ...over,
  }) as QueueItem;

describe('ส่งป้ายจีน A4 จากมือถือ', () => {
  beforeEach(() => {
    mem.clear();
    publish.mockClear();
    publishFlip.mockClear();
    publishCnSign.mockClear();
  });

  it('แยกงานตามแนวกระดาษ: แนวตั้ง 1 งาน แนวนอน 1 งาน ใส่ settings ไปด้วย', async () => {
    const { sendCnFromQueue } = await import('./cnSend');
    await sendCnFromQueue([item(), item({ Barcode: '2', CnOrient: 'landscape', CnStyle: 'plaque', PrintQty: 2 })]);
    expect(publishCnSign).toHaveBeenCalledTimes(2);
    const calls = publishCnSign.mock.calls as unknown as [unknown, { orient: string; settings: { shopCn: string }; items: { qty: number; style: string }[] }][];
    expect(calls[0][1]).toMatchObject({ orient: 'portrait', settings: { shopCn: '黄六盛' } });
    expect(calls[1][1]).toMatchObject({ orient: 'landscape' });
    expect(calls[1][1].items[0]).toMatchObject({ qty: 2, style: 'plaque' });
  });

  it('คิวผสม: ป้ายทั่วไปไป publish ปกติ · ป้ายจีนไปงาน cnsign ไม่ปนกัน · ส่งสำเร็จแล้วคิวว่าง', async () => {
    const { useQueueStore } = await import('../store/queueStore');
    useQueueStore.setState({ queue: [item({ TagMode: 'standard', Barcode: '1' }), item({ Barcode: '2' })] });
    await useQueueStore.getState().sendQueue();
    expect(publish).toHaveBeenCalledTimes(1);
    const stdItems = (publish.mock.calls as unknown as [unknown, { TagMode: string }[]][])[0][1];
    expect(stdItems.map((i) => i.TagMode)).toEqual(['standard']);
    expect(publishCnSign).toHaveBeenCalledTimes(1);
    expect(useQueueStore.getState().queue).toHaveLength(0);
  });

  it('ส่งป้ายจีนไม่สำเร็จ: คิวเหลือแต่ป้ายจีน (กันกดส่งซ้ำแล้วป้ายทั่วไปออกซ้ำ)', async () => {
    const { useQueueStore } = await import('../store/queueStore');
    publishCnSign.mockRejectedValueOnce(new Error('offline'));
    useQueueStore.setState({ queue: [item({ TagMode: 'standard', Barcode: '1' }), item({ Barcode: '2' })] });
    await expect(useQueueStore.getState().sendQueue()).rejects.toThrow();
    expect(useQueueStore.getState().queue.map((i) => i.TagMode)).toEqual(['cnsign']);
  });
});
