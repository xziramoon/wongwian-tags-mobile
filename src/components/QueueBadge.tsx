import { useQueueStore } from '../store/queueStore';
import { useUIStore } from '../store/uiStore';

/* persistent floating badge showing queue item count — tap opens QueueDrawer.
 * Hidden entirely when the queue is empty so it doesn't block the viewfinder. */
export default function QueueBadge() {
  const count = useQueueStore((s) => s.queue.length);
  const setQueueDrawerOpen = useUIStore((s) => s.setQueueDrawerOpen);

  if (!count) return null;

  return (
    <button
      type="button"
      className="queue-badge"
      onClick={() => setQueueDrawerOpen(true)}
      aria-label={`เปิดคิวป้ายราคา (${count} รายการ)`}
    >
      <span className="queue-badge-icon" aria-hidden="true">
        🏷
      </span>
      <span className="queue-badge-count">{count}</span>
    </button>
  );
}
