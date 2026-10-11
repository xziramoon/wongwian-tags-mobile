import { useEffect, useState } from 'react';
import { useQueueStore } from '../store/queueStore';
import { SEND_DELAY_MS } from '../constants';

/* แถบนับถอยหลังก่อนส่งจริง (แบบ "เลิกทำ" ของ Gmail) — กดส่งผิดยังกดยกเลิกทันก่อนป้ายออกจากเครื่องพิมพ์
 * วางระดับ App ให้อยู่บนสุดเหนือ sheet ทุกอัน จะกดส่งจากหน้าไหนก็เห็น */
export default function PendingSendBar() {
  const pendingSendAt = useQueueStore((s) => s.pendingSendAt);
  const count = useQueueStore((s) => s.queue.length);
  const cancelSend = useQueueStore((s) => s.cancelSend);
  const sendNow = useQueueStore((s) => s.sendNow);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!pendingSendAt) return;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(t);
  }, [pendingSendAt]);

  if (!pendingSendAt) return null;

  const left = Math.max(0, pendingSendAt - now);
  const secs = Math.ceil(left / 1000);
  const pct = Math.min(100, (left / SEND_DELAY_MS) * 100);

  return (
    <div className="pending-send" role="status" aria-live="polite">
      <div className="pending-send-row">
        <div className="pending-send-text">
          กำลังส่ง {count} รายการ ใน {secs} วิ
        </div>
        <button type="button" className="pending-send-cancel" onClick={cancelSend}>
          ยกเลิก
        </button>
        <button type="button" className="pending-send-now" onClick={sendNow}>
          ส่งเลย
        </button>
      </div>
      <div className="pending-send-track">
        <div className="pending-send-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
