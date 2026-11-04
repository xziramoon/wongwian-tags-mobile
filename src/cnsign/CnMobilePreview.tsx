import { useMemo } from 'react';
import type { QueueItem } from '../types';
import { useQueueStore } from '../store/queueStore';
import { ScaleToFit } from '../flip/FlipMobilePreview';
import { CnSignTag } from './CnSignTag';
import { CN_SHEET } from './config';
import { fromQueueItem } from './data';
import { useCnSettings } from './store';

/* พรีวิวป้ายจีน A4 บนมือถือ: ทั้งแผ่น ย่อให้พอดีความกว้างจอ (วาดเป็น มม. จริงแล้ว scale) */
export default function CnMobilePreview({ item }: { item: QueueItem }) {
  const settings = useCnSettings();
  const config = useQueueStore((s) => s.config);
  const d = useMemo(() => fromQueueItem(item, settings, config), [item, settings, config]);
  const portrait = d.orient === 'portrait';
  const w = portrait ? CN_SHEET.short : CN_SHEET.long;
  const h = portrait ? CN_SHEET.long : CN_SHEET.short;
  return (
    <div className="flip-prev cn-mprev" data-orient={d.orient}>
      <ScaleToFit wMm={w} hMm={h}>
        <CnSignTag data={d} settings={settings} />
      </ScaleToFit>
      <span className="flip-prev-cap">
        ป้ายจีน A4 · {d.style === 'strip' ? 'แถบตั้ง' : 'แผ่นป้ายบน'} · {portrait ? 'แนวตั้ง' : 'แนวนอน'} × {d.qty} แผ่น
      </span>
    </div>
  );
}
