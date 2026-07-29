import { EventEmitter } from "events";
import type { ReceiptSale } from "@/lib/receipt/types";

// In-memory pub/sub for dispatching print jobs to whichever device holds
// the Bluetooth pairing with the branch's receipt printer. Same
// single-process caveat as pos-display-bus.ts — would need a shared broker
// (e.g. Redis pub/sub) if this app ever scales to multiple instances.
const bus = new EventEmitter();
bus.setMaxListeners(0);

function eventName(warehouseId: string) {
  return `print:${warehouseId}`;
}

export interface PrintJob {
  id: string;
  saleId: string;
  saleNumber: string;
  createdAt: string;
  payload: ReceiptSale;
}

// Deliberately no last-job replay-on-connect (unlike pos-display-bus's
// lastSnapshots): a print job is a one-shot command, not ongoing state, so
// replaying it to a freshly (re)connected agent would reprint a receipt the
// customer already has.
export function publishPrintJob(warehouseId: string, job: PrintJob): void {
  bus.emit(eventName(warehouseId), job);
}

export function subscribe(
  warehouseId: string,
  cb: (job: PrintJob) => void,
): () => void {
  const event = eventName(warehouseId);
  bus.on(event, cb);
  return () => bus.off(event, cb);
}
