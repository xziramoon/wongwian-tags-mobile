import { describe, expect, it } from 'vitest';
import { isVeg, isVegName } from './veg';

describe('isVegName', () => {
  it('detects เจ as a word in product names', () => {
    expect(isVegName('หมูแผ่นเจ 100g')).toBe(true);
    expect(isVegName('ไส้กรอกเจ')).toBe(true);
    expect(isVegName('(เจ) บะหมี่กึ่งสำเร็จรูป')).toBe(true);
    expect(isVegName('โปรตีนเกษตร 齋')).toBe(true);
  });

  it('ignores Thai words that merely start with เจ', () => {
    expect(isVegName('เจลล้างมือ')).toBe(false);
    expect(isVegName('ไข่เจียว')).toBe(false);
    expect(isVegName('เจ้าสัว ข้าวตัง')).toBe(false);
    expect(isVegName('เป๊ปซี่ 1.26ลิตร')).toBe(false);
  });
});

describe('isVeg', () => {
  it('lets the per-item override win over auto detection', () => {
    expect(isVeg({ ProductName: 'น้ำดื่ม', Veg: 'Y' }, { vegAuto: false })).toBe(true);
    expect(isVeg({ ProductName: 'หมูเจ', Veg: 'N' }, { vegAuto: true })).toBe(false);
    expect(isVeg({ ProductName: 'หมูเจ', Veg: '' }, { vegAuto: true })).toBe(true);
    expect(isVeg({ ProductName: 'หมูเจ', Veg: '' }, { vegAuto: false })).toBe(false);
  });
});
