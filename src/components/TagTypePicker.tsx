import { useUIStore } from '../store/uiStore';
import { SCAN_TYPES } from '../lib/tagTypes';

/* เลือกแบบป้ายจากหน้ากล้อง — ใช้ setScanTagMode ตัวเดิม (จำแบบล่าสุดให้สแกนชิ้นถัดไป) */
export default function TagTypePicker() {
  const open = useUIStore((s) => s.tagTypeOpen);
  const setOpen = useUIStore((s) => s.setTagTypeOpen);
  const current = useUIStore((s) => s.lastTagMode);
  const setScanTagMode = useUIStore((s) => s.setScanTagMode);

  if (!open) return null;
  return (
    <div className="dz-sheet-backdrop" onClick={() => setOpen(false)}>
      <div className="dz-picker" role="dialog" aria-label="เลือกแบบป้าย" onClick={(e) => e.stopPropagation()}>
        <span className="dz-grabber" />
        <div className="dz-head" style={{ fontSize: 20 }}>
          สแกนต่อด้วยป้ายแบบไหน
        </div>
        <span className="dz-label">ชิ้นต่อไปใช้แบบนี้ จนกว่าจะเปลี่ยน</span>
        <div className="dz-types two">
          {SCAN_TYPES.map((t) => (
            <button
              key={t.key}
              type="button"
              className="dz-type"
              aria-pressed={current === t.key}
              onClick={() => {
                setScanTagMode(t.key);
                setOpen(false);
              }}
            >
              <i style={{ background: t.color }} />
              {t.label}
            </button>
          ))}
        </div>
        <button type="button" className="dz-btn" onClick={() => setOpen(false)}>
          ปิด
        </button>
      </div>
    </div>
  );
}
