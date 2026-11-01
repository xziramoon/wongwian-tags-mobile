import { NARROW, SHEET, STICKER, TAG } from './config';
import type { FlipData } from './data';

/* ตัวจัดหน้า A4 แบบชั้น (shelf bin-packing): วางชิ้นตามลำดับ (ล็อค) เรียงซ้าย→ขวา เต็มแถวแล้วขึ้นแถวใหม่
 * ชิ้นขนาดเดียวกันได้จำนวนต่อแผ่นตามสเปก: ตัวป้าย 14 · แถบ 18 · ป้ายแคบ 28 · แถบแคบ 24 · สติกเกอร์ ~490
 * ผสมขนาดในแผ่นเดียวได้ (เช่น ป้ายกลุ่ม 135 มม. + ป้ายแคบ 45 มม. ในแถวเดียวกัน) */
export const PAGE_W = SHEET.w; // 200
export const PAGE_H = 286; // พื้นที่ใช้ได้ 287 เผื่อ 1 มม. กันล้นไปหน้าว่าง

export interface Size {
  w: number;
  h: number;
}
export interface Placed<T> {
  item: T;
  x: number;
  y: number;
}

export const tagSize = (d: FlipData): Size =>
  d.variant === 'narrow'
    ? { w: NARROW.w, h: NARROW.h }
    : d.variant === 'group' && d.group
      ? { w: d.group.slots * NARROW.w, h: TAG.h }
      : { w: TAG.w, h: TAG.h };

export const stripSize = (d: FlipData): Size =>
  d.variant === 'narrow' ? { w: NARROW.stripW, h: NARROW.stripH * 2 } : { w: TAG.slotW * 2, h: TAG.stripH };

export const stickerSize = (): Size => ({ w: STICKER.w, h: STICKER.h });

const EPS = 1e-6;

export function packPages<T extends Size>(pieces: T[]): Placed<T>[][] {
  const pages: Placed<T>[][] = [];
  let cur: Placed<T>[] = [];
  let x = 0;
  let y = 0;
  let rowH = 0;
  for (const p of pieces) {
    if (x > 0 && x + p.w > PAGE_W + EPS) {
      y += rowH;
      x = 0;
      rowH = 0;
    }
    if (y + p.h > PAGE_H + EPS && cur.length) {
      pages.push(cur);
      cur = [];
      x = 0;
      y = 0;
      rowH = 0;
    }
    cur.push({ item: p, x, y });
    x += p.w;
    rowH = Math.max(rowH, p.h);
  }
  if (cur.length) pages.push(cur);
  return pages;
}

/* จัดกึ่งกลางแนวนอนทั้งแผ่น (ขอบ 5 มม. ของ @page + ระยะเว้นซ้าย-ขวาเท่ากัน) */
export function pageOffset<T extends Size>(page: Placed<T>[]): number {
  const right = page.reduce((m, p) => Math.max(m, p.x + p.item.w), 0);
  return (PAGE_W - right) / 2;
}

/* สติกเกอร์ "หมด" เต็ม 1 แผ่น */
export const stickersPerSheet = (): number =>
  Math.floor(PAGE_W / STICKER.w) * Math.floor(PAGE_H / STICKER.h);
