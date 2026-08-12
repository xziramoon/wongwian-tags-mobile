import { useEffect } from 'react';
import { database } from './lib/database';
import { printBridge, type AblyConnState } from './lib/printBridge';
import { audioEngine } from './lib/audio';
import { useUIStore } from './store/uiStore';
import CameraScanner from './components/CameraScanner';
import CameraPermissionDenied from './components/CameraPermissionDenied';
import ScanResultSheet from './components/ScanResultSheet';
import ConnectionStatus from './components/ConnectionStatus';
import QueueBadge from './components/QueueBadge';
import QueueDrawer from './components/QueueDrawer';
import ManualSearchSheet from './components/ManualSearchSheet';
import SettingsSheet from './components/SettingsSheet';
import TagEditSheet from './components/TagEditSheet';
import ToastContainer from './components/ToastContainer';

/* maps Ably's connection.state values to the coarser 3-state pill the UI shows */
function toAblyStatus(state: AblyConnState): 'connecting' | 'connected' | 'offline' {
  if (state === 'connected') return 'connected';
  if (state === 'connecting') return 'connecting';
  return 'offline'; // disconnected | suspended | failed | closed
}

function App() {
  const cameraStatus = useUIStore((s) => s.cameraStatus);
  const setAblyStatus = useUIStore((s) => s.setAblyStatus);
  const showToast = useUIStore((s) => s.showToast);
  const setSettingsSheetOpen = useUIStore((s) => s.setSettingsSheetOpen);

  useEffect(() => {
    // product DB sync — needed before any barcode lookup will succeed
    database.sync().catch(() => {
      showToast('ซิงค์ฐานข้อมูลสินค้าไม่สำเร็จ — ลองใหม่ภายหลัง', 'error');
    });

    // live Ably connection-status pill
    setAblyStatus(toAblyStatus(printBridge.getState()));
    const unsubscribe = printBridge.onStateChange((state) => {
      setAblyStatus(toAblyStatus(state));
    });

    // unlock audio playback on first user tap (browsers block autoplay pre-interaction)
    const unlockAudio = () => audioEngine.unlock();
    document.addEventListener('pointerdown', unlockAudio, { once: true });

    return () => {
      unsubscribe();
      document.removeEventListener('pointerdown', unlockAudio);
    };
  }, [setAblyStatus, showToast]);

  return (
    <div className="app-shell">
      {cameraStatus === 'denied' || cameraStatus === 'error' ? <CameraPermissionDenied /> : <CameraScanner />}
      <ConnectionStatus />
      <button
        type="button"
        className="settings-gear-btn"
        onClick={() => setSettingsSheetOpen(true)}
        aria-label="ออกแบบป้ายราคา"
      >
        ⚙
      </button>
      <QueueBadge />
      <ScanResultSheet />
      <QueueDrawer />
      <ManualSearchSheet />
      <SettingsSheet />
      <TagEditSheet />
      <ToastContainer />
    </div>
  );
}

export default App;
