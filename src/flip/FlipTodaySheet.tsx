import { useUIStore } from '../store/uiStore';
import { fmtPrice } from '../lib/utils';
import { sendFlipStandalone } from './flipSend';
import { useFlipStore } from './store';
import { useFlipLists } from './useFlipLists';

/* รายการป้ายดำแดงที่ต้องทำวันนี้ — เดินชั้นพร้อมมือถือ: ติ๊ก "เปลี่ยนแล้ว", ส่งพิมพ์แถบทั้งหมด, ส่งตัวป้ายถาวรที่ขาด */
export default function FlipTodaySheet() {
  const open = useUIStore((s) => s.flipTodayOpen);
  const setOpen = useUIStore((s) => s.setFlipTodayOpen);
  const acknowledge = useFlipStore((s) => s.acknowledge);
  const { today, needTags } = useFlipLists();
  if (!open) return null;

  const stripRows = today.filter((r) => r.kind !== 'mismatch');

  return (
    <div className="sheet-backdrop" onClick={() => setOpen(false)}>
      <div className="sheet sheet-full" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="queue-drawer-header">
          <span>ป้ายดำแดง · ต้องเปลี่ยนวันนี้</span>
          <button type="button" className="sheet-close" onClick={() => setOpen(false)} aria-label="ปิด">
            ✕
          </button>
        </div>

        <div className="panel">
          <div className="p-lbl">ต้องเปลี่ยนวันนี้ — {today.length}</div>
          {today.length === 0 ? (
            <span className="fold-hint">ราคาบนชั้นตรงกับชีตทุกรายการ ✓</span>
          ) : (
            <>
              {today.map((r) => (
                <label key={`${r.kind}-${r.data.barcode}`} className={`flip-row-line${r.kind === 'mismatch' ? ' warn' : ''}`}>
                  {r.kind === 'mismatch' ? (
                    <span>⚠</span>
                  ) : (
                    <input type="checkbox" onChange={() => acknowledge([r])} aria-label="เปลี่ยนแล้ว" />
                  )}
                  <div className="flip-row-main">
                    <div className="flip-row-name">{r.data.name}</div>
                    <div className="flip-row-sub">
                      {r.data.lot && <b>ล็อค {r.data.lot} · </b>}
                      {r.kind === 'printed' ? 'พิมพ์แล้ว รอเปลี่ยน · ' : ''}
                      {r.kind === 'mismatch' ? (
                        <b>ราคาสมาชิกกลุ่มไม่เท่ากัน: {r.warn} — แยกป้ายหรือแก้ราคา</b>
                      ) : r.oldPrice ? (
                        <>
                          {fmtPrice(r.oldPrice)} → <b>{fmtPrice(r.newPrice)}</b>
                        </>
                      ) : (
                        <b>{fmtPrice(r.newPrice)}</b>
                      )}
                      {r.newPack !== r.oldPack && r.newPack && <> · {r.newPack}</>}
                    </div>
                  </div>
                </label>
              ))}
              <div className="sheet-actions">
                <button type="button" className="btn btn-primary" disabled={!stripRows.length} onClick={() => sendFlipStandalone('strips', stripRows.map((r) => r.data))}>
                  📡 ส่งแถบทั้งหมด ({stripRows.length})
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => acknowledge(today)}>
                  ✓ เปลี่ยนแล้วทั้งหมด
                </button>
              </div>
            </>
          )}
        </div>

        <div className="panel">
          <div className="p-lbl">ต้องพิมพ์ตัวป้ายถาวร — {needTags.length}</div>
          {needTags.length === 0 ? (
            <span className="fold-hint">ตัวป้ายถาวรครบทุกสินค้า ✓</span>
          ) : (
            <>
              {needTags.map((r) => (
                <div key={r.data.barcode} className="flip-row-line">
                  <div className="flip-row-main">
                    <div className="flip-row-name">{r.data.name}</div>
                    <div className="flip-row-sub">
                      {r.data.lot && <b>ล็อค {r.data.lot} · </b>}
                      {r.reason}
                    </div>
                  </div>
                </div>
              ))}
              <button type="button" className="btn btn-primary btn-block" onClick={() => sendFlipStandalone('tags', needTags.map((r) => r.data))}>
                📡 ส่งตัวป้าย ({needTags.length})
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
