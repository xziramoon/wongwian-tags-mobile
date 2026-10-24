import { create } from 'zustand';
import type { Config, DualStyle, QueueItem, SendHistoryEntry } from '../types';
import {
  CONFIG_STORAGE_KEY,
  DEFAULT_CONFIG,
  HISTORY_MAX_AGE_MS,
  HISTORY_MAX_BATCHES,
  HISTORY_STORAGE_KEY,
  QUEUE_STORAGE_KEY,
  SEND_DELAY_MS,
  SIZE_PRESETS,
} from '../constants';
import { database } from '../lib/database';
import { printBridge } from '../lib/printBridge';
import { autoFontSize, extractSize } from '../lib/utils';
import { printRank } from '../lib/fridge';
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
    OosEta: '',
    OosReason: 'temp',
    Loc: '',
    Printed: '',
    Veg: '',
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

function loadHistory(): SendHistoryEntry[] {
  try {
    const saved = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (saved) {
      const cutoff = Date.now() - HISTORY_MAX_AGE_MS;
      return (JSON.parse(saved) as SendHistoryEntry[])
        .filter((h) => h.ts >= cutoff)
        .map((h) => ({ ...h, items: h.items.map(normalize) }));
    }
  } catch {
    /* corrupted storage — start with empty history */
  }
  return [];
}

function persistHistory(history: SendHistoryEntry[]) {
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
  } catch {
    /* storage full — history is best-effort, never block a send */
  }
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
  /** ล็อตที่ส่งพิมพ์สำเร็จแล้ว (ใหม่สุดก่อน) — เผื่อกดส่งผิด */
  history: SendHistoryEntry[];

  /** merges `item` into the queue: same Barcode already present → PrintQty bump by
   * item.PrintQty (keeps existing product data, refreshes Exp if provided); else appended. */
  addItem: (item: QueueItem) => void;
  /** convenience wrapper: look up + addItem in one call (mirrors desktop addFromBarcode) */
  addFromBarcode: (code: string, exp?: string) => { item: QueueItem; found: boolean };
  /** ป้ายระบายเปล่า (ตู้แช่ ไม่มีชื่อ ไม่มีราคา) — ไม่ต้องสแกนสินค้า */
  addBlankFridge: (qty: number) => void;

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

  /** เวลาที่จะส่งจริง (Date.now() + SEND_DELAY_MS) ระหว่างรอให้กดยกเลิกได้ — null = ไม่มีงานรอส่ง */
  pendingSendAt: number | null;
  /** ทางเข้าของปุ่ม "ส่ง" ทุกปุ่ม — ตั้งเวลาส่ง แทนที่จะส่งทันที */
  requestSend: () => void;
  cancelSend: () => void;
  /** ข้ามการรอ ส่งทันที */
  sendNow: () => void;

  /** ดึงล็อตที่ส่งไปแล้วกลับเข้าคิว (รวมกับของที่มีในคิว) — ไม่ลบประวัติ
   * ดึงได้ครั้งเดียวต่อล็อต (restoredAt) กันกดซ้ำแล้วจำนวนป้ายคูณสอง */
  restoreFromHistory: (id: string) => void;
  removeHistory: (id: string) => void;
  clearHistory: () => void;
}

let sendTimer: ReturnType<typeof setTimeout> | undefined;

export const useQueueStore = create<QueueState>((set, get) => ({
  queue: loadQueue(),
  config: loadConfig(),
  history: loadHistory(),
  pendingSendAt: null,

  addItem: (item) => {
    set((s) => {
      const queue = s.queue.slice();
      const existingIdx = queue.findIndex(
        (i) => i.Barcode === item.Barcode && (i.Loc || '') === (item.Loc || '') && i.TagMode === item.TagMode,
      );
      if (existingIdx !== -1) {
        const existing = queue[existingIdx];
        queue[existingIdx] = {
          ...existing,
          PrintQty: existing.PrintQty + item.PrintQty,
          ...(item.Exp ? { Exp: item.Exp } : {}),
          /* กด เจ / ไม่เจ ตอนสแกนซ้ำ = ใช้ค่าล่าสุด ('' = ไม่ได้กด คงค่าเดิมไว้) */
          ...(item.Veg ? { Veg: item.Veg } : {}),
        };
      } else {
        queue.push(item);
      }
      persist(queue, s.config);
      return { queue };
    });
  },

  addBlankFridge: (qty) => {
    get().addItem(normalize({ Barcode: '', ProductName: '', TagMode: 'fridge', Price: '', Unit: '', PrintQty: Math.max(1, qty) }));
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
      // แถบสินค้าหมด (oos) สูงแค่ 1.4 ซม. ไม่เท่าป้ายอื่น (4.0 ซม.) — ถ้าปนกลางแถวใน A4
      // จะเกิดช่องว่างฟันหลอ เรียงแถบไปท้ายสุดของงานพิมพ์เสมอ — ป้ายตู้แช่ (3.5 ซม.) ก็สูงไม่เท่า จัดกลุ่มไว้ก่อนแถบ
      const ordered = [...queue].sort((a, b) => printRank(a.TagMode) - printRank(b.TagMode));
      await printBridge.publish(config, ordered);
      set((s) => {
        persist([], s.config);
        const history = [{ id: `${Date.now()}`, ts: Date.now(), items: queue }, ...s.history].slice(
          0,
          HISTORY_MAX_BATCHES,
        );
        persistHistory(history);
        return { queue: [], history };
      });
      useUIStore.getState().showToast(`ส่งพิมพ์แล้ว · ${queue.length} รายการ`, 'success');
    } catch (err) {
      useUIStore.getState().showToast('ส่งไม่สำเร็จ กรุณาลองใหม่', 'error');
      throw err;
    } finally {
      useUIStore.getState().setSending(false);
    }
  },

  restoreFromHistory: (id) => {
    const entry = get().history.find((h) => h.id === id);
    if (!entry) return;
    if (entry.restoredAt) {
      useUIStore.getState().showToast('ล็อตนี้ดึงกลับเข้าคิวไปแล้ว', 'info');
      return;
    }
    entry.items.forEach((it) => get().addItem(it));
    set((s) => {
      const history = s.history.map((h) => (h.id === id ? { ...h, restoredAt: Date.now() } : h));
      persistHistory(history);
      return { history };
    });
    useUIStore.getState().showToast(`ดึงกลับเข้าคิวแล้ว · ${entry.items.length} รายการ`, 'success');
  },

  requestSend: () => {
    if (!get().queue.length || get().pendingSendAt || useUIStore.getState().sending) return;
    clearTimeout(sendTimer);
    set({ pendingSendAt: Date.now() + SEND_DELAY_MS });
    sendTimer = setTimeout(() => get().sendNow(), SEND_DELAY_MS);
  },

  cancelSend: () => {
    clearTimeout(sendTimer);
    if (get().pendingSendAt) useUIStore.getState().showToast('ยกเลิกการส่งแล้ว — ป้ายยังอยู่ในคิว', 'info');
    set({ pendingSendAt: null });
  },

  sendNow: () => {
    clearTimeout(sendTimer);
    set({ pendingSendAt: null });
    void get().sendQueue().catch(() => {
      /* toast แจ้งไปแล้วใน sendQueue — คิวยังอยู่ กดส่งใหม่ได้ */
    });
  },

  removeHistory: (id) => {
    set((s) => {
      const history = s.history.filter((h) => h.id !== id);
      persistHistory(history);
      return { history };
    });
  },

  clearHistory: () => {
    persistHistory([]);
    set({ history: [] });
  },
}));
