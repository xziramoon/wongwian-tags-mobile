import { useState } from 'react';
import { useQueueStore, previewFromBarcode } from '../store/queueStore';
import { useUIStore } from '../store/uiStore';
import { useOosStore } from '../store/oosStore';
import { summarizeByType, totalTags, typeDef } from '../lib/tagTypes';
import { usePaperSheets } from '../lib/usePaper';
import type { TagMode } from '../types';
import PrinterOfflineBar from './PrinterOfflineBar';
import TypeBar from './TypeBar';
import { IconPrinter, IconTrash, IconUndo } from './Icons';

const OOS_WARN_DAYS = 14;

/* หน้า "ป้ายที่รอปริ้น" (ดีไซน์ใหม่ 1d) — แท็บ รอปริ้น / ของหมด / ปริ้นไปแล้ว · กรองตามแบบ · แถวมีแถบสีประจำแบบ + ราคา + ×จำนวน
 * ล่าง: ปริ้นทั้งหมด N ใบ + ใช้กระดาษกี่แผ่น · แตะชื่อเพื่อแก้ */
export default function QueueDrawer() {
  const open = useUIStore((s) => s.queueDrawerOpen);
  const setOpen = useUIStore((s) => s.setQueueDrawerOpen);
  const openTagEditForIndex = useUIStore((s) => s.openTagEditForIndex);
  const sending = useUIStore((s) => s.sending);
  const queue = useQueueStore((s) => s.queue);
  const changeQty = useQueueStore((s) => s.changeQty);
  const remove = useQueueStore((s) => s.remove);
  const clearQueue = useQueueStore((s) => s.clearQueue);
  const requestSend = useQueueStore((s) => s.requestSend);
  const pendingSendAt = useQueueStore((s) => s.pendingSendAt);
  const addItem = useQueueStore((s) => s.addItem);
  const history = useQueueStore((s) => s.history);
  const restoreFromHistory = useQueueStore((s) => s.restoreFromHistory);
  const removeHistory = useQueueStore((s) => s.removeHistory);
  const clearHistory = useQueueStore((s) => s.clearHistory);
  const oosRecords = useOosStore((s) => s.records);
  const oosClear = useOosStore((s) => s.clear);
  const tab = useUIStore((s) => s.queueDrawerTab);
  const setTab = useUIStore((s) => s.setQueueDrawerTab);
  const paper = usePaperSheets();
  const [filter, setFilter] = useState<TagMode | 'all'>('all');

  if (!open) return null;

  const oosList = Object.values(oosRecords).sort((a, b) => a.since - b.since);
  const total = totalTags(queue);
  const types = summarizeByType(queue);
  const rows = queue.map((item, index) => ({ item, index })).filter((r) => filter === 'all' || r.item.TagMode === filter);

  const handleSendAll = () => {
    requestSend();
    setOpen(false); // ปิดหน้ารายการให้เห็นหน้านับถอยหลัง/ปุ่มยกเลิกชัด ๆ
  };

  // แตะชื่อ/ราคาแถว = เปิดหน้าแก้ป้ายของแถวนั้น — ปิดหน้ารายการก่อน เปิดกลับมาจะเห็นค่าที่แก้ชัด
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

  const rowMeta = (i: (typeof queue)[number]) =>
    i.TagMode === 'fridge'
      ? i.ProductName
        ? 'เขียนราคาเอง'
        : 'ไม่มีชื่อสินค้า'
      : i.Loc
        ? `อยู่ชั้น ${i.Loc}`
        : i.Veg === 'Y'
          ? 'ติดธงเจ'
          : i.TagMode === 'dual' && String(i.Price2 || '').trim()
            ? `${i.Unit2 || 'ยกลัง'}ละ ${i.Price2}.-`
            : '';

  return (
    <div className="dz-queue" role="dialog" aria-label="ป้ายที่รอปริ้น">
      <header className="dz-q-header">
        <button type="button" className="dz-icon-btn" onClick={() => setOpen(false)} aria-label="กลับ">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </button>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <span className="dz-q-title">ป้ายที่รอปริ้น</span>
          <span style={{ fontSize: 13, color: 'var(--dz-muted)' }}>
            {total} ใบ{total > 0 ? ` · ใช้กระดาษ ${paper} แผ่น` : ''}
          </span>
        </div>
        {tab === 'queue' && queue.length > 0 && (
          <button
            type="button"
            className="dz-mini-btn"
            style={{ height: 40, color: '#d4d4d8' }}
            onClick={() => {
              if (confirm('ลบป้ายที่รอปริ้นทั้งหมด?')) clearQueue();
            }}
          >
            ลบทั้งหมด
          </button>
        )}
      </header>

      <PrinterOfflineBarSlot />

      <div className="dz-tabs" role="tablist" aria-label="มุมมอง">
        <button type="button" role="tab" className="dz-tab" aria-selected={tab === 'queue'} onClick={() => setTab('queue')}>
          รอปริ้น
        </button>
        <button type="button" role="tab" className="dz-tab" aria-selected={tab === 'oos'} onClick={() => setTab('oos')}>
          ของหมด {oosList.length}
        </button>
        <button type="button" role="tab" className="dz-tab" aria-selected={tab === 'history'} onClick={() => setTab('history')}>
          ปริ้นไปแล้ว
        </button>
      </div>

      {tab === 'queue' && types.length > 1 && (
        <div className="dz-filters">
          <button type="button" className="dz-chip" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>
            ทั้งหมด
          </button>
          {types.map((t) => (
            <button key={t.def.key} type="button" className="dz-chip" aria-pressed={filter === t.def.key} onClick={() => setFilter(t.def.key)}>
              <span className="dz-swatch" style={{ background: t.def.color }} />
              {t.def.label} {t.count}
            </button>
          ))}
        </div>
      )}

      {tab === 'queue' ? (
        queue.length === 0 ? (
          <div className="dz-list">
            <div className="dz-empty">ยังไม่มีป้ายที่รอปริ้น — สแกนสินค้าเพื่อเริ่ม</div>
          </div>
        ) : (
          <ul className="dz-list">
            {rows.map(({ item, index }) => {
              const def = typeDef(item.TagMode);
              const meta = rowMeta(item);
              return (
                <li className="dz-row" key={`${item.Barcode}-${index}`}>
                  <button type="button" className="dz-row-main" onClick={() => handleEditRow(index)} aria-label={`แก้ป้าย ${item.ProductName || 'ป้ายตู้แช่เปล่า'}`}>
                    <span className="dz-row-name">{item.ProductName || 'ป้ายตู้แช่เปล่า'}</span>
                    <span className="dz-row-meta">
                      <span className="ty">
                        <span className="dz-swatch" style={{ background: def.color }} />
                        {def.label}
                      </span>
                      {meta && <span>{meta}</span>}
                    </span>
                  </button>
                  <span className="dz-row-price">{item.TagMode === 'fridge' && !item.ProductName ? '888' : item.TagMode === 'fridge' ? item.Price || '—' : item.Price}</span>
                  <span className="dz-qty">
                    <button type="button" aria-label="ลดจำนวน" onClick={() => changeQty(index, -1)}>
                      −
                    </button>
                    <span>{item.PrintQty}</span>
                    <button type="button" aria-label="เพิ่มจำนวน" onClick={() => changeQty(index, 1)}>
                      +
                    </button>
                  </span>
                  <button type="button" className="dz-row-del" onClick={() => remove(index)} aria-label="ลบป้ายนี้">
                    <IconTrash size={18} />
                  </button>
                </li>
              );
            })}
          </ul>
        )
      ) : tab === 'history' ? (
        <ul className="dz-list">
          {history.length === 0 && <li className="dz-empty">ยังไม่เคยปริ้น</li>}
          {history.map((h) => {
            const d = new Date(h.ts);
            const when = `${d.getDate()}/${d.getMonth() + 1} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
            const preview = h.items.slice(0, 3).map((i) => i.ProductName || 'ป้ายตู้แช่เปล่า').join(', ');
            return (
              <li className="dz-row" key={h.id}>
                <div className="dz-row-main" style={{ cursor: 'default' }}>
                  <span className="dz-row-name">
                    {when} · {totalTags(h.items)} ใบ
                  </span>
                  <span className="dz-row-meta">
                    {h.restoredAt ? 'เอากลับมาแล้ว · ' : ''}
                    {preview}
                    {h.items.length > 3 ? ' ...' : ''}
                  </span>
                </div>
                <button
                  type="button"
                  className="dz-mini-btn"
                  disabled={!!h.restoredAt}
                  onClick={() => {
                    restoreFromHistory(h.id);
                    setTab('queue');
                  }}
                  aria-label="เอากลับมา"
                >
                  <IconUndo size={16} />
                </button>
                <button type="button" className="dz-row-del" onClick={() => removeHistory(h.id)} aria-label="ลบรายการนี้">
                  <IconTrash size={18} />
                </button>
              </li>
            );
          })}
          {history.length > 0 && (
            <li>
              <button type="button" className="dz-btn" style={{ width: '100%' }} onClick={clearHistory}>
                ล้างรายการที่ปริ้นไปแล้วทั้งหมด
              </button>
            </li>
          )}
        </ul>
      ) : (
        <ul className="dz-list">
          {oosList.length === 0 && <li className="dz-empty">ยังไม่มีสินค้าที่ลงทะเบียนว่าหมด</li>}
          {oosList.map((rec) => {
            const days = Math.floor((Date.now() - rec.since) / 86400000);
            const warn = days > OOS_WARN_DAYS;
            return (
              <li className="dz-row" key={rec.Barcode} style={warn ? { borderColor: 'var(--dz-primary)' } : undefined}>
                <div className="dz-row-main" style={{ cursor: 'default' }}>
                  <span className="dz-row-name">{rec.ProductName}</span>
                  <span className="dz-row-meta" style={warn ? { color: 'var(--dz-err-tx)' } : undefined}>
                    หมดมา {days} วัน{rec.eta ? ` · แจ้งของเข้า ${rec.eta}` : ''}
                  </span>
                </div>
                <button type="button" className="dz-mini-btn" onClick={() => handleReprintStrip(rec.Barcode)} aria-label="ปริ้นแถบหมดซ้ำ">
                  <IconPrinter size={16} />
                </button>
                <button type="button" className="dz-row-del" onClick={() => oosClear(rec.Barcode)} aria-label="ลบออกจากรายการของหมด">
                  <IconTrash size={18} />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {tab === 'queue' && (
        <div className="dz-q-foot">
          <TypeBar types={types} height={8} />
          <button type="button" className="dz-btn dz-btn-primary dz-btn-lg" onClick={handleSendAll} disabled={!queue.length || sending || !!pendingSendAt}>
            <IconPrinter size={22} />
            {sending ? 'กำลังส่ง...' : `ปริ้นทั้งหมด ${total} ใบ`}
          </button>
          {queue.length > 0 && <div className="dz-foot-note">ใช้กระดาษ {paper} แผ่น · แตะชื่อเพื่อแก้</div>}
        </div>
      )}
    </div>
  );
}

/* แถบแดงเครื่องปริ้นหลุดในหน้ารายการ — เว้นระยะข้างให้ตรงกับขอบหน้า */
function PrinterOfflineBarSlot() {
  return (
    <div style={{ padding: '0 16px' }}>
      <PrinterOfflineBar compact />
    </div>
  );
}

