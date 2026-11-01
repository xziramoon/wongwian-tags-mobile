import type { Product, QueueItem } from '../types';
import { database } from '../lib/database';
import { extractSize, priceEq } from '../lib/utils';
import { DEFAULT_PACK_LABEL, GROUP_DEFAULTS, type FlipSettings } from './config';

/* ขนาดป้าย 3 แบบ (สเปกข้อ 12): full 90 มม. · narrow 45 มม. · group = n × 45 มม. */
export type FlipVariant = 'full' | 'narrow' | 'group';

export interface FlipMember {
  barcode: string;
  label: string; // ชื่อกลิ่น/สีแบบสั้น
}
export interface FlipGroup {
  id: string;
  name: string;
  size: string;
  corner: string;
  slots: number; // ความกว้าง = slots × 45 มม.
  members: FlipMember[];
}
export interface FlipGroupData {
  id: string;
  name: string;
  size: string;
  corner: string;
  chip: string; // ป้ายดำเล็กเหนือราคาบนแถบ เช่น "ทุกกลิ่น"
  slots: number;
  members: FlipMember[];
}

/* ข้อมูลที่ตัวป้าย/แถบใช้วาด — สร้างจากรายการในคิว หรือจากสินค้าในฐานข้อมูล */
export interface FlipData {
  barcode: string; // ป้ายกลุ่มใช้ `group:<id>`
  name: string;
  size: string;
  price: string;
  pack: string;
  label: string; // ข้อความนำหน้าราคาแพ็ก เช่น "ยกลัง" (เก็บไว้สร้าง pack ใหม่ตอนราคาเปลี่ยน)
  corner: string;
  footer: string;
  lot: string;
  qty: number;
  variant: FlipVariant;
  tagW?: number; // ความกว้างตัวป้ายเต็ม (มม.) — ว่าง = 90
  nameSz?: number; // ขนาดชื่อ (มม.) — 0/ว่าง = อัตโนมัติ
  group?: FlipGroupData;
  sig?: string; // ลายเซ็นของป้ายกลุ่ม (ชื่อ+สมาชิก) ไว้เทียบว่าต้องพิมพ์ตัวป้ายใหม่ไหม
}

/* ค่าระดับสินค้าที่ผู้ใช้ override — มีคีย์ (แม้เป็น '') = ใช้ค่านั้น, ไม่มีคีย์ = อัตโนมัติ */
export interface FlipOverride {
  corner?: string;
  footer?: string;
  pack?: string;
  variant?: FlipVariant;
  groupId?: string;
  tagW?: number;
  nameSz?: number;
}
export type FlipOverrides = Record<string, FlipOverride>;

export interface LastPrinted {
  price: string;
  pack: string;
  label: string;
  date: string;
  placed: boolean; // false = พิมพ์แล้วแต่ยังไม่ได้เปลี่ยนที่ชั้น
  prevPrice?: string; // ราคาที่ติดอยู่บนชั้นจริง (ก่อนพิมพ์ใบใหม่)
  prevPack?: string;
  variant?: FlipVariant;
}
export interface TagPrinted {
  name: string; // ป้ายกลุ่มเก็บลายเซ็น (sig) แทนชื่อ
  lot: string;
  date: string;
}

export const GROUP_PREFIX = 'group:';
export const isGroupKey = (k: string) => k.startsWith(GROUP_PREFIX);

