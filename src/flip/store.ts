import { useMemo } from 'react';
import { create } from 'zustand';
import { useQueueStore } from '../store/queueStore';
import { DEFAULT_FLIP_SETTINGS, FLIP_KEYS, type FlipSettings } from './config';
import type { FlipData, FlipGroup, FlipOverride, FlipOverrides, LastPrinted, TagPrinted, TodayRow } from './data';

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return { ...fallback, ...JSON.parse(raw) };
  } catch {
    /* storage เสีย/ถูกบล็อก — ใช้ค่าเริ่มต้น */
  }
  return fallback;
}
function loadGroups(): FlipGroup[] {
  try {
    const raw = localStorage.getItem(FLIP_KEYS.groups);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}
function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ไม่ให้การบันทึกล้มทำให้แอปพัง */
  }
}

export type FlipPrintKind = 'tags' | 'strips' | 'both' | 'stickers';
export interface FlipJob {
  kind: FlipPrintKind;
  items: FlipData[];
}

interface FlipState {
  settings: FlipSettings;
  overrides: FlipOverrides;
  lastPrinted: Record<string, LastPrinted>;
  tagsPrinted: Record<string, TagPrinted>;
  job: FlipJob | null;
  groups: FlipGroup[];

  updateSetting: <K extends keyof FlipSettings>(key: K, value: FlipSettings[K]) => void;
  setOverride: (barcode: string, key: keyof FlipOverride, value: string) => void;
  clearOverride: (barcode: string, key: keyof FlipOverride) => void;
  markStripsPrinted: (items: FlipData[]) => void;
  markTagsPrinted: (items: FlipData[]) => void;
  acknowledge: (rows: TodayRow[]) => void;
  setJob: (job: FlipJob | null) => void;
  upsertGroup: (g: FlipGroup) => void;
  removeGroup: (id: string) => void;
}

const today = () => new Date().toISOString();

export const useFlipStore = create<FlipState>((set) => ({
  settings: load(FLIP_KEYS.settings, DEFAULT_FLIP_SETTINGS),
  overrides: load<FlipOverrides>(FLIP_KEYS.overrides, {}),
  lastPrinted: load<Record<string, LastPrinted>>(FLIP_KEYS.lastPrinted, {}),
  tagsPrinted: load<Record<string, TagPrinted>>(FLIP_KEYS.tagsPrinted, {}),
  job: null,
  groups: loadGroups(),

  updateSetting: (key, value) =>
    set((s) => {
      const settings = { ...s.settings, [key]: value };
      save(FLIP_KEYS.settings, settings);
      return { settings };
    }),

  setOverride: (barcode, key, value) =>
    set((s) => {
      const overrides = { ...s.overrides, [barcode]: { ...s.overrides[barcode], [key]: value } };
      save(FLIP_KEYS.overrides, overrides);
      return { overrides };
    }),

  clearOverride: (barcode, key) =>
    set((s) => {
      const next = { ...s.overrides[barcode] };
      delete next[key];
      const overrides = { ...s.overrides };
      if (Object.keys(next).length) overrides[barcode] = next;
      else delete overrides[barcode];
      save(FLIP_KEYS.overrides, overrides);
      return { overrides };
    }),

  markStripsPrinted: (items) =>
    set((s) => {
      const lastPrinted = { ...s.lastPrinted };
      items.forEach((d) => {
        const prev = lastPrinted[d.barcode];
        const unplaced = prev?.placed === false;
        lastPrinted[d.barcode] = {
          price: d.price,
          pack: d.pack,
          label: d.label,
          date: today(),
          placed: false,
          prevPrice: prev ? (unplaced ? prev.prevPrice : prev.price) : undefined,
          prevPack: prev ? (unplaced ? prev.prevPack : prev.pack) : undefined,
          variant: d.variant,
        };
      });
      save(FLIP_KEYS.lastPrinted, lastPrinted);
      return { lastPrinted };
    }),

  markTagsPrinted: (items) =>
    set((s) => {
      const tagsPrinted = { ...s.tagsPrinted };
      items.forEach((d) => {
        tagsPrinted[d.barcode] = { name: d.sig ?? d.name, lot: d.lot, date: today() };
      });
      save(FLIP_KEYS.tagsPrinted, tagsPrinted);
      return { tagsPrinted };
    }),

  /* ติ๊ก "เปลี่ยนแล้ว" — ราคาบนชั้นตรงกับปัจจุบันแล้ว */
  acknowledge: (rows) =>
    set((s) => {
      const lastPrinted = { ...s.lastPrinted };
      rows.forEach((r) => {
        if (r.kind === 'mismatch') return; // แถวเตือนราคากลุ่มไม่เท่ากัน ไม่ใช่งานเปลี่ยนป้าย
        lastPrinted[r.data.barcode] = {
          variant: r.data.variant,
          price: r.newPrice,
          pack: r.newPack,
          label: r.data.label,
          date: today(),
          placed: true,
        };
      });
      save(FLIP_KEYS.lastPrinted, lastPrinted);
      return { lastPrinted };
    }),

  setJob: (job) => set({ job }),

  upsertGroup: (g) =>
    set((s) => {
      const groups = s.groups.some((x) => x.id === g.id) ? s.groups.map((x) => (x.id === g.id ? g : x)) : [...s.groups, g];
      save(FLIP_KEYS.groups, groups);
      return { groups };
    }),

  removeGroup: (id) =>
    set((s) => {
      const groups = s.groups.filter((x) => x.id !== id);
      save(FLIP_KEYS.groups, groups);
      return { groups };
    }),
}));

/* ตั้งค่าที่ใช้วาดจริง: รวมค่าจากตั้งค่าหลักของแอป — "พิมพ์ขาว-ดำ" (printMono) และฟอนต์ตัวเลขราคา (priceFont) */
const withApp = (settings: FlipSettings, printMono: boolean, priceFont: string): FlipSettings =>
  (printMono && !settings.mono) || priceFont
    ? { ...settings, mono: settings.mono || printMono, priceFont: priceFont || undefined }
    : settings;

export function useFlipSettings(): FlipSettings {
  const settings = useFlipStore((s) => s.settings);
  const printMono = useQueueStore((s) => !!s.config.printMono);
  const priceFont = useQueueStore((s) => String(s.config.priceFont || ''));
  return useMemo(() => withApp(settings, printMono, priceFont), [settings, printMono, priceFont]);
}

export const getFlipSettings = (): FlipSettings =>
  withApp(
    useFlipStore.getState().settings,
    !!useQueueStore.getState().config.printMono,
    String(useQueueStore.getState().config.priceFont || ''),
  );
