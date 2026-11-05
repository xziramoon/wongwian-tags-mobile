import { INK_RED } from '../constants';

/* ป้ายใหญ่ "ป้ายจีน" A4 (spec-chinese-sign-a4) — 1 สินค้า/แผ่น · ค่าคงที่ทั้งหมดเป็นหน่วย มม. ปรับที่นี่ที่เดียว
 * ถ้าแก้ค่าที่นี่ ต้องแก้สำเนาใน public/TAG_PRINTER.html (CN_*) และ src/styles/tag-cnsign.css ให้ตรงกัน */

export type CnStyle = 'strip' | 'plaque';
export type CnOrient = 'portrait' | 'landscape';
/* รหัสแบบ: sp = strip-p · sl = strip-l · pp = plaque-p · pl = plaque-l */
export type CnVariant = 'sp' | 'sl' | 'pp' | 'pl';

export const cnVariant = (style: CnStyle, orient: CnOrient): CnVariant =>
  `${style === 'strip' ? 's' : 'p'}${orient === 'portrait' ? 'p' : 'l'}` as CnVariant;

/* พื้นที่ใช้ได้ของ A4 หลังหักขอบ 5 มม. */
export const CN_SHEET = { short: 200, long: 287, margin: 5, border: 1.6 };

/* คีย์ localStorage ใหม่ — ห้ามใช้ซ้ำกับคีย์เดิมของแอป */
export const CN_KEYS = { settings: 'cnSign.settings' };

/* ความเข้มสี: เครื่องพิมพ์สีบางเครื่อง (หมึกจาง/ตั้งโหมดประหยัด) พิมพ์ออกมาซีด
 * normal = ตามสีจริง · rich = แดงเข้มอิ่มขึ้น + ตัวเลขราคาหนาขึ้น + เทาเข้ม + เส้นหนา · max = เข้มสุด */
export type CnInk = 'normal' | 'rich' | 'max';

export interface CnSignSettings {
  style: CnStyle; // ค่าเริ่มต้นของสไตล์
  orient: CnOrient;
  shopCn: string;
  shopTh: string;
  corner: string;
  unit: string;
  red: string;
  mono: boolean;
  ink: CnInk;
}

export const DEFAULT_CN_SETTINGS: CnSignSettings = {
  style: 'strip',
  orient: 'portrait',
  shopCn: '黄六盛',
  shopTh: 'อึ้งลักเส็ง',
  corner: 'ปลีก-ส่ง',
  unit: 'บาท',
  red: INK_RED,
  mono: false,
  ink: 'rich',
};

export const CN_REDS = [
  { value: INK_RED, label: 'แดงหมึก' },
  { value: '#D0021B', label: 'แดงมาตรฐาน' },
  { value: '#B00018', label: 'แดงเข้ม' },
  { value: '#E30613', label: 'แดงสด' },
];

export const CN_STYLES: { value: CnStyle; label: string; hint: string }[] = [
  { value: 'strip', label: 'แถบตั้ง', hint: 'ป้ายร้านจีน แถบดำด้านซ้าย' },
  { value: 'plaque', label: 'แผ่นป้ายบน', hint: 'ป้ายจีน หัวดำ + แผ่นแดงชิดมุม' },
];
export const CN_ORIENTS: { value: CnOrient; label: string }[] = [
  { value: 'portrait', label: 'แนวตั้ง' },
  { value: 'landscape', label: 'แนวนอน' },
];

/* ขนาดตัวหนังสือชื่อสินค้า (มม.) ตามจำนวนตัวอักษร: [≤จำนวนตัว, ขนาด] ... ตัวสุดท้ายคือ "มากกว่านั้น" */
export const CN_NAME_STEPS: Record<CnVariant, { upTo: number; size: number }[]> = {
  sp: [{ upTo: 12, size: 21 }, { upTo: 20, size: 18 }, { upTo: 30, size: 15.3 }, { upTo: Infinity, size: 12.7 }],
  sl: [{ upTo: 16, size: 20 }, { upTo: 24, size: 17 }, { upTo: 34, size: 14.3 }, { upTo: Infinity, size: 12.2 }],
  pl: [{ upTo: 10, size: 19 }, { upTo: 18, size: 16.4 }, { upTo: 28, size: 13.8 }, { upTo: Infinity, size: 11.6 }],
  pp: [{ upTo: 14, size: 22 }, { upTo: 22, size: 19 }, { upTo: 32, size: 16.4 }, { upTo: Infinity, size: 13.8 }],
};
export const CN_NAME_LINES: Record<CnVariant, number> = { sp: 2, sl: 2, pl: 3, pp: 2 };

