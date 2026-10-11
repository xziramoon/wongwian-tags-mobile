import { useUIStore } from '../store/uiStore';
import { IconCamera } from './Icons';

/* full-screen fallback shown when the camera is unavailable (permission denied, or
 * any other getUserMedia error) — keeps the app usable via manual product search */
export default function CameraPermissionDenied() {
  const cameraStatus = useUIStore((s) => s.cameraStatus);
  const setManualSearchOpen = useUIStore((s) => s.setManualSearchOpen);
  const setCameraEnabled = useUIStore((s) => s.setCameraEnabled);

  const isDenied = cameraStatus === 'denied';

  return (
    <div className="camera-denied">
      <div className="camera-denied-icon">
        <IconCamera size={48} />
      </div>
      <h1 className="camera-denied-title">{isDenied ? 'ไม่ได้รับอนุญาตให้ใช้กล้อง' : 'ไม่สามารถเปิดกล้องได้'}</h1>
      <p className="camera-denied-text">
        {isDenied
          ? 'แอปนี้ต้องใช้กล้องเพื่อสแกนบาร์โค้ดสินค้า กรุณาอนุญาตการใช้กล้องในตั้งค่าเบราว์เซอร์ แล้วกดลองอีกครั้ง'
          : 'เกิดข้อผิดพลาดในการเปิดกล้อง คุณยังสามารถค้นหาสินค้าด้วยตนเองได้'}
      </p>
      <button type="button" className="btn btn-primary" onClick={() => setManualSearchOpen(true)}>
        ค้นหาสินค้าด้วยตนเอง
      </button>
      <button type="button" className="btn btn-secondary" onClick={() => setCameraEnabled(true)}>
        ลองเปิดกล้องอีกครั้ง
      </button>
      <button type="button" className="btn btn-secondary" onClick={() => setCameraEnabled(false)}>
        กลับหน้าแรก
      </button>
    </div>
  );
}
