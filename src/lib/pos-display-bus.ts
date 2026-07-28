import { EventEmitter } from "events";

// In-memory pub/sub for pushing POS cart snapshots to customer-facing display
// screens in real time. Works because the app runs as a single Node process —
// if this ever scales to multiple instances, this needs to move to a shared
// broker (e.g. Redis pub/sub) instead.
const bus = new EventEmitter();
bus.setMaxListeners(0);

const lastSnapshots = new Map<string, unknown>();

function eventName(warehouseId: string) {
  return `cart:${warehouseId}`;
}

export function publishCart(warehouseId: string, snapshot: unknown): void {
  lastSnapshots.set(warehouseId, snapshot);
  bus.emit(eventName(warehouseId), snapshot);
}

// Latest snapshot for a branch, if any has been published since server
// start — lets a freshly (re)connected display render immediately instead
// of showing a blank screen until the next cart change.
export function getLastSnapshot(warehouseId: string): unknown {
  return lastSnapshots.get(warehouseId);
}

export function subscribe(
  warehouseId: string,
  cb: (snapshot: unknown) => void,
): () => void {
  const event = eventName(warehouseId);
  bus.on(event, cb);
  return () => bus.off(event, cb);
}
