import { useCallback, useEffect, useRef, useState } from 'react';
import { useUIStore } from '../store/uiStore';
import { useQueueStore, previewFromBarcode } from '../store/queueStore';
import { openCamera, closeCamera, startDecoding, stopDecoding, hasTorch, setTorch, getZoomRange, setZoom } from '../lib/scan';
import { feedback } from '../lib/feedback';
import { tryKeepScan, resetKeepCooldown } from '../lib/scanKeep';
import { totalTags, typeDef } from '../lib/tagTypes';
import ConnectionStatus from './ConnectionStatus';
import { IconClose, IconFlash } from './Icons';

/* ไม่มีการสแกนนานเท่านี้ → ปิดกล้องกลับหน้าแรกเอง ประหยัดแบต/ไม่ให้กล้องค้าง */
const IDLE_CLOSE_MS = 2 * 60 * 1000;
/* พักหลังปิดแผ่นผลสแกนก่อนอ่านต่อ — เท่ากับเวลาเปิดกล้องใหม่ของแบบเดิมโดยประมาณ ให้ทันยกมือถือออก */
const RESUME_DELAY_MS = 1000;

interface ZoomRange {
  min: number;
  max: number;
  step: number;
}

/* กล้องสแกนเต็มจอ (ดีไซน์ใหม่ 1b) — App.tsx mount เฉพาะตอน cameraStatus ไม่ใช่ 'denied'
 * เลือกแบบป้ายจากบนกล้องได้ · สวิตช์ "สแกนแล้วเก็บเลย" / "ขอดูก่อนทุกชิ้น" · การ์ดชิ้นล่าสุด + ปุ่มแก้ */
