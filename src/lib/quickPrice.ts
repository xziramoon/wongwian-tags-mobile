import type { Config, QueueItem, TagMode } from '../types';
import { normalize } from '../store/queueStore';
import { autoFontSize } from './utils';

/* กดราคาเอง (ไม่ต้องสแกนสินค้า): แป้นตัวเลขกดราคา → ปริ้นป้ายได้เลย
 * ใช้กับของที่ไม่มีบาร์โค้ด หรือไม่อยู่ในชีต — ป้ายไม่มีบาร์โค้ด (ใช้บาร์โค้ดว่างแบบเดียวกับป้ายตู้แช่เปล่า) */
export const QUICK_MODES: TagMode[] = ['standard', 'large', 'fridge', 'flip'];
export const QUICK_UNITS = ['ชิ้น', 'ขวด', 'แพ็ค', 'ถุง', 'กก.'];

export type KeypadKey = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '.' | 'back' | 'clear';

const MAX_INT_DIGITS = 6;
const MAX_DECIMALS = 2;

/* กดปุ่มแป้นตัวเลข → ราคาใหม่ (เป็นข้อความ) กฎ: ไม่มีเลข 0 นำหน้า · จุดทศนิยมได้ 1 จุด · สตางค์ไม่เกิน 2 หลัก · จำนวนเต็มไม่เกิน 6 หลัก */
export function pressKey(current: string, key: KeypadKey): string {
  if (key === 'clear') return '';
  if (key === 'back') return current.slice(0, -1);
  if (key === '.') {
    if (current.includes('.')) return current;
    return current === '' ? '0.' : current + '.';
  }
  const dot = current.indexOf('.');
  if (dot >= 0) return current.length - dot - 1 >= MAX_DECIMALS ? current : current + key;
  if (current === '0') return key; // 0 แล้วกดเลขอื่น = แทนที่ ไม่ให้เป็น 05
  return current.length >= MAX_INT_DIGITS ? current : current + key;
}

/* ราคาที่ใช้ปริ้นได้ไหม — ต้องมากกว่า 0 */
export const isValidPrice = (price: string): boolean => parseFloat(price) > 0;

/* "35." → "35" (จุดค้างท้ายไม่ต้องส่งไปป้าย) */
export const cleanPrice = (price: string): string => (price.endsWith('.') ? price.slice(0, -1) : price);

export function makeQuickItem(opts: {
  price: string;
  name: string;
  unit: string;
  mode: TagMode;
  qty: number;
  /** ป้ายดำแดง: ขนาดเต็ม 90 มม. / แคบ 45 มม. */
  flipVariant?: 'full' | 'narrow';
  config: Pick<Config, 'globalNameSz'>;
}): QueueItem {
  const name = opts.name.trim();
  const globalSize = parseInt(String(opts.config.globalNameSz), 10);
  return normalize({
    Barcode: '',
    ProductName: name,
    NameFontSize: globalSize && globalSize > 0 ? globalSize : autoFontSize(name, opts.mode),
    TagMode: opts.mode,
    Price: cleanPrice(opts.price),
    Unit: opts.unit.trim() || 'ชิ้น',
    PrintQty: Math.max(1, opts.qty),
    ...(opts.mode === 'flip' ? { FlipVariant: opts.flipVariant === 'narrow' ? ('narrow' as const) : ('full' as const) } : {}),
  });
}
