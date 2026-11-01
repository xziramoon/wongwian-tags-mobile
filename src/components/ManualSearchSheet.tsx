import { useEffect, useMemo, useState } from 'react';
import { database, MIN_QUERY_LENGTH, SEARCH_RESULT_CAP } from '../lib/database';
import { previewFromBarcode } from '../store/queueStore';
import { useUIStore } from '../store/uiStore';
import { debounce } from '../lib/utils';
import type { Product } from '../types';
import { IconClose } from './Icons';

/* text search fallback for when the camera is unavailable/denied, or just faster
 * than scanning. Tapping a result routes through the same preview -> ScanResultSheet
 * path as a successful camera scan, so add/print-now/qty behave identically.
 *
 * The product sheet runs ~38k rows, so database.search() enforces MIN_QUERY_LENGTH
 * (skip searching on a too-short query) and SEARCH_RESULT_CAP (stop once enough
 * matches are found) — without those, a short/common query used to match a huge
 * slice of the catalog and freeze the UI rendering all of it. The filter itself
 * re-runs on every keystroke but is debounced ~150ms so fast typing doesn't
 * re-filter/re-render on every single character. */
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

  /* the on-screen keyboard overlays the bottom sheet on phones, hiding the result list;
   * track the visual viewport height so the sheet (pinned to the top while searching)
   * always fits in the space above the keyboard */
  useEffect(() => {
    if (!open) return;
    const vv = window.visualViewport;
    const apply = () => {
      document.documentElement.style.setProperty('--vvh', `${vv ? vv.height : window.innerHeight}px`);
    };
    apply();
    vv?.addEventListener('resize', apply);
    vv?.addEventListener('scroll', apply);
    return () => {
      vv?.removeEventListener('resize', apply);
      vv?.removeEventListener('scroll', apply);
      document.documentElement.style.removeProperty('--vvh');
    };
  }, [open]);

  if (!open) return null;

  const results: Product[] = database.search(debouncedQuery);
  const trimmedQuery = debouncedQuery.trim();
  const tooShort = trimmedQuery.length > 0 && trimmedQuery.length < MIN_QUERY_LENGTH;

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
    <div className="sheet-backdrop sheet-backdrop-top" onClick={handleClose}>
      <div className="sheet manual-search-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="manual-search-fixed">
          <div className="queue-drawer-header">
            <span>
              ค้นหาสินค้า
              {results.length > 0 ? ` (${results.length}${results.length >= SEARCH_RESULT_CAP ? '+' : ''})` : ''}
            </span>
            <button type="button" className="sheet-close" onClick={handleClose} aria-label="ปิด">
              <IconClose size={20} />
            </button>
          </div>
          <input
            className="field-input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหาชื่อสินค้า หรือบาร์โค้ด"
            autoFocus
            enterKeyHint="search"
          />
        </div>
        <div className="search-results">
          {tooShort && <div className="queue-empty">กรอกอย่างน้อย {MIN_QUERY_LENGTH} ตัวอักษร</div>}
          {!tooShort && trimmedQuery && results.length === 0 && (
            <div className="queue-empty">ไม่พบสินค้าที่ค้นหา</div>
          )}
          {results.map((product) => (
            <button
              type="button"
              key={product.Barcode}
              className="search-result-row"
              onClick={() => handlePick(product)}
            >
              <div className="sr-main">
                <div className="sr-name">{product.ProductName || 'รหัส: ' + product.Barcode}</div>
                <div className="sr-code">{product.Barcode}</div>
              </div>
              <div className="sr-price">
                {product.Price || '0.00'}
                <small>บาท</small>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
