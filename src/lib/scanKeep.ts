import { previewFromBarcode, useQueueStore } from '../store/queueStore';
import { useOosStore } from '../store/oosStore';
import { useUIStore, withTagMode } from '../store/uiStore';

/* โหมด "สแกนแล้วเก็บเลย": สแกนติดแล้วเก็บเข้ารายการรอปริ้นทันที ไม่เปิดหน้าผลสแกน
 * บาร์โค้ดเดิมที่ยังอยู่ในกรอบ ไม่นับซ้ำภายใน KEEP_COOLDOWN_MS (ไม่งั้นสแกนค้างแล้วจำนวนใบพุ่งไม่หยุด) */
export const KEEP_COOLDOWN_MS = 3000;

let last: { code: string; at: number } | null = null;

export function resetKeepCooldown() {
  last = null;
}

export type KeepResult = 'kept' | 'ignored' | 'review';

/* kept = เก็บแล้ว · ignored = บาร์โค้ดเดิมยังอยู่ในกรอบ ข้าม · review = ต้องเปิดหน้าผลสแกนตามปกติ
 * (ปิดโหมดเก็บเลย / ไม่พบสินค้าในชีต ต้องกรอกเอง / เป็นสินค้าที่ลงทะเบียนว่าหมดไว้ ต้องเลือก ของเข้าแล้ว) */
export function tryKeepScan(code: string, now = Date.now()): KeepResult {
  const ui = useUIStore.getState();
  if (ui.scanMode !== 'keep') return 'review';
  const trimmed = code.trim();
  if (!trimmed) return 'review';
  const { item, found } = previewFromBarcode(trimmed);
  if (!found || useOosStore.getState().records[trimmed]) return 'review';

  if (last && last.code === trimmed && now - last.at < KEEP_COOLDOWN_MS) {
    last = { code: trimmed, at: now };
    return 'ignored';
  }
  last = { code: trimmed, at: now };

  const keep = withTagMode(item, ui.lastTagMode);
  useQueueStore.getState().addItem(keep);
  const queue = useQueueStore.getState().queue;
  const idx = queue.findIndex((i) => i.Barcode === keep.Barcode && (i.Loc || '') === (keep.Loc || '') && i.TagMode === keep.TagMode);
  ui.setLastKept({ barcode: keep.Barcode, mode: keep.TagMode, name: keep.ProductName, price: keep.Price, qty: idx >= 0 ? queue[idx].PrintQty : 1 });
  return 'kept';
}
