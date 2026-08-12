import type { Config } from './types';

/* ⚠️ ห้ามแก้ — ยกมาจาก wongwian-tags01/src/constants.ts ตรงตัว (ห้ามแก้ค่า)
 * ต้องตรงกับฝั่ง publish/subscribe ของ TAG_PRINTER.html และ printBridge.ts เดิมทุกประการ */
export const CLOUD_DB_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vRUuWPCwpQbleOg8F8Kyt34obiUG15BuUuHJvRfo_I5GSqlCPp638EqDUgcqHG0igWkg9g6ko7h9hYS/pub?gid=2051624344&single=true&output=csv';

/* Ably realtime — used only for the print-tags bridge (src/lib/printBridge.ts).
 * Publishes to the SAME channel/event the existing wongwian-tags01 receiver
 * (public/TAG_PRINTER.html) subscribes to — do not change these values. */
export const ABLY_API_KEY = '8nH3AQ.PvSlnw:CWEkBBL-RYpuLLgRyfLQIxivigFmhnbd2EzDD3oZvh8';
export const PRINT_TAGS_CHANNEL = 'branch-nuea-print-tags';
export const PRINT_EVENT_NAME = 'print';
export const PRINT_PAYLOAD_VERSION = 1;

export const QUEUE_STORAGE_KEY = 'wongwianMobileQueue_v1';

/* ⚠️ ห้ามแก้ค่า — default ตรงกับ wongwian-tags01/src/constants.ts DEFAULT_CONFIG
 * (ค่าตัวเลขคัดลอกมาจาก SLIDER_DEFS[...].def เดิม เพราะฝั่งมือถือไม่มี UI ปรับ config) */
export const DEFAULT_CONFIG: Config = {
  header: 'ร้านวงเวียน',
  font: "'Kanit',sans-serif",
  labelSize: 'ขนาด',
  labelUnit: 'บรรจุ',
  labelRetail: 'ปลีก',
  invertBaht: true,
  w: 5.4,
  h: 4.0,
  bcHeight: 24,
  globalNameSz: 0,
  priceSz: 46,
  dualSz: 28,
  metaSz: 10,
  ribbonSz: 10,
  ribbonX: -32,
  ribbonY: 15,
  largeW: 11.4,
  largeH: 6.0,
  bcHeightLrg: 35,
};
