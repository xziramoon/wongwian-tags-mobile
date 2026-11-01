import { fontStack } from './config';
import { fitName } from './fit';

interface Props {
  label: string;
  value: number; // 0 = อัตโนมัติ (เฉพาะช่องที่ส่ง autoValue)
  min: number;
  max: number;
  step: number;
  unit: string;
  autoValue?: number; // ค่าที่ระบบคำนวณให้ตอนอัตโนมัติ (แสดงเป็นค่าเริ่มของแถบเลื่อน)
  overridden?: boolean;
  onChange: (v: number) => void;
  onReset?: () => void; // ล้างค่าที่ตั้งเอง → ตามค่าตั้งค่า/อัตโนมัติ
}

/* แถบเลื่อน −/+ สำหรับขนาดป้ายดำแดง (มม.) — หน้าตาเดียวกับ SliderRow ของตั้งค่าป้ายปกติ */
export default function FlipSizeSlider({ label, value, min, max, step, unit, autoValue, overridden, onChange, onReset }: Props) {
  const isAuto = autoValue !== undefined && !value;
  const cur = isAuto ? autoValue : value;
  const set = (v: number) => onChange(Math.min(max, Math.max(min, Math.round(v / step) * step)));
  return (
    <div className="slider-row cfg-full">
      <div className="slider-header">
        <span className="cfg-lbl">{label}</span>
        <span className="slider-val">
          {isAuto ? 'อัตโนมัติ ' : ''}
          {+cur.toFixed(2)} {unit}
          {(overridden || (autoValue !== undefined && !isAuto)) && (
            <button
              type="button"
              className="flip-x"
              title={autoValue !== undefined && !onReset ? 'กลับเป็นอัตโนมัติ' : 'กลับไปใช้ค่าตั้งค่า'}
              onClick={() => (onReset ? onReset() : onChange(0))}
            >
              ↺
            </button>
          )}
        </span>
      </div>
      <div className="stepper">
        <button type="button" className="step-btn" onClick={() => set(cur - step)}>
          −
        </button>
        <input type="range" min={min} max={max} step={step} value={cur} onChange={(e) => set(parseFloat(e.target.value))} />
        <button type="button" className="step-btn" onClick={() => set(cur + step)}>
          +
        </button>
      </div>
    </div>
  );
}

/* ขนาดชื่ออัตโนมัติของป้ายเต็ม — ใช้เป็นค่าเริ่มของแถบเลื่อน */
export const autoNameSize = (name: string, font: string, tagW: number) => fitName(name, fontStack(font), tagW);
