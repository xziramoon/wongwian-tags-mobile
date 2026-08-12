import { create } from 'zustand';
import type { QueueItem, ToastType } from '../types';

/* toast shape/pattern ported verbatim from wongwian-tags01/src/store/uiStore.ts */
export interface Toast {
  id: number;
  msg: string;
  type: ToastType;
}

let toastSeq = 0;

export type AblyStatus = 'connecting' | 'connected' | 'offline';
export type CameraStatus = 'starting' | 'active' | 'denied' | 'error';

interface UIState {
  toasts: Toast[];
  showToast: (msg: string, type?: ToastType) => void;
  removeToast: (id: number) => void;

  ablyStatus: AblyStatus;
  setAblyStatus: (status: AblyStatus) => void;

  cameraStatus: CameraStatus;
  setCameraStatus: (status: CameraStatus) => void;

  /* bottom sheet shown after a scan (or a manual-search tap) — scanSheetItem is a
   * preview QueueItem not yet committed to the queue; scanSheetFound tells the sheet
   * whether to render the found layout or the "ไม่พบสินค้า" manual-entry layout */
  scanSheetOpen: boolean;
  scanSheetItem: QueueItem | null;
  scanSheetFound: boolean;
  openScanSheet: (item: QueueItem, found: boolean) => void;
  updateScanSheetItem: (patch: Partial<QueueItem>) => void;
  closeScanSheet: () => void;

  queueDrawerOpen: boolean;
  setQueueDrawerOpen: (open: boolean) => void;

  manualSearchOpen: boolean;
  setManualSearchOpen: (open: boolean) => void;

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

  scanSheetOpen: false,
  scanSheetItem: null,
  scanSheetFound: true,
  openScanSheet: (item, found) => set({ scanSheetOpen: true, scanSheetItem: item, scanSheetFound: found }),
  updateScanSheetItem: (patch) =>
    set((s) => ({ scanSheetItem: s.scanSheetItem ? { ...s.scanSheetItem, ...patch } : s.scanSheetItem })),
  closeScanSheet: () => set({ scanSheetOpen: false, scanSheetItem: null }),

  queueDrawerOpen: false,
  setQueueDrawerOpen: (queueDrawerOpen) => set({ queueDrawerOpen }),

  manualSearchOpen: false,
  setManualSearchOpen: (manualSearchOpen) => set({ manualSearchOpen }),

  sending: false,
  setSending: (sending) => set({ sending }),
}));
