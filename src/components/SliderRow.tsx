import { useEffect, useState } from 'react';
import { useQueueStore } from '../store/queueStore';
import { SLIDER_DEFS } from '../constants';
import type { Config } from '../types';

interface Props {
  configKey: keyof Config;
  full?: boolean;
}

/* ported near-verbatim from wongwian-tags01/src/components/SliderRow.tsx (same
 * configKey/full props, same SLIDER_DEFS lookup + setValue/commitNumText logic) —
 * only the CSS changed, bumping the −/+ step buttons to the app's 44px tap-target
 * convention (see .qty-btn in global.css) instead of desktop's mouse-sized buttons */
export default function SliderRow({ configKey, full }: Props) {
  const def = SLIDER_DEFS[configKey as string];
  const value = useQueueStore((s) => s.config[configKey]);
  const updateConfig = useQueueStore((s) => s.updateConfig);
  const cur = typeof value === 'number' ? value : def.def;
  const [numText, setNumText] = useState(String(cur));

  useEffect(() => setNumText(String(cur)), [cur]);

  const setValue = (v: number) => {
    const clamped = Math.min(def.max, Math.max(def.min, +v.toFixed(2)));
    updateConfig(configKey, clamped);
  };

  const commitNumText = () => {
    const v = parseFloat(numText);
    setValue(isNaN(v) ? def.def : v);
  };

  return (
    <div className={`slider-row${full ? ' cfg-full' : ''}`}>
      <div className="slider-header">
        <span className="cfg-lbl">{def.label}</span>
        <span className="slider-val">{cur}</span>
      </div>
      <div className="stepper">
        <button type="button" className="step-btn" onClick={() => setValue(cur - def.step)}>
          −
        </button>
        <input
          type="range"
          min={def.min}
          max={def.max}
          step={def.step}
          value={cur}
          onChange={(e) => setValue(parseFloat(e.target.value))}
        />
        <input
          type="text"
          inputMode="decimal"
          className="step-num"
          value={numText}
          onChange={(e) => setNumText(e.target.value)}
          onBlur={commitNumText}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          }}
        />
        <button type="button" className="step-btn" onClick={() => setValue(cur + def.step)}>
          +
        </button>
      </div>
    </div>
  );
}
