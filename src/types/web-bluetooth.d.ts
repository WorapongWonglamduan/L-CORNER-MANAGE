// Minimal ambient types for the subset of the Web Bluetooth API this app
// uses (navigator.bluetooth is not yet covered by @types/react or lib.dom.d.ts
// in the TS version this project targets). Not a full spec surface — extend
// only if a new API is actually called.

interface BluetoothCharacteristicProperties {
  readonly write: boolean;
  readonly writeWithoutResponse: boolean;
}

interface BluetoothRemoteGATTCharacteristic {
  readonly properties: BluetoothCharacteristicProperties;
  writeValue(value: BufferSource): Promise<void>;
  writeValueWithoutResponse(value: BufferSource): Promise<void>;
}

interface BluetoothRemoteGATTService {
  getCharacteristics(): Promise<BluetoothRemoteGATTCharacteristic[]>;
}

interface BluetoothRemoteGATTServer {
  readonly connected: boolean;
  connect(): Promise<BluetoothRemoteGATTServer>;
  disconnect(): void;
  getPrimaryServices(): Promise<BluetoothRemoteGATTService[]>;
}

interface BluetoothDevice extends EventTarget {
  readonly id: string;
  readonly name?: string;
  readonly gatt?: BluetoothRemoteGATTServer;
}

interface RequestDeviceOptions {
  acceptAllDevices?: boolean;
  filters?: Array<{ services?: string[]; name?: string; namePrefix?: string }>;
  optionalServices?: string[];
}

interface Bluetooth extends EventTarget {
  requestDevice(options?: RequestDeviceOptions): Promise<BluetoothDevice>;
  getDevices(): Promise<BluetoothDevice[]>;
}

interface Navigator {
  readonly bluetooth?: Bluetooth;
}
