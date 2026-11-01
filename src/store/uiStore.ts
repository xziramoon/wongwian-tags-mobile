import { create } from 'zustand';
import type { QueueItem, TagMode, ToastType } from '../types';
import { PREFS_STORAGE_KEY } from '../constants';
import { autoFontSize } from '../lib/utils';

/* แบบป้ายที่เลือกได้ในหน้าผลสแกน (แถบสินค้าหมดมีปุ่ม/ขั้นตอนของตัวเอง) */
export const SCAN_TAG_MODES: TagMode[] = ['standard', 'dual', 'large', 'fridge', 'hamper', 'flip'];

interface Prefs {
  autoOpenCamera: boolean;
  /* แบบป้ายล่าสุดที่เลือกตอนสแกน — สแกนป้ายตู้แช่ทั้งแถวไม่ต้องกดเลือกใหม่ทุกชิ้น */
  lastTagMode: TagMode;
}

const DEFAULT_PREFS: Prefs = { autoOpenCamera: false, lastTagMode: 'standard' };

function loadPrefs(): Prefs {
  try {
    const saved = localStorage.getItem(PREFS_STORAGE_KEY);
    if (saved) {
      const p = { ...DEFAULT_PREFS, ...JSON.parse(saved) } as Prefs;
      if (!SCAN_TAG_MODES.includes(p.lastTagMode)) p.lastTagMode = 'standard';
      return p;
    }
  } catch {
    /* corrupted storage — defaults */
  }
  return { ...DEFAULT_PREFS };
}

const initialPrefs = loadPrefs();
let prefs = initialPrefs;
function savePrefs(patch: Partial<Prefs>) {
  prefs = { ...prefs, ...patch };
  try {
    localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* storage blocked — ค่าใช้ได้แค่รอบนี้ */
  }
}

/* เปลี่ยนแบบป้าย — ขนาดชื่อที่คำนวณอัตโนมัติไว้ (ป้ายใหญ่ใช้สูตรต่าง) คำนวณใหม่ตามแบบ
 * ถ้าผู้ใช้ตั้งขนาดชื่อเองทั้งร้าน (globalNameSz) ค่าจะไม่ตรงสูตร standard เลยไม่แตะ */
export function withTagMode(item: QueueItem, mode: TagMode): QueueItem {
  const autoSize = item.NameFontSize === autoFontSize(item.ProductName, item.TagMode);
  return { ...item, TagMode: mode, NameFontSize: autoSize ? autoFontSize(item.ProductName, mode) : item.NameFontSize };
}

/* toast shape/pattern ported verbatim from wongwian-tags01/src/store/uiStore.ts */
export interface Toast {
  id: number;
  msg: string;
  type: ToastType;
}

let toastSeq = 0;

export type AblyStatus = 'connecting' | 'connected' | 'offline';
export type QueueDrawerTab = 'queue' | 'oos' | 'history';
export type CameraStatus = 'starting' | 'active' | 'denied' | 'error';

interface UIState {
  toasts: Toast[];
  showToast: (msg: string, type?: ToastType) => void;
  removeToast: (id: number) => void;

  ablyStatus: AblyStatus;
  setAblyStatus: (status: AblyStatus) => void;

  cameraStatus: CameraStatus;
  setCameraStatus: (status: CameraStatus) => void;

  /* user-initiated camera on/off (separate from cameraStatus, which reflects what the
   * device/browser reports) — lets someone switch to search-only mode deliberately,
   * e.g. to save battery or when typing is faster than scanning right now */
  cameraEnabled: boolean;
  setCameraEnabled: (enabled: boolean) => void;

  /** ค่าตั้ง: เข้าแอปแล้วเปิดกล้องเลย (สำหรับคนสแกนทั้งวัน ไม่อยากกดเพิ่ม) */
  autoOpenCamera: boolean;
  setAutoOpenCamera: (on: boolean) => void;

  /* bottom sheet shown after a scan (or a manual-search tap) — scanSheetItem is a
   * preview QueueItem not yet committed to the queue; scanSheetFound tells the sheet
   * whether to render the found layout or the "ไม่พบสินค้า" manual-entry layout */
  scanSheetOpen: boolean;
  scanSheetItem: QueueItem | null;
  scanSheetFound: boolean;
  openScanSheet: (item: QueueItem, found: boolean) => void;
  lastTagMode: TagMode;
  setScanTagMode: (mode: TagMode) => void;
  updateScanSheetItem: (patch: Partial<QueueItem>) => void;
  closeScanSheet: () => void;

