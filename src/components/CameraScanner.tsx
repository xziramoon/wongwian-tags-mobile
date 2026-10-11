import { useCallback, useEffect, useRef, useState } from 'react';
import { useUIStore } from '../store/uiStore';
import { useQueueStore, previewFromBarcode } from '../store/queueStore';
import { startScanning, stopScanning, hasTorch, setTorch, getZoomRange, setZoom } from '../lib/scan';
import { feedback } from '../lib/feedback';
import ConnectionStatus from './ConnectionStatus';
import { IconClose, IconFlash, IconSearch, IconZoom } from './Icons';

/* ไม่มีการสแกนนานเท่านี้ → ปิดกล้องกลับหน้าแรกเอง ประหยัดแบต/ไม่ให้กล้องค้าง */
const IDLE_CLOSE_MS = 2 * 60 * 1000;

interface ZoomRange {
  min: number;
  max: number;
  step: number;
}

/* Full-screen rear-camera scanner. App.tsx only mounts this while
 * cameraStatus !== 'denied' (CameraPermissionDenied is shown instead in that case),
 * so this component doesn't need to handle the denied state itself. */
export default function CameraScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const setCameraStatus = useUIStore((s) => s.setCameraStatus);
  const scanSheetOpen = useUIStore((s) => s.scanSheetOpen);
  const queueDrawerOpen = useUIStore((s) => s.queueDrawerOpen);
  const manualSearchOpen = useUIStore((s) => s.manualSearchOpen);
  const openScanSheet = useUIStore((s) => s.openScanSheet);
  const setCameraEnabled = useUIStore((s) => s.setCameraEnabled);
  const setManualSearchOpen = useUIStore((s) => s.setManualSearchOpen);
  const showToast = useUIStore((s) => s.showToast);
  const settingsOpen = useUIStore((s) => s.settingsSheetOpen);
  const tagEditOpen = useUIStore((s) => s.tagEditTarget !== null);
  const [lastActivity, setLastActivity] = useState(() => Date.now());
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [zoomRange, setZoomRange] = useState<ZoomRange | null>(null);
  const [zoomValue, setZoomValue] = useState(1);

  const handleDetect = useCallback(
    (code: string) => {
      const trimmed = code.trim();
      if (!trimmed) return;
      setLastActivity(Date.now());
      const alreadyQueued = useQueueStore.getState().queue.some((i) => i.Barcode === trimmed);
      const { item, found } = previewFromBarcode(trimmed);
      if (found) feedback[alreadyQueued ? 'duplicate' : 'success']();
      else feedback.notFound();
      openScanSheet(item, found);
    },
    [openScanSheet],
  );

  useEffect(() => {
    // pause the decode loop whenever a sheet/drawer covers the camera — resumes
    // automatically when they close
    const paused = scanSheetOpen || queueDrawerOpen || manualSearchOpen;
    const videoEl = videoRef.current;
    setTorchAvailable(false);
    setTorchOn(false);
    setZoomRange(null);
    setZoomValue(1);
    if (paused || !videoEl) {
      stopScanning();
      return;
    }

    let cancelled = false;
    setCameraStatus('starting');
    startScanning(videoEl, handleDetect)
      .then(() => {
        if (cancelled) return;
        setCameraStatus('active');
        setTorchAvailable(hasTorch());
        const range = getZoomRange();
        setZoomRange(range);
        if (range) setZoomValue(range.min);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const name = err instanceof Error ? err.name : '';
        setCameraStatus(name === 'NotAllowedError' ? 'denied' : 'error');
      });

    return () => {
      cancelled = true;
      stopScanning();
    };
  }, [scanSheetOpen, queueDrawerOpen, manualSearchOpen, handleDetect, setCameraStatus]);

  // ปิดกล้องอัตโนมัติเมื่อไม่ได้ใช้ — นับเฉพาะตอนกล้องโชว์อยู่ (มีแผ่นไหนเปิดทับ = กำลังใช้งาน)
  const anySheetOpen = scanSheetOpen || queueDrawerOpen || manualSearchOpen || settingsOpen || tagEditOpen;
  useEffect(() => {
    if (anySheetOpen) return;
    const t = window.setTimeout(() => {
      setCameraEnabled(false);
      showToast('ปิดกล้องอัตโนมัติเพื่อประหยัดแบตเตอรี่', 'info');
    }, IDLE_CLOSE_MS);
    return () => window.clearTimeout(t);
  }, [anySheetOpen, lastActivity, setCameraEnabled, showToast]);

  // สลับไปแอปอื่น/ล็อกจอ → ปิดกล้องทันที กลับมาเจอหน้าแรก ไม่ใช่กล้องเปิดค้าง
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') setCameraEnabled(false);
    };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, [setCameraEnabled]);

  const toggleTorch = () => {
    const next = !torchOn;
    setTorchOn(next);
    void setTorch(next);
  };

  const handleZoomChange = (value: number) => {
    setZoomValue(value);
    void setZoom(value);
  };

  return (
    /* แตะตรงไหนก็ได้ (ซูม/ไฟฉาย/จอ) = ยังใช้งานอยู่ เริ่มนับเวลาปิดอัตโนมัติใหม่
     * เดิมนับแค่ตอนสแกนติด — คนกำลังเล็งบาร์โค้ดยาก ๆ อยู่โดนกล้องปิดกลางคัน */
    <div className="camera-scanner" onPointerDownCapture={() => setLastActivity(Date.now())}>
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video ref={videoRef} className="camera-video" autoPlay playsInline muted />
      <div className="viewfinder" aria-hidden="true">
        {/* alignment guide, not a hardware focus point — browsers don't expose a way
         * to pin autofocus to an exact pixel, but lining the barcode up with this
         * keeps it centered in the sharpest/most stable part of the frame */}
        <div className="scan-line" />
      </div>
      <div className="scanner-topbar">
        <button
          type="button"
          className="scanner-close-btn"
          onClick={() => setCameraEnabled(false)}
          aria-label="ปิดกล้อง กลับหน้าแรก"
        >
          <IconClose size={18} /> ปิดกล้อง
        </button>
        <ConnectionStatus inline />
        <button
          type="button"
          className="scanner-icon-btn"
          onClick={() => setManualSearchOpen(true)}
          aria-label="ค้นหาสินค้าด้วยตนเอง"
        >
          <IconSearch size={20} />
        </button>
      </div>
      <div className="scanner-hint">เล็งบาร์โค้ดให้อยู่ในกรอบ</div>
      {torchAvailable && (
        <button
          type="button"
          className={`torch-btn${torchOn ? ' active' : ''}`}
          onClick={toggleTorch}
          aria-label={torchOn ? 'ปิดไฟฉาย' : 'เปิดไฟฉาย'}
        >
          <IconFlash size={22} />
        </button>
      )}
      {zoomRange && (
        <div className="zoom-slider" role="group" aria-label="ซูมกล้อง">
          <span className="zoom-slider-icon">
            <IconZoom size={18} />
          </span>
          <input
            type="range"
            className="zoom-slider-input"
            min={zoomRange.min}
            max={zoomRange.max}
            step={zoomRange.step || 0.1}
            value={zoomValue}
            onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
            aria-label="ระดับซูม"
          />
        </div>
      )}
    </div>
  );
}
