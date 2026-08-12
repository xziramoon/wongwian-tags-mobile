import { useEffect, useState } from 'react';
import { useQueueStore } from '../store/queueStore';
import { useUIStore } from '../store/uiStore';
import { autoFontSize } from '../lib/utils';
import type { DualStyle, QueueItem } from '../types';
import TagPreview from './TagPreview';

/* Shared new/edit tag-design sheet, driven by uiStore.tagEditTarget:
 *  - mode 'new': fields are buffered in local state (there's no queue index yet)
 *    and only committed via addItem() when the user taps Save.
 *  - mode 'edit': fields commit straight to the store on every change (no buffering,
 *    same live-editing UX as desktop's QueueItemCard.tsx — `value` is bound directly
 *    to store state and each onChange calls updateQueueItem/setDualStyle).
 * Field grouping mirrors wongwian-tags01/src/components/QueueItemCard.tsx (minus its
 * qty stepper / delete / drag chrome, which mobile's callers already own). */
export default function TagEditSheet() {
  const target = useUIStore((s) => s.tagEditTarget);
  const closeTagEdit = useUIStore((s) => s.closeTagEdit);
  const config = useQueueStore((s) => s.config);
  const addItem = useQueueStore((s) => s.addItem);
  const updateQueueItem = useQueueStore((s) => s.updateQueueItem);
  const setDualStyleAction = useQueueStore((s) => s.setDualStyle);
  const queueItemAtIndex = useQueueStore((s) => (target?.mode === 'edit' ? s.queue[target.index] : undefined));

  const [localItem, setLocalItem] = useState<QueueItem | null>(null);

  useEffect(() => {
    setLocalItem(target?.mode === 'new' ? target.item : null);
  }, [target]);

  if (!target) return null;

  const item = target.mode === 'new' ? localItem : queueItemAtIndex;
  if (!item) return null;

  const setField = (field: keyof QueueItem, value: string | number) => {
    if (target.mode === 'edit') {
      updateQueueItem(target.index, field, value);
      return;
    }
    setLocalItem((prev) => {
      if (!prev) return prev;
      const next = { ...prev, [field]: value } as QueueItem;
      if (field === 'ProductName') {
        const globalSize = parseInt(String(config.globalNameSz), 10);
        next.NameFontSize = globalSize && globalSize > 0 ? globalSize : autoFontSize(String(value), next.TagMode);
      }
      if (field === 'Price') next.PriceDiff = null; // manual edit clears flag
      return next;
    });
  };

  const setDualStyle = (style: DualStyle) => {
    if (target.mode === 'edit') setDualStyleAction(target.index, style);
    else setField('DualStyle', style);
  };

  const handleSave = () => {
    if (target.mode === 'new') addItem(item);
    closeTagEdit();
  };

  const fs = item.NameFontSize || autoFontSize(item.ProductName, item.TagMode);

  return (
    <div className="sheet-backdrop" onClick={closeTagEdit}>
      <div className="sheet sheet-full tag-edit-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="queue-drawer-header">
          <span>{target.mode === 'new' ? 'เพิ่มป้ายใหม่' : 'แก้ไขป้าย'}</span>
          <button type="button" className="sheet-close" onClick={closeTagEdit} aria-label="ปิด">
            ✕
          </button>
        </div>

        <TagPreview item={item} config={config} />

        <input
          className="field-input"
          value={item.ProductName}
          onChange={(e) => setField('ProductName', e.target.value)}
          placeholder="ชื่อสินค้า"
        />

        <div className="q-price-grid">
          <div className="q-field">
            <span className="q-lbl">ราคาขาย (บาท)</span>
            <input
              className="field-input"
              type="number"
              step=".01"
              value={item.Price}
              onChange={(e) => setField('Price', e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="q-field">
            <span className="q-lbl">ราคาแพ็ค / ยกลัง (บาท)</span>
            <div className="q-pack-row">
              <input
                className="field-input"
                value={item.Unit2 || ''}
                onChange={(e) => setField('Unit2', e.target.value)}
                placeholder="ยกลัง"
              />
              <input
                className="field-input"
                type="number"
                step=".01"
                value={item.Price2 || ''}
                onChange={(e) => setField('Price2', e.target.value)}
                placeholder="—"
              />
            </div>
          </div>
        </div>

        <div>
          <span className="q-lbl">เลือกแบบป้าย</span>
          <div className="mode-btns">
            <button
              type="button"
              className={`mode-btn${item.TagMode === 'standard' ? ' active' : ''}`}
              onClick={() => setField('TagMode', 'standard')}
            >
              ป้ายปกติ
            </button>
            <button
              type="button"
              className={`mode-btn${item.TagMode === 'dual' ? ' active' : ''}`}
              onClick={() => setField('TagMode', 'dual')}
            >
              โชว์ 2 ราคา
            </button>
            <button
              type="button"
              className={`mode-btn${item.TagMode === 'large' ? ' active' : ''}`}
              onClick={() => setField('TagMode', 'large')}
            >
              ป้ายใหญ่
            </button>
          </div>
        </div>

        {item.TagMode === 'dual' && (
          <div className="mode-btns mode-btns-2">
            <button
              type="button"
              className={`mode-btn${item.DualStyle !== 'B' ? ' active' : ''}`}
              onClick={() => setDualStyle('A')}
            >
              แบบ A: แบ่งสองช่อง
            </button>
            <button
              type="button"
              className={`mode-btn${item.DualStyle === 'B' ? ' active' : ''}`}
              onClick={() => setDualStyle('B')}
            >
              แบบ B: ราคาเด่น + แถบส่ง
            </button>
          </div>
        )}

        <details className="fold q-more">
          <summary>
            เพิ่มเติม<span className="fold-arrow">▾</span>
          </summary>
          <div className="fold-body">
            <div className="q-grid2">
              <div className="q-field">
                <span className="q-lbl">ราคาเดิม (ขีดฆ่า)</span>
                <input
                  className="field-input"
                  type="number"
                  step=".01"
                  value={item.OldPrice || ''}
                  onChange={(e) => setField('OldPrice', e.target.value)}
                  placeholder="—"
                />
              </div>
              <div className="q-field">
                <span className="q-lbl">คำว่า "ปลีก" บนป้าย</span>
                <input
                  className="field-input"
                  value={item.Unit1 || ''}
                  onChange={(e) => setField('Unit1', e.target.value)}
                  placeholder="ว่าง = ตามตั้งค่า"
                />
              </div>
              <div className="q-field">
                <span className="q-lbl">ขนาดสินค้า</span>
                <input
                  className="field-input"
                  value={item.Size || ''}
                  onChange={(e) => setField('Size', e.target.value)}
                  placeholder="เช่น 500 กรัม"
                />
              </div>
              <div className="q-field">
                <span className="q-lbl">หน่วยขาย</span>
                <input
                  className="field-input"
                  value={item.Unit}
                  onChange={(e) => setField('Unit', e.target.value)}
                  placeholder="ชิ้น"
                />
              </div>
              <div className="q-field">
                <span className="q-lbl">ริบบิ้นมุมป้าย</span>
                <input
                  className="field-input"
                  value={item.Ribbon || ''}
                  onChange={(e) => setField('Ribbon', e.target.value)}
                  placeholder="เช่น ลดพิเศษ"
                />
              </div>
              <div className="q-field">
                <span className="q-lbl">แพ็ค / ลัง</span>
                <input
                  className="field-input"
                  value={item.PackType || ''}
                  onChange={(e) => setField('PackType', e.target.value)}
                  placeholder="เช่น แพ็ค 6"
                />
              </div>
              <div className="q-field">
                <span className="q-lbl">วันผลิต (MFG)</span>
                <input
                  className="field-input"
                  value={item.Mfg || ''}
                  onChange={(e) => setField('Mfg', e.target.value)}
                  placeholder="—"
                />
              </div>
              <div className="q-field">
                <span className="q-lbl">วันหมดอายุ (EXP)</span>
                <input
                  className="field-input"
                  value={item.Exp || ''}
                  onChange={(e) => setField('Exp', e.target.value)}
                  placeholder="—"
                />
              </div>
              <div className="q-field">
                <span className="q-lbl">ขนาดตัวหนังสือชื่อ</span>
                <input
                  className="field-input"
                  type="number"
                  value={fs}
                  onChange={(e) => setField('NameFontSize', +e.target.value)}
                  title="ขนาดฟอนต์ชื่อ"
                />
              </div>
              <div className="q-field">
                <span className="q-lbl">เลื่อนราคา ซ้าย-ขวา</span>
                <input
                  className="field-input"
                  type="number"
                  value={item.PriceOffsetX || 0}
                  onChange={(e) => setField('PriceOffsetX', +e.target.value)}
                  placeholder="0"
                  title="เลื่อนราคา (px)"
                />
              </div>
            </div>
            <div className="q-field">
              <span className="q-lbl">ลิงก์รูปสินค้า (ไม่บังคับ)</span>
              <input
                className="field-input"
                value={item.Image || ''}
                onChange={(e) => setField('Image', e.target.value)}
                placeholder="วางลิงก์รูปที่นี่"
              />
            </div>
          </div>
        </details>

        <div className="sheet-actions">
          <button type="button" className="btn btn-primary btn-block" onClick={handleSave}>
            {target.mode === 'new' ? 'บันทึกลงคิว' : 'เสร็จสิ้น'}
          </button>
        </div>
      </div>
    </div>
  );
}