  queueDrawerOpen: boolean;
  /** เปิดลิ้นชักคิวที่แท็บไหน — การ์ด "สินค้าหมด" หน้าแรกเปิดตรงแท็บ oos */
  queueDrawerTab: QueueDrawerTab;
  setQueueDrawerOpen: (open: boolean, tab?: QueueDrawerTab) => void;
  setQueueDrawerTab: (tab: QueueDrawerTab) => void;

  manualSearchOpen: boolean;
  setManualSearchOpen: (open: boolean) => void;

  settingsSheetOpen: boolean;
  setSettingsSheetOpen: (open: boolean) => void;

  /** รายการป้ายดำแดง (แถบพลิก) ที่ต้องเปลี่ยนวันนี้ */
  flipTodayOpen: boolean;
  setFlipTodayOpen: (open: boolean) => void;

  /** TagEditSheet — either creating a new item from a scan/search preview, or
   * editing an existing queue row by index. null when the sheet is closed. */
  tagEditTarget: { mode: 'new'; item: QueueItem } | { mode: 'edit'; index: number } | null;
  openTagEditNew: (item: QueueItem) => void;
  openTagEditForIndex: (index: number) => void;
  closeTagEdit: () => void;

  sending: boolean;
  setSending: (sending: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  toasts: [],
  showToast: (msg, type = 'info') => {
    const id = ++toastSeq;
    set((s) => ({ toasts: [...s.toasts, { id, msg, type }] }));
  },
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  ablyStatus: 'connecting',
  setAblyStatus: (ablyStatus) => set({ ablyStatus }),

  cameraStatus: 'starting',
  setCameraStatus: (cameraStatus) => set({ cameraStatus }),

  /* ค่าเริ่มต้นเริ่มที่หน้าแรก — กล้องเปิดเมื่อกด "สแกนบาร์โค้ด" เว้นแต่เปิดค่าตั้ง autoOpenCamera ไว้ */
  cameraEnabled: initialPrefs.autoOpenCamera,
  /* เปิดใหม่ทุกครั้ง = ลองขอกล้องใหม่ (เคยถูกปฏิเสธ/error แล้วไปแก้สิทธิ์มา ก็ไม่ต้องรีโหลดหน้า) */
  setCameraEnabled: (cameraEnabled) =>
    set(cameraEnabled ? { cameraEnabled, cameraStatus: 'starting' } : { cameraEnabled }),

  autoOpenCamera: initialPrefs.autoOpenCamera,
  setAutoOpenCamera: (autoOpenCamera) => {
    savePrefs({ autoOpenCamera });
    set({ autoOpenCamera });
  },

  lastTagMode: initialPrefs.lastTagMode,
  setScanTagMode: (mode) => {
    savePrefs({ lastTagMode: mode });
    set((s) => ({ lastTagMode: mode, scanSheetItem: s.scanSheetItem ? withTagMode(s.scanSheetItem, mode) : s.scanSheetItem }));
  },

  scanSheetOpen: false,
  scanSheetItem: null,
  scanSheetFound: true,
  openScanSheet: (item, found) =>
    set((s) => ({ scanSheetOpen: true, scanSheetItem: withTagMode(item, s.lastTagMode), scanSheetFound: found })),
  updateScanSheetItem: (patch) =>
    set((s) => ({ scanSheetItem: s.scanSheetItem ? { ...s.scanSheetItem, ...patch } : s.scanSheetItem })),
  closeScanSheet: () => set({ scanSheetOpen: false, scanSheetItem: null }),

  queueDrawerOpen: false,
  queueDrawerTab: 'queue',
  setQueueDrawerOpen: (queueDrawerOpen, tab) =>
    set(queueDrawerOpen ? { queueDrawerOpen, queueDrawerTab: tab ?? 'queue' } : { queueDrawerOpen }),
  setQueueDrawerTab: (queueDrawerTab) => set({ queueDrawerTab }),

  manualSearchOpen: false,
  setManualSearchOpen: (manualSearchOpen) => set({ manualSearchOpen }),

  settingsSheetOpen: false,
  setSettingsSheetOpen: (settingsSheetOpen) => set({ settingsSheetOpen }),

  flipTodayOpen: false,
  setFlipTodayOpen: (flipTodayOpen) => set({ flipTodayOpen }),

  tagEditTarget: null,
  openTagEditNew: (item) => set({ tagEditTarget: { mode: 'new', item } }),
  openTagEditForIndex: (index) => set({ tagEditTarget: { mode: 'edit', index } }),
  closeTagEdit: () => set({ tagEditTarget: null }),

  sending: false,
  setSending: (sending) => set({ sending }),
}));
