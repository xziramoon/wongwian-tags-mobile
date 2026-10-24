import type { Config, QueueItem } from '../types';
import { escapeHTML, fmtPrice } from './utils';

/* ป้ายตู้แช่ — ชื่อสินค้าพิมพ์ + ตัวเลข 7 ส่วน "888" เส้นกลวงให้พนักงานเอาเมจิกระบายราคาเอง
 * ขาว-ดำล้วน (#000/#fff) เพราะเครื่องพิมพ์หมึกดำอย่างเดียว
 * ⚠️ ต้องตรงกับ wongwian-tags01/public/TAG_PRINTER.html buildFridgeHTML() ทุกตัวอักษร
 * (พอร์ตไป ES5 ตรงตัว) — แก้ที่นี่ต้องแก้ที่นั่นด้วย */

/* ขีด a–g ต่อหลัก หน่วย = px บนแคนวาสดีไซน์ (6px = 1 มม.) — SVG viewBox ย่อ/ขยายตามขนาดป้ายเอง */
const SEG_W = 66;
const SEG_H = 116;
const SEG_T = 13;
const SEG_V = 46;
const SEG_GAP = 14;
const SEG_GEO: Record<string, [number, number, number, number]> = {
  a: [8, 0, SEG_W - 16, SEG_T],
  b: [SEG_W - SEG_T, 8, SEG_T, SEG_V],
  c: [SEG_W - SEG_T, SEG_H / 2 + 4, SEG_T, SEG_V],
  d: [8, SEG_H - SEG_T, SEG_W - 16, SEG_T],
  e: [0, SEG_H / 2 + 4, SEG_T, SEG_V],
  f: [0, 8, SEG_T, SEG_V],
  g: [8, (SEG_H - SEG_T) / 2, SEG_W - 16, SEG_T],
};
export const SEG_MAP: Record<string, string> = {
  '0': 'abcdef', '1': 'bc', '2': 'abged', '3': 'abgcd', '4': 'fgbc',
  '5': 'afgcd', '6': 'afgedc', '7': 'abc', '8': 'abcdefg', '9': 'abcdfg',
};

export const FRIDGE_BARS = ['line', 'solid', 'stripe'] as const;

export function fridgeDigitCount(config: Config): number {
  return Number(config.fridgeDigits) === 4 ? 4 : 3;
}

/* โหมด "พิมพ์ราคาจริง": ถมดำเฉพาะราคาเต็มบาทที่ใส่ช่องได้พอดี — มีสตางค์หรือยาวเกินช่อง = ไม่ถม (ระบายเอง)
 * ไม่ปัด 12.50 เป็น 12 เด็ดขาด ราคาผิดบนป้ายแย่กว่าป้ายว่าง */
export function fridgeFillDigits(price: unknown, digits: number): string {
  const n = parseFloat(String(price));
  if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) return '';
  const s = String(n);
  return s.length <= digits ? s : '';
}

/* fill = ขีดที่ถมดำให้เลย · guide = ขีดที่ต้องระบาย ใส่จุดดำเล็กกลางขีด (ระบายทับแล้วจุดหายไปในสีเมจิก)
 * heightPct = ความสูงตัวเลข (% ของป้าย) — ป้ายระบายเปล่าไม่มีแถวชื่อ ตัวเลขเลยใหญ่ขึ้น */
export function fridgeDigitsSVG(digits: number, fill: string, guide = '', heightPct = 55): string {
  const vbW = digits * SEG_W + (digits - 1) * SEG_GAP;
  const fillPad = fill ? fill.padStart(digits, ' ') : '';
  const guidePad = guide ? guide.padStart(digits, ' ') : '';
  let rects = '';
  let dots = '';
  for (let i = 0; i < digits; i++) {
    const on = fillPad ? SEG_MAP[fillPad[i]] || '' : '';
    const mark = guidePad ? SEG_MAP[guidePad[i]] || '' : '';
    const x0 = i * (SEG_W + SEG_GAP);
    for (const seg of 'abcdefg') {
      const [x, y, w, h] = SEG_GEO[seg];
      rects +=
        '<rect x="' + (x0 + x) + '" y="' + y + '" width="' + w + '" height="' + h +
        '" rx="6" fill="' + (on.indexOf(seg) >= 0 ? '#000' : '#fff') + '" stroke="#000" stroke-width="1.5"/>';
      if (mark.indexOf(seg) >= 0 && on.indexOf(seg) < 0) {
        dots += '<circle cx="' + (x0 + x + w / 2) + '" cy="' + (y + h / 2) + '" r="3.6" fill="#000"/>';
      }
    }
  }
  /* สูงตาม heightPct แต่ถ้า 4 หลักกว้างเกินช่อง ให้ย่อตามความกว้างแทน (ไม่ล้นทับคำว่า บาท) */
  const ratio = (vbW + 2) / (SEG_H + 2);
  return (
    '<svg class="fr-digits" viewBox="-1 -1 ' + (vbW + 2) + ' ' + (SEG_H + 2) + '" style="height:min(' + heightPct + 'cqh, calc(76cqw / ' +
    ratio.toFixed(3) + '));aspect-ratio:' + ratio.toFixed(3) + '">' + rects + dots + '</svg>'
  );
}

