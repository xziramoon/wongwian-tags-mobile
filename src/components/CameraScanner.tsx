import { useCallback, useEffect, useRef, useState } from 'react';
import { useUIStore } from '../store/uiStore';
import { useQueueStore, previewFromBarcode } from '../store/queueStore';
import { startScanning, stopScanning, hasTorch, setTorch, getZoomRange, setZoom } from '../lib/scan';
import { feedback } from '../lib/feedback';

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
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [zoomRange, setZoomRange] = useState<ZoomRange | null>(null);
  const [zoomValue, setZoomValue] = useState(1);

  const handleDetect = useCallback(
    (code: string) => {
      const trimmed = code.trim();
      if (!trimmed) return;
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
    <div className="camera-scanner">
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video ref={videoRef} className="camera-video" autoPlay playsInline muted />
      <div className="viewfinder" aria-hidden="true">
        {/* alignment guide, not a hardware focus point — browsers don't expose a way
         * to pin autofocus to an exact pixel, but lining the barcode up with this
         * keeps it centered in the sharpest/most stable part of the frame */}
        <div className="scan-line" />
      </div>
      {torchAvailable && (
        <button
          type="button"
          className={`torch-btn${torchOn ? ' active' : ''}`}
          onClick={toggleTorch}
          aria-label={torchOn ? 'ปิดไฟฉาย' : 'เปิดไฟฉาย'}
        >
          🔦
        </button>
      )}
      {zoomRange && (
        <div className="zoom-slider" role="group" aria-label="ซูมกล้อง">
          <span className="zoom-slider-icon" aria-hidden="true">
            🔎
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