/* ช่องราคา: ตัวเลขขยายให้ใหญ่สุดเท่าที่ช่องที่เหลือจริงรับได้ (priceFit.ts วัดขอบหมึกจริง + เอียง -4°)
 * beside = "บาท" อยู่ข้างตัวเลข (แถบตั้งแนวนอน) · ไม่ใช่ = อยู่ใต้ตัวเลขชิดขวา · bahtMm = ขนาดตัวอักษร "บาท" · gap = ระยะห่างจากตัวเลข */
export const CN_PRICE_LAYOUT: Record<CnVariant, { bahtMm: number; beside: boolean; gap: number }> = {
  sp: { bahtMm: 16.4, beside: false, gap: 1.6 },
  sl: { bahtMm: 19, beside: true, gap: 6.4 },
  pp: { bahtMm: 16.4, beside: false, gap: 1.6 },
  pl: { bahtMm: 17.5, beside: false, gap: 1.6 },
};
/* ขอบเว้นรอบตัวเลขในช่องราคา (มม. ต่อด้าน) */
export const CN_PRICE_PAD = { x: 4, y: 3 };
export const CN_PRICE_TILT = 4; // องศา
export const CN_PRICE_CAP = 220; // เพดานขนาดตัวเลข (มม.) กันราคาหลักเดียวบนช่องใหญ่ผิดปกติ

export const CN_PRICE_FAMILY = "'Potta One',cursive";
export const CN_PRICE_WEIGHT = 400;
export const CN_MONO_INK = '#111111';

export const nameSizeFor = (v: CnVariant, name: string): number => {
  const n = name.length;
  return (CN_NAME_STEPS[v].find((s) => n <= s.upTo) ?? CN_NAME_STEPS[v][CN_NAME_STEPS[v].length - 1]).size;
};

export const CN_INK_LEVELS: { value: CnInk; label: string; hint: string }[] = [
  { value: 'normal', label: 'ปกติ', hint: 'ตามสีจริง' },
  { value: 'rich', label: 'เข้ม', hint: 'เครื่องพิมพ์สีซีดเล็กน้อย' },
  { value: 'max', label: 'เข้มมาก', hint: 'ซีดมาก' },
];
/* l = คูณความสว่างของแดง (น้อย = เข้ม) · s = คูณความอิ่มสี · stroke = ขอบหนาเพิ่มให้ตัวเลขแดง (มม.) */
export const CN_INK_PARAMS: Record<CnInk, { l: number; s: number; stroke: number }> = {
  normal: { l: 1, s: 1, stroke: 0 },
  rich: { l: 0.88, s: 1.08, stroke: 0.35 },
  max: { l: 0.76, s: 1.15, stroke: 0.7 },
};

const toRgb = (hex: string): [number, number, number] | null => {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const h = m[1].length === 3 ? m[1].replace(/./g, (c) => c + c) : m[1];
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
};
const toHex = (r: number, g: number, b: number) => '#' + [r, g, b].map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('').toUpperCase();

/* ทำให้สีแดงเข้ม/อิ่มขึ้นตามระดับ (ผ่าน HSL) — สีที่อ่านไม่ได้คืนค่าเดิม */
export function boostRed(hex: string, ink: CnInk): string {
  const rgb = toRgb(hex);
  const p = CN_INK_PARAMS[ink] ?? CN_INK_PARAMS.normal;
  if (!rgb || ink === 'normal') return hex;
  const [r, g, b] = rgb.map((v) => v / 255);
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const l = (mx + mn) / 2;
  const d = mx - mn;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d !== 0) {
    if (mx === r) h = ((g - b) / d) % 6;
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const l2 = Math.min(1, l * p.l);
  const s2 = Math.min(1, s * p.s);
  const c = (1 - Math.abs(2 * l2 - 1)) * s2;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l2 - c / 2;
  const [r1, g1, b1] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return toHex((r1 + m) * 255, (g1 + m) * 255, (b1 + m) * 255);
}

export const cnRed = (s: CnSignSettings): string => (s.mono ? CN_MONO_INK : boostRed(s.red, s.ink));
