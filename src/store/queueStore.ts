import { create } from 'zustand';
import type { Config, DualStyle, QueueItem } from '../types';
import { CONFIG_STORAGE_KEY, DEFAULT_CONFIG, QUEUE_STORAGE_KEY, SIZE_PRESETS } from '../constants';
import { database } from '../lib/database';
import { printBridge } from '../lib/printBridge';
import { autoFontSize, extractSize } from '../lib/utils';
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

/* mirrors loadQueue()'s pattern — read from localStorage, fall back to defaults */
function loadConfig(): Config {
  try {
    const saved = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (saved) return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
  } catch {
    /* corrupted storage — fall back to defaults */
  }
  return { ...DEFAULT_CONFIG };
}

function persist(queue: QueueItem[], config: Config) {
  localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
}

/**
 * Looks up a barcode against the product DB and builds the QueueItem that adding it
 * would produce — used both as a scan/manual-search PREVIEW (before the user
 * confirms in ScanResultSheet) and as the payload passed to addItem() on confirm.
 * Ported to match desktop's addFromBarcode() "new item" branch exactly (Size via
 * extractSize() fallback, NameFontSize via config.globalNameSz -> autoFontSize()),
 * now that src/lib/utils.ts exists on the mobile side too. Reads live config via
 * useQueueStore.getState() rather than taking it as a parameter, so every call site
 * (CameraScanner, ManualSearchSheet) stays a one-line call.
 */
export function previewFromBarcode(code: string, exp = ''): { item: QueueItem; found: boolean } {
  const trimmed = String(code).trim();
  const product = database.find(trimmed);
  const config = useQueueStore.getState().config;
  const name = product ? product.ProductName || 'รหัส: ' + trimmed : 'รหัส: ' + trimmed;
  const size = product ? product.Size || extractSize(name) : extractSize(name);
  const globalSize = parseInt(String(config.globalNameSz), 10);
  const item = normalize({
    Barcode: trimmed,
    ProductName: name,
    NameFontSize: globalSize && globalSize > 0 ? globalSize : autoFontSize(name),
    TagMode: 'standard',
    OldPrice: '',
    Price: product ? product.Price || '0.00' : '0.00',
    PriceOffsetX: 0,
    Size: size,
    Unit: product ? product.Unit || 'ชิ้น' : 'ชิ้น',
    Ribbon: '',
    Unit2: 'ยกลัง',
    Price2: product ? product.Price2 || '' : '',
    Image: product ? product.Image || '' : '',
    Mfg: '',
    Exp: exp,
    PrintQty: 1,
  });
  return { item, found: !!product };
}

interface QueueState {
  queue: QueueItem[];
  config: Config;

  /** merges `item` into the queue: same Barcode already present → PrintQty bump by
   * item.PrintQty (keeps existing product data, refreshes Exp if provided); else appended. */
  addItem: (item: QueueItem) => void;
  /** convenience wrapper: look up + addItem in one call (mirrors desktop addFromBarcode) */
  addFromBarcode: (code: string, exp?: string) => { item: QueueItem; found: boolean };

  changeQty: (index: number, delta: number) => void;
  remove: (index: number) => void;
  clearQueue: () => void;

  /** global tag-design config — ported verbatim from desktop queueStore.ts */
  updateConfig: (key: keyof Config, value: string | number | boolean) => void;
  applyPreset: (size: 'S' | 'M' | 'L' | 'XL') => void;

  /** per-item field editors — ported verbatim from desktop queueStore.ts */
  updateQueueItem: (index: number, field: keyof QueueItem, value: string | number) => void;
  setDualStyle: (index: number, style: DualStyle) => void;

  /** the single publish entry point — sends the WHOLE current queue as one Ably
   * message (TAG_PRINTER.html beeps/prints once per message, not per item) and
   * clears the queue ONLY on success; on failure the queue is left intact and the
   * error is rethrown so the caller can show a retry toast. */
  sendQueue: () => Promise<void>;
}

export const useQueueStore = create<QueueState>((set, get) => ({
  queue: loadQueue(),
  config: loadConfig(),

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
      persist(queue, s.config);
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
      persist(queue, s.config);
      return { queue };
    });
  },

  remove: (index) => {
    set((s) => {
      const queue = s.queue.slice();
      queue.splice(index, 1);
      persist(queue, s.config);
      return { queue };
    });
  },

  clearQueue: () => {
    set((s) => {
      persist([], s.config);
      return { queue: [] };
    });
  },

  updateConfig: (key, value) => {
    set((s) => {
      const config = { ...s.config, [key]: value };
      let queue = s.queue;
      if (key === 'globalNameSz') {
        const gs = parseInt(String(value), 10);
        if (gs && gs > 0) {
          queue = s.queue.map((q) => ({ ...q, NameFontSize: gs }));
        }
      }
      persist(queue, config);
      return { config, queue };
    });
  },

  applyPreset: (size) => {
    const preset = SIZE_PRESETS[size];
    if (!preset) return;
    set((s) => {
      const config = { ...s.config, ...preset };
      persist(s.queue, config);
      return { config };
    });
    useUIStore.getState().showToast(`ใช้ขนาดสำเร็จรูป [${size}] แล้ว`, 'success');
  },

  updateQueueItem: (index, field, value) => {
    set((s) => {
      const queue = s.queue.slice();
      const item = { ...queue[index], [field]: value } as QueueItem;
      if (field === 'ProductName') {
        const globalSize = parseInt(String(s.config.globalNameSz), 10);
        item.NameFontSize = globalSize && globalSize > 0 ? globalSize : autoFontSize(String(value), item.TagMode);
      }
      if (field === 'Price') item.PriceDiff = null; // manual edit clears flag
      queue[index] = item;
      persist(queue, s.config);
      return { queue };
    });
  },

  setDualStyle: (index, style) => {
    set((s) => {
      const queue = s.queue.slice();
      queue[index] = { ...queue[index], DualStyle: style };
      persist(queue, s.config);
      return { queue };
    });
  },

  sendQueue: async () => {
    const { queue, config } = get();
    if (!queue.length) return;
    useUIStore.getState().setSending(true);
    try {
      await printBridge.publish(config, queue);
      set((s) => {
        persist([], s.config);
        return { queue: [] };
      });
      useUIStore.getState().showToast(`ส่งพิมพ์แล้ว · ${queue.length} รายการ`, 'success');
    } catch (err) {
      useUIStore.getState().showToast('ส่งไม่สำเร็จ กรุณาลองใหม่', 'error');
      throw err;
    } finally {
      useUIStore.getState().setSending(false);
    }
  },
}));
