import { useUIStore } from '../store/uiStore';

/* สถานะเครื่องปริ้น: จุดสี + ข้อความ (เขียว = พร้อม, เหลือง = กำลังต่อ, แดง = หลุด) */
const STATUS_TEXT: Record<string, string> = {
  connecting: 'กำลังต่อเครื่องปริ้น...',
  connected: 'เครื่องปริ้นพร้อมแล้ว',
  offline: 'เครื่องปริ้นหลุด',
};

/* inline = วางในแถวหัวหน้าแรก (ไม่ลอยทับกล้อง) */
export default function ConnectionStatus({ inline = false }: { inline?: boolean }) {
  const ablyStatus = useUIStore((s) => s.ablyStatus);
  return (
    <div
      id="ably-status"
      className={`dz-printer ${ablyStatus}${inline ? '' : ' dz-printer-float'}`}
      role="status"
    >
      <span className="dot" />
      <span>{STATUS_TEXT[ablyStatus]}</span>
    </div>
  );
}
