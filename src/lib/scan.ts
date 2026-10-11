import { BrowserMultiFormatReader } from '@zxing/browser';
import type { IScannerControls } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';

/* retail barcode formats only — keeps decode fast and avoids false-positive reads
 * from QR/Aztec/Data Matrix noise in frame */
const FORMATS = [
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
  BarcodeFormat.ITF,
];

const hints = new Map<DecodeHintType, unknown>();
hints.set(DecodeHintType.POSSIBLE_FORMATS, FORMATS);
hints.set(DecodeHintType.TRY_HARDER, true);

const reader = new BrowserMultiFormatReader(hints);

/* กล้อง (stream) กับการอ่านบาร์โค้ด (decode loop) แยกกัน:
 * - openCamera() ขอกล้องครั้งเดียวต่อการเปิดหน้าสแกน 1 รอบ
 * - startDecoding()/stopDecoding() หยุด/เดินแค่ตัวอ่าน ระหว่างแผ่นผลสแกนเปิดทับ
 * เดิมปิดทั้ง stream ทุกครั้งที่สแกนติด แล้ว getUserMedia ใหม่ — iOS PWA (โหมดหน้าจอโฮม)
 * ถามสิทธิ์กล้องซ้ำเมื่อเรียก getUserMedia ใหม่หลังผ่านไป ~90 วิ (WebKit bug 215884)
 * กล้องต้องวอร์มใหม่ทุกชิ้น และซูม/ไฟฉายที่ตั้งไว้หายทุกครั้ง */
let stream: MediaStream | null = null;
let decodeControls: IScannerControls | null = null;
let decodeToken = 0;
/* bumped on every open/close so a stale getUserMedia() resolution (e.g. from a React
 * StrictMode double-effect mount/cleanup/remount race) can detect it was superseded
 * and release its camera stream instead of leaking it. */
let openToken = 0;

function videoTrack(): MediaStreamTrack | null {
  return stream?.getVideoTracks()[0] ?? null;
}

/** เปิดกล้องหลังเข้า `videoEl` (ยังไม่เริ่มอ่านบาร์โค้ด) */
export async function openCamera(videoEl: HTMLVideoElement): Promise<void> {
  closeCamera(); // ensure any previous stream is torn down before opening a new one
  const token = ++openToken;

  const newStream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: 'environment',
      // 720p: enough pixel density to read small/far barcodes clearly without the
      // decode cost of full 1080p. 1080p was tried first but the JS-based zxing
      // decode (re-run every ~500ms) was heavy enough at that resolution to
      // visibly stall the main thread on real phones — this is the balance point.
      width: { ideal: 1280 },
      height: { ideal: 720 },
      // best-effort only: unsupported keys inside `advanced` are silently ignored
      // rather than rejected, so this is safe to request even where unsupported
      advanced: [{ focusMode: 'continuous' } as MediaTrackConstraintSet],
    },
  });

  if (token !== openToken) {
    // a newer open/close happened while getUserMedia was pending — release this stream
    newStream.getTracks().forEach((t) => t.stop());
    return;
  }
  stream = newStream;
  videoEl.srcObject = newStream;
  await videoEl.play().catch(() => {
    /* autoPlay+muted+playsInline on the element covers browsers that reject play() here */
  });
}

/**
 * Starts the decode loop on the (already open) camera video. Stops ITSELF after the
 * FIRST successful decode (calling `onDetect`) to avoid double-fires while the same
 * barcode still sits in frame — the camera keeps running; call startDecoding() again
 * to resume (e.g. after the confirmation sheet closes).
 */
export function startDecoding(videoEl: HTMLVideoElement, onDetect: (code: string) => void): void {
  stopDecoding();
  if (!stream) return;
  // token ไม่ใช่ตัว controls เอง: scan() เรียก callback ครั้งแรกแบบ synchronous ก่อน return
  const token = ++decodeToken;
  decodeControls = reader.scan(videoEl, (result) => {
    if (token !== decodeToken) return; // superseded by a newer start/stop — ignore
    if (result) {
      stopDecoding();
      onDetect(result.getText());
    }
    // decode errors (NotFoundException etc.) fire on every frame with no result —
    // ignored on purpose, they just mean "no barcode in this frame yet"
  });
  // เจอบาร์โค้ดตั้งแต่เฟรมแรก (synchronous) → stopDecoding() ถูกเรียกไปก่อนได้ controls มา
  if (token !== decodeToken) {
    decodeControls.stop();
    decodeControls = null;
  }
}

export function stopDecoding(): void {
  decodeToken++;
  const c = decodeControls;
  decodeControls = null;
  c?.stop(); // no finalize callback passed to scan() → stops the loop only, not the stream
}

/** ปิดกล้องจริง (ปล่อยไฟเขียวกล้อง/แบต) — ปิดหน้าสแกน, ปิดอัตโนมัติ, สลับแอป */
export function closeCamera(videoEl?: HTMLVideoElement | null): void {
  openToken++;
  stopDecoding();
  stream?.getTracks().forEach((t) => t.stop());
  stream = null;
  if (videoEl) videoEl.srcObject = null;
}

/* non-standard MediaTrackCapabilities/Constraints keys (torch, zoom) — supported by
 * Chromium-based browsers, not part of the official W3C MediaCapture spec */
interface ExtendedTrackCapabilities extends MediaTrackCapabilities {
  torch?: boolean;
  zoom?: { min: number; max: number; step: number };
}

/** true if the active camera stream exposes a torch (flashlight) track capability */
export function hasTorch(): boolean {
  try {
    const caps = videoTrack()?.getCapabilities?.() as ExtendedTrackCapabilities | undefined;
    return !!caps?.torch;
  } catch {
    return false; // capability query not supported on this device — treat as no torch
  }
}

/** best-effort torch on/off — no-ops silently if the device/browser doesn't support it */
export async function setTorch(on: boolean): Promise<void> {
  try {
    await videoTrack()?.applyConstraints({ advanced: [{ torch: on } as MediaTrackConstraintSet] });
  } catch {
    /* torch not supported on this device — non-critical, scanning still works */
  }
}

/** the active camera's optical zoom range, or null if the device/browser doesn't
 * expose one (in practice: mostly Android Chrome — iOS Safari has no zoom control) */
export function getZoomRange(): { min: number; max: number; step: number } | null {
  try {
    const caps = videoTrack()?.getCapabilities?.() as ExtendedTrackCapabilities | undefined;
    return caps?.zoom ?? null;
  } catch {
    return null;
  }
}

/** best-effort zoom-level set — no-ops silently if unsupported */
export async function setZoom(level: number): Promise<void> {
  try {
    await videoTrack()?.applyConstraints({ advanced: [{ zoom: level } as MediaTrackConstraintSet] });
  } catch {
    /* zoom not supported on this device — non-critical, scanning still works */
  }
}
