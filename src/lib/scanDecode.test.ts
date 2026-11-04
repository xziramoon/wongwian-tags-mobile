import { describe, expect, it } from 'vitest';
import { CONFIRM_WINDOW_MS, MODE_CYCLE, ROI, createConfirmer, isTrusted, roiRect } from './scanDecode';
import { decodeLuma, rgbaToLuma } from './scanCore';
import { DEFAULT_ZOOM, pickInitialZoom } from './scan';

describe('ตัวอ่านบาร์โค้ด · แถบกลางภาพ', () => {
  it('แถบกลางอยู่ในเฟรมและเล็กกว่าทั้งเฟรม · ทั้งเฟรม = ทั้งภาพ', () => {
    const r = roiRect(1920, 1080, false);
    expect(r.sx).toBeGreaterThanOrEqual(0);
    expect(r.sx + r.sw).toBeLessThanOrEqual(1920);
    expect(r.sy + r.sh).toBeLessThanOrEqual(1080);
    expect(r.sw * r.sh).toBeLessThan(1920 * 1080);
    expect(r.sw).toBe(Math.round(1920 * ROI.w));
    expect(roiRect(1920, 1080, true)).toEqual({ sx: 0, sy: 0, sw: 1920, sh: 1080 });
  });

  it('ลำดับลองอ่านวนซ้ำ: ส่วนใหญ่แถบกลาง แต่มีทั้งเฟรมและหมุนทั้งสองทิศ', () => {
    expect(MODE_CYCLE.filter((m) => m === 'roi').length).toBeGreaterThan(MODE_CYCLE.length / 2 - 1);
    expect(MODE_CYCLE).toEqual(expect.arrayContaining(['roi', 'full', 'rot+', 'rot-']));
  });
});

describe('ตัวอ่านบาร์โค้ด · กรองผลระหว่างเฟรม', () => {
  it('บาร์โค้ดมี check digit (EAN/UPC) เชื่อทันทีเฟรมเดียว', () => {
    const c = createConfirmer();
    expect(c({ text: '8850144000013', format: 'EAN_13' })).toBe('8850144000013');
    expect(isTrusted('UPC_A')).toBe(true);
    expect(isTrusted('CODE_128')).toBe(false);
  });

  it('CODE_128/39/ITF ต้องอ่านได้ค่าเดิมซ้ำภายในช่วงเวลา ถึงจะรับ (กันอ่านมั่วจากลายรบกวน)', () => {
    let t = 1000;
    const c = createConfirmer(() => t);
    expect(c({ text: 'AB12', format: 'CODE_128' })).toBeNull(); // ครั้งแรก ยังไม่ชัวร์
    t += 300;
    expect(c({ text: 'AB12', format: 'CODE_128' })).toBe('AB12');
  });

  it('ค่าไม่ตรงกัน หรือห่างเกินช่วงเวลา = ไม่รับ', () => {
    let t = 0;
    const c = createConfirmer(() => t);
    expect(c({ text: 'AAAA', format: 'CODE_39' })).toBeNull();
    t += 200;
    expect(c({ text: 'BBBB', format: 'CODE_39' })).toBeNull();
    t += CONFIRM_WINDOW_MS + 1;
    expect(c({ text: 'BBBB', format: 'CODE_39' })).toBeNull();
    expect(c(null)).toBeNull();
  });
});

describe('ตัวอ่านบาร์โค้ด · zxing แกน (ไม่แตะ DOM)', () => {
  it('แปลง RGBA → ความสว่าง: ขาว=255 ดำ=0 และเฟรมว่างอ่านไม่เจอ (ไม่โยน error)', () => {
    const rgba = new Uint8ClampedArray([255, 255, 255, 255, 0, 0, 0, 255]);
    expect(Array.from(rgbaToLuma(rgba, 2))).toEqual([255, 0]);
  });

  it('ภาพว่างเปล่า → null', () => {
    expect(decodeLuma(new Uint8ClampedArray(200 * 100).fill(255), 200, 100)).toBeNull();
  });
});

describe('กล้อง · ซูมเริ่มต้น', () => {
  it('ไม่มีค่าที่จำไว้ = ซูม 2× (ถ้ากล้องรองรับ) · ตัดให้อยู่ในช่วงของกล้อง', () => {
    expect(pickInitialZoom({ min: 1, max: 5 }, null)).toBe(DEFAULT_ZOOM);
    expect(pickInitialZoom({ min: 1, max: 1.5 }, null)).toBe(1.5);
    expect(pickInitialZoom({ min: 3, max: 8 }, null)).toBe(3);
  });
  it('ใช้ค่าที่ผู้ใช้เคยตั้งไว้', () => {
    expect(pickInitialZoom({ min: 1, max: 5 }, 3.5)).toBe(3.5);
    expect(pickInitialZoom({ min: 1, max: 5 }, 9)).toBe(5);
  });
});
