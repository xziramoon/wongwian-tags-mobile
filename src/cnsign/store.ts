import { useMemo } from 'react';
import { create } from 'zustand';
import { useQueueStore } from '../store/queueStore';
import { CN_KEYS, DEFAULT_CN_SETTINGS, type CnSignSettings } from './config';

function loadSettings(): CnSignSettings {
  try {
    const raw = localStorage.getItem(CN_KEYS.settings);
    if (raw) return { ...DEFAULT_CN_SETTINGS, ...JSON.parse(raw) };
  } catch {
    /* storage เสีย/ถูกบล็อก — ใช้ค่าเริ่มต้น */
  }
  return DEFAULT_CN_SETTINGS;
}
function saveSettings(s: CnSignSettings) {
  try {
    localStorage.setItem(CN_KEYS.settings, JSON.stringify(s));
  } catch {
    /* ไม่ให้การบันทึกล้มทำให้แอปพัง */
  }
}

interface CnState {
  settings: CnSignSettings;
  updateSetting: <K extends keyof CnSignSettings>(key: K, value: CnSignSettings[K]) => void;
  resetSettings: () => void;
}

/* ตั้งค่าป้ายจีน A4 — ชื่อคีย์ localStorage เหมือนแอปเดสก์ท็อป (cnSign.settings) แต่เก็บแยกในแต่ละเครื่อง */
export const useCnStore = create<CnState>((set) => ({
  settings: loadSettings(),
  updateSetting: (key, value) =>
    set((st) => {
      const settings = { ...st.settings, [key]: value };
      saveSettings(settings);
      return { settings };
    }),
  resetSettings: () => {
    saveSettings(DEFAULT_CN_SETTINGS);
    set({ settings: DEFAULT_CN_SETTINGS });
  },
}));

/* ตั้งค่าที่ใช้วาด: โหมดขาว-ดำของป้ายจีนเอง หรือ "ปริ้นขาว-ดำ" ของทั้งแอป (config.printMono) อย่างใดอย่างหนึ่ง */
const withApp = (s: CnSignSettings, printMono: boolean): CnSignSettings => (printMono && !s.mono ? { ...s, mono: true } : s);

export function useCnSettings(): CnSignSettings {
  const s = useCnStore((st) => st.settings);
  const printMono = useQueueStore((st) => st.config.printMono);
  return useMemo(() => withApp(s, printMono), [s, printMono]);
}

export const getCnSettings = (): CnSignSettings => withApp(useCnStore.getState().settings, useQueueStore.getState().config.printMono);
