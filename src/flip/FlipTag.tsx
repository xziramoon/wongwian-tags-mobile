import { useEffect, useMemo, useRef, type CSSProperties } from 'react';
import JsBarcode from 'jsbarcode';
import { NARROW, TAG, fontStack, flipPriceFamily, flipPriceWeight, flipRed, type FlipSettings } from './config';
import { flipNum, last4, type FlipData } from './data';
import { fitGroupName, fitName, fitNarrowName, fitWidth, useFontsTick } from './fit';

/* ตัวแปรสี/ฟอนต์ของป้ายชุดนี้ — สีตามธีม (หมึกแดง/เกาหลี) โหมดขาวดำแทนแดงด้วยดำทั้งหมด */
const flipVars = (s: FlipSettings) =>
  ({ '--ft-red': flipRed(s), '--ft-font': fontStack(s.font), '--ft-price-font': flipPriceFamily(s), '--ft-price-weight': flipPriceWeight(s) }) as CSSProperties;
const wrapClass = (s: FlipSettings, base: string) => `${base} ft-theme-${s.theme}${s.mono ? ' flip-mono' : ''}`;
const FONT_WAIT = ['"Noto Serif SC"'];

interface Props {
  data: FlipData;
  settings: FlipSettings;
}

function Barcode({ value }: { value: string }) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    const svg = ref.current;
    if (!svg || !value) return;
    try {
      JsBarcode(svg, value, { format: 'CODE128', displayValue: false, margin: 0, width: 1, height: 40 });
      // ให้ขนาดจริงถูกกำหนดด้วย CSS (มม.) ไม่ใช่ px จาก JsBarcode
      const w = parseFloat(svg.getAttribute('width') || '0');
      const h = parseFloat(svg.getAttribute('height') || '0');
      if (w && h) svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
      svg.removeAttribute('width');
      svg.removeAttribute('height');
      svg.setAttribute('preserveAspectRatio', 'none');
    } catch {
      svg.innerHTML = ''; // บาร์โค้ดใช้ไม่ได้ — เว้นว่าง
    }
  }, [value]);
  if (!value) return null;
  return <svg ref={ref} className="ft-bc" />;
}

/* ตัวป้ายถาวร 90 × 40 มม. */
export function FlipTag({ data, settings }: Props) {
  const family = fontStack(settings.font);
  const tick = useFontsTick(...FONT_WAIT);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const nameSz = useMemo(() => fitName(data.name, family), [data.name, family, tick]);

  return (
    <div className={wrapClass(settings, 'ft')} style={flipVars(settings)}>
      <div className="ft-head">
        <span className="ft-cn">{settings.shopCn}</span>
        <span className="ft-th">{settings.shopTh}</span>
        <span className="ft-corner">{data.corner}</span>
      </div>
      <div className="ft-body">
        <div className="ft-info">
          <div className="ft-name" style={{ fontSize: `${nameSz}mm` }}>
            {data.name}
          </div>
          {data.size && <div className="ft-size">{data.size}</div>}
          <div className="ft-spacer" />
          <Barcode value={data.barcode} />
          {data.footer && <div className="ft-foot">{data.footer}</div>}
        </div>
        <div className="ft-slot">
          <div className="ft-slot-box">ช่องแถบราคา</div>
        </div>
      </div>
    </div>
  );
}

/* ด้านหน้าแถบ: ราคา (ฟอนต์/สีตามธีมเดียวกับป้ายปกติ) */
export function FlipFront({ data, settings }: Props) {
  const family = fontStack(settings.font);
  const priceFamily = flipPriceFamily(settings);
  const priceWeight = flipPriceWeight(settings);
  const tick = useFontsTick(priceFamily, ...FONT_WAIT);
  const price = flipNum(data.price);
  // ธีมเอียง -4° ต้องเว้นที่ขอบเผื่อมุม จึงจำกัดความกว้างน้อยกว่าเล็กน้อย
  const maxW = settings.theme === 'ink' ? 33 : 36;
  /* eslint-disable react-hooks/exhaustive-deps */
  const priceSz = useMemo(
    () => fitWidth(price, priceFamily, priceWeight, maxW, 17.5, 11),
    [price, priceFamily, priceWeight, maxW, tick],
  );
  const packSz = useMemo(() => fitWidth(data.pack, family, 600, 36, 3, 2), [data.pack, family, tick]);
  /* eslint-enable react-hooks/exhaustive-deps */

  return (
    <div className={wrapClass(settings, 'fs-face fs-front')} style={flipVars(settings)}>
      <div className="fs-pw">
        {data.variant === 'group' && data.group?.chip && <div className="fs-chip">{data.group.chip}</div>}
        <div className="fs-price" style={{ fontSize: `${priceSz}mm` }}>
          {price}
        </div>
        <div className="fs-unit">{settings.unit}</div>
      </div>
      {data.pack && (
        <div className="fs-pack" style={{ fontSize: `${packSz}mm` }}>
          {data.pack}
        </div>
      )}
    </div>
  );
}