export default function CameraScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const setCameraStatus = useUIStore((s) => s.setCameraStatus);
  const scanSheetOpen = useUIStore((s) => s.scanSheetOpen);
  const queueDrawerOpen = useUIStore((s) => s.queueDrawerOpen);
  const manualSearchOpen = useUIStore((s) => s.manualSearchOpen);
  const openScanSheet = useUIStore((s) => s.openScanSheet);
  const setCameraEnabled = useUIStore((s) => s.setCameraEnabled);
  const setManualSearchOpen = useUIStore((s) => s.setManualSearchOpen);
  const setQueueDrawerOpen = useUIStore((s) => s.setQueueDrawerOpen);
  const setTagTypeOpen = useUIStore((s) => s.setTagTypeOpen);
  const openTagEditForIndex = useUIStore((s) => s.openTagEditForIndex);
  const showToast = useUIStore((s) => s.showToast);
  const settingsOpen = useUIStore((s) => s.settingsSheetOpen);
  const tagEditOpen = useUIStore((s) => s.tagEditTarget !== null);
  const tagTypeOpen = useUIStore((s) => s.tagTypeOpen);
  const flipTodayOpen = useUIStore((s) => s.flipTodayOpen);
  const lastTagMode = useUIStore((s) => s.lastTagMode);
  const scanMode = useUIStore((s) => s.scanMode);
  const setScanMode = useUIStore((s) => s.setScanMode);
  const lastKept = useUIStore((s) => s.lastKept);
  const recentKept = useUIStore((s) => s.recentKept);
  const queue = useQueueStore((s) => s.queue);
  const ablyStatus = useUIStore((s) => s.ablyStatus);
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

      /* โหมดเก็บเลย (lib/scanKeep.ts): เจอสินค้าแล้วเก็บทันที ไม่เปิดหน้าผลสแกน */
      const kept = tryKeepScan(trimmed);
      if (kept === 'ignored') return; // บาร์โค้ดเดิมยังอยู่ในกรอบ
      if (kept === 'kept') {
        feedback[alreadyQueued ? 'duplicate' : 'success']();
        return;
      }

      const { item, found } = previewFromBarcode(trimmed);
      if (found) feedback[alreadyQueued ? 'duplicate' : 'success']();
      else feedback.notFound();
      openScanSheet(item, found);
    },
    [openScanSheet],
  );

  const [cameraReady, setCameraReady] = useState(false);
  const anySheetOpen =
    scanSheetOpen || queueDrawerOpen || manualSearchOpen || settingsOpen || tagEditOpen || tagTypeOpen || flipTodayOpen;

  // เปิดกล้องครั้งเดียวตอนเข้าหน้าสแกน ปิดตอนออก — ไม่ปิด/เปิดใหม่ทุกครั้งที่สแกนติด
  // (ดู lib/scan.ts: iOS PWA ถามสิทธิ์ซ้ำ, กล้องวอร์มช้า, ซูม/ไฟฉายหาย)
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;
    let cancelled = false;
    resetKeepCooldown();
    setCameraStatus('starting');
    openCamera(videoEl)
      .then(() => {
        if (cancelled) return;
        setCameraStatus('active');
        setCameraReady(true);
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
      setCameraReady(false);
      closeCamera(videoEl);
    };
  }, [setCameraStatus]);

  // หยุดแค่ตัวอ่านบาร์โค้ดระหว่างมีแผ่นเปิดทับ (กล้องยังเปิดอยู่) — ปิดแผ่นแล้วสแกนต่อได้ทันที
  // ปิดแผ่นแล้วพักก่อนอ่านต่อ ไม่งั้นบาร์โค้ดที่ยังอยู่ในกรอบถูกอ่านซ้ำทันที (แผ่นเด้งกลับมา)
  // ครั้งแรกตอนเปิดกล้องไม่ต้องพัก
  const resumedOnce = useRef(false);
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!cameraReady || anySheetOpen || !videoEl) return;
    const delay = resumedOnce.current ? RESUME_DELAY_MS : 0;
    resumedOnce.current = true;
    const t = window.setTimeout(() => startDecoding(videoEl, handleDetect), delay);
    return () => {
      window.clearTimeout(t);
      stopDecoding();
    };
  }, [cameraReady, anySheetOpen, handleDetect]);

  // ปิดกล้องอัตโนมัติเมื่อไม่ได้ใช้ — นับเฉพาะตอนกล้องโชว์อยู่ (มีแผ่นไหนเปิดทับ = กำลังใช้งาน)
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

  const editLastKept = () => {
    if (!lastKept) return;
    const idx = queue.findIndex((i) => i.Barcode === lastKept.barcode && i.TagMode === lastKept.mode);
    if (idx >= 0) openTagEditForIndex(idx);
  };

  const total = totalTags(queue);
  const def = typeDef(lastTagMode);

  return (
    /* แตะตรงไหนก็ได้ (ซูม/ไฟฉาย/จอ) = ยังใช้งานอยู่ เริ่มนับเวลาปิดอัตโนมัติใหม่
     * เดิมนับแค่ตอนสแกนติด — คนกำลังเล็งบาร์โค้ดยาก ๆ อยู่โดนกล้องปิดกลางคัน */
    <div className="camera-scanner" onPointerDownCapture={() => setLastActivity(Date.now())}>
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video ref={videoRef} className="camera-video" autoPlay playsInline muted />

      <div className="dz-cam-top">
        <button type="button" className="dz-cam-btn" onClick={() => setCameraEnabled(false)} aria-label="ปิดกล้อง กลับหน้าแรก">
          <IconClose size={20} />
        </button>
        <button type="button" className="dz-cam-chip" onClick={() => setTagTypeOpen(true)} aria-label="เปลี่ยนแบบป้าย">
          <span className="dz-swatch" style={{ background: def.color, width: 10, height: 10, borderRadius: 3 }} />
          ป้ายแบบ{def.label} · เปลี่ยน
        </button>
        {torchAvailable && (
          <button type="button" className={`dz-cam-btn${torchOn ? ' torch-on' : ''}`} onClick={toggleTorch} aria-label={torchOn ? 'ปิดไฟฉาย' : 'เปิดไฟฉาย'}>
            <IconFlash size={20} />
          </button>
        )}
      </div>

      <div className="dz-cam-modes" role="group" aria-label="โหมดสแกน">
        <button type="button" className={`dz-mode${scanMode === 'keep' ? ' active' : ''}`} aria-pressed={scanMode === 'keep'} onClick={() => setScanMode('keep')}>
          <IconFlash size={16} />
          สแกนแล้วเก็บเลย
        </button>
        <button type="button" className={`dz-mode${scanMode === 'review' ? ' active' : ''}`} aria-pressed={scanMode === 'review'} onClick={() => setScanMode('review')}>
          ขอดูก่อนทุกชิ้น
        </button>
      </div>

      <div className="dz-frame" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
        <i className="line" />
      </div>
      <div className="dz-cam-hint">ส่องบาร์โค้ดให้อยู่ในกรอบ</div>
      {ablyStatus !== 'connected' && (
        <div className="dz-printer-float-slot">
          <ConnectionStatus />
        </div>
      )}

      {zoomRange && (
        <div className="dz-zoom" role="group" aria-label="ซูมกล้อง">
          <span>{zoomRange.max.toFixed(0)}×</span>
          <span className="dz-zoom-track">
            <input
              type="range"
              min={zoomRange.min}
              max={zoomRange.max}
              step={zoomRange.step || 0.1}
              value={zoomValue}
              onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
              aria-label="ระดับซูม"
            />
          </span>
          <span>{zoomRange.min.toFixed(0)}×</span>
        </div>
      )}

      <div className="dz-cam-bottom">
        {scanMode === 'keep' && lastKept && (
          <>
            <div className="dz-kept" role="status" aria-live="polite">
              <span className="dz-kept-ic">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12l5 5L20 7" />
                </svg>
              </span>
              <span className="dz-kept-main">
                <span className="dz-kept-name">{lastKept.name}</span>
                <span style={{ fontSize: 12, color: 'var(--dz-muted)' }}>เก็บไว้แล้ว {lastKept.qty} ใบ</span>
              </span>
              <span className="dz-kept-price">{lastKept.price}.-</span>
              <button type="button" className="dz-mini-btn" style={{ height: 36 }} onClick={editLastKept}>
                แก้
              </button>
            </div>
            {recentKept.length > 0 && (
              <div className="dz-recent">
                <span>ก่อนหน้านี้:</span>
                {recentKept.map((r, i) => (
                  <span key={`${r.name}-${i}`}>
                    <b>
                      {r.name} {r.price}.-
                    </b>
                    {i < recentKept.length - 1 ? ' ·' : ''}
                  </span>
                ))}
              </div>
            )}
          </>
        )}
        <div className="dz-cam-row">
          <button type="button" className="dz-cam-key" onClick={() => setManualSearchOpen(true)} aria-label="สแกนไม่ติด กรอกเลขเอง">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <rect x="3" y="6" width="18" height="12" rx="2" />
              <path d="M7 10h1M11 10h1M15 10h2M7 14h10" />
            </svg>
            กรอกเลข
          </button>
          <button type="button" className="dz-cam-wait" onClick={() => setQueueDrawerOpen(true)}>
            <span style={{ display: 'flex', flexDirection: 'column' }}>
              <span className="t1">รอปริ้น</span>
              <span className="t2">{total} ใบ</span>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: 600 }}>
              ดูรายการ ›
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
