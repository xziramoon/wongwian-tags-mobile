import { useEffect, useState } from 'react';
import { printBridge } from '../lib/printBridge';
import { useUIStore } from '../store/uiStore';

/* แถบแดงบนสุดเมื่อเครื่องปริ้นหลุด — บอกขั้นตอนลองแก้ + ปุ่มลองต่อใหม่ (ป้ายที่เก็บไว้ไม่หาย) */
export default function PrinterOfflineBar({ compact = false }: { compact?: boolean }) {
  const status = useUIStore((s) => s.ablyStatus);
  const [trying, setTrying] = useState(false);

  useEffect(() => {
    if (status !== 'offline') setTrying(false);
  }, [status]);

  if (status !== 'offline') return null;

  return (
    <div className="dz-offline" role="alert">
      <div className="dz-offline-title">เครื่องปริ้นหลุด</div>
      {!compact && (
        <>
          <ol>
            <li>เช็กว่ามือถือมีเน็ต (ลองเปิดเว็บอื่นดู)</li>
            <li>เช็กว่าเปิดหน้าเครื่องปริ้นที่ร้านค้างไว้อยู่</li>
            <li>กด "ลองต่อใหม่" ด้านล่าง</li>
          </ol>
          <div className="dz-offline-note">ป้ายที่เก็บไว้ไม่หาย — ต่อติดแล้วกดปริ้นได้เลย</div>
        </>
      )}
      {compact && <div className="dz-offline-note">ป้ายที่เก็บไว้ไม่หาย</div>}
      <button
        type="button"
        className="dz-btn"
        style={{ borderColor: 'var(--dz-primary)', color: 'var(--dz-err-tx)' }}
        disabled={trying}
        onClick={() => {
          setTrying(true);
          printBridge.reconnect();
        }}
      >
        {trying ? 'กำลังต่อ...' : 'ลองต่อใหม่'}
      </button>
    </div>
  );
}
