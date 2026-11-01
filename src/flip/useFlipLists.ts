import { useMemo } from 'react';
import { useQueueStore } from '../store/queueStore';
import { computeNeedTags, computeToday } from './data';
import { flipDataFromQueue } from './flipSend';
import { useFlipSettings, useFlipStore } from './store';
import { useDbVersion } from './useDbVersion';

/* รายการ "ต้องเปลี่ยนวันนี้" และ "ต้องพิมพ์ตัวป้ายถาวร" (สเปกข้อ 8) — คำนวณใหม่เมื่อฐานข้อมูลสินค้าซิงค์เสร็จ */
export function useFlipLists() {
  const settings = useFlipSettings();
  const overrides = useFlipStore((s) => s.overrides);
  const lastPrinted = useFlipStore((s) => s.lastPrinted);
  const tagsPrinted = useFlipStore((s) => s.tagsPrinted);
  const groups = useFlipStore((s) => s.groups);
  const queue = useQueueStore((s) => s.queue);
  const dbVersion = useDbVersion();

  /* eslint-disable react-hooks/exhaustive-deps */
  const today = useMemo(() => computeToday(lastPrinted, settings, overrides, groups), [lastPrinted, settings, overrides, groups, dbVersion]);
  const needTags = useMemo(() => {
    const flipQueue = flipDataFromQueue(queue.filter((i) => i.TagMode === 'flip'));
    return computeNeedTags(
      tagsPrinted,
      lastPrinted,
      flipQueue.filter((d) => d.variant !== 'group').map((d) => d.barcode),
      settings,
      overrides,
      groups,
    );
  }, [tagsPrinted, lastPrinted, queue, settings, overrides, groups, dbVersion]);
  /* eslint-enable react-hooks/exhaustive-deps */

  return { today, needTags, dbVersion };
}
