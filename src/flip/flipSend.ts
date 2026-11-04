import { printBridge } from '../lib/printBridge';
import { useQueueStore } from '../store/queueStore';
import { useUIStore } from '../store/uiStore';
import type { QueueItem } from '../types';
import { queueToFlipData, type FlipData } from './data';
import { getFlipSettings, useFlipStore, type FlipPrintKind } from './store';

/* ส่งงานป้ายดำแดงไปเครื่องปริ้นปลายทาง (TAG_PRINTER.html) — บันทึกประวัติ (ต้องเปลี่ยนวันนี้ / ตัวป้ายถาวร) เมื่อส่งสำเร็จ
 * โยน error ถ้าส่งไม่สำเร็จ ผู้เรียกแจ้งผู้ใช้เอง */
export async function publishFlipJob(kind: FlipPrintKind, items: FlipData[]): Promise<void> {
  await printBridge.publishFlip(useQueueStore.getState().config, { kind, settings: getFlipSettings(), items });
  const s = useFlipStore.getState();
  if (kind === 'strips' || kind === 'both') s.markStripsPrinted(items);
  if (kind === 'tags' || kind === 'both') s.markTagsPrinted(items);
}

export function flipDataFromQueue(items: QueueItem[]): FlipData[] {
  const s = useFlipStore.getState();
  return queueToFlipData(items, getFlipSettings(), s.overrides, s.groups);
}

/* ป้ายดำแดงในคิว — ส่งตามชนิดที่ตั้งไว้ (ตัวป้าย / แถบราคา / ทั้งคู่) */
export async function sendFlipFromQueue(items: QueueItem[]): Promise<void> {
  /* ป้ายที่กดราคาเอง (ไม่มีบาร์โค้ด) ปริ้นเฉพาะแถบราคาเสมอ — ไม่มีตัวป้ายถาวรให้ปริ้น */
  const quick = items.filter((i) => !i.Barcode);
  const scanned = items.filter((i) => i.Barcode);
  if (scanned.length) await publishFlipJob(useFlipStore.getState().settings.sendKind, flipDataFromQueue(scanned));
  if (quick.length) await publishFlipJob('strips', flipDataFromQueue(quick));
}

/* ส่งงานเดี่ยวจากหน้าอื่น (ต้องเปลี่ยนวันนี้ / สติกเกอร์ / ป้ายกลุ่ม) พร้อมแจ้งผล */
export async function sendFlipStandalone(kind: FlipPrintKind, items: FlipData[]): Promise<boolean> {
  const toast = useUIStore.getState().showToast;
  if (!items.length && kind !== 'stickers') {
    toast('ยังไม่มีป้ายดำแดงให้ปริ้น', 'error');
    return false;
  }
  try {
    await publishFlipJob(kind, items);
    toast('ส่งป้ายดำแดงไปเครื่องปริ้นแล้ว ✓', 'success');
    return true;
  } catch {
    toast('ส่งไม่สำเร็จ กรุณาลองใหม่', 'error');
    return false;
  }
}
