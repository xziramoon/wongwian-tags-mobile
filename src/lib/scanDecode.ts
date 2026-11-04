import { decodeLuma, rgbaToLuma } from './scanCore';
import type { WorkerRequest, WorkerResponse } from './scanWorker';

/* ตัวอ่านบาร์โค้ดจากเฟรมกล้อง — 2 ทาง:
 *  1) BarcodeDetector ของเบราว์เซอร์ (Chrome/Android ใช้ ML Kit ของเครื่อง) เร็วและทนภาพเบลอ/เอียง/แสงน้อยกว่ามาก
 *  2) zxing (JS) สำรองสำหรับ iOS/เบราว์เซอร์ที่ไม่มี — ตัดเฉพาะแถบกลางภาพ สลับอ่านทั้งเฟรม/หมุนภาพเป็นระยะ
 *     และถอดรหัสใน Web Worker (scanWorker.ts) ไม่ให้หน้าจอกระตุก */

export interface ScanResult {
  text: string;
  format: string;
}
export interface FrameDecoder {
  name: 'native' | 'zxing';
  decode(video: HTMLVideoElement): Promise<ScanResult | null>;
}

/* บาร์โค้ดที่มี check digit — อ่านผิดแล้วผ่านได้ยาก เชื่อได้ทันที · ที่เหลือ (CODE_128/39/ITF) ต้องอ่านซ้ำ 2 เฟรมถึงจะรับ */
export const CHECKSUM_FORMATS = ['EAN_13', 'EAN_8', 'UPC_A', 'UPC_E'];
export const isTrusted = (format: string) => CHECKSUM_FORMATS.includes(format);

/* ชื่อรูปแบบของ BarcodeDetector (ตัวเล็ก ขีดล่าง) → ชื่อแบบ zxing (ตัวใหญ่) เพื่อเทียบกัน */
const NATIVE_FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'itf'];

interface NativeDetectorCtor {
  new (opts?: { formats?: string[] }): { detect(src: CanvasImageSource): Promise<{ rawValue: string; format: string }[]> };
  getSupportedFormats?: () => Promise<string[]>;
}

export async function createNativeDecoder(): Promise<FrameDecoder | null> {
  const Ctor = (globalThis as unknown as { BarcodeDetector?: NativeDetectorCtor }).BarcodeDetector;
  if (!Ctor) return null;
  try {
    const supported = (await Ctor.getSupportedFormats?.()) ?? NATIVE_FORMATS;
    const formats = NATIVE_FORMATS.filter((f) => supported.includes(f));
    if (!formats.length) return null;
    const detector = new Ctor({ formats });
    return {
      name: 'native',
      async decode(video) {
        const found = await detector.detect(video);
        const hit = found.find((b) => b.rawValue);
        return hit ? { text: hit.rawValue, format: hit.format.toUpperCase() } : null;
      },
    };
  } catch {
    return null; // สร้างไม่ได้ (เครื่อง/ระบบไม่รองรับ) → ใช้ zxing
  }
}

/* แถบกลางภาพที่ใช้อ่าน (สัดส่วนของเฟรม) — บาร์โค้ดเป็นสี่เหลี่ยมผืนผ้ากว้าง ไม่ต้องอ่านทั้งภาพ */
export const ROI = { x: 0.04, w: 0.92, y: 0.12, h: 0.62 };
/* ด้านยาวสุดของภาพที่ส่งให้ zxing — เกินนี้ย่อลง (1080p ทั้งเฟรมเคยทำเครื่องกระตุก) */
export const MAX_DECODE_WIDTH = 1280;
/* ภาพที่หมุนแล้วย่อให้เล็กกว่า (ผืนผ้าใบใหญ่ขึ้นเพราะหมุน) */
export const MAX_ROTATED_WIDTH = 960;
/* ลำดับการลองอ่านทีละเฟรม วนซ้ำ: แถบกลาง (ส่วนใหญ่) · ทั้งเฟรม (บาร์โค้ดอยู่นอกแถบ) · หมุน ±ROTATE_DEG (ป้ายเอียง — zxing อ่านเส้นตรงได้เอียงไม่เกิน ~15°) */
export type DecodeMode = 'roi' | 'full' | 'rot+' | 'rot-';
export const MODE_CYCLE: DecodeMode[] = ['roi', 'roi', 'full', 'rot+', 'roi', 'rot-'];
export const ROTATE_DEG = 22;

