import { CN_PRICE_FAMILY, CN_PRICE_WEIGHT, CN_PRICE_LAYOUT, CN_PRICE_PAD, CN_PRICE_TILT, CN_PRICE_CAP, type CnVariant } from './config';

/* ขนาดตัวเลขราคาให้ใหญ่ที่สุดเท่าที่ช่องราคาจะรับได้ — คำนวณจาก "ขอบหมึกจริง" ของตัวเลข (ไม่ใช่กล่องตัวอักษร)
 * แล้วหมุน -4° ตามจริง เทียบกับช่องที่เหลือจริงหลังหักชื่อ/ยกลัง/ท้ายป้าย ด้วย container query (cqw/cqh)
 * ช่องราคาเป็น container-type: size ในสไตล์ tag-cnsign.css → ชื่อ 1 หรือ 3 บรรทัด ช่องจะเปลี่ยนเอง ตัวเลขตามเอง */

/* หน่วยเป็น em ของฟอนต์ (วัดที่ 100px แล้วหาร 100) */
export interface InkMetrics {
  adv: number; // ความกว้างรวม (advance)
  abl: number; // หมึกยื่นไปทางซ้ายของจุดเริ่ม (ติดลบ = หมึกเริ่มหลังจุดเริ่ม)
  abr: number; // หมึกยื่นไปทางขวา
  asc: number; // หมึกเหนือเส้นฐาน
  desc: number; // หมึกใต้เส้นฐาน
  fa: number; // ascent ของฟอนต์
  fd: number; // descent ของฟอนต์
}

let ctx: CanvasRenderingContext2D | null = null;
export function measureInk(text: string, family = CN_PRICE_FAMILY, weight = CN_PRICE_WEIGHT): InkMetrics {
  ctx ??= document.createElement('canvas').getContext('2d');
  if (!ctx) return { adv: text.length * 0.6, abl: 0, abr: text.length * 0.6, asc: 0.75, desc: 0.05, fa: 1.1, fd: 0.3 };
  ctx.font = `${weight} 100px ${family}`;
  const m = ctx.measureText(text);
  return {
    adv: m.width / 100,
    abl: m.actualBoundingBoxLeft / 100,
    abr: m.actualBoundingBoxRight / 100,
    asc: m.actualBoundingBoxAscent / 100,
    desc: m.actualBoundingBoxDescent / 100,
    fa: (m.fontBoundingBoxAscent ?? 1.1 * 100) / 100,
    fd: (m.fontBoundingBoxDescent ?? 0.3 * 100) / 100,
  };
}

const num = (n: number) => +n.toFixed(4);

export interface PriceFit {
  fontSize: string; // CSS: min(กว้าง, สูง, เพดาน)
  lineHeight: number; // ความสูงกล่อง = ความสูงของตัวเลขที่เอียงแล้ว (em)
  transform: string; // เอียง -4° + ขยับให้หมึกอยู่กลางกล่อง
}

/* unitEm = ความกว้างคำหน่วย ("บาท") เป็น em ของฟอนต์ Kanit 800 — ใช้เฉพาะแบบที่ "บาท" อยู่ข้างตัวเลข */
export function priceFit(v: CnVariant, m: InkMetrics, unitEm: number): PriceFit {
  const lay = CN_PRICE_LAYOUT[v];
  const a = (CN_PRICE_TILT * Math.PI) / 180;
  const wi = m.abl + m.abr;
  const hi = m.asc + m.desc;
  const bw = wi * Math.cos(a) + hi * Math.sin(a); // ความกว้างรวมหลังเอียง (em)
  const bh = wi * Math.sin(a) + hi * Math.cos(a); // ความสูงรวมหลังเอียง (em)
  const subW = lay.beside ? unitEm * lay.bahtMm + lay.gap : 0;
  const subH = lay.beside ? 0 : lay.bahtMm + lay.gap;
  const availW = 2 * CN_PRICE_PAD.x + subW;
  const availH = 2 * CN_PRICE_PAD.y + subH;
  const dx = (m.abr - m.abl) / 2 - m.adv / 2;
  const dy = (m.fa - m.fd - (m.asc - m.desc)) / 2;
  return {
    fontSize: `min(calc((100cqw - ${num(availW)}mm) / ${num(bw)}), calc((100cqh - ${num(availH)}mm) / ${num(bh)}), ${CN_PRICE_CAP}mm)`,
    lineHeight: num(bh),
    transform: `rotate(-${CN_PRICE_TILT}deg) translate(${num(-dx)}em, ${num(-dy)}em)`,
  };
}
