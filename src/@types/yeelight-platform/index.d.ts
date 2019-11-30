declare module "yeelight-platform" {
  import { EventEmitter } from "events";

  export class Discovery extends EventEmitter {
    public listen(): void;
    public discover(): void;
    public didDiscoverDevice(response: DeviceInfo): void;
  }

  export interface DeviceInfo {
    Location: string;
    id: string;
    model: string;
    support: string;
    power: string;
    bright: string;
    color_mode: string;
    ct: string;
    rgb: string;
    hue: string;
    sat: string;
    host: string;
    port: string;
    tracked_attrs: string[];
  }

  export class Device extends EventEmitter {
    readonly device: DeviceInfo;
    readonly connected: boolean;

    constructor(device: DeviceInfo);
    connect(): void;
    disconnect(forceDisconnect?: boolean): void;
    bindSocket(): void;

    socketClosed(err: any): void;

    didConnect(): void;
    sendHeartBeat(): void;

    didReceiveResponse(data: any): void;
    sendCommand(data: any): void;
    updateDevice(device: DeviceInfo): void;
  }
}
