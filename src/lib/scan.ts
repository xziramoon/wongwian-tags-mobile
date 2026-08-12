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
let controls: IScannerControls | null = null;
/* bumped on every start/stop so a stale decodeFromConstraints() resolution (e.g. from
 * a React StrictMode double-effect mount/cleanup/remount race) can detect it was
 * superseded and release its camera stream instead of leaking it or double-firing. */
let startToken = 0;

/**
 * Starts the rear-camera decode loop into `videoEl`. Stops itself after the FIRST
 * successful decode (calling `onDetect`) to avoid double-fires while the same
 * barcode still sits in frame — call startScanning() again to resume scanning
 * (e.g. after the confirmation sheet closes).
 */
export async function startScanning(videoEl: HTMLVideoElement, onDetect: (code: string) => void): Promise<void> {
  stopScanning(); // ensure any previous run is torn down before opening a new stream
  const token = ++startToken;

  const newControls = await reader.decodeFromConstraints(
    { video: { facingMode: 'environment' } },
    videoEl,
    (result) => {
      if (token !== startToken) return; // superseded by a newer start/stop — ignore
      if (result) {
        const text = result.getText();
        stopScanning();
        onDetect(text);
      }
      // decode errors (NotFoundException etc.) fire on every frame with no result —
      // ignored on purpose, they just mean "no barcode in this frame yet"
    },
  );

  if (token !== startToken) {
    // a newer startScanning()/stopScanning() happened while getUserMedia was pending —
    // release the stream we just opened instead of leaking it
    newControls.stop();
    return;
  }
  controls = newControls;
}

export function stopScanning(): void {
  startToken++;
  controls?.stop();
  controls = null;
}
