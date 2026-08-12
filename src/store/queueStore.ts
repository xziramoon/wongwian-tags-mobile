import { create } from 'zustand';
import type { QueueItem } from '../types';
import { DEFAULT_CONFIG, QUEUE_STORAGE_KEY } from '../constants';
import { database } from '../lib/database';
import { printBridge } from '../lib/printBridge';
import { useUIStore } from './uiStore';

/* ⚠️ ตรรกะฟิลด์เริ่มต้น (normalize) ต้องคงเดิม — ยกมาจาก
 * wongwian-tags01/src/store/queueStore.ts normalize() ตรงตัว เพื่อให้ item ที่ส่งไป
 * ตรงกับ normalizeItem() ฝั่ง TAG_PRINTER.html */
function normalize(q: Partial<QueueItem>): QueueItem {
  return {
    Barcode: '',
    ProductName: '',
    NameFontSize: 0,
    TagMode: 'standard',
    DualStyle: 'A',
    OldPrice: '',
    Price: '0.00',
    Price2: '',
    PriceOffsetX: 0,
    Size: '',
    Unit: 'ชิ้น',
    Unit1: '',
    Unit2: '',
    PackType: '',
    Ribbon: '',
    Mfg: '',
    Exp: '',
    Image: '',
    PrintQty: 1,
    PriceDiff: null,
    ...q,
  };
}

function loadQueue(): QueueItem[] {
  try {
    const saved = localStorage.getItem(QUEUE_STORAGE_KEY);
    if (saved) return (JSON.parse(saved) as Partial<QueueItem>[]).map(normalize);
  } catch {
    /* corrupted storage — start with empty queue */
  }
  return [];
}

function persist(queue: QueueItem[]) {
  localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
}

/**
 * Looks up a barcode against the product DB and builds the QueueItem that adding it
 * would produce — used both as a scan/manual-search PREVIEW (before the user
 * confirms in ScanResultSheet) and as the payload passed to addItem() on confirm.
 * Field defaults mirror the desktop addFromBarcode() "new item" branch: product data
 * when found, else a 'รหัส: <code>' placeholder name — exactly like desktop.
 *
 * Deviation from desktop: desktop's addFromBarcode() also derives NameFontSize via
 * autoFontSize()/extractSize() (src/lib/utils.ts, not part of this app's ground-truth
 * file list). The mobile app has no per-tag font-size UI, so NameFontSize is left at
 * normalize()'s default of 0 — TAG_PRINTER.html's normalizeItem() already falls back
 * to a sane default (`item.NameFontSize || 13`) when it's 0, so tags still render.
 */
export function previewFromBarcode(code: string, exp = ''): { item: QueueItem; found: boolean } {
  const trimmed = String(code).trim();
  const product = database.find(trimmed);
  const name = product ? product.ProductName || 'รหัส: ' + trimmed : 'รหัส: ' + trimmed;
  const item = normalize({
    Barcode: trimmed,
    ProductName: name,
    TagMode: 'standard',
    Price: product ? product.Price || '0.00' : '0.00',
    Size: product ? product.Size || '' : '',
    Unit: product ? product.Unit || 'ชิ้น' : 'ชิ้น',
    Unit2: 'ยกลัง',
    Price2: product ? product.Price2 || '' : '',
    Image: product ? product.Image || '' : '',
    Exp: exp,
    PrintQty: 1,
  });
  return { item, found: !!product };
}

interface QueueState {
  queue: QueueItem[];

  /** merges `item` into the queue: same Barcode already present → PrintQty bump by
   * item.PrintQty (keeps existing product data, refreshes Exp if provided); else appended. */
  addItem: (item: QueueItem) => void;
  /** convenience wrapper: look up + addItem in one call (mirrors desktop addFromBarcode) */
  addFromBarcode: (code: string, exp?: string) => { item: QueueItem; found: boolean };

  changeQty: (index: number, delta: number) => void;
  remove: (index: number) => void;
  clearQueue: () => void;

  /** the single publish entry point — sends the WHOLE current queue as one Ably
   * message (TAG_PRINTER.html beeps/prints once per message, not per item) and
   * clears the queue ONLY on success; on failure the queue is left intact and the
   * error is rethrown so the caller can show a retry toast. */
  sendQueue: () => Promise<void>;
}

export const useQueueStore = create<QueueState>((set, get) => ({
  queue: loadQueue(),

  addItem: (item) => {
    set((s) => {
      const queue = s.queue.slice();
      const existingIdx = queue.findIndex((i) => i.Barcode === item.Barcode);
      if (existingIdx !== -1) {
        const existing = queue[existingIdx];
        queue[existingIdx] = {
          ...existing,
          PrintQty: existing.PrintQty + item.PrintQty,
          ...(item.Exp ? { Exp: item.Exp } : {}),
        };
      } else {
        queue.push(item);
      }
      persist(queue);
      return { queue };
    });
  },

  addFromBarcode: (code, exp = '') => {
    const result = previewFromBarcode(code, exp);
    get().addItem(result.item);
    return result;
  },

  changeQty: (index, delta) => {
    set((s) => {
      const queue = s.queue.slice();
      const item = queue[index];
      if (!item) return { queue: s.queue };
      queue[index] = { ...item, PrintQty: Math.max(1, item.PrintQty + delta) };
      persist(queue);
      return { queue };
    });
  },

  remove: (index) => {
    set((s) => {
      const queue = s.queue.slice();
      queue.splice(index, 1);
      persist(queue);
      return { queue };
    });
  },

  clearQueue: () => {
    set({ queue: [] });
    persist([]);
  },

  sendQueue: async () => {
    const { queue } = get();
    if (!queue.length) return;
    useUIStore.getState().setSending(true);
    try {
      await printBridge.publish(DEFAULT_CONFIG, queue);
      set({ queue: [] });
      persist([]);
      useUIStore.getState().showToast(`ส่งพิมพ์แล้ว · ${queue.length} รายการ`, 'success');
    } catch (err) {
      useUIStore.getState().showToast('ส่งไม่สำเร็จ กรุณาลองใหม่', 'error');
      throw err;
    } finally {
      useUIStore.getState().setSending(false);
    }
  },
}));
