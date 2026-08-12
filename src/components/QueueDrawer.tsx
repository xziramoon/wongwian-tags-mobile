import { useQueueStore } from '../store/queueStore';
import { useUIStore } from '../store/uiStore';

/* full queue list — qty +/-, remove, and the single "send all" publish action */
export default function QueueDrawer() {
  const open = useUIStore((s) => s.queueDrawerOpen);
  const setOpen = useUIStore((s) => s.setQueueDrawerOpen);
  const sending = useUIStore((s) => s.sending);
  const queue = useQueueStore((s) => s.queue);
  const changeQty = useQueueStore((s) => s.changeQty);
  const remove = useQueueStore((s) => s.remove);
  const sendQueue = useQueueStore((s) => s.sendQueue);

  if (!open) return null;

  const handleSendAll = () => {
    void sendQueue();
  };

  return (
    <div className="sheet-backdrop" onClick={() => setOpen(false)}>
      <div className="sheet queue-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="queue-drawer-header">
          <span>คิวป้ายราคา ({queue.length})</span>
          <button type="button" className="sheet-close" onClick={() => setOpen(false)} aria-label="ปิด">
            ✕
          </button>
        </div>

        {queue.length === 0 ? (
          <div className="queue-empty">ยังไม่มีรายการในคิว</div>
        ) : (
          <div className="queue-list">
            {queue.map((item, index) => (
              <div className="queue-row" key={`${item.Barcode}-${index}`}>
                <div className="queue-row-info">
                  <div className="queue-row-name">{item.ProductName}</div>
                  <div className="queue-row-price">{item.Price} บาท</div>
                </div>
                <div className="queue-row-qty">
                  <button type="button" className="qty-btn" onClick={() => changeQty(index, -1)} aria-label="ลดจำนวน">
                    −
                  </button>
                  <span className="qty-value">{item.PrintQty}</span>
                  <button type="button" className="qty-btn" onClick={() => changeQty(index, 1)} aria-label="เพิ่มจำนวน">
                    +
                  </button>
                </div>
                <button type="button" className="queue-row-remove" onClick={() => remove(index)} aria-label="ลบรายการ">
                  🗑
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="sheet-actions">
          <button
            type="button"
            className="btn btn-primary btn-block"
            onClick={handleSendAll}
            disabled={!queue.length || sending}
          >
            {sending ? 'กำลังส่ง...' : 'ส่งทั้งหมด'}
          </button>
        </div>
      </div>
    </div>
  );
}
