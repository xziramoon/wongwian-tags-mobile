import type { QueueItem } from '../types';
import CnMobilePreview from './CnMobilePreview';
import { CN_INK_LEVELS, CN_ORIENTS, CN_REDS, CN_STYLES, DEFAULT_CN_SETTINGS } from './config';
import { useCnStore } from './store';

const SAMPLE: QueueItem = {
  Barcode: '8850144000013',
  ProductName: 'น้ำปลาทิพรส สูตรต้นตำรับ',
  NameFontSize: 0,
  TagMode: 'cnsign',
  DualStyle: 'A',
  OldPrice: '',
  Price: '35',
  Price2: '399',
  PriceOffsetX: 0,
  Size: '700 มล.',
  Unit: 'ขวด',
  Unit1: '',
  Unit2: 'ยกลัง',
  PackType: '12 ขวด',
  Ribbon: '',
  Mfg: '',
  Exp: '',
  Image: '',
  PrintQty: 1,
  PriceDiff: null,
  OosEta: '',
  OosReason: 'temp',
  Loc: '',
  Printed: '',
  Veg: '',
  HamperLabel: '',
  HamperNote: '',
  HamperGreet: '',
  HamperGreetCN: '',
};

const TEXTS: { key: 'shopCn' | 'shopTh' | 'corner' | 'unit'; label: string }[] = [
  { key: 'shopCn', label: 'ตราจีน' },
  { key: 'shopTh', label: 'ชื่อร้านไทย' },
  { key: 'corner', label: 'คำมุม' },
  { key: 'unit', label: 'หน่วยราคา' },
];

/* ตั้งค่าป้ายจีน A4 ในหน้าตั้งค่าของมือถือ: สไตล์/แนวตั้งต้น ข้อความ สีแดง ขาว-ดำ + พรีวิวสด */
export default function CnSettingsFold() {
  const raw = useCnStore((s) => s.settings);
  const update = useCnStore((s) => s.updateSetting);
  const reset = useCnStore((s) => s.resetSettings);
  const isDefault = JSON.stringify(raw) === JSON.stringify(DEFAULT_CN_SETTINGS);

  return (
    <details className="fold" open>
      <summary>
        ป้ายจีน A4<span className="fold-arrow">▾</span>
      </summary>
      <div className="fold-body">
        <CnMobilePreview item={SAMPLE} />

        <div className="cfg-full">
          <span className="cfg-lbl">สไตล์ตั้งต้น (เปลี่ยนรายใบได้ตอนเลือกแบบป้าย)</span>
          <div className="flip-kind-row">
            {CN_STYLES.map((t) => (
              <button key={t.value} type="button" className={`mode-btn${raw.style === t.value ? ' active' : ''}`} aria-pressed={raw.style === t.value} onClick={() => update('style', t.value)}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="cfg-full">
          <span className="cfg-lbl">แนวกระดาษตั้งต้น</span>
          <div className="flip-kind-row">
            {CN_ORIENTS.map((t) => (
              <button key={t.value} type="button" className={`mode-btn${raw.orient === t.value ? ' active' : ''}`} aria-pressed={raw.orient === t.value} onClick={() => update('orient', t.value)}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {TEXTS.map(({ key, label }) => (
          <div key={key}>
            <span className="cfg-lbl">{label}</span>
            <input className="field-input" value={raw[key]} onChange={(e) => update(key, e.target.value)} />
          </div>
        ))}

        <div className="cfg-full">
          <span className="cfg-lbl">ความเข้มสี (ปริ้นออกมาซีดให้เพิ่ม)</span>
          <div className="flip-kind-row">
            {CN_INK_LEVELS.map((t) => (
              <button key={t.value} type="button" className={`mode-btn${raw.ink === t.value ? ' active' : ''}`} aria-pressed={raw.ink === t.value} onClick={() => update('ink', t.value)}>
                {t.label}
              </button>
            ))}
          </div>
          <span className="fold-hint">แดงเข้มขึ้น ตัวเลขราคาหนาขึ้น ตัวเทา/เส้นบางเข้มขึ้น</span>
        </div>

        <div>
          <span className="cfg-lbl">สีแดง</span>
          <div className="flip-red">
            <select
              className="field-input"
              value={CN_REDS.some((r) => r.value.toLowerCase() === raw.red.toLowerCase()) ? raw.red : ''}
              onChange={(e) => e.target.value && update('red', e.target.value)}
            >
              {CN_REDS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label} {r.value}
                </option>
              ))}
              <option value="">กำหนดเอง</option>
            </select>
            <input type="color" value={raw.red} onChange={(e) => update('red', e.target.value)} aria-label="เลือกสีแดงเอง" />
          </div>
        </div>

        <div className="cb-wrap">
          <input type="checkbox" id="cn-mono" checked={raw.mono} onChange={(e) => update('mono', e.target.checked)} />
          <label htmlFor="cn-mono">โหมดขาวดำ (แดงเป็นดำ) — หรือเปิด "ปริ้นขาว-ดำ" ด้านบนของตั้งค่า</label>
        </div>

        <button type="button" className="dz-btn" onClick={reset} disabled={isDefault}>
          คืนค่าเริ่มต้น
        </button>
      </div>
    </details>
  );
}