/* ด้านหลังแถบ: สินค้าหมด */
export function FlipBack({ settings }: { settings: FlipSettings }) {
  const family = fontStack(settings.font);
  const tick = useFontsTick();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const sz = useMemo(() => fitWidth(settings.outText, family, 800, 36, 8, 4), [settings.outText, family, tick]);
  return (
    <div className={wrapClass(settings, 'fs-face fs-back')} style={flipVars(settings)}>
      <div className="fs-out" style={{ fontSize: `${sz}mm` }}>
        {settings.outText}
      </div>
      {settings.outSub && <div className="fs-outsub">{settings.outSub}</div>}
    </div>
  );
}

/* แถบกางออก 80 × 31 มม.: หน้า | เส้นประพับ | หลัง — พับแล้วหนา 2 ชั้น */
export function FlipStrip({ data, settings }: Props) {
  return (
    <div className="fs" style={{ width: `${TAG.slotW * 2}mm`, height: `${TAG.stripH}mm` }}>
      <FlipFront data={data} settings={settings} />
      <FlipBack settings={settings} />
      <div className="fs-fold" />
    </div>
  );
}

/* ================= ป้ายแคบ 45 × 40 มม. (สเปกข้อ 12.1) =================
 * หัวป้าย 6 มม. (ตราจีน + ชื่อร้านกึ่งกลาง ไม่มีคำมุมขวา) · ชื่อ 11 มม. · ราคาครึ่งล่าง · ไม่พิมพ์บาร์โค้ด/ราคายกลัง */
export function FlipNarrowTag({ data, settings }: Props) {
  const family = fontStack(settings.font);
  const priceFamily = flipPriceFamily(settings);
  const priceWeight = flipPriceWeight(settings);
  const tick = useFontsTick(priceFamily, ...FONT_WAIT);
  const price = flipNum(data.price);
  const maxW = settings.theme === 'ink' ? 38 : 41; // ธีมเอียง -4° เผื่อมุม
  /* eslint-disable react-hooks/exhaustive-deps */
  const nameSz = useMemo(() => fitNarrowName(data.name, family, !!data.size), [data.name, data.size, family, tick]);
  const priceSz = useMemo(
    () => fitWidth(price, priceFamily, priceWeight, maxW, 15, 10),
    [price, priceFamily, priceWeight, maxW, tick],
  );
  /* eslint-enable react-hooks/exhaustive-deps */

  return (
    <div className={wrapClass(settings, 'ft ftn')} style={flipVars(settings)}>
      <div className="ft-head ftn-head">
        <span className="ft-cn">{settings.shopCn}</span>
        <span className="ftn-th">{settings.shopTh}</span>
      </div>
      <div className="ftn-name">
        <div className="ftn-nm" style={{ fontSize: `${nameSz}mm` }}>
          {data.name}
        </div>
        {data.size && <div className="ftn-sz">{data.size}</div>}
      </div>
      <div className="ftn-price">
        <div className="fs-price" style={{ fontSize: `${priceSz}mm` }}>
          {price}
        </div>
        <div className="ftn-unit">{settings.unit}</div>
      </div>
    </div>
  );
}

/* แถบราคาป้ายแคบ: ด้านละ 43 × 21 มม. พับแนวบน-ล่าง (กางออก 43 × 42)
 * ด้านสินค้าหมดพิมพ์กลับหัว 180° เพื่อให้พับแล้วตั้งตรง */
