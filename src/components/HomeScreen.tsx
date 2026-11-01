import { useQueueStore } from '../store/queueStore';
import { fridgeSheetLayout } from '../lib/fridge';
import { useUIStore } from '../store/uiStore';
import { useOosStore } from '../store/oosStore';
import { useFlipLists } from '../flip/useFlipLists';
import { summarizeByType, totalTags, typeDef } from '../lib/tagTypes';
import { usePaperSheets } from '../lib/usePaper';
import ConnectionStatus from './ConnectionStatus';
import PrinterOfflineBar from './PrinterOfflineBar';
import TypeBar from './TypeBar';
import { IconBox, IconScan, IconSearch, IconSettings, IconPrinter } from './Icons';

/* หน้าแรก (ดีไซน์ใหม่ 1a): จำนวนป้ายที่รอปริ้นตัวใหญ่ + แถบสีแยกตามแบบ + การ์ดทางลัด + แถบล่าง หาชื่อ / สแกน / รอปริ้น
 * กล้องไม่เปิดเองตอนเข้าแอป (ขอกล้องตอนผู้ใช้ตั้งใจสแกน) เว้นแต่เปิดค่า "เปิดกล้องทันที" */
export default function HomeScreen() {
  const setCameraEnabled = useUIStore((s) => s.setCameraEnabled);
  const setManualSearchOpen = useUIStore((s) => s.setManualSearchOpen);
  const setSettingsSheetOpen = useUIStore((s) => s.setSettingsSheetOpen);
  const setQueueDrawerOpen = useUIStore((s) => s.setQueueDrawerOpen);
  const setFlipTodayOpen = useUIStore((s) => s.setFlipTodayOpen);
  const autoOpenCamera = useUIStore((s) => s.autoOpenCamera);
  const setAutoOpenCamera = useUIStore((s) => s.setAutoOpenCamera);
  const lastTagMode = useUIStore((s) => s.lastTagMode);
  const sending = useUIStore((s) => s.sending);
  const queue = useQueueStore((s) => s.queue);
  const history = useQueueStore((s) => s.history);
  const pendingSendAt = useQueueStore((s) => s.pendingSendAt);
  const requestSend = useQueueStore((s) => s.requestSend);
  const restoreFromHistory = useQueueStore((s) => s.restoreFromHistory);
  const addBlankFridge = useQueueStore((s) => s.addBlankFridge);
  const sheetSize = useQueueStore((s) => fridgeSheetLayout(s.config).perSheet);
  const oosCount = useOosStore((s) => Object.keys(s.records).length);
  const flipLists = useFlipLists();
  const paper = usePaperSheets();

  const total = totalTags(queue);
  const types = summarizeByType(queue);
  const last = history[0];
  const lastTime = last ? new Date(last.ts).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '';

  return (
    <div className="dz-home">
      <div className="dz-home-body">
      <header className="dz-home-header">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div className="dz-home-title">ทำป้ายราคา</div>
          <ConnectionStatus inline />
        </div>
        <button type="button" className="dz-icon-btn" onClick={() => setSettingsSheetOpen(true)} aria-label="ตั้งค่าป้าย">
          <IconSettings size={22} />
        </button>
      </header>

      <PrinterOfflineBar />

      <section className="dz-summary" aria-label="ป้ายที่รอปริ้น">
        <div className="dz-summary-top">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span className="dz-muted" style={{ fontSize: 13 }}>
              ป้ายที่รอปริ้น
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span className="dz-count">{total}</span>
              <span style={{ fontSize: 15, color: '#d4d4d8' }}>ใบ</span>
            </div>
          </div>
          {total > 0 && <span className="dz-pill">ใช้กระดาษ {paper} แผ่น</span>}
        </div>
        {total === 0 ? (
          <div className="dz-muted" style={{ fontSize: 14 }}>
            ยังไม่มีป้าย — กดสแกนเพื่อเริ่ม
          </div>
        ) : (
          <TypeBar types={types} legend />
        )}
        <div className="dz-summary-actions">
          <button type="button" className="dz-btn" onClick={() => setQueueDrawerOpen(true)}>
            ดูรายการ
          </button>
          <button type="button" className="dz-btn dz-btn-primary" onClick={requestSend} disabled={!queue.length || sending || !!pendingSendAt}>
            <IconPrinter size={18} />
            {sending ? 'กำลังส่ง...' : 'สั่งปริ้น'}
          </button>
        </div>
      </section>

      <div className="dz-cards">
        <button type="button" className="dz-card" onClick={() => setFlipTodayOpen(true)}>
          <span className="dz-card-top">
            <span className="dz-card-ic" style={{ background: '#2a1311', color: '#ff6b5e' }}>
              <IconPrinter size={18} />
            </span>
            <span className="dz-card-num" style={{ color: '#ff6b5e' }}>
              {flipLists.today.length}
            </span>
          </span>
          <span className="dz-card-title">ราคาเปลี่ยนวันนี้</span>
          <span className="dz-card-sub">
            {flipLists.today.length ? 'ไปเปลี่ยนแถบบนชั้น' : 'ราคาบนชั้นตรงกับชีต'}
            {flipLists.needTags.length ? ` · ของใหม่ ${flipLists.needTags.length} อย่าง` : ''}
          </span>
        </button>

        <button type="button" className="dz-card" onClick={() => setQueueDrawerOpen(true, 'oos')}>
          <span className="dz-card-top">
            <span className="dz-card-ic" style={{ background: '#2b2410', color: '#fbbf24' }}>
              <IconBox size={18} />
            </span>
            <span className="dz-card-num" style={{ color: '#fbbf24' }}>
              {oosCount}
            </span>
          </span>
          <span className="dz-card-title">ของหมด</span>
          <span className="dz-card-sub">รอของเข้า</span>
        </button>

        <div className="dz-card" style={{ cursor: 'default' }}>
          <span className="dz-card-top">
            <span className="dz-card-ic" style={{ background: '#0e2a30', color: '#22d3ee' }}>
              888
            </span>
            <button
              type="button"
              className="dz-mini-btn"
              style={{ borderColor: '#22d3ee', color: '#22d3ee' }}
              onClick={() => addBlankFridge(sheetSize)}
              aria-label={`เพิ่มป้ายตู้แช่เปล่า 1 แผ่น (${sheetSize} ใบ)`}
            >
              + 1 แผ่น
            </button>
          </span>
          <span className="dz-card-title">ป้ายตู้แช่เปล่า</span>
          <span className="dz-card-sub">ไว้เขียนราคาเอง · {sheetSize} ใบ/แผ่น</span>
        </div>

        <div className="dz-card" style={{ cursor: 'default' }}>
          <span className="dz-card-top">
            <span className="dz-card-ic" style={{ background: 'var(--dz-raised)', color: '#d4d4d8' }}>
              <IconPrinter size={18} />
            </span>
            <button type="button" className="dz-mini-btn" disabled={!last || !!last.restoredAt} onClick={() => last && restoreFromHistory(last.id)}>
              {last?.restoredAt ? 'เอากลับมาแล้ว' : 'เอากลับมา'}
            </button>
          </span>
          <span className="dz-card-title">{last ? `ปริ้นไปเมื่อ ${lastTime}` : 'ยังไม่เคยปริ้น'}</span>
          <span className="dz-card-sub">{last ? 'ส่งผิด? เอากลับมาแก้ได้' : 'ปริ้นแล้วจะเห็นตรงนี้'}</span>
        </div>
      </div>

      <label className="dz-pref">
        <input type="checkbox" checked={autoOpenCamera} onChange={(e) => setAutoOpenCamera(e.target.checked)} />
        <span>
          เปิดกล้องทันทีเมื่อเข้าแอป
          <small>สำหรับคนสแกนต่อเนื่องทั้งวัน ไม่ต้องกดปุ่มสแกนก่อน</small>
        </span>
      </label>

      </div>

      <nav className="dz-nav" aria-label="ทางลัดหลัก">
        <button type="button" className="dz-nav-side" onClick={() => setManualSearchOpen(true)} aria-label="ค้นหาด้วยชื่อหรือรหัส">
          <IconSearch size={24} />
          หาชื่อ
        </button>
        <button type="button" className="dz-scan" onClick={() => setCameraEnabled(true)}>
          <IconScan size={34} />
          <span style={{ display: 'flex', flexDirection: 'column' }}>
            <span className="dz-scan-label">สแกน</span>
            <span className="dz-scan-sub">ทำป้ายแบบ{typeDef(lastTagMode).label}</span>
          </span>
        </button>
        <button type="button" className="dz-nav-side" onClick={() => setQueueDrawerOpen(true)} aria-label={`ดูป้ายที่รอปริ้น ${total} ใบ`}>
          <span className="dz-nav-num">{total}</span>
          รอปริ้น
        </button>
      </nav>
    </div>
  );
}
