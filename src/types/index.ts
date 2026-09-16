export type TagMode = 'standard' | 'dual' | 'large' | 'oos';
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
}

export type ToastType = 'info' | 'success' | 'error';