export function FlipNarrowStrip({ data, settings }: Props) {
  const family = fontStack(settings.font);
  const priceFamily = flipPriceFamily(settings);
  const priceWeight = flipPriceWeight(settings);
  const tick = useFontsTick(priceFamily, ...FONT_WAIT);
  const price = flipNum(data.price);
  const maxW = settings.theme === 'ink' ? 36 : 39;
  /* eslint-disable react-hooks/exhaustive-deps */
  const priceSz = useMemo(
    () => fitWidth(price, priceFamily, priceWeight, maxW, 15, 10),
    [price, priceFamily, priceWeight, maxW, tick],
  );
  const outSz = useMemo(() => fitWidth(settings.outText, family, 800, 39, 6.5, 4), [settings.outText, family, tick]);
  /* eslint-enable react-hooks/exhaustive-deps */

  return (
    <div className={wrapClass(settings, 'fsn')} style={flipVars(settings)}>
      <div className="fsn-face fsn-front">
        <div className="fs-price" style={{ fontSize: `${priceSz}mm` }}>
          {price}
        </div>
        <div className="ftn-unit">{settings.unit}</div>
      </div>
      <div className="fsn-face fsn-back">
        <div className="fs-out" style={{ fontSize: `${outSz}mm` }}>
          {settings.outText}
        </div>
        {settings.outSub && <div className="fs-outsub">{settings.outSub}</div>}
      </div>
      <div className="fsn-fold" />
    </div>
  );
}

/* ================= ป้ายกลุ่ม n × 45 × 40 มม. (สเปกข้อ 12.2) =================
 * หัวเหมือนป้ายเต็ม · ซ้าย: ชื่อกลุ่ม + ขนาด + กล่องชื่อกลิ่น (พร้อมเลขท้ายบาร์โค้ด 4 หลัก) · ขวา: ช่องแถบราคา 40 มม. */
export function FlipGroupTag({ data, settings }: Props) {
  const g = data.group;
  const family = fontStack(settings.font);
  const tick = useFontsTick(...FONT_WAIT);
  const slots = g?.slots ?? 3;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const nameSz = useMemo(() => fitGroupName(data.name, family, slots), [data.name, family, slots, tick]);
  if (!g) return null;

  return (
    <div className={wrapClass(settings, 'ft ftg')} style={{ ...flipVars(settings), width: `${slots * NARROW.w}mm` }}>
      <div className="ft-head">
        <span className="ft-cn">{settings.shopCn}</span>
        <span className="ft-th">{settings.shopTh}</span>
        <span className="ft-corner">{data.corner}</span>
      </div>
      <div className="ft-body">
        <div className="ft-info">
          <div className="ft-name" style={{ fontSize: `${nameSz}mm` }}>
            {data.name}
          </div>
          {data.size && <div className="ft-size">{data.size}</div>}
          <div className="ft-spacer" />
          <div className="ftg-boxes">
            {g.members.map((m) => (
              <div key={m.barcode} className="ftg-box">
                <span className="ftg-lb">{m.label}</span>
                <span className="ftg-code">{last4(m.barcode)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="ft-slot">
          <div className="ft-slot-box">ช่องแถบราคา</div>
        </div>
      </div>
    </div>
  );
}

/* สติกเกอร์แดง "หมด" 14 × 8 มม. แปะทับกล่องกลิ่นที่หมด */
export function FlipSticker({ settings }: { settings: FlipSettings }) {
  return (
    <div className={wrapClass(settings, 'fst')} style={flipVars(settings)}>
      หมด
    </div>
  );
}

/* เลือกวาดตามขนาดป้าย (full / narrow / group) */
export function FlipTagAny({ data, settings }: Props) {
  if (data.variant === 'narrow') return <FlipNarrowTag data={data} settings={settings} />;
  if (data.variant === 'group') return <FlipGroupTag data={data} settings={settings} />;
  return <FlipTag data={data} settings={settings} />;
}
export function FlipStripAny({ data, settings }: Props) {
  if (data.variant === 'narrow') return <FlipNarrowStrip data={data} settings={settings} />;
  return <FlipStrip data={data} settings={settings} />;
}
