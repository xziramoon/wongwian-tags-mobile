import type { CSSProperties } from 'react';
import { fitWidth, useFontsTick } from '../flip/fit';
import { cnRed, cnVariant, nameSizeFor, priceSizeFor, type CnSignSettings, type CnVariant } from './config';
import type { CnSignData } from './data';

const mm = (n: number) => `${n.toFixed(2)}mm`;

/* ป้ายจีน A4 — โครงและชื่อ class ตรงกับตัวรับ public/TAG_PRINTER.html (cnSignHTML) · สไตล์อยู่ใน styles/tag-cnsign.css */
function Name({ v, d }: { v: CnVariant; d: CnSignData }) {
  return (
    <div className="cn-name" style={{ fontSize: mm(nameSizeFor(v, d.name)) }}>
      {d.name}
    </div>
  );
}

function Price({ d, size, unit }: { d: CnSignData; size: number; unit: string }) {
  return (
    <div className="cn-priceblk">
      <div className="cn-pw">
        <div className="cn-num" style={{ fontSize: mm(size) }}>
          {d.price}
        </div>
        <div className="cn-baht">{unit}</div>
      </div>
    </div>
  );
}

/* บรรทัดยกลัง: แถบตั้ง/แผ่นป้ายแนวตั้ง = แถวเดียว · แผ่นป้ายแนวนอน = 2 บรรทัด */
function Pack({ d, unit }: { d: CnSignData; unit: string }) {
  if (!d.packPrice) return null;
  return (
    <div className="cn-pack">
      <div className="cn-pack-l">{d.packLabel}</div>
      <div className="cn-pack-r">
        <span className="cn-pack-p">{d.packPrice}</span>
        <span className="cn-pack-b">{unit}</span>
      </div>
    </div>
  );
}

function Foot({ d }: { d: CnSignData }) {
  return (
    <div className="cn-foot">
      <span>{d.branch}</span>
      <span className="cn-foot-bc">{d.barcode}</span>
    </div>
  );
}

export function CnSignTag({ data: d, settings: s, className }: { data: CnSignData; settings: CnSignSettings; className?: string }) {
  useFontsTick("'Potta One'", "'Noto Serif SC'", "'Kanit'");
  const v = cnVariant(d.style, d.orient);
  const size = priceSizeFor(v, d.name, d.price, fitWidth);
  const wrap = `cn cn-${v} ${d.orient === 'portrait' ? 'cn-p' : 'cn-l'}${s.mono ? ' cn-mono' : ''}${className ? ` ${className}` : ''}`;
  const style = { '--cn-red': cnRed(s) } as CSSProperties;
  const price = <Price d={d} size={size} unit={s.unit} />;
  const head = (
    <div className="cn-head">
      <Name v={v} d={d} />
      {d.size && <div className="cn-size">{d.size}</div>}
    </div>
  );

  if (d.style === 'strip') {
    return (
      <div className={wrap} style={style}>
        <div className="cn-side">
          <div className="cn-plate">
            {Array.from(s.shopCn).map((ch, i) => (
              <span key={i}>{ch}</span>
            ))}
          </div>
          <div className="cn-shopv">{s.shopTh}</div>
          <div className="cn-grow" />
          <div className="cn-dash" />
          <div className="cn-cornerv">{s.corner}</div>
        </div>
        <div className="cn-main">
          {head}
          {price}
          <Pack d={d} unit={s.unit} />
          <Foot d={d} />
        </div>
      </div>
    );
  }

  const header = (
    <div className="cn-ph">
      <div className="cn-ph-plate">
        <div className="cn-ph-plate-in">{s.shopCn}</div>
      </div>
      <div className="cn-ph-shop">{s.shopTh}</div>
      <div className="cn-ph-corner">{s.corner}</div>
    </div>
  );

  if (d.orient === 'portrait') {
    return (
      <div className={wrap} style={style}>
        {header}
        {head}
        {price}
        <Pack d={d} unit={s.unit} />
        <Foot d={d} />
      </div>
    );
  }

  /* plaque-l: ซ้าย = ข้อมูล (ชื่อ ขนาด ยกลัง 2 บรรทัด ท้ายป้าย) · ขวา = ราคา */
  return (
    <div className={wrap} style={style}>
      {header}
      <div className="cn-pbody">
        <div className="cn-pl-left">
          <div className="cn-pl-info">
            <Name v={v} d={d} />
            {d.size && <div className="cn-size">{d.size}</div>}
          </div>
          <div className="cn-grow" />
          {d.packPrice && (
            <div className="cn-pack cn-pack2">
              <div className="cn-pack-l">{d.packLabel}</div>
              <div className="cn-pack-r">
                <span className="cn-pack-p">{d.packPrice}</span>
                <span className="cn-pack-b">{s.unit}</span>
              </div>
            </div>
          )}
          <Foot d={d} />
        </div>
        <div className="cn-pl-right">
          <div className="cn-pw">
            <div className="cn-num" style={{ fontSize: mm(size) }}>
              {d.price}
            </div>
            <div className="cn-baht">{s.unit}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
