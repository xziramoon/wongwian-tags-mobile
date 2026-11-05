import type { Config, QueueItem } from '../types';
import { extractSize } from '../lib/utils';
import { DEFAULT_PACK_LABEL } from '../flip/config';
import { flipNum } from '../flip/data';
import { DEFAULT_CN_SETTINGS, type CnOrient, type CnSignSettings, type CnStyle } from './config';

/* ข้อมูลที่ป้ายจีนใช้วาด — สร้างจากรายการในคิว (ไม่มีฟิลด์สินค้าใหม่) ส่งข้ามเครื่องเป็นก้อนนี้ */
export interface CnSignData {
  name: string;
  size: string; // ว่าง = ซ่อนบรรทัด
  price: string; // จัดรูปแล้ว (มีจุลภาคหลักพัน)
  packLabel: string; // "ยกลัง 12 ขวด"
  packPrice: string; // ว่าง = ซ่อนบรรทัดยกลังทั้งบรรทัด
  barcode: string;
  branch: string;
  style: CnStyle;
  orient: CnOrient;
  qty: number;
}

const isPrice = (v: unknown) => {
  const n = parseFloat(String(v));
  return Number.isFinite(n) && n > 0;
};

export function fromQueueItem(item: QueueItem, settings: CnSignSettings, config: Pick<Config, 'branchLabel'>): CnSignData {
  const unit2 = (item.Unit2 || '').trim() || DEFAULT_PACK_LABEL;
  const packType = (item.PackType || '').trim();
  return {
    name: (item.ProductName || '').trim(),
    size: (item.Size || extractSize(item.ProductName) || '').trim(),
    price: flipNum(item.Price),
    packLabel: packType ? `${unit2} ${packType}` : unit2,
    packPrice: isPrice(item.Price2) ? flipNum(item.Price2) : '',
    barcode: (item.Barcode || '').trim(),
    branch: (config.branchLabel || '').trim() || 'สาขาวงเวียน',
    style: item.CnStyle ?? settings.style ?? DEFAULT_CN_SETTINGS.style,
    orient: item.CnOrient ?? settings.orient ?? DEFAULT_CN_SETTINGS.orient,
    qty: Math.max(1, item.PrintQty || 1),
  };
}

/* ป้ายตัวอย่างของใบทดสอบสี — ท้ายป้ายบอกชื่อแบบที่ทดสอบ */
export const colorTestSample = (label: string): CnSignData => ({
  name: 'น้ำปลาทิพรส สูตรต้นตำรับ',
  size: '700 มล.',
  price: '35',
  packLabel: 'ยกลัง 12 ขวด',
  packPrice: '399',
  barcode: '8850144000013',
  branch: `ทดสอบสี: ${label}`,
  style: 'strip',
  orient: 'portrait',
  qty: 1,
});

export const queueToCnData = (items: QueueItem[], settings: CnSignSettings, config: Pick<Config, 'branchLabel'>): CnSignData[] =>
  items.filter((i) => i.TagMode === 'cnsign').map((i) => fromQueueItem(i, settings, config));

/* งานพิมพ์ต้องแยกตามแนวกระดาษ — @page ใช้ได้ทีละแนว */
export const splitByOrient = (items: CnSignData[]): Record<CnOrient, CnSignData[]> => ({
  portrait: items.filter((d) => d.orient === 'portrait'),
  landscape: items.filter((d) => d.orient === 'landscape'),
});

export const cnPageCount = (items: CnSignData[]): number => items.reduce((n, d) => n + d.qty, 0);
