import { useState } from 'react';
import { useUIStore } from '../store/uiStore';
import { useQueueStore, previewFromBarcode } from '../store/queueStore';
import { useOosStore } from '../store/oosStore';
import type { QueueItem } from '../types';

/* Bottom sheet shown after a scan (or a manual-search tap). Shows the looked-up
 * product with a qty stepper when found; falls back to a "ไม่พบสินค้า" state with
 * manual name/price text inputs when the barcode isn't in the product database —
 * still addable to the queue either way.
 *
 * Phase 2 (OOS registry): branches on whether the scanned barcode is already sitting
 * in oosStore. Already registered -> show a restock banner + one big "ของเข้าแล้ว"
 * button instead of the normal flow. Not registered -> normal flow, plus one more
 * action to put the barcode into the registry with an OOS strip. */
export default function ScanResultSheet() {
  const open = useUIStore((s) => s.scanSheetOpen);
  const item = useUIStore((s) => s.scanSheetItem);
  const found = useUIStore((s) => s.scanSheetFound);
  const updateScanSheetItem = useUIStore((s) => s.updateScanSheetItem);
  const closeScanSheet = useUIStore((s) => s.closeScanSheet);
  const openTagEditNew = useUIStore((s) => s.openTagEditNew);
  const addItem = useQueueStore((s) => s.addItem);
  const sendQueue = useQueueStore((s) => s.sendQueue);
  const oosRecords = useOosStore((s) => s.records);
  const oosAdd = useOosStore((s) => s.add);
  const oosClear = useOosStore((s) => s.clear);

  const [oosFormOpen, setOosFormOpen] = useState(false);
  const [oosEta, setOosEta] = useState('');
  const [locFormOpen, setLocFormOpen] = useState(false);
  const [locValue, setLocValue] = useState('');

  if (!open || !item) return null;

  const oosRecord = oosRecords[item.Barcode];

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

  const handleCustomize = () => {
    closeScanSheet();
    openTagEditNew(item);
  };

  const handleAddOosStrip = () => {
    const eta = oosEta.trim();
    const oosItem: QueueItem = { ...item, TagMode: 'oos', OosReason: 'temp', OosEta: eta };
    addItem(oosItem);
    oosAdd({ Barcode: item.Barcode, ProductName: item.ProductName, since: Date.now(), eta, reason: 'temp' });
    setOosFormOpen(false);
    setOosEta('');
    closeScanSheet();
  };

  const openLocForm = () => {
    setOosFormOpen(false);
    setLocFormOpen(true);
  };

  const openOosForm = () => {
    setLocFormOpen(false);
    setOosFormOpen(true);
  };

  /* ลงทะเบียนตำแหน่งชั้น-แถว — ตั้ง item.Loc แล้วเข้าคิวทันที เพื่อให้ป้ายที่พิมพ์ออกมา
   * โชว์รหัสชั้น-แถวที่หัวป้าย (ดู renderHeader() ใน PriceTag.tsx) */
  const handleRegisterLoc = () => {
    const loc = locValue.trim().toUpperCase().slice(0, 5);
    if (!loc) return;
    addItem({ ...item, Loc: loc });
    setLocFormOpen(false);
    setLocValue('');
    closeScanSheet();
    useUIStore.getState().showToast(`ลงทะเบียนตำแหน่ง ${loc} แล้ว`, 'success');
  };

  // ของเข้ารอบใหม่ราคามักเปลี่ยน — ดึงราคาล่าสุดจาก CSV มาเข้าคิวพิมพ์ป้ายใหม่ทับไปเลย
  const handleRestock = () => {
    oosClear(item.Barcode);
    addItem(previewFromBarcode(item.Barcode).item);
    closeScanSheet();
  };

  if (oosRecord) {
    const days = Math.floor((Date.now() - oosRecord.since) / 86400000);
    return (
      <div className="sheet-backdrop" onClick={closeScanSheet}>
        <div className="sheet scan-result-sheet" onClick={(e) => e.stopPropagation()}>
          <div className="sheet-handle" />
          <div className="scan-result-name">{item.ProductName}</div>
          <div className="oos-banner">
            หมดมา {days} วัน{oosRecord.eta ? ` · แจ้งของเข้า ${oosRecord.eta}` : ''}
          </div>
          <div className="sheet-actions">
            <button type="button" className="btn btn-primary btn-block" onClick={handleRestock}>
              ของเข้าแล้ว
            </button>
          </div>
        </div>
      </div>
    );
  }

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

        <button type="button" className="btn btn-secondary btn-block" onClick={handleCustomize}>
          ปรับแต่งป้าย
        </button>

        <div className="sheet-actions">
          <button type="button" className="btn btn-secondary" onClick={handleAdd}>
            เพิ่มในคิว
          </button>
          <button type="button" className="btn btn-primary" onClick={handlePrintNow}>
            พิมพ์เลย
          </button>
        </div>

        {locFormOpen ? (
          <div className="q-field">
            <span className="q-lbl">ตำแหน่งชั้น-แถว (เช่น A-3)</span>
            <input
              className="field-input"
              value={locValue}
              onChange={(e) => setLocValue(e.target.value)}
              placeholder="เช่น A-3"
              autoFocus
            />
            <div className="sheet-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setLocFormOpen(false)}>
                ยกเลิก
              </button>
              <button type="button" className="btn btn-primary" onClick={handleRegisterLoc}>
                บันทึกตำแหน่ง
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className="btn btn-secondary btn-block" onClick={openLocForm}>
            📍 ลงทะเบียนตำแหน่งชั้น-แถว
          </button>
        )}

        {oosFormOpen ? (
          <div className="q-field">
            <span className="q-lbl">วันที่ของเข้า (ข้ามได้)</span>
            <input
              className="field-input"
              value={oosEta}
              onChange={(e) => setOosEta(e.target.value)}
              placeholder="เช่น 18 ก.ย."
            />
            <div className="sheet-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setOosFormOpen(false)}>
                ยกเลิก
              </button>
              <button type="button" className="btn btn-primary" onClick={handleAddOosStrip}>
                ยืนยันติดแถบ
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className="btn btn-secondary btn-block" onClick={openOosForm}>
            🚫 แถบสินค้าหมด
          </button>
        )}
      </div>
    </div>
  );
}
