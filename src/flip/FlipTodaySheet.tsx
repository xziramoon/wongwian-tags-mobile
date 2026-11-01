import { useRef, useState } from 'react';
import { useUIStore } from '../store/uiStore';
import { fmtPrice } from '../lib/utils';
import { sendFlipStandalone } from './flipSend';
import { useFlipStore } from './store';
import type { TodayRow } from './data';
import { useFlipLists } from './useFlipLists';

/* ราคาเปลี่ยนวันนี้ (ดีไซน์ใหม่ 1f) — เดินเปลี่ยนแถบราคาบนชั้น: แถบ "เสร็จแล้ว X จาก N" · จัดกลุ่มตามล็อค
 * · ราคาเก่าขีดฆ่า → ใหม่ · ติ๊กเมื่อเปลี่ยนแล้ว · การ์ด "ของใหม่ยังไม่มีป้าย" ปริ้นตัวป้ายก่อนเสียบแถบ */
export default function FlipTodaySheet() {
  const open = useUIStore((s) => s.flipTodayOpen);
  const setOpen = useUIStore((s) => s.setFlipTodayOpen);
  const acknowledge = useFlipStore((s) => s.acknowledge);
  const { today, needTags } = useFlipLists();
  /* แถวที่ติ๊กเสร็จในรอบนี้ — เก็บไว้โชว์จางๆ ให้เห็นความคืบหน้า (หายเองเมื่อปิดหน้านี้) */
  const [done, setDone] = useState<TodayRow[]>([]);
  const doneKeys = useRef(new Set<string>());

  if (!open) return null;

  const key = (r: TodayRow) => `${r.kind}-${r.data.barcode}`;
  const pending = today.filter((r) => r.kind !== 'mismatch' && !doneKeys.current.has(key(r)));
  const warns = today.filter((r) => r.kind === 'mismatch');
  const all = [...done, ...pending];
  const doneCount = done.length;
  const total = doneCount + pending.length;
  const pct = total ? Math.round((doneCount / total) * 100) : 100;

  const markDone = (rows: TodayRow[]) => {
    rows.forEach((r) => doneKeys.current.add(key(r)));
    setDone((d) => [...d, ...rows]);
    acknowledge(rows);
  };
  const close = () => {
    setDone([]);
    doneKeys.current = new Set();
    setOpen(false);
  };

  /* จัดกลุ่มตามล็อค (ไม่มีล็อค = รวมไว้ท้าย) */
  const lots = new Map<string, TodayRow[]>();
  all.forEach((r) => {
    const lot = r.data.lot || '';
    lots.set(lot, [...(lots.get(lot) ?? []), r]);
  });
  const lotEntries = [...lots.entries()].sort(([a], [b]) => (a && !b ? -1 : !a && b ? 1 : a.localeCompare(b, 'th', { numeric: true })));

  return (
    <div className="dz-today" role="dialog" aria-label="ราคาเปลี่ยนวันนี้">
      <header className="dz-q-header" style={{ paddingBottom: 12 }}>
        <button type="button" className="dz-icon-btn" onClick={close} aria-label="กลับ">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </button>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <span className="dz-q-title">ราคาเปลี่ยนวันนี้</span>
          <span style={{ fontSize: 13, color: 'var(--dz-muted)' }}>
            {total ? `เดินไปเปลี่ยนแถบราคาบนชั้น ${total} อย่าง` : 'ไม่มีอะไรต้องเปลี่ยน'}
          </span>
        </div>
      </header>

      <div className="dz-progress">
        <div className="dz-progress-bar">
          <div style={{ width: `${pct}%` }} />
        </div>
        <span style={{ fontSize: 13, color: '#d4d4d8' }}>
          เสร็จแล้ว {doneCount} จาก {total}
        </span>
      </div>

      <div className="dz-today-body">
        {warns.map((r) => (
          <div key={key(r)} className="dz-item warn">
            <span className="dz-alert-ic">!</span>
            <span className="dz-item-main">
              <span className="dz-item-name">{r.data.name}</span>
              <span className="dz-item-note">ราคาสมาชิกกลุ่มไม่เท่ากัน: {r.warn} — แยกป้ายหรือแก้ราคา</span>
            </span>
          </div>
        ))}

        {total === 0 && warns.length === 0 && <div className="dz-empty">ราคาบนชั้นตรงกับชีตทุกอย่าง ✓</div>}

        {lotEntries.map(([lot, rows]) => (
          <section key={lot || 'none'} className="dz-lot">
            <span className="dz-lot-head">
              {lot ? <b>ล็อค {lot}</b> : <b>ไม่ระบุล็อค</b>}
            </span>
            {rows.map((r) => {
              const isDone = doneKeys.current.has(key(r));
              return (
                <label key={key(r)} className={`dz-item${isDone ? ' done' : ''}`}>
                  <input type="checkbox" checked={isDone} disabled={isDone} onChange={() => markDone([r])} aria-label={`เปลี่ยนแล้ว ${r.data.name}`} />
                  <span className="dz-item-main">
                    <span className="dz-item-name">{r.data.name}</span>
                    <span className="dz-item-note">
                      {isDone ? 'เปลี่ยนแล้ว' : r.kind === 'printed' ? 'ปริ้นแถบแล้ว รอไปเสียบ' : 'ยังไม่ได้ปริ้นแถบ'}
                      {r.newPack !== r.oldPack && r.newPack ? ` · ${r.newPack}` : ''}
                    </span>
                  </span>
                  <span style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    {r.oldPrice && <span className="dz-old">{fmtPrice(r.oldPrice)}</span>}
                    <span className="dz-new">{fmtPrice(r.newPrice)}</span>
                  </span>
                </label>
              );
            })}
          </section>
        ))}

        {needTags.length > 0 && (
          <div className="dz-newtag">
            <span className="main">
              <span style={{ fontSize: 15, fontWeight: 500 }}>ของใหม่ยังไม่มีป้าย</span>
              <span style={{ fontSize: 12, color: 'var(--dz-muted)' }}>{needTags.length} อย่าง ต้องปริ้นตัวป้ายก่อนเสียบแถบ</span>
            </span>
            <button
              type="button"
              className="dz-btn"
              style={{ minHeight: 40, borderColor: '#ff4d3d', color: '#ff6b5e', fontSize: 14 }}
              onClick={() => sendFlipStandalone('tags', needTags.map((r) => r.data))}
            >
              ปริ้น {needTags.length} ใบ
            </button>
          </div>
        )}
      </div>

      <div className="dz-today-foot">
        <button type="button" className="dz-btn" style={{ fontSize: 15 }} disabled={!pending.length} onClick={() => markDone(pending)}>
          เปลี่ยนครบแล้ว
        </button>
        <button
          type="button"
          className="dz-btn dz-btn-primary"
          style={{ fontSize: 17 }}
          disabled={!pending.length}
          onClick={() => sendFlipStandalone('strips', pending.map((r) => r.data))}
        >
          ปริ้นแถบที่เหลือ {pending.length}
        </button>
      </div>
    </div>
  );
}
