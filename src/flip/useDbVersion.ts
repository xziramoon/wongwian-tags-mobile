import { useEffect, useState } from 'react';
import { database } from '../lib/database';

/* ฐานข้อมูลสินค้าโหลด/ซิงค์ใหม่เมื่อไหร่ ให้ส่วนที่คำนวณจากข้อมูลสินค้า (ราคากลุ่ม ล็อค รายการเทียบราคา) คำนวณใหม่ */
export function useDbVersion(): number {
  const [v, setV] = useState(0);
  useEffect(() => database.onChange(() => setV((n) => n + 1)), []);
  return v;
}
