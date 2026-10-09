import type { Config } from '../types';
import { INK_RED, THEME_ACCENT } from '../constants';

/* ⚠️ ห้ามแก้ตรรกะ — ยกมาจาก wongwian-tags01/src/lib/cssVars.ts ตรงตัว */
export function applyCSSVars(config: Config) {
  const root = document.documentElement.style;
  const set = (prop: string, val: string | number | undefined, suffix = '') => {
    if (val !== undefined && val !== '') root.setProperty(prop, `${val}${suffix}`);
  };
  set('--tag-w', config.w, 'cm');
  set('--tag-h', config.h, 'cm');
  set('--large-w', config.largeW, 'cm');
  set('--large-h', config.largeH, 'cm');
  set('--price-sz', config.priceSz, 'px');
  set('--dual-price-sz', config.dualSz, 'px');
  set('--meta-sz', config.metaSz || 10, 'px');
  set('--ribbon-f-sz', config.ribbonSz || 10, 'px');
  set('--ribbon-x', config.ribbonX ?? -32, 'px');
  set('--ribbon-y', config.ribbonY ?? 15, 'px');
  set('--f-tag', config.font);
  set('--f-price', config.priceFont || config.font);
  set('--ink-red', INK_RED);
  set('--th-accent', THEME_ACCENT);
  /* ฟอนต์ราคาของธีม: เลือกเอง = ใช้ priceFont, ว่าง = ฟอนต์ของธีม (fallback ใน CSS) */
  if (config.priceFont) root.setProperty('--f-th-price', String(config.priceFont));
  else root.removeProperty('--f-th-price');
  set('--oos-w', config.oosW || 5.4, 'cm');
  set('--oos-h', config.oosH || 1.4, 'cm');
  set('--oos-sz', config.oosSz || 22, 'px');
}
