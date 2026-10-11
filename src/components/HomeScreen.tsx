import { useQueueStore } from '../store/queueStore';
import { useUIStore } from '../store/uiStore';
import { useOosStore } from '../store/oosStore';
import ConnectionStatus from './ConnectionStatus';
import { IconBox, IconScan, IconSearch, IconSettings, IconUndo } from './Icons';

/* หน้าแรกของแอป — กล้องจะไม่เปิดเองตอนเข้าแอป (ขอกล้องตอนผู้ใช้ตั้งใจจะสแกน
 * เท่านั้น ตามแนวทาง permission-in-context) เว้นแต่เปิดค่าตั้ง "เปิดกล้องทันที" ไว้
 * หน้านี้รวมทางเข้าหลัก: สแกน / ค้นหา / คิวรอพิมพ์ / ส่งล่าสุด / สินค้าหมด / ตั้งค่าป้าย */
export default function HomeScreen() {
  const setCameraEnabled = useUIStore((s) => s.setCameraEnabled);
  const setManualSearchOpen = useUIStore((s) => s.setManualSearchOpen);
  const setSettingsSheetOpen = useUIStore((s) => s.setSettingsSheetOpen);
  const setQueueDrawerOpen = useUIStore((s) => s.setQueueDrawerOpen);
  const autoOpenCamera = useUIStore((s) => s.autoOpenCamera);
  const setAutoOpenCamera = useUIStore((s) => s.setAutoOpenCamera);
  const sending = useUIStore((s) => s.sending);
  const queue = useQueueStore((s) => s.queue);
  const history = useQueueStore((s) => s.history);
  const pendingSendAt = useQueueStore((s) => s.pendingSendAt);
  const requestSend = useQueueStore((s) => s.requestSend);
  const restoreFromHistory = useQueueStore((s) => s.restoreFromHistory);
  const oosCount = useOosStore((s) => Object.keys(s.records).length);

  const totalTags = queue.reduce((sum, i) => sum + i.PrintQty, 0);
  const last = history[0];
  const lastTime = last
    ? new Date(last.ts).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <div className="home">
      <header className="home-header">
        <div className="home-title">
          <div className="home-title-main">วงเวียน สแกนพิมพ์ป้าย</div>
          <ConnectionStatus inline />
        </div>
        <button
          type="button"
          className="home-icon-btn"
          onClick={() => setSettingsSheetOpen(true)}
          aria-label="ออกแบบป้ายราคา"
        >
          <IconSettings />
        </button>
      </header>

      <button type="button" className="home-scan-btn" onClick={() => setCameraEnabled(true)}>
        <span className="home-scan-icon">
          <IconScan size={56} />
        </span>
        <span className="home-scan-label">สแกนบาร์โค้ด</span>
        <span className="home-scan-sub">แตะเพื่อเปิดกล้อง</span>
      </button>

      <button type="button" className="home-search-btn" onClick={() => setManualSearchOpen(true)}>
        <IconSearch size={20} /> ค้นหาด้วยชื่อหรือรหัสสินค้า
      </button>

      <section className="home-card">
        <div className="home-card-head">
          <span className="home-card-title">คิวรอพิมพ์</span>
          <span className="home-card-count">
            {queue.length} รายการ{totalTags > queue.length ? ` · ${totalTags} ป้าย` : ''}
          </span>
        </div>
        {queue.length === 0 ? (
          <div className="home-card-empty">ยังไม่มีป้ายในคิว — สแกนสินค้าเพื่อเริ่ม</div>
        ) : (
          <ul className="home-queue-preview">
            {queue
              .slice(-3)
              .reverse()
              .map((item, i) => (
                <li key={`${item.Barcode}-${i}`}>
                  <span className="home-queue-name">{item.ProductName}</span>
                  <span className="home-queue-price">
                    {item.Price} ฿{item.PrintQty > 1 ? ` ×${item.PrintQty}` : ''}
                  </span>
                </li>
              ))}
            {queue.length > 3 && <li className="home-queue-more">และอีก {queue.length - 3} รายการ</li>}
          </ul>
        )}
        <div className="home-card-actions">
          <button type="button" className="btn btn-secondary" onClick={() => setQueueDrawerOpen(true)}>
            ดู / แก้คิว
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={requestSend}
            disabled={!queue.length || sending || !!pendingSendAt}
          >
            {sending ? 'กำลังส่ง...' : 'ส่งพิมพ์ทั้งหมด'}
          </button>
        </div>
      </section>

      {last && (
        <section className="home-card home-row-card">
          <div className="home-row-info">
            <div className="home-card-title">ส่งล่าสุด {lastTime}</div>
            <div className="home-row-meta">
              {last.items.length} รายการ · {last.items[0]?.ProductName}
              {last.items.length > 1 ? ' ...' : ''}
            </div>
          </div>
          <button
            type="button"
            className="home-row-btn"
            onClick={() => restoreFromHistory(last.id)}
            disabled={!!last.restoredAt}
          >
            <IconUndo size={16} /> {last.restoredAt ? 'ดึงแล้ว' : 'ดึงกลับเข้าคิว'}
          </button>
        </section>
      )}

      {oosCount > 0 && (
        <button type="button" className="home-card home-row-card home-oos" onClick={() => setQueueDrawerOpen(true, 'oos')}>
          <span className="home-oos-icon">
            <IconBox size={22} />
          </span>
          <span className="home-row-info">
            <span className="home-card-title">สินค้าหมดบนชั้น</span>
            <span className="home-row-meta">{oosCount} รายการรอของเข้า</span>
          </span>
          <span className="home-chevron" aria-hidden="true">
            ›
          </span>
        </button>
      )}

      <label className="home-pref">
        <input type="checkbox" checked={autoOpenCamera} onChange={(e) => setAutoOpenCamera(e.target.checked)} />
        <span>
          เปิดกล้องทันทีเมื่อเข้าแอป
          <small>สำหรับคนสแกนต่อเนื่องทั้งวัน ไม่ต้องกดปุ่มสแกนก่อน</small>
        </span>
      </label>
    </div>
  );
}
