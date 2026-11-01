import { useUIStore } from '../store/uiStore';
import { IconCamera } from './Icons';

/* หน้าเมื่อเปิดกล้องไม่ได้ (ไม่อนุญาต หรือเครื่องมีปัญหา) — บอกวิธีเปิดสิทธิ์ ลองใหม่ หรือกรอกเลขแทน (ใช้งานต่อได้ไม่ต้องมีกล้อง) */
export default function CameraPermissionDenied() {
  const cameraStatus = useUIStore((s) => s.cameraStatus);
  const setManualSearchOpen = useUIStore((s) => s.setManualSearchOpen);
  const setCameraEnabled = useUIStore((s) => s.setCameraEnabled);

  const isDenied = cameraStatus === 'denied';

  return (
    <div className="camera-denied dz-denied">
      <div className="camera-denied-icon">
        <IconCamera size={48} />
      </div>
      <h1 className="camera-denied-title">{isDenied ? 'ยังเปิดกล้องไม่ได้' : 'กล้องเปิดไม่ติด'}</h1>
      <p className="camera-denied-text">
        {isDenied
          ? 'แอปต้องใช้กล้องส่องบาร์โค้ดสินค้า — เปิดสิทธิ์กล้องแล้วกดลองใหม่'
          : 'กล้องมีปัญหา ลองปิดแอปอื่นที่ใช้กล้องอยู่ แล้วกดลองใหม่ — หรือกรอกเลขแทนได้เลย'}
      </p>
      {isDenied && (
        <ol className="dz-steps">
          <li>
            <b>iPhone:</b> ตั้งค่า → Safari → กล้อง → เลือก "อนุญาต"
          </li>
          <li>
            <b>Android:</b> แตะรูปกุญแจข้างชื่อเว็บ → สิทธิ์ → กล้อง → อนุญาต
          </li>
        </ol>
      )}
      <button type="button" className="dz-btn dz-btn-primary dz-btn-lg" onClick={() => setCameraEnabled(true)}>
        ลองใหม่
      </button>
      <button type="button" className="dz-btn" onClick={() => setManualSearchOpen(true)}>
        กรอกเลขแทน
      </button>
      <button type="button" className="dz-btn" onClick={() => setCameraEnabled(false)}>
        กลับหน้าแรก
      </button>
    </div>
  );
}
