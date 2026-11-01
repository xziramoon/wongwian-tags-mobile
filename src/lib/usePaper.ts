import { useMemo } from 'react';
import { useQueueStore } from '../store/queueStore';
import { queueToFlipData } from '../flip/data';
import { useFlipSettings, useFlipStore } from '../flip/store';
import { countFlipPages, paperSheets } from './paper';

/* จำนวนกระดาษ A4 ที่ต้องใช้กับของที่รอปริ้นตอนนี้ (ป้ายดำแดงนับตามชนิดที่ตั้งส่ง: ตัวป้าย / แถบ / ทั้งคู่) */
export function usePaperSheets(): number {
  const queue = useQueueStore((s) => s.queue);
  const config = useQueueStore((s) => s.config);
  const settings = useFlipSettings();
  const overrides = useFlipStore((s) => s.overrides);
  const groups = useFlipStore((s) => s.groups);
  return useMemo(() => {
    const flipData = queueToFlipData(
      queue.filter((i) => i.TagMode === 'flip'),
      settings,
      overrides,
      groups,
    );
    return paperSheets(queue, config, countFlipPages(flipData, settings.sendKind));
  }, [queue, config, settings, overrides, groups]);
}
