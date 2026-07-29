"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PaperWidth } from "@/lib/receipt/types";

const STORAGE_KEY = "l-corner:thermal-printer";
const CHUNK_SIZE = 150;
const CHUNK_DELAY_MS = 20;
const MOCK_PRINT_DELAY_MS = 400;
export const MOCK_DEVICE_ID = "mock-printer";

interface PairedPrinterConfig {
  deviceId: string;
  deviceName: string;
  paperWidth: PaperWidth;
  isMock?: boolean;
}

type PrinterStatus = "unsupported" | "disconnected" | "connecting" | "connected" | "error";

function loadConfig(): PairedPrinterConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PairedPrinterConfig) : null;
  } catch {
    return null;
  }
}

function saveConfig(config: PairedPrinterConfig) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Cheap clone printers don't share a standard service/characteristic UUID,
// so instead of pre-declaring one, connect and walk every advertised
// service for the first characteristic that can actually be written to.
async function findWritableCharacteristic(
  server: BluetoothRemoteGATTServer,
): Promise<BluetoothRemoteGATTCharacteristic | null> {
  const services = await server.getPrimaryServices();
  for (const service of services) {
    const characteristics = await service.getCharacteristics();
    const writable = characteristics.find(
      (c) => c.properties.write || c.properties.writeWithoutResponse,
    );
    if (writable) return writable;
  }
  return null;
}

export function useThermalPrinter() {
  const [status, setStatus] = useState<PrinterStatus>("disconnected");
  const [pairedDevice, setPairedDevice] = useState<PairedPrinterConfig | null>(null);
  const characteristicRef = useRef<BluetoothRemoteGATTCharacteristic | null>(null);
  const deviceRef = useRef<BluetoothDevice | null>(null);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.bluetooth) {
      setStatus("unsupported");
      return;
    }
    setPairedDevice(loadConfig());
  }, []);

  // A mock pairing has no real GATT device to reconnect to — it's "connected"
  // by definition the moment it's loaded from storage.
  useEffect(() => {
    if (pairedDevice?.isMock) setStatus("connected");
  }, [pairedDevice]);

  // Reconnects to a previously-granted device without a new user gesture,
  // when the browser still remembers the permission. If it doesn't (revoked,
  // different profile), this just leaves status as "disconnected" so the UI
  // can show a "reconnect" button requiring a fresh click.
  useEffect(() => {
    if (!pairedDevice || pairedDevice.isMock) return;
    if (typeof navigator === "undefined" || !navigator.bluetooth) return;
    let cancelled = false;

    (async () => {
      const bluetooth = navigator.bluetooth;
      if (!bluetooth) return;
      const known = await bluetooth.getDevices();
      const match = known.find((d) => d.id === pairedDevice.deviceId);
      if (!match?.gatt || cancelled) return;
      try {
        setStatus("connecting");
        const server = await match.gatt.connect();
        const characteristic = await findWritableCharacteristic(server);
        if (cancelled) return;
        if (!characteristic) {
          setStatus("error");
          return;
        }
        deviceRef.current = match;
        characteristicRef.current = characteristic;
        setStatus("connected");
      } catch {
        if (!cancelled) setStatus("disconnected");
      }
    })();

    return () => {
      cancelled = true;
    };
    // Only re-run when the paired device identity changes, not on every
    // render — connecting is a one-shot side effect per device.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pairedDevice?.deviceId]);

  // Must be invoked directly from a click handler with no prior `await` —
  // Web Bluetooth requires a user gesture for requestDevice().
  const pair = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.bluetooth) {
      setStatus("unsupported");
      return;
    }
    try {
      setStatus("connecting");
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          "000018f0-0000-1000-8000-00805f9b34fb",
          "0000ff00-0000-1000-8000-00805f9b34fb",
          "0000ffe0-0000-1000-8000-00805f9b34fb",
          "49535343-fe7d-4ae5-8fa9-9fafd205e455",
          "6e400001-b5a3-f393-e0a9-e50e24dcca9e",
        ],
      });
      if (!device.gatt) throw new Error("Device has no GATT server");
      const server = await device.gatt.connect();
      const characteristic = await findWritableCharacteristic(server);
      if (!characteristic) throw new Error("No writable characteristic found");

      const config: PairedPrinterConfig = {
        deviceId: device.id,
        deviceName: device.name ?? "Unknown printer",
        paperWidth: pairedDevice?.paperWidth ?? "58",
      };
      saveConfig(config);
      setPairedDevice(config);
      deviceRef.current = device;
      characteristicRef.current = characteristic;
      setStatus("connected");
    } catch {
      setStatus("error");
    }
  }, [pairedDevice]);

  // No real user gesture requirement here (nothing actually talks to the OS
  // Bluetooth stack) — lets the printer-agent flow (checkout → print job →
  // render → "print") be exercised end-to-end before any hardware exists.
  const pairMock = useCallback(() => {
    const config: PairedPrinterConfig = {
      deviceId: MOCK_DEVICE_ID,
      deviceName: "Mock printer",
      paperWidth: pairedDevice?.paperWidth ?? "58",
      isMock: true,
    };
    saveConfig(config);
    setPairedDevice(config);
    setStatus("connected");
  }, [pairedDevice]);

  const disconnect = useCallback(() => {
    deviceRef.current?.gatt?.disconnect();
    deviceRef.current = null;
    characteristicRef.current = null;
    setStatus("disconnected");
    // A mock pairing has nothing to "reconnect" to, unlike a real device —
    // clear it so the UI falls back to offering both connect options again.
    if (pairedDevice?.isMock) {
      if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY);
      setPairedDevice(null);
    }
  }, [pairedDevice]);

  const setPaperWidth = useCallback((paperWidth: PaperWidth) => {
    setPairedDevice((prev) => {
      if (!prev) return prev;
      const next = { ...prev, paperWidth };
      saveConfig(next);
      return next;
    });
  }, []);

  const print = useCallback(
    async (bytes: Uint8Array) => {
      if (pairedDevice?.isMock) {
        await sleep(MOCK_PRINT_DELAY_MS);
        return;
      }
      const characteristic = characteristicRef.current;
      if (!characteristic) throw new Error("Printer not connected");
      for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
        const chunk = bytes.slice(i, i + CHUNK_SIZE);
        await characteristic.writeValueWithoutResponse(chunk);
        await sleep(CHUNK_DELAY_MS);
      }
    },
    [pairedDevice],
  );

  return { status, pairedDevice, pair, pairMock, disconnect, print, setPaperWidth };
}
