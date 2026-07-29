// Low-level ESC/POS byte helpers. Pure functions, no DOM/Bluetooth
// dependency, so the byte layout is independently testable.

export function concatBytes(...chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, c) => sum + c.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

// ESC @ - reset the printer to its power-on state before each job, so a
// previous job's leftover mode/state (if any clone firmware persists it)
// never bleeds into the next receipt.
export function initPrinter(): Uint8Array {
  return new Uint8Array([0x1b, 0x40]);
}

// GS v 0 - print a 1-bit raster image. `packedBits` must already be packed
// MSB-first, `Math.ceil(widthPx / 8)` bytes per row, bit=1 meaning "print
// this dot" (black), row-major.
export function rasterImage(
  widthPx: number,
  heightPx: number,
  packedBits: Uint8Array,
): Uint8Array {
  const bytesPerRow = Math.ceil(widthPx / 8);
  const header = new Uint8Array([
    0x1d,
    0x76,
    0x30,
    0x00, // m: normal mode
    bytesPerRow & 0xff,
    (bytesPerRow >> 8) & 0xff,
    heightPx & 0xff,
    (heightPx >> 8) & 0xff,
  ]);
  return concatBytes(header, packedBits);
}

// Feeds a few lines then issues a partial cut. Printers without a cutter
// simply ignore GS V — safe default, not something that needs detecting.
export function feedAndCut(feedLines = 3): Uint8Array {
  const feed = new Uint8Array([0x1b, 0x64, feedLines]);
  const cut = new Uint8Array([0x1d, 0x56, 0x01]);
  return concatBytes(feed, cut);
}