/* ป้ายระบายเปล่า = ป้ายตู้แช่ที่ไม่มีชื่อสินค้า — ไม่มีชื่อ ไม่มีจุดนำ ตัวเลขใหญ่ ไว้ใส่แทนป้ายเดิมตอนราคาเปลี่ยน */
export function isFridgeBlank(item: QueueItem): boolean {
  return !String(item.ProductName || '').trim();
}

/* ตัวช่วยระบาย: 'full' = จุดนำ + ราคาตัวเล็ก (ค่าเริ่มต้น) · 'dots' = จุดนำอย่างเดียว · 'none' = 888 เปล่า */
export function fridgeGuideMode(config: Config): string {
  const g = String(config.fridgeGuide || 'full');
  return g === 'dots' || g === 'none' ? g : 'full';
}

function fridgeGuideText(price: unknown): string {
  const n = parseFloat(String(price));
  if (!Number.isFinite(n) || n <= 0) return '';
  return Number.isInteger(n) ? 'ราคา ' + n + '.-' : 'ราคา ' + fmtPrice(n);
}

const SNOWFLAKE =
  '<svg class="fr-snow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">' +
  '<path d="M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7M9 4l3 2 3-2M9 20l3-2 3 2M3.6 10.6l3.4-.6-1.2-3.2M20.4 13.4l-3.4.6 1.2 3.2M3.6 13.4l3.4.6-1.2 3.2M20.4 10.6l-3.4-.6 1.2-3.2"/></svg>';

function fridgeHeadHTML(config: Config): string {
  const bar = (FRIDGE_BARS as readonly string[]).includes(String(config.fridgeBar)) ? String(config.fridgeBar) : 'line';
  const name = escapeHTML(String(config.header || '').trim());
  const cn = escapeHTML(String(config.headerCN || '').trim());
  if (bar === 'solid') {
    return (
      '<div class="fr-head fr-solid"><span class="fr-brand">' + SNOWFLAKE + '<span>' + name + '</span></span>' +
      (cn ? '<span class="fr-cn">' + cn + '</span>' : '') + '</div>'
    );
  }
  if (bar === 'stripe') {
    return (
      '<div class="fr-head fr-stripe"><span class="fr-box">' + name +
      (cn ? ' <span class="fr-cn">' + cn + '</span>' : '') + '</span></div>'
    );
  }
  return (
    '<div class="fr-head fr-line"><span class="fr-brand">' + name + '</span>' +
    (cn ? '<span class="fr-cn">' + cn + '</span>' : '') + '</div>'
  );
}

export function buildFridgeHTML(item: QueueItem, config: Config): string {
  const digits = fridgeDigitCount(config);
  if (isFridgeBlank(item)) {
    return (
      '<div class="price-tag price-tag-fridge fr-blank">' +
      fridgeHeadHTML(config) +
      '<div class="fr-price">' + fridgeDigitsSVG(digits, '', '', 70) + '<span class="fr-baht">บาท</span></div>' +
      '</div>'
    );
  }
  const fill = config.fridgeFill ? fridgeFillDigits(item.Price, digits) : '';
  const guide = fridgeGuideMode(config);
  const guideDigits = !config.fridgeFill && guide !== 'none' ? fridgeFillDigits(item.Price, digits) : '';
  const guideText = !config.fridgeFill && guide === 'full' ? fridgeGuideText(item.Price) : '';
  return (
    '<div class="price-tag price-tag-fridge">' +
    fridgeHeadHTML(config) +
    '<div class="fr-name"><span class="fr-nm">' + escapeHTML(item.ProductName) + '</span>' +
    (guideText ? '<span class="fr-guide">' + guideText + '</span>' : '') + '</div>' +
    '<div class="fr-price">' + fridgeDigitsSVG(digits, fill, guideDigits) + '<span class="fr-baht">บาท</span></div>' +
    '</div>'
  );
}

/* จัดป้ายตู้แช่ลงแผ่น A4 แบบตาราง — คอลัมน์×แถว คำนวณจากขนาดป้าย (60×35 มม. = 3×8 = 24 ใบ/แผ่น)
 * ขอบบน-ล่าง 4.5 มม. ซ้าย-ขวา 5 มม. ช่องไฟ 0.8 มม. ไว้ตัด — ตรงกับ .fr-sheet ใน tag-fridge.css */
export const FR_SHEET = { pageW: 210, pageH: 297, padX: 5, padY: 4.5, gap: 0.8 };

export function fridgeSheetLayout(config: Config): { cols: number; rows: number; perSheet: number } {
  const w = (Number(config.fridgeW) || 6) * 10;
  const h = (Number(config.fridgeH) || 3.5) * 10;
  const cols = Math.max(1, Math.floor((FR_SHEET.pageW - 2 * FR_SHEET.padX + FR_SHEET.gap) / (w + FR_SHEET.gap)));
  const rows = Math.max(1, Math.floor((FR_SHEET.pageH - 2 * FR_SHEET.padY + FR_SHEET.gap) / (h + FR_SHEET.gap)));
  return { cols, rows, perSheet: cols * rows };
}

export function chunkSheets<T>(tags: T[], perSheet: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < tags.length; i += perSheet) out.push(tags.slice(i, i + perSheet));
  return out;
}

/* ลำดับบนกระดาษ: ป้ายทั่วไป → แผ่นป้ายตู้แช่ (ขึ้นหน้าใหม่) → แถบสินค้าหมด */
export function printRank(mode: string): number {
  return mode === 'oos' ? 2 : mode === 'fridge' ? 1 : 0;
}
