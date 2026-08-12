import { useUIStore } from '../store/uiStore';
import { useQueueStore } from '../store/queueStore';

/* Bottom sheet shown after a scan (or a manual-search tap). Shows the looked-up
 * product with a qty stepper when found; falls back to a "ไม่พบสินค้า" state with
 * manual name/price text inputs when the barcode isn't in the product database —
 * still addable to the queue either way. */
export default function ScanResultSheet() {
  const open = useUIStore((s) => s.scanSheetOpen);
  const item = useUIStore((s) => s.scanSheetItem);
  const found = useUIStore((s) => s.scanSheetFound);
  const updateScanSheetItem = useUIStore((s) => s.updateScanSheetItem);
  const closeScanSheet = useUIStore((s) => s.closeScanSheet);
  const addItem = useQueueStore((s) => s.addItem);
  const sendQueue = useQueueStore((s) => s.sendQueue);

  if (!open || !item) return null;

  const stepQty = (delta: number) => {
    updateScanSheetItem({ PrintQty: Math.max(1, item.PrintQty + delta) });
  };

  const handleAdd = () => {
    addItem(item);
    closeScanSheet();
  };

  const handlePrintNow = () => {
    addItem(item);
    closeScanSheet();
    void sendQueue();
  };

  return (
    <div className="sheet-backdrop" onClick={closeScanSheet}>
      <div className="sheet scan-result-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />

        {found ? (
          <>
            <div className="scan-result-name">{item.ProductName}</div>
            <div className="scan-result-meta">
              <span className="scan-result-price">{item.Price} บาท</span>
              {item.Unit && <span className="scan-result-unit">/ {item.Unit}</span>}
            </div>
          </>
        ) : (
          <>
            <div className="scan-result-not-found">ไม่พบสินค้า</div>
            <div className="scan-result-barcode">บาร์โค้ด: {item.Barcode}</div>
            <label className="field-label" htmlFor="manual-name">
              ชื่อสินค้า
            </label>
            <input
              id="manual-name"
              className="field-input"
              type="text"
              value={item.ProductName}
              onChange={(e) => updateScanSheetItem({ ProductName: e.target.value })}
              placeholder="กรอกชื่อสินค้า"
            />
            <label className="field-label" htmlFor="manual-price">
              ราคา
            </label>
            <input
              id="manual-price"
              className="field-input"
              type="number"
              inputMode="decimal"
              value={item.Price}
              onChange={(e) => updateScanSheetItem({ Price: e.target.value })}
              placeholder="0.00"
            />
          </>
        )}

        <div className="qty-stepper">
          <button type="button" className="qty-btn" onClick={() => stepQty(-1)} aria-label="ลดจำนวน">
            −
          </button>
          <span className="qty-value">{item.PrintQty}</span>
          <button type="button" className="qty-btn" onClick={() => stepQty(1)} aria-label="เพิ่มจำนวน">
            +
          </button>
        </div>

        <div className="sheet-actions">
          <button type="button" className="btn btn-secondary" onClick={handleAdd}>
            เพิ่มในคิว
          </button>
          <button type="button" className="btn btn-primary" onClick={handlePrintNow}>
            พิมพ์เลย
          </button>
        </div>
      </div>
    </div>
  );
}
