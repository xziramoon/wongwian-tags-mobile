import { useCallback, useEffect, useRef } from 'react';
import { useUIStore } from '../store/uiStore';
import { useQueueStore, previewFromBarcode } from '../store/queueStore';
import { startScanning, stopScanning } from '../lib/scan';
import { feedback } from '../lib/feedback';

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
    if (paused || !videoEl) {
      stopScanning();
      return;
    }

    let cancelled = false;
    setCameraStatus('starting');
    startScanning(videoEl, handleDetect)
      .then(() => {
        if (!cancelled) setCameraStatus('active');
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

  return (
    <div className="camera-scanner">
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video ref={videoRef} className="camera-video" autoPlay playsInline muted />
      <div className="viewfinder" aria-hidden="true" />
    </div>
  );
}
