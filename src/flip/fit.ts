import { useEffect, useState } from 'react';
import { NARROW, TAG } from './config';
import type { FlipGroup } from './data';

/* วัดความกว้างข้อความด้วย canvas (ทำงานได้แม้องค์ประกอบถูกซ่อน เช่นหน้าพิมพ์) คืนค่าเป็นสัดส่วนของขนาดฟอนต์ (em) */
let ctx: CanvasRenderingContext2D | null = null;
const textEm = (text: string, family: string, weight: number): number => {
  ctx ??= document.createElement('canvas').getContext('2d');
  if (!ctx) return text.length * 0.55;
  ctx.font = `${weight} 100px ${family}`;
  return ctx.measureText(text).width / 100;
};

const round = (n: number, step = 0.05) => Math.floor(n / step) * step;

/* ชื่อสินค้า: เริ่ม 5 มม. ลดลงจนไม่เกิน 2 บรรทัด ต่ำสุด 3.5 มม. */
export function fitName(name: string, family: string, tagW: number = TAG.w): number {
  const avail = tagW - TAG.border * 2 - TAG.slotW - 2 * 2.5;
  const em = textEm(name, family, 800);
  for (let size = 5; size > 3.5; size -= 0.25) {
    if (Math.ceil((em * size * 1.06) / avail) <= 2) return size;
  }
  return 3.5;
}

/* ข้อความบรรทัดเดียวที่ต้องไม่เกินความกว้างที่กำหนด */
export function fitWidth(
  text: string,
  family: string,
  weight: number,
  maxWidth: number,
  maxSize: number,
  minSize: number,
): number {
  const em = textEm(text, family, weight);
  if (em <= 0) return maxSize;
  return Math.max(minSize, Math.min(maxSize, round(maxWidth / em)));
}

/* ฟอนต์เว็บโหลดเสร็จช้ากว่า render ครั้งแรก — เปลี่ยนค่านี้เพื่อให้คำนวณขนาดใหม่
 * families = ฟอนต์ที่ต้องรอ (เช่นฟอนต์พู่กันของธีม ที่ยังไม่มีป้ายอื่นในหน้าเรียกใช้) */
export function useFontsTick(...families: string[]): number {
  const [tick, setTick] = useState(0);
  const key = families.join('|');
  useEffect(() => {
    let alive = true;
    const loads = key ? key.split('|').map((f) => document.fonts?.load(`400 16px ${f}`, 'ก0')) : [];
    Promise.all(loads)
      .catch(() => {})
      .then(() => document.fonts?.ready)
      .then(() => alive && setTick((t) => t + 1));
    return () => {
      alive = false;
    };
  }, [key]);
  return tick;
}

/* ชื่อบนป้ายแคบ: เริ่ม 3.5 มม. ลดถึง 2.75 มม. — โซนชื่อสูง 11 มม. (เนื้อใน ~9 มม.) รวมบรรทัดขนาด; ยังไม่พอ = ตัดด้วย ellipsis (CSS) */
export function fitNarrowName(name: string, family: string, hasSize: boolean): number {
  const avail = NARROW.w - TAG.border * 2 - 3.5;
  const sizeH = hasSize ? 2.75 * 1.15 : 0;
  const em = textEm(name, family, 800);
  for (let s = 3.5; s >= 2.75; s -= 0.25) {
    const lines = Math.ceil((em * s * 1.06) / avail);
    if (lines <= 2 && lines * s * 1.15 + sizeH <= 9.2) return s;
  }
  return 2.75;
}

/* ชื่อกลุ่มบนป้ายกลุ่ม: 5 มม. ลดจนไม่เกิน 2 บรรทัด ต่ำสุด 3.5 มม. */
export function fitGroupName(name: string, family: string, slots: number): number {
  const avail = slots * NARROW.w - TAG.border * 2 - TAG.slotW - 5;
  const em = textEm(name, family, 800);
  for (let s = 5; s > 3.5; s -= 0.25) {
    if (Math.ceil((em * s * 1.06) / avail) <= 2) return s;
  }
  return 3.5;
}

/* กล่องชื่อกลิ่นเกินพื้นที่ไหม — ไม่พอให้เตือนเพิ่มความกว้างกลุ่ม (สเปก 12.2) */
export function groupOverflow(g: FlipGroup, family: string): boolean {
  const avail = g.slots * NARROW.w - TAG.border * 2 - TAG.slotW - 5;
  const gap = 1;
  let rows = 1;
  let used = 0;
  g.members.forEach((m) => {
    const w = Math.max(textEm(m.label, family, 600) * 3, textEm(m.barcode.slice(-4), family, 400) * 2.75) + 3.2;
    if (used > 0 && used + gap + w > avail) {
      rows++;
      used = w;
    } else {
      used += (used > 0 ? gap : 0) + w;
    }
  });
  const nameLines = Math.ceil((textEm(g.name, family, 800) * fitGroupName(g.name, family, g.slots) * 1.06) / avail);
  const nameH = nameLines * fitGroupName(g.name, family, g.slots) * 1.2 + (g.size ? 4.2 : 0);
  const boxesH = rows * 7.6 + (rows - 1) * gap;
  return nameH + boxesH > TAG.h - TAG.border * 2 - TAG.headerH - 3;
}
