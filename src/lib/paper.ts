import type { Config, QueueItem } from '../types';
import type { FlipData } from '../flip/data';
import { packPages, stripSize, tagSize } from '../flip/layout';
import { fridgeSheetLayout } from './fridge';
import { hamperSheetLayout } from './hamper';

/* นับกระดาษ A4 ที่ต้องใช้ — ประมาณจากขนาดป้ายในตั้งค่า (ใช้ตัวเลขเดียวกับที่ตัวรับ TAG_PRINTER จัดหน้า)
 *  - ป้ายปกติ / 2 ราคา / ใหญ่ / แถบของหมด: ไหลต่อกันบนแผ่นเดียวกัน → ประมาณจากพื้นที่ (ขอบ 2 มม. ช่องว่าง 2 มม. ใช้พื้นที่ได้ ~90%)
 *  - ป้ายตู้แช่ / กระเช้า: แผ่นตารางของตัวเอง ขึ้นหน้าใหม่ (ใบต่อแผ่นตามขนาดในตั้งค่า)
 *  - ป้ายดำแดง: A4 ขอบ 5 มม. จัดหน้าแบบชั้น แยกงาน (ตัวป้ายกับแถบคนละแผ่น) */
const A4_W = 206;
const A4_H = 293;
const FLOW_FILL = 0.9;
const GAP = 2;

const qtyOf = (i: QueueItem) => Math.max(1, i.PrintQty || 1);

export function flowSheets(queue: QueueItem[], config: Config): number {
  let area = 0;
  queue.forEach((i) => {
    let w: number;
    let h: number;
    if (i.TagMode === 'large') {
      w = Number(config.largeW);
      h = Number(config.largeH);
    } else if (i.TagMode === 'oos') {
      w = Number(config.oosW);
      h = Number(config.oosH);
    } else if (i.TagMode === 'standard' || i.TagMode === 'dual') {
      w = Number(config.w);
      h = Number(config.h);
    } else return;
    if (!(w > 0 && h > 0)) return;
    area += qtyOf(i) * (w * 10 + GAP) * (h * 10 + GAP);
  });
  return area ? Math.ceil(area / (A4_W * A4_H * FLOW_FILL)) : 0;
}

export function countFlipPages(data: FlipData[], kind: 'tags' | 'strips' | 'both'): number {
  const all = data.flatMap((d) => Array.from({ length: Math.max(1, d.qty) }, () => d));
  if (!all.length) return 0;
  const tags = kind === 'strips' ? 0 : packPages(all.map((d) => ({ ...tagSize(d) }))).length;
  const strips = kind === 'tags' ? 0 : packPages(all.map((d) => ({ ...stripSize(d) }))).length;
  return tags + strips;
}

export function paperSheets(queue: QueueItem[], config: Config, flipPages = 0): number {
  const fridge = queue.filter((i) => i.TagMode === 'fridge').reduce((n, i) => n + qtyOf(i), 0);
  const hamper = queue.filter((i) => i.TagMode === 'hamper').reduce((n, i) => n + qtyOf(i), 0);
  const fridgeSheets = fridge ? Math.ceil(fridge / Math.max(1, fridgeSheetLayout(config).perSheet)) : 0;
  const hamperSheets = hamper ? Math.ceil(hamper / Math.max(1, hamperSheetLayout(config).perSheet)) : 0;
  return flowSheets(queue, config) + fridgeSheets + hamperSheets + flipPages;
}
