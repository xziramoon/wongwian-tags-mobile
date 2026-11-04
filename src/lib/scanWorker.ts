import { decodeLuma, type CoreResult } from './scanCore';

/* Web Worker: รับภาพขาวดำ (ความสว่างทีละพิกเซล) จากเธรดหลัก ถอดรหัสแล้วส่งผลกลับ */
export interface WorkerRequest {
  id: number;
  width: number;
  height: number;
  luma: Uint8ClampedArray;
}
export interface WorkerResponse {
  id: number;
  result: CoreResult | null;
}

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const { id, width, height, luma } = e.data;
  let result: CoreResult | null = null;
  try {
    result = decodeLuma(luma, width, height);
  } catch {
    result = null;
  }
  (self as unknown as Worker).postMessage({ id, result } satisfies WorkerResponse);
};
