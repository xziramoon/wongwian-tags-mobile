import { useEffect, useState } from 'react';
import { useQueueStore } from '../store/queueStore';
import { SEND_DELAY_MS } from '../constants';
import { summarizeByType, totalTags } from '../lib/tagTypes';

/* หน้านับถอยหลังก่อนปริ้นจริง (แบบ "เลิกทำ" ของ Gmail) — กดผิดยังกด "ยกเลิก" ทันก่อนป้ายออกจากเครื่อง
 * "ยกเลิก" ใหญ่กว่า "ไม่ต้องรอ" เสมอ · วางระดับ App ให้อยู่บนสุดเหนือหน้าอื่นทุกหน้า */
export default function PendingSendBar() {
  const pendingSendAt = useQueueStore((s) => s.pendingSendAt);
  const queue = useQueueStore((s) => s.queue);
  const cancelSend = useQueueStore((s) => s.cancelSend);
  const sendNow = useQueueStore((s) => s.sendNow);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!pendingSendAt) return;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(t);
  }, [pendingSendAt]);

  if (!pendingSendAt) return null;

  const left = Math.max(0, pendingSendAt - now);
  const secs = Math.ceil(left / 1000);
  const pct = Math.min(100, (left / SEND_DELAY_MS) * 100);
  const types = summarizeByType(queue);
  const total = totalTags(queue);

  return (
    <div className="dz-send" role="status" aria-live="polite">
      <div
        className="dz-ring"
        aria-label={`จะปริ้นใน ${secs} วินาที`}
        style={{ background: `conic-gradient(var(--dz-primary) 0 ${pct}%, var(--dz-raised) ${pct}% 100%)` }}
      >
        <div className="dz-ring-in">
          <span className="dz-ring-num">{secs}</span>
          <span style={{ fontSize: 14, color: 'var(--dz-muted)' }}>วินาที</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, textAlign: 'center' }}>
        <span className="dz-send-title">อีกแป๊บจะปริ้น {total} ใบ</span>
        <span style={{ fontSize: 14, color: 'var(--dz-muted)', maxWidth: 280 }}>กดผิด? กด "ยกเลิก" ได้ก่อนเลขถึง 0</span>
      </div>

      <div className="dz-send-card">
        {types.map((t) => (
          <span key={t.def.key}>
            <span className="l">
              <span className="dz-swatch" style={{ background: t.def.color }} />
              {t.def.label}
            </span>
            <span>{t.count} ใบ</span>
          </span>
        ))}
      </div>

      <div className="dz-send-actions">
        <button type="button" className="dz-btn dz-btn-white" style={{ fontSize: 18, fontWeight: 700 }} onClick={cancelSend}>
          ยกเลิก
        </button>
        <button type="button" className="dz-btn" onClick={sendNow}>
          ไม่ต้องรอ
        </button>
      </div>
    </div>
  );
}
