import type { TypeCount } from '../lib/tagTypes';

/* แถบสีสรุปแบบป้าย — ความกว้างแต่ละสีเป็นสัดส่วนตามจำนวนใบ (ดีไซน์: หน้าแรก / หน้ารายการ / หน้านับถอยหลัง) */
export default function TypeBar({ types, legend = false, height }: { types: TypeCount[]; legend?: boolean; height?: number }) {
  if (!types.length) return null;
  return (
    <>
      <div className="dz-typebar" style={height ? { height } : undefined} role="img" aria-label={types.map((t) => `${t.def.label} ${t.count} ใบ`).join(' · ')}>
        {types.map((t) => (
          <span key={t.def.key} style={{ flex: t.count, background: t.def.color }} />
        ))}
      </div>
      {legend && (
        <div className="dz-legend">
          {types.map((t) => (
            <span key={t.def.key}>
              <span className="dz-swatch" style={{ background: t.def.color }} />
              {t.def.label} {t.count}
            </span>
          ))}
        </div>
      )}
    </>
  );
}
