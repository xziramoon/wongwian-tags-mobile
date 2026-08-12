import * as Ably from 'ably';
import type { Config, QueueItem } from '../types';
import { ABLY_API_KEY, PRINT_TAGS_CHANNEL, PRINT_EVENT_NAME, PRINT_PAYLOAD_VERSION } from '../constants';

export interface PrintPayload {
  v: number;
  ts: number;
  config: Config;
  items: QueueItem[];
}

export type AblyConnState = 'connecting' | 'connected' | 'disconnected' | 'suspended' | 'failed' | 'closed';
type StateListener = (state: AblyConnState) => void;

/* publishes the whole current queue+config to the remote TAG_PRINTER receiver over
 * Ably (wss on port 443 — survives shop/office firewalls). publish() logic ported
 * verbatim from wongwian-tags01/src/lib/printBridge.ts. Unlike the desktop version
 * (which connects lazily on first publish), this connects eagerly at module load so
 * the mobile app can show a live connection-status pill before the first scan. */
class PrintBridge {
  private client: Ably.Realtime;
  private listeners: StateListener[] = [];

  constructor() {
    this.client = new Ably.Realtime({ key: ABLY_API_KEY });
    (['connecting', 'connected', 'disconnected', 'suspended', 'failed', 'closed'] as const).forEach((state) => {
      this.client.connection.on(state, () => this.notify(state));
    });
  }

  private notify(state: AblyConnState) {
    this.listeners.forEach((l) => l(state));
  }

  /** subscribe to Ably connection-state changes; returns an unsubscribe fn */
  onStateChange(fn: StateListener): () => void {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  getState(): AblyConnState {
    return this.client.connection.state as AblyConnState;
  }

  private waitConnected(): Promise<void> {
    if (this.client.connection.state === 'connected') return Promise.resolve();
    return new Promise((resolve, reject) => {
      const onConnected = () => {
        this.client.connection.off('failed', onFailed);
        resolve();
      };
      const onFailed = (change: Ably.ConnectionStateChange) => {
        this.client.connection.off('connected', onConnected);
        reject(new Error(change.reason?.message || 'Ably connection failed'));
      };
      this.client.connection.once('connected', onConnected);
      this.client.connection.once('failed', onFailed);
    });
  }

  async publish(config: Config, items: QueueItem[]): Promise<void> {
    await this.waitConnected();
    const payload: PrintPayload = { v: PRINT_PAYLOAD_VERSION, ts: Date.now(), config, items };
    const channel = this.client.channels.get(PRINT_TAGS_CHANNEL);
    await channel.publish(PRINT_EVENT_NAME, payload);
  }
}

export const printBridge = new PrintBridge();
