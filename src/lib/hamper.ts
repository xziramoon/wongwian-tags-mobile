import type { Config, QueueItem } from '../types';
import { escapeHTML } from './utils';

/* ป้ายแขวนกระเช้า (TagMode 'hamper') — แถบยาวพับครึ่ง 2 หน้า เจาะรูทะลุ 2 ชั้น ร้อยเชือกผูกหูกระเช้า
 * หน้าหน้า: แถบแดง (รูร้อยเชือก + 福 + คำหัวป้าย) → ชื่อ + สรุปของในกระเช้า → แถบราคาเหลือง → ชื่อร้าน + บาร์โค้ด
 * หน้าหลัง (กลับหัว 180° พับแล้วตั้งตรง): พื้นแดง 福 คำอวยพร + แถบราคาเหลืองซ้ำ — ป้ายหมุนไปทางไหนก็เห็นราคา
 * สีแดง/เหลือง ต้องใช้เครื่องพิมพ์สี · เปิด "พิมพ์ขาว-ดำ" (config.printMono) = ดำ/ขาวล้วน
 * ทุกขนาดอิงความกว้างหน้าป้าย (cqw) ปรับ hamperW / hamperH แล้วสเกลตามเอง
 * ⚠️ ต้องตรงกับ wongwian-tags01/src/lib/hamper.ts และ public/TAG_PRINTER.html (สำเนา ES5) (buildHamperHTML / hamperSheetLayout) — แก้ที่นี่ต้องแก้ที่นั่นด้วย */

export const HAMPER_DEFAULTS = { label: 'กระเช้าของขวัญ', greet: 'สวัสดีปีใหม่', greetCN: '恭贺新禧', sale: 'ลดพิเศษ' };

/* ช่องข้อความ: ว่าง = ใช้ค่าเริ่มต้น · ใส่ "-" = ซ่อนบรรทัดนั้น */
export function hamperText(value: unknown, fallback: string): string {
  const s = String(value ?? '').trim();
  if (s === '-') return '';
  return s || fallback;
}

/* ราคาบนป้ายกระเช้า: มีจุลภาคหลักพัน (1,095) — มีสตางค์แสดง 2 ตำแหน่ง */
export function hamperPrice(v: unknown): string {
  const n = parseFloat(String(v));
  if (!Number.isFinite(n) || n <= 0) return '';
  const s = Number.isInteger(n) ? String(n) : n.toFixed(2);
  const [int, dec] = s.split('.');
  return int.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (dec ? '.' + dec : '');
}

/* ขนาดตัวเลขราคา (cqw) — ยาวขึ้นย่อลง ไม่ล้นขอบป้าย */
export function hamperPriceSize(p: string, back = false): number {
  const len = p.length;
  const base = len <= 4 ? 27 : len === 5 ? 25 : len === 6 ? 21 : len <= 8 ? 17 : 14;
  return back ? Math.round(base * 0.8) : base;
}

function hamperNameSize(name: string): number {
  const len = name.trim().length;
  return len <= 14 ? 8.5 : len <= 22 ? 7.3 : len <= 34 ? 6.3 : 5.4;
}

const HOLE = '<div class="hp-hole"><div></div></div>';

