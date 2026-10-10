import { useQueueStore } from '../store/queueStore';
import { useUIStore } from '../store/uiStore';
import type { QueueItem } from '../types';
import TagPreview from './TagPreview';
import SliderRow from './SliderRow';
import { PRICE_FONTS, THEME_PRESETS } from '../constants';

/* placeholder shown in the embedded preview when the queue is still empty */
const PLACEHOLDER_ITEM: QueueItem = {
  Barcode: '8850000000012',
  ProductName: 'ตัวอย่างชื่อสินค้า',
  NameFontSize: 0,
  TagMode: 'standard',
  DualStyle: 'A',
  OldPrice: '',
  Price: '39.00',
  Price2: '',
  PriceOffsetX: 0,
  Size: '',
  Unit: 'ชิ้น',
  Unit1: '',
  Unit2: '',
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
};

/* global tag-design editor — reachable via the gear-icon pill (top-right, mirrors
 * .conn-status top-left / .queue-badge bottom-right so nothing overlaps). Presets +
 * always-visible basics up top, ~12 SliderRows tucked under a <details> fold so the
 * common case (pick a preset, maybe change the header text) doesn't need scrolling
 * past a wall of sliders. */
export default function SettingsSheet() {
  const open = useUIStore((s) => s.settingsSheetOpen);
  const setOpen = useUIStore((s) => s.setSettingsSheetOpen);
  const config = useQueueStore((s) => s.config);
  const updateConfig = useQueueStore((s) => s.updateConfig);
  const applyPreset = useQueueStore((s) => s.applyPreset);
  const queue = useQueueStore((s) => s.queue);

  /* ใส่ค่าตั้งของธีมครบชุดเฉพาะตอนเปลี่ยนจากแบบเดิม และไม่ทับช่องที่กรอกเองไว้แล้ว (ยกเว้น tagTheme)
     สลับระหว่างธีมใหม่ด้วยกัน = เปลี่ยนแค่ tagTheme ช่องที่ผู้ใช้ลบทิ้งจะไม่ถูกเติมกลับ */
  const applyTheme = (name: 'korean' | 'ink') => {
    const preset = THEME_PRESETS[name];
    const fromClassic = !config.tagTheme || config.tagTheme === 'classic';
    Object.entries(preset).forEach(([k, v]) => {
      const key = k as keyof typeof config;
      const cur = String(config[key] ?? '').trim();
      const isDefaultHeader = key === 'header' && (cur === '' || cur === 'ร้านวงเวียน');
      if (key === 'tagTheme' || (fromClassic && (cur === '' || isDefaultHeader))) updateConfig(key, v as string);
    });
  };

  if (!open) return null;

  const previewItem = queue[0] || PLACEHOLDER_ITEM;

  return (
    <div className="sheet-backdrop" onClick={() => setOpen(false)}>
      <div className="sheet sheet-full settings-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="queue-drawer-header">
          <span>ออกแบบป้ายราคา</span>
          <button type="button" className="sheet-close" onClick={() => setOpen(false)} aria-label="ปิด">
            ✕
          </button>
        </div>

        <TagPreview item={previewItem} config={config} />

        <div className="preset-row">
          <button type="button" className="btn btn-preset" onClick={() => applyPreset('S')}>
            เล็ก
          </button>
          <button type="button" className="btn btn-preset" onClick={() => applyPreset('M')}>
            มาตรฐาน
          </button>
          <button type="button" className="btn btn-preset" onClick={() => applyPreset('L')}>
            ใหญ่
          </button>
          <button type="button" className="btn btn-preset" onClick={() => applyPreset('XL')}>
            ป้ายใหญ่
          </button>
        </div>

        <div className="cfg-grid">
          <div className="cfg-full">
            <span className="cfg-lbl">ชื่อร้านบนหัวป้าย</span>
            <input className="inp" value={config.header} onChange={(e) => updateConfig('header', e.target.value)} />
          </div>

          <div className="cfg-full">
            <span className="cfg-lbl">ฟอนต์ตัวหนังสือบนป้าย</span>
            <select className="inp" value={config.font} onChange={(e) => updateConfig('font', e.target.value)}>
              <option value="'Kanit',sans-serif">Kanit</option>
              <option value="'Prompt',sans-serif">Prompt</option>
              <option value="'Sarabun',sans-serif">Sarabun</option>
              <option value="'Mitr',sans-serif">Mitr</option>
            </select>
          </div>

          <div className="cfg-full">
            <span className="cfg-lbl">ธีมป้ายปกติ</span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              <button
                type="button"
                className="btn btn-preset"
                aria-pressed={!config.tagTheme || config.tagTheme === 'classic'}
                onClick={() => updateConfig('tagTheme', 'classic')}
              >
                แบบเดิม
              </button>
              <button
                type="button"
                className="btn btn-preset"
                aria-pressed={config.tagTheme === 'korean'}
                onClick={() => applyTheme('korean')}
              >
                เกาหลี
              </button>
              <button
                type="button"
                className="btn btn-preset"
                aria-pressed={config.tagTheme === 'ink'}
                onClick={() => applyTheme('ink')}
              >
                หมึกแดง
              </button>
            </div>
            <span className="fold-hint">
              ธีมใหม่ใช้สีแดง ต้องพิมพ์ด้วยเครื่องพิมพ์สี · ตรา SALE / 特价 ขึ้นเองเมื่อสินค้ามี "ราคาเดิม"
            </span>
          </div>

          <div className="cfg-full">
            <span className="cfg-lbl">ข้อความขวาบนหัวป้าย (เว้นว่าง = ไม่แสดง)</span>
            <input
              className="inp"
              value={String(config.headerSub || '')}
              onChange={(e) => updateConfig('headerSub', e.target.value)}
              placeholder="ซุปเปอร์มาร์เก็ต"
            />
          </div>
          <div className="cfg-full">
            <span className="cfg-lbl">ชื่อสาขา มุมล่างซ้าย (เว้นว่าง = ไม่แสดง)</span>
            <input
              className="inp"
              value={String(config.branchLabel || '')}
              onChange={(e) => updateConfig('branchLabel', e.target.value)}
              placeholder="สาขาวงเวียน"
            />
          </div>

          <div className="cfg-full">
            <span className="cfg-lbl">ชื่อจีนบนหัวป้าย (เว้นว่าง = ไม่แสดง)</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="inp"
                style={{ flex: 1, fontFamily: "'Noto Serif SC', serif", fontWeight: 900 }}
                value={String(config.headerCN || '')}
                onChange={(e) => updateConfig('headerCN', e.target.value)}
                placeholder="黄六盛"
              />
              <button type="button" className="btn btn-preset" onClick={() => updateConfig('headerCN', '黄六盛')}>
                ใส่ 黄六盛
              </button>
            </div>
          </div>

          <div className="cfg-full">
            <span className="cfg-lbl">ฟอนต์ตัวเลขราคา (หมึกพู่กัน)</span>
            <select
              className="inp"
              style={{ fontFamily: config.priceFont || undefined }}
              value={String(config.priceFont || '')}
              onChange={(e) => updateConfig('priceFont', e.target.value)}
            >
              {PRICE_FONTS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          <div className="cfg-full">
            <span className="cfg-lbl">สีตัวเลขราคา</span>
            <select
              className="inp"
              value={config.priceInk === 'red' ? 'red' : 'black'}
              onChange={(e) => updateConfig('priceInk', e.target.value)}
            >
              <option value="black">ดำ (เดิม)</option>
              <option value="red">แดงหมึก — ต้องใช้เครื่องพิมพ์สี</option>
            </select>
          </div>

          <div>
            <span className="cfg-lbl">คำนำหน้า "ขนาด"</span>
            <input className="inp" value={config.labelSize} onChange={(e) => updateConfig('labelSize', e.target.value)} />
          </div>
          <div>
            <span className="cfg-lbl">คำนำหน้า "บรรจุ"</span>
            <input className="inp" value={config.labelUnit} onChange={(e) => updateConfig('labelUnit', e.target.value)} />
          </div>
          <div className="cfg-full">
            <span className="cfg-lbl">คำว่า "ปลีก" (ป้ายโชว์ 2 ราคา แบบ A)</span>
            <input
              className="inp"
              value={config.labelRetail}
              onChange={(e) => updateConfig('labelRetail', e.target.value)}
              placeholder="เช่น ปลีก, ราคาปกติ, ขายปลีก"
            />
          </div>
        </div>

        <div className="cb-wrap">
          <input
            type="checkbox"
            id="invert-baht"
            checked={!!config.invertBaht}
            onChange={(e) => updateConfig('invertBaht', e.target.checked)}
          />
          <label htmlFor="invert-baht">ถมดำพื้นหลังคำว่า "บาท"</label>
        </div>
        <div className="cb-wrap">
          <input
            type="checkbox"
            id="ink-tilt"
            checked={!!config.inkTilt}
            onChange={(e) => updateConfig('inkTilt', e.target.checked)}
          />
          <label htmlFor="ink-tilt">เอียงตัวเลขราคาแบบหมึกพู่กัน</label>
        </div>
        <div className="cb-wrap">
          <input
            type="checkbox"
            id="veg-auto"
            checked={!!config.vegAuto}
            onChange={(e) => updateConfig('vegAuto', e.target.checked)}
          />
          <label htmlFor="veg-auto">ติดป้าย 齋 เจ อัตโนมัติเมื่อชื่อสินค้ามีคำว่า "เจ"</label>
        </div>
        <div className="cb-wrap">
          <input
            type="checkbox"
            id="print-mono"
            checked={!!config.printMono}
            onChange={(e) => updateConfig('printMono', e.target.checked)}
          />
          <label htmlFor="print-mono">พิมพ์ขาว-ดำ — เปลี่ยนแดง/เหลืองเป็นโทนดำ (เครื่องพิมพ์ขาวดำ)</label>
        </div>

        <details className="fold">
          <summary>
            ตั้งค่าขั้นสูง<span className="fold-arrow">▾</span>
          </summary>
          <div className="fold-body">
            <div className="panel">
              <div className="p-lbl">ตั้งค่าป้ายปกติ</div>
              <div className="slider-stack">
                <SliderRow configKey="w" full />
                <SliderRow configKey="h" full />
                <SliderRow configKey="bcHeight" full />

                <span className="cfg-lbl cfg-sec-lbl">ขนาดตัวหนังสือ (px)</span>
                <SliderRow configKey="globalNameSz" full />
                <SliderRow configKey="priceSz" full />
                <SliderRow configKey="dualSz" full />
                <SliderRow configKey="metaSz" full />

                <span className="cfg-lbl cfg-sec-lbl">ริบบิ้นมุมป้าย</span>
                <SliderRow configKey="ribbonSz" full />
                <SliderRow configKey="ribbonX" full />
                <SliderRow configKey="ribbonY" full />
              </div>
            </div>

            <div className="panel">
              <div className="p-lbl">ตั้งค่าป้ายใหญ่</div>
              <div className="slider-stack">
                <SliderRow configKey="largeW" full />
                <SliderRow configKey="largeH" full />
                <SliderRow configKey="bcHeightLrg" full />
              </div>
            </div>

            <div className="panel">
              <div className="p-lbl">ตั้งค่าแถบสินค้าหมด</div>
              <div className="slider-stack">
                <SliderRow configKey="oosW" full />
                <SliderRow configKey="oosH" full />
                <SliderRow configKey="oosSz" full />
              </div>
            </div>
          </div>
        </details>
      </div>
    </div>
  );
}
