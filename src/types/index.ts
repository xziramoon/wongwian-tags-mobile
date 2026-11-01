export type TagMode = 'standard' | 'dual' | 'large' | 'oos' | 'fridge' | 'hamper' | 'flip';
export type DualStyle = 'A' | 'B';
export type OosReason = 'temp' | 'stop'; // temp = หมดชั่วคราว, stop = เลิกจำหน่าย

export interface QueueItem {
  Barcode: string;
  ProductName: string;
  NameFontSize: number;
  TagMode: TagMode;
  DualStyle: DualStyle;
  OldPrice: string;
  Price: string;
  Price2: string;
  PriceOffsetX: number;
  Size: string;
  Unit: string;
  Unit1: string;
  Unit2: string;
  PackType: string;
  Ribbon: string;
  Mfg: string;
  Exp: string;
  Image: string;
  PrintQty: number;
  PriceDiff: string | null;
  OosEta: string; // เช่น '18 ก.ย.' หรือ ''
  OosReason: OosReason;
  Loc: string;
  Printed: string; // วันที่พิมพ์ป้าย เช่น '17/9/69' หรือ ''
  Veg: string; // '' = อัตโนมัติจากชื่อ, 'Y' = สินค้าเจ, 'N' = ไม่ใช่เจ
  /* ป้ายแขวนกระเช้า (TagMode 'hamper') — ว่าง = ค่าเริ่มต้น, '-' = ซ่อน */
  HamperLabel: string; // หัวป้าย เช่น กระเช้าของขวัญ
  HamperNote: string; // สรุปของในกระเช้า เช่น 12 ขวด · พร้อมถุงหิ้ว
  HamperGreet: string; // คำอวยพรหลังป้าย เช่น สวัสดีปีใหม่
  HamperGreetCN: string; // คำจีนหลังป้าย เช่น 恭贺新禧
}

export interface Config {
  header: string;
  font: string;
  labelSize: string;
  labelUnit: string;
  labelRetail: string;
  invertBaht: boolean;
  w: number;
  h: number;
  bcHeight: number;
  globalNameSz: number;
  priceSz: number;
  dualSz: number;
  metaSz: number;
  ribbonSz: number;
  ribbonX: number;
  ribbonY: number;
  largeW: number;
  largeH: number;
  bcHeightLrg: number;
  oosW: number;
  oosH: number;
  oosSz: number;
  labelOos: string;
  labelStop: string;
  priceFont: string; // '' = ใช้ฟอนต์เดียวกับตัวหนังสือ
  priceInk: string; // 'black' | 'red'
  inkTilt: boolean;
  headerCN: string; // ชื่อจีนบนหัวป้าย เช่น 黄六盛
  printMono: boolean; // พิมพ์ขาว-ดำ: แดง/เหลืองทุกจุดเป็นโทนดำ
  vegAuto: boolean; // ติดป้าย เจ อัตโนมัติเมื่อชื่อสินค้ามีคำว่า เจ
  tagTheme: string; // 'classic' | 'korean' | 'ink' — ธีมป้ายปกติ
  headerSub: string; // ข้อความขวาบนหัวป้าย (ธีมใหม่) เช่น ซุปเปอร์มาร์เก็ต
  branchLabel: string; // ชื่อสาขามุมล่างซ้าย (ธีมใหม่) เช่น สาขาวงเวียน
  fridgeW: number; // ป้ายตู้แช่ (cm) — ค่าประมาณ ต้องวัดจากรางตู้จริง
  fridgeH: number;
  fridgeBar: string; // แถบหัวป้ายตู้แช่ 'line' | 'solid' | 'stripe'
  fridgeDigits: number; // จำนวนหลัก 888 ให้ระบาย: 3 | 4
  fridgeFill: boolean; // ถมดำขีดตามราคาจริงให้เลย (ไม่ต้องระบาย)
  fridgeGuide: string; // ตัวช่วยระบาย 'full' (จุดนำ + ราคาตัวเล็ก) | 'dots' | 'none'
  hamperW: number; // ป้ายแขวนกระเช้า: กว้างต่อหน้า (cm)
  hamperH: number; // สูงต่อหน้า (cm) — แถบจริงสูง 2 เท่า (พับครึ่ง)
  [key: string]: string | number | boolean | undefined;
}

export interface Product {
  Barcode: string;
  ProductName: string;
  Unit: string;
  Price: string;
  Price2: string;
  Image: string;
  Size: string;
  Lot?: string; // ล็อค/ตำแหน่งชั้น (ถ้าชีตมีคอลัมน์) — ใช้เรียงป้ายดำแดง
}

export type ToastType = 'info' | 'success' | 'error';

export interface SendHistoryEntry {
  id: string;
  ts: number; // Date.now() ตอนส่งสำเร็จ
  items: QueueItem[];
  /** ดึงล็อตนี้กลับเข้าคิวไปแล้วเมื่อไร — กันกดซ้ำแล้วจำนวนป้ายบวกเพิ่มเป็น 2 เท่า */
  restoredAt?: number;
}
