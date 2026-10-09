import type { Config, QueueItem } from '../types';

/* ป้าย "เจ" บนชื่อสินค้า (src/styles/tag-veg.css)
 * จับคำว่า "เจ" ที่ไม่มีอักษรไทยตามหลัง (หมูเจ, อาหารเจ, (เจ)) แต่ไม่จับ เจล / เจ้า / เจ๊ / เจาะ / เจียว
 * หรือมีอักษรจีน 齋 / 斋
 * ⚠️ public/TAG_PRINTER.html มีสำเนา isVeg() ตรงตัว — แก้ที่นี่ต้องแก้ที่นั่นด้วย */
const VEG_RE = /เจ(?![฀-๿])|[齋斋]/;

export function isVegName(name: string): boolean {
  return VEG_RE.test(name || '');
}

/* item.Veg: '' = อัตโนมัติจากชื่อ (เมื่อเปิด config.vegAuto), 'Y' = เจ, 'N' = ไม่ใช่เจ */
export function isVeg(item: Pick<QueueItem, 'ProductName' | 'Veg'>, config: Pick<Config, 'vegAuto'>): boolean {
  if (item.Veg === 'Y') return true;
  if (item.Veg === 'N') return false;
  return !!config.vegAuto && isVegName(item.ProductName);
}
