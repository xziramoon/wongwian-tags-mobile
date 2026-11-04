import { useState } from 'react';
import { useUIStore } from '../store/uiStore';
import { useQueueStore } from '../store/queueStore';
import { typeDef } from '../lib/tagTypes';
import { QUICK_MODES, QUICK_UNITS, cleanPrice, isValidPrice, makeQuickItem, pressKey, type KeypadKey } from '../lib/quickPrice';
import TagPreview from './TagPreview';
import { IconClose } from './Icons';

const KEYS: { key: KeypadKey; label: string; aria?: string }[] = [
  { key: '7', label: '7' },
  { key: '8', label: '8' },
  { key: '9', label: '9' },
  { key: '4', label: '4' },
  { key: '5', label: '5' },
  { key: '6', label: '6' },
  { key: '1', label: '1' },
  { key: '2', label: '2' },
  { key: '3', label: '3' },
  { key: '.', label: '.', aria: 'จุดทศนิยม' },
  { key: '0', label: '0' },
  { key: 'back', label: '⌫', aria: 'ลบตัวเลขตัวสุดท้าย' },
];

/* กดราคาเอง (ไม่ต้องสแกนสินค้า): กดตัวเลขราคาบนแป้น → เห็นตัวอย่างป้ายทันที → เก็บไว้ก่อน / ปริ้นเลย
 * ชื่อสินค้ากับหน่วยกรอกหรือไม่กรอกก็ได้ · ป้ายไม่มีบาร์โค้ด */
export default function QuickPriceSheet() {
  const open = useUIStore((s) => s.quickPriceOpen);
  const setOpen = useUIStore((s) => s.setQuickPriceOpen);
  const lastTagMode = useUIStore((s) => s.lastTagMode);
  const config = useQueueStore((s) => s.config);
  const updateConfig = useQueueStore((s) => s.updateConfig);
  const addItem = useQueueStore((s) => s.addItem);
  const requestSend = useQueueStore((s) => s.requestSend);

  const [price, setPrice] = useState('');
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('ชิ้น');
  const [mode, setMode] = useState(() => (QUICK_MODES.includes(lastTagMode) ? lastTagMode : 'standard'));
  const [qty, setQty] = useState(1);

  if (!open) return null;

  const valid = isValidPrice(price);
  const item = makeQuickItem({ price: valid ? price : '0', name, unit, mode, qty, config });

  const reset = () => {
    setPrice('');
    setName('');
    setQty(1);
  };
  const close = () => {
    setOpen(false);
    reset();
  };
  const keep = () => {
    if (!valid) return;
    addItem(makeQuickItem({ price, name, unit, mode, qty, config }));
    useUIStore.getState().showToast(`เก็บป้ายราคา ${cleanPrice(price)} บาท ${qty} ใบแล้ว`, 'success');
    setOpen(false);
    reset();
  };
  const printNow = () => {
    if (!valid) return;
    addItem(makeQuickItem({ price, name, unit, mode, qty, config }));
    setOpen(false);
    reset();
    requestSend();
  };

  return (
    <div className="dz-sheet-backdrop" onClick={close}>
      <section className="dz-result dz-quick" role="dialog" aria-label="กดราคาเอง" onClick={(e) => e.stopPropagation()}>
        <span className="dz-grabber" />
        <div className="dz-res-head">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span className="dz-head" style={{ fontSize: 22 }}>
              กดราคาเอง
            </span>
            <span className="dz-muted" style={{ fontSize: 13 }}>
              ไม่ต้องสแกนสินค้า — กดตัวเลขแล้วปริ้นได้เลย
            </span>
          </div>
          <button type="button" className="dz-icon-btn" onClick={close} aria-label="ปิด">
            <IconClose size={20} />
          </button>
        </div>

        <div className="dz-quick-display" aria-live="polite">
          <span className="dz-quick-num" data-empty={price === ''}>
            {price === '' ? '0' : price}
          </span>
          <span className="dz-muted">บาท</span>
          <button type="button" className="dz-mini-btn" style={{ marginLeft: 'auto' }} onClick={() => setPrice('')} disabled={price === ''}>
            ล้าง
          </button>
        </div>

        <div className="dz-keypad" role="group" aria-label="แป้นตัวเลขราคา">
          {KEYS.map((k) => (
            <button key={k.key} type="button" className="dz-key" aria-label={k.aria} onClick={() => setPrice((p) => pressKey(p, k.key))}>
              {k.label}
            </button>
          ))}
        </div>

        <div className="dz-prevbox">
          <TagPreview item={item} config={config} maxWidth={250} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span className="dz-label">แบบป้าย</span>
          <div className="dz-types" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
            {QUICK_MODES.map((m) => {
              const t = typeDef(m);
              return (
                <button key={m} type="button" className="dz-type" aria-pressed={mode === m} onClick={() => setMode(m)}>
                  <i style={{ background: t.color }} />
                  {m === 'large' ? 'ป้ายใหญ่' : t.label}
                </button>
              );
            })}
          </div>
          {mode === 'fridge' && !config.fridgeFill && (
            <div className="dz-form">
              <span className="fold-hint">ป้ายตู้แช่ปริ้น 888 เปล่าให้เขียนราคาเอง — เปิด "ปริ้นราคาจริง" เพื่อให้ถมตัวเลขที่กดไว้ให้เลย</span>
              <button type="button" className="dz-btn" onClick={() => updateConfig('fridgeFill', true)}>
                เปิดปริ้นราคาจริง (ตู้แช่)
              </button>
            </div>
          )}
          {mode === 'fridge' && config.fridgeFill && <span className="fold-hint">ถมตัวเลขตามราคาที่กดให้แล้ว (ราคามีสตางค์ = เว้นว่างให้ระบายเอง)</span>}
        </div>

        <div className="dz-form">
          <label className="field-label" htmlFor="quick-name">
            ชื่อสินค้า (ไม่กรอกก็ได้)
          </label>
          <input id="quick-name" className="field-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น น้ำปลา 700 มล." />
          <span className="field-label">หน่วย</span>
          <div className="dz-units">
            {QUICK_UNITS.map((u) => (
              <button key={u} type="button" className="dz-chip" aria-pressed={unit === u} onClick={() => setUnit(u)}>
                {u}
              </button>
            ))}
          </div>
        </div>

        <div className="dz-bottom">
          <div role="group" aria-label="กี่ใบ" className="dz-stepper">
            <button type="button" aria-label="ลดจำนวน" onClick={() => setQty((q) => Math.max(1, q - 1))}>
              −
            </button>
            <span>{qty}</span>
            <button type="button" aria-label="เพิ่มจำนวน" onClick={() => setQty((q) => q + 1)}>
              +
            </button>
          </div>
          <button type="button" className="dz-btn" onClick={keep} disabled={!valid}>
            เก็บไว้ก่อน
          </button>
          <button type="button" className="dz-btn dz-btn-primary" onClick={printNow} disabled={!valid}>
            ปริ้นเลย
          </button>
        </div>
      </section>
    </div>
  );
}
