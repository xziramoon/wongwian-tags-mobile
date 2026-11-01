import { describe, expect, it } from 'vitest';
import type { QueueItem } from '../types';
import { summarizeByType, totalTags, typeDef } from './tagTypes';

const it_ = (mode: QueueItem['TagMode'], qty: number) => ({ TagMode: mode, PrintQty: qty }) as QueueItem;

describe('tagTypes', () => {
  it('นับใบแยกตามแบบ เรียงตามลำดับแบบ และข้ามแบบที่ไม่มี', () => {
    const s = summarizeByType([it_('flip', 2), it_('standard', 3), it_('standard', 2), it_('fridge', 1)]);
    expect(s.map((x) => [x.def.key, x.count])).toEqual([
      ['standard', 5],
      ['fridge', 1],
      ['flip', 2],
    ]);
  });

  it('จำนวนใบรวม และสีประจำแบบตามดีไซน์', () => {
    expect(totalTags([it_('dual', 2), it_('large', 1)])).toBe(3);
    expect(typeDef('flip').color).toBe('#FF4D3D');
    expect(typeDef('fridge').color).toBe('#22D3EE');
    expect(typeDef('oos').label).toBe('ของหมด');
  });
});
