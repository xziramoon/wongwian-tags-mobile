import { useMemo, useState } from 'react';
import { database } from '../lib/database';
import { fmtPrice } from '../lib/utils';
import { useUIStore } from '../store/uiStore';
import { GROUP_DEFAULTS, fontStack } from './config';
import { fromGroup, groupPrices, last4, type FlipGroup } from './data';
import { groupOverflow } from './fit';
import { sendFlipStandalone } from './flipSend';
import { useFlipSettings, useFlipStore } from './store';

const newId = () => `g${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

function GroupCard({ g, dbVersion }: { g: FlipGroup; dbVersion: number }) {
  const settings = useFlipSettings();
  const upsertGroup = useFlipStore((s) => s.upsertGroup);
  const removeGroup = useFlipStore((s) => s.removeGroup);
  const showToast = useUIStore((s) => s.showToast);
  const [q, setQ] = useState('');

  const update = (patch: Partial<FlipGroup>) => upsertGroup({ ...g, ...patch });
  /* eslint-disable react-hooks/exhaustive-deps */
  const gp = useMemo(() => groupPrices(g), [g, dbVersion]);
  const overflow = useMemo(() => groupOverflow(g, fontStack(settings.font)), [g, settings.font]);
  const results = useMemo(() => (q.trim() ? database.search(q) : []), [q, dbVersion]);
  /* eslint-enable react-hooks/exhaustive-deps */

  const addMember = (barcode: string, name: string) => {
    if (g.members.some((m) => m.barcode === barcode)) {
      showToast('สินค้านี้อยู่ในกลุ่มแล้ว', 'error');
      return;
    }
    update({ members: [...g.members, { barcode, label: name.slice(0, 16) }] });
    setQ('');
  };
  const onEnter = () => {
    const exact = database.find(q.trim());
    if (exact) addMember(exact.Barcode, exact.ProductName);
    else if (results[0]) addMember(results[0].Barcode, results[0].ProductName);
  };

  const data = [fromGroup(g, 1)];

  return (
    <div className="flip-grp">
      <span className="cfg-lbl">ชื่อกลุ่ม</span>
      <input className="field-input" value={g.name} onChange={(e) => update({ name: e.target.value })} />
      <div className="flip-kind-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div>
          <span className="cfg-lbl">ขนาด</span>
          <input className="field-input" value={g.size} onChange={(e) => update({ size: e.target.value })} placeholder="เช่น ขวด 20 มล." />
        </div>
        <div>
          <span className="cfg-lbl">ความกว้าง</span>
          <select className="field-input" value={g.slots} onChange={(e) => update({ slots: Number(e.target.value) })}>
            {Array.from({ length: GROUP_DEFAULTS.maxSlots - GROUP_DEFAULTS.minSlots + 1 }, (_, i) => GROUP_DEFAULTS.minSlots + i).map((n) => (
              <option key={n} value={n}>
                {n} ช่อง ({n * 45} มม.)
              </option>
            ))}
          </select>
        </div>
      </div>
      <span className="cfg-lbl">คำมุมขวาหัวป้าย</span>
      <input className="field-input" value={g.corner} onChange={(e) => update({ corner: e.target.value })} />

      <span className="cfg-lbl">สมาชิก (กลิ่น/สี) — {g.members.length} รายการ</span>
      {g.members.map((m) => {
        const p = database.find(m.barcode);
        return (
          <div key={m.barcode} className="flip-grp-member">
            <input
              className="field-input"
              value={m.label}
              onChange={(e) => update({ members: g.members.map((x) => (x.barcode === m.barcode ? { ...x, label: e.target.value } : x)) })}
              title="ชื่อกลิ่นแบบสั้น"
            />
            <span className="flip-grp-code" title={m.barcode}>
              …{last4(m.barcode)}
            </span>
            <span className="flip-grp-price">{p?.Price ? fmtPrice(p.Price) : 'ไม่พบ'}</span>
            <button type="button" className="flip-x" title="เอาออกจากกลุ่ม" onClick={() => update({ members: g.members.filter((x) => x.barcode !== m.barcode) })}>
              ✕
            </button>
          </div>
        );
      })}
      <input
        className="field-input"
        value={q}
        inputMode="search"
        placeholder="พิมพ์บาร์โค้ด หรือค้นหาชื่อสินค้า แล้วกด Enter"
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onEnter()}
      />
      {results.length > 0 && (
        <div className="flip-results">
          {results.slice(0, 6).map((p) => (
            <button type="button" key={p.Barcode} onClick={() => addMember(p.Barcode, p.ProductName)}>
              {p.ProductName} <small>…{last4(p.Barcode)}</small>
            </button>
          ))}
        </div>
      )}

      {gp.mismatch && <div className="flip-warn">⚠ ราคาสมาชิกไม่เท่ากัน ({gp.prices.map(fmtPrice).join(' / ')}) — แยกป้าย หรือแก้ราคาให้เท่ากัน</div>}
      {overflow && <div className="flip-warn">⚠ กล่องชื่อกลิ่นเกินพื้นที่ — เพิ่มความกว้างกลุ่ม หรือย่อชื่อกลิ่น</div>}
      {!g.members.length && <div className="flip-warn">ยังไม่มีสมาชิกในกลุ่ม</div>}
      <span className="fold-hint">
        ราคากลุ่ม: <b>{gp.price ? `${fmtPrice(gp.price)} บาท` : '—'}</b> (ดึงจากสมาชิก) · หมดกลิ่นเดียว = แปะสติกเกอร์ "หมด" · หมดทั้งกลุ่ม = พลิกแถบ
      </span>

      <div className="flip-kind-row">
        <button type="button" className="btn btn-secondary" onClick={() => sendFlipStandalone('tags', data)}>
          📡 ป้ายกลุ่ม
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => sendFlipStandalone('strips', data)}>
          📡 แถบราคา
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => sendFlipStandalone('both', data)}>
          📡 ทั้งคู่
        </button>
      </div>
      <button
        type="button"
        className="btn btn-secondary btn-block"
        onClick={() => {
          if (confirm(`ลบกลุ่ม "${g.name}" ?`)) removeGroup(g.id);
        }}
      >
        ✕ ลบกลุ่มนี้
      </button>
    </div>
  );
}

/* จัดการกลุ่มสินค้า (สเปกข้อ 12.3): แบรนด์/ขนาด/ราคาเดียวกัน หลายกลิ่น → ป้ายกลุ่ม 1 ใบ */
export default function FlipGroupsMobile({ dbVersion }: { dbVersion: number }) {
  const groups = useFlipStore((s) => s.groups);
  const upsertGroup = useFlipStore((s) => s.upsertGroup);
  return (
    <div className="panel">
      <div className="p-lbl">กลุ่มสินค้า (ป้ายกลุ่ม) — {groups.length} กลุ่ม</div>
      {groups.length === 0 && (
        <span className="fold-hint">สินค้าชิ้นเล็กวางติดกัน แบรนด์/ขนาด/ราคาเดียวกันหลายกลิ่น → รวมเป็นป้ายกลุ่มใบเดียว (กว้าง n × 45 มม.)</span>
      )}
      {groups.map((g) => (
        <GroupCard key={g.id} g={g} dbVersion={dbVersion} />
      ))}
      <button
        type="button"
        className="btn btn-secondary btn-block"
        onClick={() =>
          upsertGroup({ id: newId(), name: 'กลุ่มใหม่', size: '', corner: GROUP_DEFAULTS.corner, slots: GROUP_DEFAULTS.slots, members: [] })
        }
      >
        + สร้างกลุ่มใหม่
      </button>
    </div>
  );
}
