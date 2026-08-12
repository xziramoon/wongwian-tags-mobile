import { useEffect, useMemo, useState } from 'react';
import { database } from '../lib/database';
import { previewFromBarcode } from '../store/queueStore';
import { useUIStore } from '../store/uiStore';
import { debounce } from '../lib/utils';
import type { Product } from '../types';

/* text search fallback for when the camera is unavailable/denied, or just faster
 * than scanning. Tapping a result routes through the same preview -> ScanResultSheet
 * path as a successful camera scan, so add/print-now/qty behave identically.
 *
 * Search results are NOT capped (database.search() returns every match) — a common
 * term can match hundreds of products, so the results list scrolls independently
 * while the search box + header stay pinned in view. The filter itself re-runs on
 * every keystroke but is debounced ~150ms so fast typing doesn't re-filter/re-render
 * the full (uncapped) result set on every single character. */
export default function ManualSearchSheet() {
  const open = useUIStore((s) => s.manualSearchOpen);
  const setOpen = useUIStore((s) => s.setManualSearchOpen);
  const openScanSheet = useUIStore((s) => s.openScanSheet);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  const applyDebounced = useMemo(() => debounce((q: string) => setDebouncedQuery(q), 150), []);

  useEffect(() => {
    applyDebounced(query);
  }, [query, applyDebounced]);

  if (!open) return null;

  const results: Product[] = database.search(debouncedQuery);

  const handlePick = (product: Product) => {
    const { item, found } = previewFromBarcode(product.Barcode);
    setOpen(false);
    setQuery('');
    setDebouncedQuery('');
    openScanSheet(item, found);
  };

  const handleClose = () => {
    setOpen(false);
    setQuery('');
    setDebouncedQuery('');
  };

  return (
    <div className="sheet-backdrop" onClick={handleClose}>
      <div className="sheet manual-search-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="manual-search-fixed">
          <div className="queue-drawer-header">
            <span>ค้นหาสินค้า{debouncedQuery.trim() && results.length > 0 ? ` (${results.length})` : ''}</span>
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
        </div>
        <div className="search-results">
          {debouncedQuery.trim() && results.length === 0 && <div className="queue-empty">ไม่พบสินค้าที่ค้นหา</div>}
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
