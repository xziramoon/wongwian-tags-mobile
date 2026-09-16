import { create } from 'zustand';
import type { OosReason } from '../types';
import { OOS_STORAGE_KEY } from '../constants';

/* Phase 2 — OOS registry: tracks which barcodes currently have an OOS strip out on
 * the shelf, separate from the print queue (queueStore) — a barcode stays registered
 * here from the moment the strip goes up until someone taps "ของเข้าแล้ว", regardless
 * of how many print jobs happen in between. Deliberately its own store/file rather
 * than folded into queueStore, since it's a different kind of state (a standing
 * registry, not a transient print queue). */
export interface OosRecord {
  Barcode: string;
  ProductName: string;
  since: number; // Date.now() ตอนติดป้าย
  eta: string;
  reason: OosReason;
}

/* keyed by Barcode for O(1) find/clear — mirrors loadQueue()/persist() in
 * queueStore.ts, just storing a Record instead of an array */
function loadRegistry(): Record<string, OosRecord> {
  try {
    const saved = localStorage.getItem(OOS_STORAGE_KEY);
    if (saved) return JSON.parse(saved) as Record<string, OosRecord>;
  } catch {
    /* corrupted storage — start with empty registry */
  }
  return {};
}

function persist(records: Record<string, OosRecord>) {
  localStorage.setItem(OOS_STORAGE_KEY, JSON.stringify(records));
}

interface OosState {
  records: Record<string, OosRecord>;

  /** adds/overwrites the record for rec.Barcode — if it's already registered, keeps
   * the existing `since` (re-tagging the same barcode isn't a new "went out of stock"
   * event, so the day count shouldn't reset) */
  add: (rec: OosRecord) => void;
  clear: (barcode: string) => void;
  find: (barcode: string) => OosRecord | undefined;
  daysOut: (barcode: string) => number;
}

export const useOosStore = create<OosState>((set, get) => ({
  records: loadRegistry(),

  add: (rec) => {
    set((s) => {
      const existing = s.records[rec.Barcode];
      const records = {
        ...s.records,
        [rec.Barcode]: { ...rec, since: existing ? existing.since : rec.since },
      };
      persist(records);
      return { records };
    });
  },

  clear: (barcode) => {
    set((s) => {
      if (!(barcode in s.records)) return s;
      const records = { ...s.records };
      delete records[barcode];
      persist(records);
      return { records };
    });
  },

  find: (barcode) => get().records[barcode],

  daysOut: (barcode) => {
    const rec = get().records[barcode];
    if (!rec) return 0;
    return Math.floor((Date.now() - rec.since) / 86400000);
  },
}));
