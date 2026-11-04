import type { QueueItem } from '../types';
import { CN_ORIENTS, CN_STYLES } from './config';
import { useCnStore } from './store';

/* ตัวเลือกของป้ายจีน A4 ต่อใบ: สไตล์ + แนวกระดาษ เป็นปุ่มใหญ่ — ว่าง = ใช้ค่าตั้งต้นจากตั้งค่า "ป้ายจีน A4" */
export default function CnMobileOptions({ item, onSet }: { item: QueueItem; onSet: (field: 'CnStyle' | 'CnOrient', value: string) => void }) {
  const base = useCnStore((s) => s.settings);
  const style = item.CnStyle ?? base.style;
  const orient = item.CnOrient ?? base.orient;
  return (
    <div className="flip-ov" style={{ display: 'flex', flexDirection: 'column', gap: 8, alignSelf: 'stretch' }}>
      <div>
        <span className="q-lbl">สไตล์ป้ายจีน</span>
        <div className="flip-kind-row">
          {CN_STYLES.map((s) => (
            <button key={s.value} type="button" className={`mode-btn${style === s.value ? ' active' : ''}`} aria-pressed={style === s.value} onClick={() => onSet('CnStyle', s.value)}>
              {s.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <span className="q-lbl">แนวกระดาษ A4</span>
        <div className="flip-kind-row">
          {CN_ORIENTS.map((o) => (
            <button key={o.value} type="button" className={`mode-btn${orient === o.value ? ' active' : ''}`} aria-pressed={orient === o.value} onClick={() => onSet('CnOrient', o.value)}>
              {o.label}
            </button>
          ))}
        </div>
      </div>
      <span className="fold-hint">1 ใบ = 1 แผ่น A4 · กดปริ้นแล้วส่งไปเครื่องปริ้นปลายทาง</span>
    </div>
  );
}