export function buildHamperHTML(item: QueueItem, config: Config): string {
  const price = hamperPrice(item.Price);
  const old = parseFloat(String(item.OldPrice));
  const now = parseFloat(String(item.Price));
  const showOld = Number.isFinite(old) && old > 0 && !(now >= old);
  const ribbon = String(item.Ribbon || '').trim();
  const saleText = ribbon || (showOld ? HAMPER_DEFAULTS.sale : '');
  const label = hamperText(item.HamperLabel, HAMPER_DEFAULTS.label);
  const note = hamperText(item.HamperNote, '');
  const greet = hamperText(item.HamperGreet, HAMPER_DEFAULTS.greet);
  const greetCN = hamperText(item.HamperGreetCN, HAMPER_DEFAULTS.greetCN);
  const shop = escapeHTML(String(config.header || '').trim());
  const cn = escapeHTML(String(config.headerCN || '').trim());
  const name = String(item.ProductName || '');
  const priceHTML = (back: boolean) =>
    price
      ? '<span class="hp-num" style="font-size:' + hamperPriceSize(price, back) + 'cqw">' + price + '</span><span class="hp-baht">บาท</span>'
      : '<span class="hp-num hp-blank" style="font-size:' + hamperPriceSize('0000', back) + 'cqw">&nbsp;</span><span class="hp-baht">บาท</span>';

  const back =
    '<div class="hp-face hp-back">' +
    HOLE +
    '<div class="hp-fu"><span>福</span></div>' +
    (greet ? '<div class="hp-greet">' + escapeHTML(greet) + '</div>' : '') +
    (greetCN ? '<div class="hp-greet-cn">' + escapeHTML(greetCN) + '</div>' : '') +
    '<div class="hp-fill"></div>' +
    '<div class="hp-band hp-band-back"><span class="hp-pre">ราคา</span>' + priceHTML(true) + '</div>' +
    '<div class="hp-back-shop">' + shop + (cn ? ' · <span class="hp-cn">' + cn + '</span>' : '') + '</div>' +
    '</div>';

  const front =
    '<div class="hp-face hp-front">' +
    '<div class="hp-top">' + HOLE +
    '<div class="hp-label"><span class="hp-fu-chip">福</span><span>' + escapeHTML(label) + '</span></div></div>' +
    '<div class="hp-fill"></div>' + /* ชื่ออยู่กลางระหว่างแถบแดงกับแถบราคา */
    '<div class="hp-body">' +
    '<div class="hp-name" style="font-size:' + hamperNameSize(name) + 'cqw">' + escapeHTML(name) + '</div>' +
    (note ? '<div class="hp-note">' + escapeHTML(note) + '</div>' : '') +
    '</div>' +
    '<div class="hp-fill"></div>' +
    '<div class="hp-band">' +
    (saleText ? '<span class="hp-sale">' + escapeHTML(saleText) + '</span>' : '') +
    (showOld ? '<div class="hp-old">ปกติ <del>' + hamperPrice(old) + '</del> บาท</div>' : '') +
    '<div class="hp-price">' + priceHTML(false) + '</div>' +
    '</div>' +
    '<div class="hp-foot"><div class="hp-shop"><b>' + shop + '</b>' + (cn ? '<span class="hp-cn">' + cn + '</span>' : '') + '</div>' +
    (item.Barcode ? '<svg class="bc-svg" data-barcode="' + escapeHTML(item.Barcode) + '" data-large="false" data-bch="18"></svg>' : '') +
    '</div>' +
    '</div>';

  return (
    '<div class="hamper-tag' + (config.printMono ? ' hp-mono' : '') + '">' +
    back +
    '<div class="hp-fold"></div>' +
    front +
    '</div>'
  );
}

/* จัดป้ายกระเช้าลงแผ่น A4 — แถบ 6.5 × 19 ซม. ได้ 3 ใบ/แผ่น · เว้นช่อง 2 มม. ไว้ตัด
 * ค่าตรงกับ .hp-sheet ใน tag-hamper.css */
export const HP_SHEET = { pageW: 210, pageH: 297, padX: 5, padY: 4.5, gap: 2 };

export function hamperSheetLayout(config: Config): { cols: number; rows: number; perSheet: number } {
  const w = (Number(config.hamperW) || 6.5) * 10;
  const h = (Number(config.hamperH) || 9.5) * 20; /* พับครึ่ง = สูง 2 หน้า */
  const cols = Math.max(1, Math.floor((HP_SHEET.pageW - 2 * HP_SHEET.padX + HP_SHEET.gap) / (w + HP_SHEET.gap)));
  const rows = Math.max(1, Math.floor((HP_SHEET.pageH - 2 * HP_SHEET.padY + HP_SHEET.gap) / (h + HP_SHEET.gap)));
  return { cols, rows, perSheet: cols * rows };
}
