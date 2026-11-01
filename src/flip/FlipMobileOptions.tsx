import type { QueueItem } from '../types';
import { fromQueueItem, type FlipVariant } from './data';
import type { FlipSendKind } from './config';
import { useFlipStore } from './store';

type TextKey = 'corner' | 'footer' | 'pack';
const FIELDS: { key: TextKey; label: string; hint: string }[] = [
  { key: 'corner', label: 'คำมุมขวาหัวป้าย', hint: 'ว่าง = ตามตั้งค่าร้าน' },
  { key: 'footer', label: 'บรรทัดล่างของป้าย', hint: 'ว่าง = ไม่แสดง' },
  { key: 'pack', label: 'แถบดำใต้ราคา (ยกลัง)', hint: 'ว่าง = ซ่อนแถบดำ' },
];
const VARIANTS: { value: FlipVariant; label: string }[] = [
  { value: 'full', label: 'เต็ม 90 มม.' },
  { value: 'narrow', label: 'แคบ 45 มม.' },
  { value: 'group', label: 'กลุ่ม' },
];
const SEND_KINDS: { value: FlipSendKind; label: string }[] = [
  { value: 'tags', label: 'ตัวป้าย' },
  { value: 'strips', label: 'แถบราคา' },
  { value: 'both', label: 'ทั้งคู่' },
];

/* เลือกว่าสั่งส่งแล้วให้พิมพ์อะไร — ตั้งค่าเดียวทั้งแอป (ของใหม่ = ทั้งคู่, ราคาเปลี่ยนรายวัน = แถบราคา) */
export function FlipSendKindPicker() {
  const kind = useFlipStore((s) => s.settings.sendKind);
  const update = useFlipStore((s) => s.updateSetting);
  return (
    <div>
      <span className="q-lbl">เมื่อส่งพิมพ์ ให้พิมพ์</span>
      <div className="flip-kind-row">
        {SEND_KINDS.map((k) => (
          <button
            key={k.value}
            type="button"
            className={`mode-btn${kind === k.value ? ' active' : ''}`}
            aria-pressed={kind === k.value}
            onClick={() => update('sendKind', k.value)}
          >
            {k.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ตัวเลือกของป้ายดำแดงต่อสินค้า: ขนาด เต็ม/แคบ/กลุ่ม + ข้อความ override (เก็บตามบาร์โค้ด) */
export default function FlipMobileOptions({ item }: { item: QueueItem }) {
  const settings = useFlipStore((s) => s.settings);
  const overrides = useFlipStore((s) => s.overrides[item.Barcode]);
  const groups = useFlipStore((s) => s.groups);
  const setOverride = useFlipStore((s) => s.setOverride);
  const clearOverride = useFlipStore((s) => s.clearOverride);
  const auto = fromQueueItem(item, settings, {});
  const variant: FlipVariant = overrides?.variant ?? 'full';
  const memberOf = groups.find((g) => g.members.some((m) => m.barcode === item.Barcode));

  const chooseGroup = (id: string) => {
    setOverride(item.Barcode, 'variant', 'group');
    setOverride(item.Barcode, 'groupId', id);
  };

  return (
    <div className="flip-ov" style={{ display: 'flex', flexDirection: 'column', gap: 8, alignSelf: 'stretch' }}>
      <span className="q-lbl">ขนาดป้ายดำแดง</span>
      <div className="flip-variant-row">
        {VARIANTS.map((v) => (
          <button
            key={v.value}
            type="button"
            className={`mode-btn${variant === v.value ? ' active' : ''}`}
            aria-pressed={variant === v.value}
            disabled={v.value === 'group' && !groups.length}
            onClick={() => {
              if (v.value === 'group') chooseGroup(overrides?.groupId || groups[0]?.id || '');
              else setOverride(item.Barcode, 'variant', v.value);
            }}
          >
            {v.label}
          </button>
        ))}
      </div>
      {!groups.length && <span className="fold-hint">ยังไม่มีกลุ่ม — สร้างได้ที่ ตั้งค่า → ป้ายดำแดง (แถบพลิก)</span>}

      {variant === 'group' && (
        <div className="q-field">
          <span className="q-lbl">กลุ่มสินค้า</span>
          <select className="field-input" value={overrides?.groupId ?? ''} onChange={(e) => chooseGroup(e.target.value)}>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name} ({g.members.length} กลิ่น)
              </option>
            ))}
          </select>
        </div>
      )}

      {memberOf && variant !== 'group' && (
        <div className="flip-hint-box">
          <span>
            สินค้านี้อยู่ในกลุ่ม <b>{memberOf.name}</b> — พิมพ์ป้ายกลุ่มแทนไหม?
          </span>
          <button type="button" className="btn btn-secondary" onClick={() => chooseGroup(memberOf.id)}>
            พิมพ์ป้ายกลุ่มแทน
          </button>
        </div>
      )}

      {variant === 'narrow' && (
        <span className="fold-hint">ป้ายแคบไม่พิมพ์บาร์โค้ด/ราคายกลัง/คำมุมขวา · แถบราคา 43 × 21 มม. พับบน-ล่าง</span>
      )}

      {variant === 'full' &&
        FIELDS.map(({ key, label, hint }) => {
          const overridden = overrides !== undefined && key in overrides;
          return (
            <div className="q-field" key={key}>
              <span className="q-lbl">
                {label}
                {overridden && (
                  <button type="button" className="flip-x" title="กลับไปใช้ค่าอัตโนมัติ" onClick={() => clearOverride(item.Barcode, key)}>
                    ↺
                  </button>
                )}
              </span>
              <input
                className="field-input"
                value={overridden ? (overrides[key] ?? '') : auto[key]}
                placeholder={hint}
                onChange={(e) => setOverride(item.Barcode, key, e.target.value)}
              />
            </div>
          );
        })}

      <FlipSendKindPicker />
    </div>
  );
}
