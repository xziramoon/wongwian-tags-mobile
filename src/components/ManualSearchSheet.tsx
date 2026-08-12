import { useState } from 'react';
import { database } from '../lib/database';
import { previewFromBarcode } from '../store/queueStore';
import { useUIStore } from '../store/uiStore';
import type { Product } from '../types';

/* text search fallback for when the camera is unavailable/denied, or just faster
 * than scanning. Tapping a result routes through the same preview -> ScanResultSheet
 * path as a successful camera scan, so add/print-now/qty behave identically. */
export default function ManualSearchSheet() {
  const open = useUIStore((s) => s.manualSearchOpen);
  const setOpen = useUIStore((s) => s.setManualSearchOpen);
  const openScanSheet = useUIStore((s) => s.openScanSheet);
  const [query, setQuery] = useState('');

  if (!open) return null;

  const results: Product[] = database.search(query);

  const handlePick = (product: Product) => {
    const { item, found } = previewFromBarcode(product.Barcode);
    setOpen(false);
    setQuery('');
    openScanSheet(item, found);
  };

  const handleClose = () => {
    setOpen(false);
    setQuery('');
  };

  return (
    <div className="sheet-backdrop" onClick={handleClose}>
      <div className="sheet manual-search-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="queue-drawer-header">
          <span>ค้นหาสินค้า</span>
          <button type="button" className="sheet-close" onClick={handleClose} aria-label="ปิด">
            ✕
          </button>
        </div>
        <input
          className="field-input"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ค้นหาชื่อสินค้า หรือบาร์โค้ด"
          autoFocus
        />
        <div className="search-results">
          {query.trim() && results.length === 0 && <div className="queue-empty">ไม่พบสินค้าที่ค้นหา</div>}
          {results.map((product) => (
            <button
              type="button"
              key={product.Barcode}
              className="search-result-row"
              onClick={() => handlePick(product)}
            >
              <div className="queue-row-name">{product.ProductName || 'รหัส: ' + product.Barcode}</div>
              <div className="queue-row-price">{product.Price || '0.00'} บาท</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