export function roiRect(vw: number, vh: number, full: boolean) {
  if (full) return { sx: 0, sy: 0, sw: vw, sh: vh };
  return { sx: Math.round(vw * ROI.x), sy: Math.round(vh * ROI.y), sw: Math.round(vw * ROI.w), sh: Math.round(vh * ROI.h) };
}

/* ส่งภาพให้ Worker ทีละงาน (ถ้ายังไม่เสร็จ งานเก่าถูกทิ้ง) · สร้าง Worker ไม่ได้ = ถอดรหัสบนเธรดหลักแทน */
function createWorkerClient() {
  let worker: Worker | null = null;
  try {
    worker = new Worker(new URL('./scanWorker.ts', import.meta.url), { type: 'module' });
  } catch {
    return null;
  }
  let seq = 0;
  const pending = new Map<number, (r: ScanResult | null) => void>();
  worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
    pending.get(e.data.id)?.(e.data.result);
    pending.delete(e.data.id);
  };
  worker.onerror = () => {
    pending.forEach((resolve) => resolve(null));
    pending.clear();
    worker = null; // พัง → ครั้งต่อไปใช้เธรดหลัก
  };
  return {
    alive: () => worker !== null,
    run(luma: Uint8ClampedArray, width: number, height: number): Promise<ScanResult | null> {
      return new Promise((resolve) => {
        const id = ++seq;
        pending.set(id, resolve);
        worker?.postMessage({ id, width, height, luma } satisfies WorkerRequest, [luma.buffer]);
      });
    },
  };
}

export function createZxingDecoder(): FrameDecoder {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const client = createWorkerClient();
  let attempt = 0;

  return {
    name: 'zxing',
    async decode(video) {
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      if (!ctx || !vw || !vh) return null;
      const mode = MODE_CYCLE[attempt++ % MODE_CYCLE.length];
      const rotated = mode === 'rot+' || mode === 'rot-';
      const { sx, sy, sw, sh } = roiRect(vw, vh, mode === 'full');
      const scale = Math.min(1, (rotated ? MAX_ROTATED_WIDTH : MAX_DECODE_WIDTH) / sw);
      const dw = Math.round(sw * scale);
      const dh = Math.round(sh * scale);
      if (rotated) {
        // หมุนภาพแล้วอ่าน: ผืนผ้าใบใหญ่พอให้ไม่ตัดมุม พื้นขาวรอบนอก
        const a = ((mode === 'rot+' ? 1 : -1) * ROTATE_DEG * Math.PI) / 180;
        canvas.width = Math.round(Math.abs(dw * Math.cos(a)) + Math.abs(dh * Math.sin(a)));
        canvas.height = Math.round(Math.abs(dw * Math.sin(a)) + Math.abs(dh * Math.cos(a)));
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(a);
        ctx.drawImage(video, sx, sy, sw, sh, -dw / 2, -dh / 2, dw, dh);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
      } else {
        canvas.width = dw;
        canvas.height = dh;
        ctx.drawImage(video, sx, sy, sw, sh, 0, 0, dw, dh);
      }
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const luma = rgbaToLuma(img.data, canvas.width * canvas.height);
      if (client?.alive()) return client.run(luma, canvas.width, canvas.height);
      return decodeLuma(luma, canvas.width, canvas.height);
    },
  };
}

/* ตัวกรองผลอ่านระหว่างเฟรม: บาร์โค้ดมี check digit เชื่อทันที · แบบอื่นต้องอ่านได้ค่าเดิมซ้ำภายใน CONFIRM_WINDOW_MS */
export const CONFIRM_WINDOW_MS = 1500;
export function createConfirmer(now: () => number = Date.now) {
  let last: { text: string; at: number } | null = null;
  return (r: ScanResult | null): string | null => {
    if (!r) return null;
    if (isTrusted(r.format)) return r.text;
    const t = now();
    if (last && last.text === r.text && t - last.at <= CONFIRM_WINDOW_MS) return r.text;
    last = { text: r.text, at: t };
    return null;
  };
}
