import { createConfirmer, createNativeDecoder, createZxingDecoder, type FrameDecoder } from './scanDecode';

/* กล้อง (stream) กับการอ่านบาร์โค้ด (decode loop) แยกกัน:
 * - openCamera() ขอกล้องครั้งเดียวต่อการเปิดหน้าสแกน 1 รอบ
 * - startDecoding()/stopDecoding() หยุด/เดินแค่ตัวอ่าน ระหว่างแผ่นผลสแกนเปิดทับ
 * เดิมปิดทั้ง stream ทุกครั้งที่สแกนติด แล้ว getUserMedia ใหม่ — iOS PWA (โหมดหน้าจอโฮม)
 * ถามสิทธิ์กล้องซ้ำเมื่อเรียก getUserMedia ใหม่หลังผ่านไป ~90 วิ (WebKit bug 215884)
 * กล้องต้องวอร์มใหม่ทุกชิ้น และซูม/ไฟฉายที่ตั้งไว้หายทุกครั้ง
 *
 * ตัวอ่าน (lib/scanDecode.ts): BarcodeDetector ของเครื่องถ้ามี ไม่มีก็ zxing แบบตัดแถบกลางภาพ */
let stream: MediaStream | null = null;
let decodeToken = 0;
/* bumped on every open/close so a stale getUserMedia() resolution (e.g. from a React
 * StrictMode double-effect mount/cleanup/remount race) can detect it was superseded
 * and release its camera stream instead of leaking it. */
let openToken = 0;

/* ตัวอ่านที่ใช้อยู่ — สร้างครั้งเดียวต่อรอบเปิดแอป (native ถ้าเครื่องมี) */
let decoderPromise: Promise<FrameDecoder> | null = null;
const getDecoder = (): Promise<FrameDecoder> => (decoderPromise ??= createNativeDecoder().then((d) => d ?? createZxingDecoder()));

/* ช่วงห่างระหว่างการอ่านแต่ละรอบ (ms) — รวมเวลาอ่านจริงแล้ว ไม่ให้ถี่จนเครื่องร้อน */
const INTERVAL_MS = { native: 90, zxing: 110 };

/* ซูมที่จำไว้ — บาร์โค้ดบนป้ายชั้นเล็ก ซูมเข้าช่วยให้ถอยมือถือห่างขึ้นได้ (โฟกัสกล้องมือถือมีระยะใกล้สุด ยิ่งใกล้ยิ่งเบลอ) */
const ZOOM_KEY = 'wongwianScanZoom_v1';
export const DEFAULT_ZOOM = 2;

function videoTrack(): MediaStreamTrack | null {
  return stream?.getVideoTracks()[0] ?? null;
}

/* non-standard MediaTrackCapabilities/Constraints keys (torch, zoom, focus) — supported by
 * Chromium-based browsers, not part of the official W3C MediaCapture spec */
interface ExtendedTrackCapabilities extends MediaTrackCapabilities {
  torch?: boolean;
  zoom?: { min: number; max: number; step: number };
  focusMode?: string[];
  exposureMode?: string[];
  whiteBalanceMode?: string[];
}
const capabilities = (): ExtendedTrackCapabilities | undefined => {
  try {
    return videoTrack()?.getCapabilities?.() as ExtendedTrackCapabilities | undefined;
  } catch {
    return undefined;
  }
};

const readSavedZoom = (): number | null => {
  try {
    const v = parseFloat(localStorage.getItem(ZOOM_KEY) ?? '');
    return Number.isFinite(v) && v > 0 ? v : null;
  } catch {
    return null;
  }
};

/** ซูมเริ่มต้น: ค่าที่ผู้ใช้เคยตั้งไว้ ไม่มีก็ DEFAULT_ZOOM — ตัดให้อยู่ในช่วงที่กล้องรองรับ */
export function pickInitialZoom(range: { min: number; max: number }, saved: number | null = readSavedZoom()): number {
  const want = saved ?? DEFAULT_ZOOM;
  return Math.min(range.max, Math.max(range.min, want));
}

/** เปิดกล้องหลังเข้า `videoEl` (ยังไม่เริ่มอ่านบาร์โค้ด) */
export async function openCamera(videoEl: HTMLVideoElement): Promise<void> {
  closeCamera(); // ensure any previous stream is torn down before opening a new one
  const token = ++openToken;

  const newStream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: 'environment',
      // 1080p: บาร์โค้ดเล็ก/ไกลมีพิกเซลพอให้อ่าน — ตัวอ่านตัดแถบกลางภาพและย่อก่อนส่ง zxing
      // เลยไม่หนักเหมือนเดิม (เดิมอ่านทั้งเฟรม 1080p ทุก 500ms แล้วเครื่องกระตุก จึงเคยลดเหลือ 720p)
      width: { ideal: 1920 },
      height: { ideal: 1080 },
      frameRate: { ideal: 30 },
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
  await tuneTrack();
}

