import { useEffect } from 'react';
import { database } from './lib/database';
import { printBridge, type AblyConnState } from './lib/printBridge';
import { audioEngine } from './lib/audio';
import { useUIStore } from './store/uiStore';
import { useQueueStore } from './store/queueStore';
import { applyCSSVars } from './lib/cssVars';
import CameraScanner from './components/CameraScanner';
import CameraPermissionDenied from './components/CameraPermissionDenied';
import HomeScreen from './components/HomeScreen';
import ScanResultSheet from './components/ScanResultSheet';
import TagTypePicker from './components/TagTypePicker';
import QueueDrawer from './components/QueueDrawer';
import ManualSearchSheet from './components/ManualSearchSheet';
import SettingsSheet from './components/SettingsSheet';
import TagEditSheet from './components/TagEditSheet';
import ToastContainer from './components/ToastContainer';
import PendingSendBar from './components/PendingSendBar';
import FlipTodaySheet from './flip/FlipTodaySheet';

/* maps Ably's connection.state values to the coarser 3-state pill the UI shows */
function toAblyStatus(state: AblyConnState): 'connecting' | 'connected' | 'offline' {
  if (state === 'connected') return 'connected';
  if (state === 'connecting') return 'connecting';
  return 'offline'; // disconnected | suspended | failed | closed
}

function App() {
  const cameraStatus = useUIStore((s) => s.cameraStatus);
  const cameraEnabled = useUIStore((s) => s.cameraEnabled);
  const setAblyStatus = useUIStore((s) => s.setAblyStatus);
  const showToast = useUIStore((s) => s.showToast);

  const cameraUnavailable = cameraStatus === 'denied' || cameraStatus === 'error';

  /* ตั้งตัวแปรขนาดป้าย (--tag-w/--tag-h/--price-sz/...) ทุกครั้งที่ config เปลี่ยน — เหมือน wongwian-tags01 App.tsx
   * เดิมมือถือไม่เคยเรียก ป้ายในตัวอย่างเลยไม่มีขนาดจริง (กว้างล้นกรอบ ธีมใหม่แถวราคาหาย) */
  const config = useQueueStore((s) => s.config);
  useEffect(() => {
    applyCSSVars(config);
  }, [config]);

  useEffect(() => {
    // product DB sync — needed before any barcode lookup will succeed
    database.sync().catch(() => {
      showToast('โหลดรายการสินค้าไม่สำเร็จ — ลองใหม่ภายหลัง', 'error');
    });

    // live Ably connection-status pill
    setAblyStatus(toAblyStatus(printBridge.getState()));
    const unsubscribe = printBridge.onStateChange((state) => {
      setAblyStatus(toAblyStatus(state));
    });

    // กดส่งแล้วล็อกจอ/สลับแอประหว่างนับถอยหลัง → ส่งทันที เพราะมือถือหยุดตัวจับเวลาของหน้าที่ถูกพับ
    // งานจะค้างไม่ออกจนกว่าจะเปิดจอใหม่ (ผู้ใช้ตั้งใจส่งและไม่ได้กดยกเลิก)
    const flushPendingSend = () => {
      if (document.visibilityState === 'hidden' && useQueueStore.getState().pendingSendAt) {
        useQueueStore.getState().sendNow();
      }
    };
    document.addEventListener('visibilitychange', flushPendingSend);

    // unlock audio playback on first user tap (browsers block autoplay pre-interaction)
    const unlockAudio = () => audioEngine.unlock();
    document.addEventListener('pointerdown', unlockAudio, { once: true });

    return () => {
      unsubscribe();
      document.removeEventListener('pointerdown', unlockAudio);
      document.removeEventListener('visibilitychange', flushPendingSend);
    };
  }, [setAblyStatus, showToast]);

  return (
    <div className="app-shell">
      {!cameraEnabled ? (
        <HomeScreen />
      ) : cameraUnavailable ? (
        <CameraPermissionDenied />
      ) : (
        <>
          <CameraScanner />
        </>
      )}
      <ScanResultSheet />
      <QueueDrawer />
      <ManualSearchSheet />
      <SettingsSheet />
      <TagEditSheet />
      <TagTypePicker />
      <FlipTodaySheet />
      <PendingSendBar />
      <ToastContainer />
    </div>
  );
}

export default App;
