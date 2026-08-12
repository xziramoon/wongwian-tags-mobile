export type TagMode = 'standard' | 'dual' | 'large';
export type DualStyle = 'A' | 'B';

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
