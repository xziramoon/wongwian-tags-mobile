import type { QueueItem, TagMode } from '../types';

/* แบบป้าย + สีประจำแบบ (ดีไซน์ใหม่) — ใช้เหมือนกันทุกหน้า: ปุ่มเลือกแบบ · แถวรายการ · แถบสรุปหน้าแรก · หน้านับถอยหลัง */
export interface TagTypeDef {
  key: TagMode;
  label: string;
  color: string;
}

export const TAG_TYPES: TagTypeDef[] = [
  { key: 'standard', label: 'ปกติ', color: '#F4F4F5' },
  { key: 'dual', label: 'ปลีก+ส่ง', color: '#60A5FA' },
  { key: 'large', label: 'ป้ายใหญ่', color: '#C084FC' },
  { key: 'fridge', label: 'ตู้แช่', color: '#22D3EE' },
  { key: 'hamper', label: 'กระเช้า', color: '#FBBF24' },
  { key: 'flip', label: 'ดำแดง', color: '#FF4D3D' },
  { key: 'cnsign', label: 'ป้ายจีน A4', color: '#FB923C' },
  { key: 'oos', label: 'ของหมด', color: '#A1A1AA' },
];

/* แบบที่เลือกได้ตอนสแกน (ของหมดมีปุ่มของมันเอง) */
export const SCAN_TYPES = TAG_TYPES.filter((t) => t.key !== 'oos');

export const typeDef = (mode: TagMode): TagTypeDef => TAG_TYPES.find((t) => t.key === mode) ?? TAG_TYPES[0];

export interface TypeCount {
  def: TagTypeDef;
  count: number; // จำนวนใบ
}

/* นับใบแยกตามแบบ (เรียงตาม TAG_TYPES, ข้ามแบบที่ไม่มี) */
export function summarizeByType(queue: QueueItem[]): TypeCount[] {
  const counts = new Map<TagMode, number>();
  queue.forEach((i) => counts.set(i.TagMode, (counts.get(i.TagMode) ?? 0) + Math.max(1, i.PrintQty || 1)));
  return TAG_TYPES.filter((t) => counts.has(t.key)).map((def) => ({ def, count: counts.get(def.key) ?? 0 }));
}

/* ชื่อที่โชว์ในรายการ — ป้ายที่ไม่มีชื่อ: ตู้แช่ = ป้ายตู้แช่เปล่า, แบบอื่น = ป้ายที่กดราคาเอง */
export const itemLabel = (i: QueueItem): string =>
  i.ProductName || (i.TagMode === 'fridge' ? 'ป้ายตู้แช่เปล่า' : 'ป้ายราคา (ไม่มีชื่อ)');

export const totalTags = (queue: QueueItem[]): number => queue.reduce((n, i) => n + Math.max(1, i.PrintQty || 1), 0);
