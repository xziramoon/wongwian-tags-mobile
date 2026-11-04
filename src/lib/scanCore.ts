import {
  BarcodeFormat,
  BinaryBitmap,
  DecodeHintType,
  GlobalHistogramBinarizer,
  HybridBinarizer,
  MultiFormatReader,
  PlanarYUVLuminanceSource,
} from '@zxing/library';

/* แกน zxing ที่ไม่แตะ DOM — รันใน Web Worker (scanWorker.ts) ไม่ให้การถอดรหัสทำหน้าจอกระตุก
 * ถ้าสร้าง Worker ไม่ได้ scanDecode.ts เรียกใช้ตรง ๆ บนเธรดหลักแทน */

export interface CoreResult {
  text: string;
  format: string;
}

const FORMATS = [
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
  BarcodeFormat.ITF,
];

let reader: MultiFormatReader | null = null;
function getReader(): MultiFormatReader {
  if (!reader) {
    const hints = new Map<DecodeHintType, unknown>();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, FORMATS);
    hints.set(DecodeHintType.TRY_HARDER, true);
    reader = new MultiFormatReader();
    reader.setHints(hints);
  }
  return reader;
}

/* luma = ความสว่างทีละพิกเซล (0–255) ขนาด width × height — ลอง HybridBinarizer ก่อน (ทนแสงไม่เท่ากัน)
 * ไม่เจอค่อยลอง GlobalHistogram (ดีกับภาพเบลอ/ตัดกันต่ำ) */
export function decodeLuma(luma: Uint8ClampedArray, width: number, height: number): CoreResult | null {
  const r = getReader();
  const source = new PlanarYUVLuminanceSource(luma, width, height, 0, 0, width, height, false);
  for (const Binarizer of [HybridBinarizer, GlobalHistogramBinarizer]) {
    try {
      const res = r.decodeWithState(new BinaryBitmap(new Binarizer(source)));
      return { text: res.getText(), format: BarcodeFormat[res.getBarcodeFormat()] };
    } catch {
      /* NotFoundException ทุกเฟรมที่ยังไม่เจอ — ปกติ */
    } finally {
      r.reset();
    }
  }
  return null;
}

/* RGBA → ความสว่าง (สูตร Rec.601 แบบจำนวนเต็ม) */
export function rgbaToLuma(rgba: Uint8ClampedArray, pixels: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(pixels);
  for (let i = 0, j = 0; i < pixels; i++, j += 4) out[i] = (rgba[j] * 77 + rgba[j + 1] * 150 + rgba[j + 2] * 29) >> 8;
  return out;
}
