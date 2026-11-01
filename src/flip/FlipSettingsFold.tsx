import { useMemo } from 'react';
import type { QueueItem } from '../types';
import { FLIP_FONTS, FLIP_REDS, FLIP_THEMES, NAME_SZ_RANGE, TAG_W_RANGE, type FlipSettings } from './config';
import FlipSizeSlider, { autoNameSize } from './FlipSizeSlider';
import FlipGroupsMobile from './FlipGroupsMobile';
import FlipMobilePreview from './FlipMobilePreview';
import { FlipSendKindPicker } from './FlipMobileOptions';
import { sendFlipStandalone } from './flipSend';
import { useFlipStore } from './store';
import { useDbVersion } from './useDbVersion';

const SAMPLE: QueueItem = {
  Barcode: '8850999123456',
  ProductName: 'น้ำดื่มตัวอย่าง ขวดใหญ่ 1.5 ลิตร',
  NameFontSize: 0,
  TagMode: 'flip',
  DualStyle: 'A',
  OldPrice: '',
  Price: '25',
  Price2: '400',
  PriceOffsetX: 0,
  Size: '1.5 ลิตร',
  Unit: 'ขวด',
  Unit1: '',
  Unit2: 'ยกลัง',
  PackType: '',
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

const TEXT_FIELDS: { key: keyof FlipSettings; label: string }[] = [
  { key: 'shopCn', label: 'ตราจีน (หัวป้าย)' },
  { key: 'shopTh', label: 'ชื่อร้านไทย' },
  { key: 'corner', label: 'คำมุมขวาหัวป้าย' },
  { key: 'unit', label: 'หน่วยราคา' },
  { key: 'outText', label: 'ด้านหลัง: ข้อความใหญ่' },
  { key: 'outSub', label: 'ด้านหลัง: บรรทัดเล็ก' },
];

/* ตั้งค่าป้ายดำแดง (แถบพลิก) ในหน้าตั้งค่าของมือถือ: ธีม/ข้อความ/ฟอนต์/ขาวดำ + ชนิดที่ส่ง + สติกเกอร์ + กลุ่มสินค้า */
export default function FlipSettingsFold() {
  const settings = useFlipStore((s) => s.settings);
  const updateSetting = useFlipStore((s) => s.updateSetting);
  const dbVersion = useDbVersion();
  const sample = useMemo(() => SAMPLE, []);

  return (
    <details className="fold" open>
      <summary>
        ป้ายดำแดง (แถบพลิก)<span className="fold-arrow">▾</span>
      </summary>
      <div className="fold-body">
        <FlipMobilePreview item={sample} />

        <div className="cfg-full">
          <span className="cfg-lbl">ธีม (สี/ฟอนต์ตัวเลขเหมือนป้ายปกติ)</span>
          <div className="flip-kind-row">
            {FLIP_THEMES.map((t) => (
              <button
                key={t.value}
                type="button"
                className={`mode-btn${settings.theme === t.value ? ' active' : ''}`}
                aria-pressed={settings.theme === t.value}
                onClick={() => updateSetting('theme', t.value)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="cb-wrap">
          <input type="checkbox" id="flip-mono" checked={settings.mono} onChange={(e) => updateSetting('mono', e.target.checked)} />
          <label htmlFor="flip-mono">โหมดขาวดำ (แดงเป็นดำ) — หรือเปิด "ปริ้นขาว-ดำ" ด้านบนของตั้งค่า</label>
        </div>

        <FlipSendKindPicker />

        {TEXT_FIELDS.map(({ key, label }) => (
          <div key={key}>
            <span className="cfg-lbl">{label}</span>
            <input className="field-input" value={String(settings[key])} onChange={(e) => updateSetting(key, e.target.value as never)} />
          </div>
        ))}

        <FlipSizeSlider
          label="ความกว้างป้าย (ค่าตั้งต้นทุกสินค้า)"
          unit="มม."
          {...TAG_W_RANGE}
          value={settings.tagW}
          onChange={(v) => updateSetting('tagW', v)}
          onReset={() => updateSetting('tagW', 90)}
          overridden={settings.tagW !== 90}
        />
        <FlipSizeSlider
          label="ขนาดตัวอักษรชื่อสินค้า (ค่าตั้งต้น)"
          unit="มม."
          {...NAME_SZ_RANGE}
          value={settings.nameSz}
          autoValue={autoNameSize(sample.ProductName, settings.font, settings.tagW)}
          onChange={(v) => updateSetting('nameSz', v)}
        />

        <div>
          <span className="cfg-lbl">ฟอนต์</span>
          <select className="field-input" value={settings.font} onChange={(e) => updateSetting('font', e.target.value)}>
            {FLIP_FONTS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>

        {settings.theme === 'plain' && (
          <div>
            <span className="cfg-lbl">สีแดง</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <select
                className="field-input"
                value={FLIP_REDS.some((r) => r.value === settings.red) ? settings.red : ''}
                onChange={(e) => e.target.value && updateSetting('red', e.target.value)}
              >
                {FLIP_REDS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label} {r.value}
                  </option>
                ))}
                <option value="">กำหนดเอง</option>
              </select>
              <input type="color" value={settings.red} onChange={(e) => updateSetting('red', e.target.value)} aria-label="เลือกสีแดงเอง" />
            </div>
          </div>
        )}

        <button type="button" className="btn btn-secondary btn-block" onClick={() => sendFlipStandalone('stickers', [])}>
          ส่งสติกเกอร์ "หมด" 1 แผ่น (14 × 8 มม.)
        </button>

        <FlipGroupsMobile dbVersion={dbVersion} />
      </div>
    </details>
  );
}