export const flipNum = (v: unknown): string => {
  const n = parseFloat(String(v));
  if (!isFinite(n)) return '0';
  return Number.isInteger(n)
    ? n.toLocaleString('en-US')
    : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

/* "ยกลัง 400.-" — ว่างถ้าไม่มีราคาแพ็ก (ว่าง = ซ่อนแถบดำทั้งแถบ) */
export const packText = (label: string, price2: unknown): string => {
  const n = parseFloat(String(price2));
  if (!(n > 0)) return '';
  return `${label} ${flipNum(n)}.-`;
};

/* ---------- ป้ายกลุ่ม ---------- */
export const last4 = (barcode: string) => String(barcode).trim().slice(-4);

export const groupSig = (g: FlipGroup) => `${g.name}|${g.members.map((m) => `${m.barcode}:${m.label}`).join(',')}`;

/* ราคากลุ่มดึงจากสมาชิก — ถ้าราคาสมาชิกไม่เท่ากัน mismatch = true (ต้องแยกป้ายหรือแก้ราคา) */
export function groupPrices(g: FlipGroup): { price: string; prices: string[]; mismatch: boolean } {
  const prices: string[] = [];
  g.members.forEach((m) => {
    const p = database.find(m.barcode)?.Price;
    if (p !== undefined && p !== '' && !prices.some((x) => priceEq(x, p))) prices.push(p);
  });
  return { price: prices[0] ?? '', prices, mismatch: prices.length > 1 };
}

export function fromGroup(g: FlipGroup, qty = 1): FlipData {
  const lot = g.members.map((m) => database.find(m.barcode)?.Lot || '').find(Boolean) || '';
  return {
    barcode: GROUP_PREFIX + g.id,
    name: g.name,
    size: g.size,
    price: groupPrices(g).price,
    pack: '',
    label: '',
    corner: g.corner,
    footer: '',
    lot,
    qty,
    variant: 'group',
    sig: groupSig(g),
    group: {
      id: g.id,
      name: g.name,
      size: g.size,
      corner: g.corner,
      chip: GROUP_DEFAULTS.chip,
      slots: g.slots,
      members: g.members,
    },
  };
}

export function fromQueueItem(
  item: QueueItem,
  settings: FlipSettings,
  ov: FlipOverride = {},
  groups: FlipGroup[] = [],
): FlipData {
  const qty = Math.max(1, item.PrintQty || 1);
  if (ov.variant === 'group' && ov.groupId) {
    const g = groups.find((x) => x.id === ov.groupId);
    if (g) return fromGroup(g, qty);
  }
  const label = (item.Unit2 || '').trim() || DEFAULT_PACK_LABEL;
  return {
    barcode: item.Barcode,
    name: item.ProductName,
    size: (item.Size || '').trim(),
    price: item.Price,
    label,
    pack: ov.pack ?? packText(label, item.Price2),
    corner: ov.corner ?? settings.corner,
    footer: ov.footer ?? item.Barcode,
    lot: (item.Loc || '').trim() || database.find(item.Barcode)?.Lot || '',
    qty,
    variant: ov.variant === 'narrow' ? 'narrow' : 'full',
    tagW: ov.tagW ?? settings.tagW,
    nameSz: ov.nameSz ?? settings.nameSz,
  };
}

/* รายการในคิว → ข้อมูลวาด: หลายรายการที่เลือกกลุ่มเดียวกัน รวมเป็นป้ายกลุ่ม 1 ใบ */
export function queueToFlipData(
  items: QueueItem[],
  settings: FlipSettings,
  overrides: FlipOverrides,
  groups: FlipGroup[],
): FlipData[] {
  const out: FlipData[] = [];
  items.forEach((i) => {
    const d = fromQueueItem(i, settings, overrides[i.Barcode], groups);
    if (d.variant === 'group') {
      const same = out.find((x) => x.barcode === d.barcode);
      if (same) {
        same.qty = Math.max(same.qty, d.qty);
        return;
      }
    }
    out.push(d);
  });
  return out;
}

export function fromProduct(p: Product, label: string, settings: FlipSettings, ov: FlipOverride = {}): FlipData {
  return {
    barcode: p.Barcode,
    name: p.ProductName,
    size: (p.Size || extractSize(p.ProductName)).trim(),
    price: p.Price,
    label,
    pack: ov.pack ?? packText(label, p.Price2),
    corner: ov.corner ?? settings.corner,
    footer: ov.footer ?? p.Barcode,
    lot: p.Lot || '',
    qty: 1,
    variant: ov.variant === 'narrow' ? 'narrow' : 'full',
    tagW: ov.tagW ?? settings.tagW,
    nameSz: ov.nameSz ?? settings.nameSz,
  };
}

/* เรียงตามล็อค (เลขล็อคแบบ natural) ล็อคว่างไว้ท้าย แล้วตามชื่อ — เดินเปลี่ยนรอบเดียวจบ */
export function sortByLot<T extends { lot: string; name: string }>(items: T[]): T[] {
  const cmp = (a: string, b: string) => a.localeCompare(b, 'th', { numeric: true });
  return items.slice().sort((a, b) => {
    if (a.lot !== b.lot) {
      if (!a.lot) return 1;
      if (!b.lot) return -1;
      return cmp(a.lot, b.lot);
    }
    return cmp(a.name, b.name);
  });
}

export const chunk = <T,>(arr: T[], n: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
};

/* ---------- รายการ "ต้องเปลี่ยนวันนี้" ---------- */
export interface TodayRow {
  kind: 'changed' | 'printed' | 'mismatch';
  data: FlipData;
  oldPrice: string;
  newPrice: string;
  oldPack: string;
  newPack: string;
  warn?: string; // mismatch: ราคาสมาชิกกลุ่มที่ไม่เท่ากัน
}

export function computeToday(
  lastPrinted: Record<string, LastPrinted>,
  settings: FlipSettings,
  overrides: FlipOverrides,
  groups: FlipGroup[] = [],
): TodayRow[] {
  const rows: TodayRow[] = [];

  /* กลุ่มที่ราคาสมาชิกไม่เท่ากัน: เตือนสีแดงเสมอ (นับกลุ่มเป็น 1 รายการ) */
  groups.forEach((g) => {
    const gp = groupPrices(g);
    if (gp.mismatch) {
      rows.push({
        kind: 'mismatch',
        data: fromGroup(g),
        oldPrice: '',
        newPrice: '',
        oldPack: '',
        newPack: '',
        warn: gp.prices.join(' / '),
      });
    }
  });

  for (const [key, e] of Object.entries(lastPrinted)) {
    let data: FlipData;
    let newPrice: string;
    let newPack = '';
    if (isGroupKey(key)) {
      const g = groups.find((x) => GROUP_PREFIX + x.id === key);
      if (!g) continue;
      const gp = groupPrices(g);
      if (gp.price === '' || gp.mismatch) continue; // mismatch แสดงเป็นแถวเตือนแล้ว
      data = fromGroup(g);
      newPrice = gp.price;
    } else {
      const p = database.find(key);
      if (!p || p.Price === '') continue;
      const ov = overrides[key] ?? {};
      newPack = ov.pack ?? packText(e.label, p.Price2);
      data = fromProduct(p, e.label, settings, ov);
      if (e.variant === 'narrow') data.variant = 'narrow';
      newPrice = p.Price;
    }
    const changed = !priceEq(e.price, newPrice) || e.pack !== newPack;
    const onShelfPrice = e.placed === false ? (e.prevPrice ?? e.price) : e.price;
    const onShelfPack = e.placed === false ? (e.prevPack ?? e.pack) : e.pack;
    if (!changed && e.placed !== false) continue;
    rows.push({
      kind: changed ? 'changed' : 'printed',
      data,
      oldPrice: onShelfPrice,
      newPrice: changed ? newPrice : e.price,
      oldPack: onShelfPack,
      newPack: changed ? newPack : e.pack,
    });
  }
  return sortByLot(rows.map((r) => ({ ...r, lot: r.data.lot, name: r.data.name })));
}

/* ---------- รายการ "ต้องพิมพ์ตัวป้ายถาวร" ---------- */
export interface TagRow {
  data: FlipData;
  reason: 'ใหม่' | 'เปลี่ยนชื่อ' | 'ย้ายล็อค' | 'แก้ไขกลุ่ม';
}

export function computeNeedTags(
  tagsPrinted: Record<string, TagPrinted>,
  lastPrinted: Record<string, LastPrinted>,
  queueBarcodes: string[],
  settings: FlipSettings,
  overrides: FlipOverrides,
  groups: FlipGroup[] = [],
): TagRow[] {
  const barcodes = new Set(
    [...Object.keys(lastPrinted), ...Object.keys(tagsPrinted), ...queueBarcodes].filter((b) => !isGroupKey(b)),
  );
  const rows: TagRow[] = [];
  barcodes.forEach((b) => {
    const p = database.find(b);
    if (!p) return;
    const t = tagsPrinted[b];
    let reason: TagRow['reason'] | null = null;
    if (!t) reason = 'ใหม่';
    else if (t.name !== p.ProductName) reason = 'เปลี่ยนชื่อ';
    else if ((t.lot || '') !== (p.Lot || '')) reason = 'ย้ายล็อค';
    if (!reason) return;
    const label = lastPrinted[b]?.label || DEFAULT_PACK_LABEL;
    const data = fromProduct(p, label, settings, overrides[b] ?? {});
    if (lastPrinted[b]?.variant === 'narrow') data.variant = 'narrow';
    rows.push({ reason, data });
  });

  /* ป้ายกลุ่ม: นับเป็น 1 รายการ — ยังไม่เคยพิมพ์ หรือชื่อ/สมาชิกเปลี่ยนไป */
  groups.forEach((g) => {
    const data = fromGroup(g);
    const t = tagsPrinted[data.barcode];
    if (!t) rows.push({ reason: 'ใหม่', data });
    else if (t.name !== data.sig) rows.push({ reason: 'แก้ไขกลุ่ม', data });
  });
  return sortByLot(rows.map((r) => ({ ...r, lot: r.data.lot, name: r.data.name })));
}