/* ตั้งค่ากล้องให้เหมาะกับอ่านบาร์โค้ด (ทุกอย่าง best-effort — เครื่องไหนไม่รองรับก็ข้าม):
 * โฟกัส/แสง/สีต่อเนื่อง + ซูมเริ่มต้น */
async function tuneTrack(): Promise<void> {
  const track = videoTrack();
  const caps = capabilities();
  if (!track || !caps) return;
  const advanced: MediaTrackConstraintSet[] = [];
  const add = (c: Record<string, unknown>) => advanced.push(c as MediaTrackConstraintSet);
  if (caps.focusMode?.includes('continuous')) add({ focusMode: 'continuous' });
  if (caps.exposureMode?.includes('continuous')) add({ exposureMode: 'continuous' });
  if (caps.whiteBalanceMode?.includes('continuous')) add({ whiteBalanceMode: 'continuous' });
  if (caps.zoom) add({ zoom: pickInitialZoom(caps.zoom) });
  for (const c of advanced) {
    try {
      await track.applyConstraints({ advanced: [c] }); // ทีละอย่าง: อย่างใดไม่รองรับไม่ทำให้อย่างอื่นล้ม
    } catch {
      /* ข้าม */
    }
  }
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
  // token ใช้ยกเลิกรอบเก่า: stopDecoding()/startDecoding() ซ้อนกันไม่ให้ผลอ่านของรอบเก่าหลุดมา
  const token = ++decodeToken;
  const confirm = createConfirmer();
  void (async () => {
    const decoder = await getDecoder();
    while (token === decodeToken) {
      const t0 = performance.now();
      let code: string | null = null;
      if (videoEl.readyState >= 2) {
        try {
          code = confirm(await decoder.decode(videoEl));
        } catch {
          // BarcodeDetector พังกลางทาง (บางเครื่องรายงานว่ารองรับแต่ใช้ไม่ได้) → สลับเป็น zxing ถาวร
          if (decoder.name === 'native') decoderPromise = Promise.resolve(createZxingDecoder());
          code = null;
        }
      }
      if (token !== decodeToken) return; // superseded while decoding — drop result
      if (code) {
        stopDecoding();
        onDetect(code);
        return;
      }
      const wait = Math.max(0, INTERVAL_MS[decoder.name] - (performance.now() - t0));
      await new Promise((r) => setTimeout(r, wait));
    }
  })();
}

export function stopDecoding(): void {
  decodeToken++;
}

/** ปิดกล้องจริง (ปล่อยไฟเขียวกล้อง/แบต) — ปิดหน้าสแกน, ปิดอัตโนมัติ, สลับแอป */
export function closeCamera(videoEl?: HTMLVideoElement | null): void {
  openToken++;
  stopDecoding();
  stream?.getTracks().forEach((t) => t.stop());
  stream = null;
  if (videoEl) videoEl.srcObject = null;
}

/** true if the active camera stream exposes a torch (flashlight) track capability */
export function hasTorch(): boolean {
  return !!capabilities()?.torch;
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
  return capabilities()?.zoom ?? null;
}

/** ซูมปัจจุบันของกล้อง (หลัง tuneTrack) หรือ null ถ้าอ่านไม่ได้ */
export function getZoom(): number | null {
  try {
    const z = (videoTrack()?.getSettings?.() as { zoom?: number } | undefined)?.zoom;
    return typeof z === 'number' ? z : null;
  } catch {
    return null;
  }
}

/** best-effort zoom-level set (จำค่าไว้ใช้รอบหน้า) — no-ops silently if unsupported */
export async function setZoom(level: number): Promise<void> {
  try {
    await videoTrack()?.applyConstraints({ advanced: [{ zoom: level } as MediaTrackConstraintSet] });
    try {
      localStorage.setItem(ZOOM_KEY, String(level));
    } catch {
      /* storage ถูกบล็อก — ไม่จำ */
    }
  } catch {
    /* zoom not supported on this device — non-critical, scanning still works */
  }
}

/** แตะจอเพื่อโฟกัสใหม่: สั่งโฟกัสครั้งเดียว แล้วกลับไปโฟกัสต่อเนื่อง (เครื่องที่ไม่รองรับ = ไม่ทำอะไร) */
export async function refocus(): Promise<void> {
  const track = videoTrack();
  const modes = capabilities()?.focusMode;
  if (!track || !modes) return;
  try {
    if (modes.includes('single-shot')) {
      await track.applyConstraints({ advanced: [{ focusMode: 'single-shot' } as MediaTrackConstraintSet] });
      await new Promise((r) => setTimeout(r, 900));
    }
    if (modes.includes('continuous')) await track.applyConstraints({ advanced: [{ focusMode: 'continuous' } as MediaTrackConstraintSet] });
  } catch {
    /* โฟกัสมือไม่รองรับ — ข้าม */
  }
}
