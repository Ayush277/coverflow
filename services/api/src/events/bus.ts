/**
 * EventBus — Google Pub/Sub-shaped abstraction.
 * Local dev uses the in-memory adapter; in production swap `createBus` for the
 * @google-cloud/pubsub adapter (same topic/subscribe contract, see infra/README).
 */
import { EventEmitter } from "node:events";
import { log } from "../lib/core.js";

export type Topic =
  | "transactions.created"
  | "benefits.activated"
  | "receipts.uploaded"
  | "claims.submitted"
  | "notifications.created";

export interface BusMessage<T = any> { id: string; topic: Topic; data: T; publishedAt: string }

class InMemoryBus {
  private emitter = new EventEmitter();

  publish<T>(topic: Topic, data: T) {
    const msg: BusMessage<T> = { id: crypto.randomUUID(), topic, data, publishedAt: new Date().toISOString() };
    log("pubsub", `publish ${topic}`, { msgId: msg.id });
    // async delivery like real Pub/Sub — consumers never block publishers
    setImmediate(() => this.emitter.emit(topic, msg));
    return msg.id;
  }

  subscribe<T>(topic: Topic, handler: (msg: BusMessage<T>) => void | Promise<void>) {
    this.emitter.on(topic, async (msg: BusMessage<T>) => {
      try { await handler(msg); }
      catch (e) { log("pubsub", `consumer error on ${topic}`, { error: String(e) }); }
    });
  }
}

export const bus = new InMemoryBus();
