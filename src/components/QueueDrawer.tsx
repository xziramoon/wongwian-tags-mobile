import { useState } from 'react';
import { useQueueStore, previewFromBarcode } from '../store/queueStore';
import { useUIStore } from '../store/uiStore';
import { useOosStore } from '../store/oosStore';

const OOS_WARN_DAYS = 14;

/* full queue list — qty +/-, remove, and the single "send all" publish action.
 * Phase 2 adds a second tab listing the OOS registry (oosStore) alongside the print
 * queue, since both are "things waiting on this scan session" from the user's POV
 * even though they're backed by separate stores. */
export default function QueueDrawer() {
  const open = useUIStore((s) => s.queueDrawerOpen);
  const setOpen = useUIStore((s) => s.setQueueDrawerOpen);
  const openTagEditForIndex = useUIStore((s) => s.openTagEditForIndex);
  const sending = useUIStore((s) => s.sending);
  const queue = useQueueStore((s) => s.queue);
  const changeQty = useQueueStore((s) => s.changeQty);
  const remove = useQueueStore((s) => s.remove);
  const sendQueue = useQueueStore((s) => s.sendQueue);
  const addItem = useQueueStore((s) => s.addItem);
  const oosRecords = useOosStore((s) => s.records);
  const oosClear = useOosStore((s) => s.clear);

  const [tab, setTab] = useState<'queue' | 'oos'>('queue');

  if (!open) return null;

  const oosList = Object.values(oosRecords).sort((a, b) => a.since - b.since);

  const handleSendAll = () => {
    void sendQueue();
  };

  // tapping a row's name/price opens TagEditSheet in edit mode for that index —
  // close the drawer first so reopening it afterward clearly shows the saved change
  // (qty +/- and remove are separate sibling elements, untouched, no stopPropagation needed)
  const handleEditRow = (index: number) => {
    setOpen(false);
    openTagEditForIndex(index);
  };

  const handleReprintStrip = (barcode: string) => {
    const rec = oosRecords[barcode];
    if (!rec) return;
    const base = previewFromBarcode(barcode).item;
    addItem({ ...base, ProductName: rec.ProductName || base.ProductName, TagMode: 'oos', OosReason: rec.reason, OosEta: rec.eta });
  };

  return (
    <div className="sheet-backdrop" onClick={() => setOpen(false)}>
      <div className="sheet queue-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="queue-drawer-header">
          <span>คิวป้ายราคา ({queue.length})</span>
          <button type="button" className="sheet-close" onClick={() => setOpen(false)} aria-label="ปิด">
            ✕
          </button>
        </div>

        <div className="queue-tabs">
          <button
            type="button"
            className={`queue-tab${tab === 'queue' ? ' active' : ''}`}
            onClick={() => setTab('queue')}
          >
            คิวพิมพ์ ({queue.length})
          </button>
          <button type="button" className={`queue-tab${tab === 'oos' ? ' active' : ''}`} onClick={() => setTab('oos')}>
            สินค้าหมด ({oosList.length})
          </button>
        </div>

        {tab === 'queue' ? (
          queue.length === 0 ? (
            <div className="queue-empty">ยังไม่มีรายการในคิว</div>
          ) : (
            <div className="queue-list">
              {queue.map((item, index) => (
                <div className="queue-row" key={`${item.Barcode}-${index}`}>
                  <div
                    className="queue-row-info"
                    role="button"
                    tabIndex={0}
                    onClick={() => handleEditRow(index)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') handleEditRow(index);
                    }}
                  >
                    <div className="queue-row-name">
                      {item.Loc && <span className="queue-row-loc">{item.Loc}</span>}
                      {item.ProductName}
                    </div>
                    <div className="queue-row-price">{item.Price} บาท</div>
                  </div>
                  <div className="queue-row-qty">
                    <button type="button" className="qty-btn" onClick={() => changeQty(index, -1)} aria-label="ลดจำนวน">
                      −
                    </button>
                    <span className="qty-value">{item.PrintQty}</span>
                    <button type="button" className="qty-btn" onClick={() => changeQty(index, 1)} aria-label="เพิ่มจำนวน">
                      +
                    </button>
                  </div>
                  <button type="button" className="queue-row-remove" onClick={() => remove(index)} aria-label="ลบรายการ">
                    🗑
                  </button>
                </div>
              ))}
            </div>
          )
        ) : oosList.length === 0 ? (
          <div className="queue-empty">ยังไม่มีสินค้าหมดในทะเบียน</div>
        ) : (
          <div className="oos-list">
            {oosList.map((rec) => {
              const days = Math.floor((Date.now() - rec.since) / 86400000);
              const warn = days > OOS_WARN_DAYS;
              return (
                <div className={`oos-row${warn ? ' oos-row-warn' : ''}`} key={rec.Barcode}>
                  <div className="oos-row-info">
                    <div className="oos-row-name">{rec.ProductName}</div>
                    <div className="oos-row-meta">
                      หมดมา {days} วัน{rec.eta ? ` · แจ้งของเข้า ${rec.eta}` : ''}
                    </div>
                  </div>
                  <div className="oos-row-actions">
                    <button
                      type="button"
                      className="oos-row-btn"
                      onClick={() => handleReprintStrip(rec.Barcode)}
                      aria-label="พิมพ์แถบซ้ำ"
                      title="พิมพ์แถบซ้ำ"
                    >
                      🖨
                    </button>
                    <button
                      type="button"
                      className="oos-row-btn"
                      onClick={() => oosClear(rec.Barcode)}
                      aria-label="ลบออกจากทะเบียน"
                      title="ลบออกจากทะเบียน"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === 'queue' && (
          <div className="sheet-actions">
            <button
              type="button"
              className="btn btn-primary btn-block"
              onClick={handleSendAll}
              disabled={!queue.length || sending}
            >
              {sending ? 'กำลังส่ง...' : 'ส่งทั้งหมด'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
