import { useState } from 'react';
import { useUIStore } from '../store/uiStore';
import TagPreview from './TagPreview';
import { useQueueStore, previewFromBarcode } from '../store/queueStore';
import { useOosStore } from '../store/oosStore';
import type { QueueItem } from '../types';
import { isVeg } from '../lib/veg';
import { SCAN_TYPES } from '../lib/tagTypes';
import FlipMobileOptions from '../flip/FlipMobileOptions';

/* หน้าผลสแกน (ดีไซน์ใหม่ 1c/1j/1k): ชื่อ + ราคา · ตัวอย่างป้าย · เลือกแบบป้าย · ปุ่มเล็ก เจ / อยู่ชั้น / ของหมดแล้ว
 * · แถบล่าง ตัวนับ ± · เก็บไว้ก่อน · ปริ้นเลย
 * ไม่พบสินค้า → กรอกชื่อ/ราคาเองแล้วปริ้นได้ · สแกนของที่ลงทะเบียนว่าหมดไว้ → ของเข้าแล้ว / ปริ้นป้ายหมดซ้ำ */
export default function ScanResultSheet() {
  const open = useUIStore((s) => s.scanSheetOpen);
  const item = useUIStore((s) => s.scanSheetItem);
  const found = useUIStore((s) => s.scanSheetFound);
  const updateScanSheetItem = useUIStore((s) => s.updateScanSheetItem);
  const closeScanSheet = useUIStore((s) => s.closeScanSheet);
  const openTagEditNew = useUIStore((s) => s.openTagEditNew);
  const addItem = useQueueStore((s) => s.addItem);
  const requestSend = useQueueStore((s) => s.requestSend);
  const oosRecords = useOosStore((s) => s.records);
  const oosAdd = useOosStore((s) => s.add);
  const oosClear = useOosStore((s) => s.clear);
  const config = useQueueStore((s) => s.config);
  const setScanTagMode = useUIStore((s) => s.setScanTagMode);

  const [oosFormOpen, setOosFormOpen] = useState(false);
  const [oosEta, setOosEta] = useState('');
  const [locFormOpen, setLocFormOpen] = useState(false);
  const [locValue, setLocValue] = useState('');

  if (!open || !item) return null;

  const oosRecord = oosRecords[item.Barcode];
  const vegNow = isVeg(item, config);

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
    requestSend();
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

  /* ลงทะเบียนตำแหน่งชั้น-แถว — ตั้ง item.Loc แล้วเข้ารายการทันที เพื่อให้ป้ายที่ปริ้นออกมา
   * โชว์รหัสชั้น-แถวที่หัวป้าย (ดู renderHeader() ใน PriceTag.tsx) */
  const handleRegisterLoc = () => {
    const loc = locValue.trim().toUpperCase().slice(0, 5);
    if (!loc) return;
    addItem({ ...item, Loc: loc });
    setLocFormOpen(false);
    setLocValue('');
    closeScanSheet();
    useUIStore.getState().showToast(`บันทึกตำแหน่ง ${loc} แล้ว`, 'success');
  };

  // ของเข้ารอบใหม่ราคามักเปลี่ยน — ดึงราคาล่าสุดจากชีตมาเข้ารายการปริ้นป้ายใหม่ทับไปเลย
  const handleRestock = () => {
    oosClear(item.Barcode);
    addItem(previewFromBarcode(item.Barcode).item);
    closeScanSheet();
  };

  const handleReprintOos = () => {
    if (!oosRecord) return;
    addItem({ ...item, TagMode: 'oos', OosReason: oosRecord.reason, OosEta: oosRecord.eta });
    closeScanSheet();
  };

  if (oosRecord) {
    const days = Math.floor((Date.now() - oosRecord.since) / 86400000);
    return (
      <div className="dz-sheet-backdrop" onClick={closeScanSheet}>
        <div className="dz-picker" role="dialog" aria-label="สแกนเจอของที่หมดไว้" onClick={(e) => e.stopPropagation()}>
          <span className="dz-grabber" />
          <div className="dz-res-name">{item.ProductName}</div>
          <div className="dz-banner">
            หมดมา {days} วัน{oosRecord.eta ? ` · แจ้งของเข้า ${oosRecord.eta}` : ''}
          </div>
          <button type="button" className="dz-btn dz-btn-primary dz-btn-lg" onClick={handleRestock}>
            ของเข้าแล้ว
          </button>
          <button type="button" className="dz-btn" onClick={handleReprintOos}>
            ปริ้นป้ายหมดซ้ำ
          </button>
        </div>
      </div>
    );
  }

  const packLine = String(item.Price2 || '').trim() ? `${item.Unit2 || 'ยกลัง'} ${item.Price2}.-` : '';

  return (
    <div className="dz-sheet-backdrop" onClick={closeScanSheet}>
      <section className="dz-result" aria-label="ผลการสแกน" onClick={(e) => e.stopPropagation()}>
        <span className="dz-grabber" />

        {found ? (
          <div className="dz-res-head">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
              <div className="dz-res-name">{item.ProductName}</div>
              <div className="dz-mono">
                {item.Barcode}
                {item.Unit ? ` · ${item.Unit}` : ''}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <span className="dz-res-price">{item.Price}.-</span>
              {packLine && <span className="dz-res-pack">{packLine}</span>}
            </div>
          </div>
        ) : (
          <div className="dz-form">
            <div className="dz-head" style={{ fontSize: 18, color: 'var(--dz-err-tx)' }}>
              ไม่พบสินค้านี้ในชีต
            </div>
            <div className="dz-mono">บาร์โค้ด: {item.Barcode}</div>
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
              ราคา (บาท)
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
          </div>
        )}

        <div className="dz-prevbox">
          <TagPreview item={item} config={config} maxWidth={item.TagMode === 'large' ? 300 : 250} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span className="dz-label">
            อยากได้ป้ายแบบไหน <span style={{ color: '#71717a' }}>· ชิ้นต่อไปใช้แบบเดิม</span>
          </span>
          <div className="dz-types">
            {SCAN_TYPES.map((t) => (
              <button key={t.key} type="button" className="dz-type" aria-pressed={item.TagMode === t.key} onClick={() => setScanTagMode(t.key)}>
                <i style={{ background: t.color }} />
                {t.label}
              </button>
            ))}
            <button type="button" className="dz-type dashed" onClick={handleCustomize}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M4 20h4L19 9l-4-4L4 16z" />
              </svg>
              แก้คำบนป้าย
            </button>
          </div>
          {item.TagMode === 'flip' && <FlipMobileOptions item={item} />}
          {item.TagMode === 'fridge' && (
            <span className="fold-hint">
              {config.fridgeFill ? 'ถมขีดตามราคาให้แล้ว (ราคามีสตางค์ = เว้นว่างให้ระบาย)' : `ป้ายปริ้น 888 เปล่า — เอาเมจิกระบาย ${item.Price || '?'} บาท เอง`}
            </span>
          )}
          {item.TagMode === 'hamper' && (
            <span className="fold-hint">ป้ายพับ 2 หน้า แดง-เหลือง — กด "แก้คำบนป้าย" เพื่อแก้หัวป้าย / ของในกระเช้า / คำอวยพร / ราคาเดิม</span>
          )}
          {item.TagMode === 'dual' && !String(item.Price2 || '').trim() && (
            <span className="fold-hint">สินค้านี้ยังไม่มีราคาส่ง — กด "แก้คำบนป้าย" เพื่อกรอกราคาที่ 2</span>
          )}
        </div>

        <div className="dz-small-row">
          <button type="button" className="dz-small" aria-pressed={vegNow} onClick={() => updateScanSheetItem({ Veg: vegNow ? 'N' : 'Y' })}>
            <span style={{ fontFamily: "'Noto Serif SC', serif", color: '#fbbf24' }}>齋</span>เจ
          </button>
          <button
            type="button"
            className="dz-small"
            aria-pressed={locFormOpen}
            onClick={() => {
              setOosFormOpen(false);
              setLocFormOpen((v) => !v);
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" />
              <circle cx="12" cy="10" r="2.5" />
            </svg>
            {item.Loc ? `อยู่ชั้น ${item.Loc}` : 'อยู่ชั้น'}
          </button>
          <button
            type="button"
            className="dz-small"
            aria-pressed={oosFormOpen}
            onClick={() => {
              setLocFormOpen(false);
              setOosFormOpen((v) => !v);
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M5.6 5.6l12.8 12.8" />
            </svg>
            ของหมดแล้ว
          </button>
        </div>

        {locFormOpen && (
          <div className="dz-form">
            <span className="q-lbl">อยู่ชั้นไหน (เช่น A-3)</span>
            <input className="field-input" value={locValue} onChange={(e) => setLocValue(e.target.value)} placeholder="เช่น A-3" autoFocus />
            <div className="sheet-actions">
              <button type="button" className="dz-btn" onClick={() => setLocFormOpen(false)}>
                ยกเลิก
              </button>
              <button type="button" className="dz-btn dz-btn-primary" onClick={handleRegisterLoc}>
                บันทึกชั้น
              </button>
            </div>
          </div>
        )}

        {oosFormOpen && (
          <div className="dz-form">
            <span className="q-lbl">ของจะเข้าวันไหน (ข้ามได้)</span>
            <input className="field-input" value={oosEta} onChange={(e) => setOosEta(e.target.value)} placeholder="เช่น 18 ก.ย." />
            <div className="sheet-actions">
              <button type="button" className="dz-btn" onClick={() => setOosFormOpen(false)}>
                ยกเลิก
              </button>
              <button type="button" className="dz-btn dz-btn-primary" onClick={handleAddOosStrip}>
                ติดแถบของหมด
              </button>
            </div>
          </div>
        )}

        <div className="dz-bottom">
          <div role="group" aria-label="กี่ใบ" className="dz-stepper">
            <button type="button" aria-label="ลดจำนวน" onClick={() => stepQty(-1)}>
              −
            </button>
            <span>{item.PrintQty}</span>
            <button type="button" aria-label="เพิ่มจำนวน" onClick={() => stepQty(1)}>
              +
            </button>
          </div>
          <button type="button" className="dz-btn" onClick={handleAdd}>
            เก็บไว้ก่อน
          </button>
          <button type="button" className="dz-btn dz-btn-primary" onClick={handlePrintNow}>
            ปริ้นเลย
          </button>
        </div>
      </section>
    </div>
  );
}
