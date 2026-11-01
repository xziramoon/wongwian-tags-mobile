import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { QueueItem } from '../types';
import { queueToFlipData } from './data';
import { FlipStripAny, FlipTagAny } from './FlipTag';
import { stripSize, tagSize } from './layout';
import { useFlipSettings, useFlipStore } from './store';
import { useDbVersion } from './useDbVersion';

const MM = 96 / 25.4; // px ต่อ มม. (ป้ายวาดเป็น mm จริง ย่อด้วย transform ให้พอดีจอ)

function ScaleToFit({ wMm, hMm, children }: { wMm: number; hMm: number; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const compute = () => setScale(Math.min(1, el.clientWidth / (wMm * MM)));
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [wMm]);
  return (
    <div ref={ref} className="flip-scale" style={{ height: Math.ceil(hMm * MM * scale) + 2 }}>
      <div className="flip-scale-inner" style={{ transform: `scale(${scale})` }}>
        {children}
      </div>
    </div>
  );
}

/* พรีวิวป้ายดำแดงบนมือถือ: ตัวป้ายถาวร + แถบราคาหน้า|หลัง (หรือบน/ล่างสำหรับป้ายแคบ) ย่อให้พอดีความกว้างจอ */
export default function FlipMobilePreview({ item }: { item: QueueItem }) {
  const settings = useFlipSettings();
  const overrides = useFlipStore((s) => s.overrides);
  const groups = useFlipStore((s) => s.groups);
  const dbVersion = useDbVersion(); // ราคากลุ่มมาจากฐานข้อมูล
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const d = useMemo(() => queueToFlipData([item], settings, overrides, groups)[0], [item, settings, overrides, groups, dbVersion]);
  const t = tagSize(d);
  const s = stripSize(d);
  return (
    <div className="flip-prev">
      <ScaleToFit wMm={t.w} hMm={t.h}>
        <FlipTagAny data={d} settings={settings} />
      </ScaleToFit>
      <span className="flip-prev-cap">
        {d.variant === 'group' ? 'ป้ายกลุ่ม' : d.variant === 'narrow' ? 'ป้ายแคบ' : 'ตัวป้ายถาวร'} {t.w} × {t.h} มม.
      </span>
      <ScaleToFit wMm={s.w} hMm={s.h}>
        <FlipStripAny data={d} settings={settings} />
      </ScaleToFit>
      <span className="flip-prev-cap">
        แถบราคา {s.w} × {s.h} มม. {d.variant === 'narrow' ? 'พับบน-ล่าง' : 'พับตามเส้นประ'} × {d.qty}
      </span>
    </div>
  );
}
