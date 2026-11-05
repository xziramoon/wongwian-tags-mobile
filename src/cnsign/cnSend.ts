import { printBridge } from '../lib/printBridge';
import { useQueueStore } from '../store/queueStore';
import type { QueueItem } from '../types';
import { CN_COLOR_TESTS } from './config';
import { colorTestSample, queueToCnData, splitByOrient } from './data';
import { getCnSettings } from './store';

/* ส่งป้ายจีน A4 ในคิวไปเครื่องปริ้นปลายทาง (TAG_PRINTER.html) — แยกงานตามแนวกระดาษ (ตัวรับพิมพ์ทีละแนว)
 * โยน error ถ้าส่งไม่สำเร็จ ผู้เรียกแจ้งผู้ใช้เอง */
export async function sendCnFromQueue(items: QueueItem[]): Promise<void> {
  const config = useQueueStore.getState().config;
  const settings = getCnSettings();
  const groups = splitByOrient(queueToCnData(items, settings, config));
  if (groups.portrait.length) await printBridge.publishCnSign(config, { orient: 'portrait', settings, items: groups.portrait });
  if (groups.landscape.length) await printBridge.publishCnSign(config, { orient: 'landscape', settings, items: groups.landscape });
}

/* ใบทดสอบสี: ส่งป้ายตัวอย่างทุกแบบใน CN_COLOR_TESTS ไปเครื่องปริ้นปลายทาง ใบละแบบ — เลือกจากกระดาษจริงว่าแบบไหนเหมาะกับเครื่องพิมพ์ */
export async function sendCnColorTests(): Promise<void> {
  const config = useQueueStore.getState().config;
  const base = getCnSettings();
  for (const t of CN_COLOR_TESTS) {
    await printBridge.publishCnSign(config, { orient: 'portrait', settings: { ...base, ink: t.ink, red: t.red ?? base.red }, items: [colorTestSample(t.label)] });
  }
}
