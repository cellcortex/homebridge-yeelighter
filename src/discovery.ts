import { EventEmitter } from "node:events";
import dgram from "node:dgram";
import url from "node:url";
import { DeviceInfo, EMPTY_DEVICEINFO } from "./yeedevice";
import httpHeaders from "http-headers";

interface MyHeaders {
  [key: string]: string;
}

const options = {
  port: 1982,
  multicastAddr: "239.255.255.250",
  discoveryMsg: 'M-SEARCH * HTTP/1.1\r\nMAN: "ssdp:discover"\r\nST: wifi_bulb\r\n'
};

export class Discovery extends EventEmitter {
  socket: dgram.Socket;
  constructor() {
    super();
    this.socket = dgram.createSocket({ type: "udp4", reuseAddr: true });
  }

  discover() {
    const buffer = Buffer.from(options.discoveryMsg);
    this.socket.send(buffer, 0, buffer.length, options.port, options.multicastAddr);
  }

  listen() {
    this.socket.on("listening", () => {
      this.discover();
      this.emit("started");
    });

    this.socket.on("message", this.onMessage);

    this.socket.bind(options.port, () => {
      this.socket.setBroadcast(true);
      this.socket.setMulticastTTL(128);
      this.socket.addMembership(options.multicastAddr);
    });
  }

  onMessage = (response: Buffer) => {
    const headers: MyHeaders = httpHeaders(response, true) as MyHeaders;
    const device: DeviceInfo = { ...EMPTY_DEVICEINFO };

    for (const header of Object.keys(headers)) {
      const value = headers[header];
      switch (typeof EMPTY_DEVICEINFO[header]) {
        case "number":
          device[header] = Number(value);
          break;
        case "boolean":
          device[header] = value === "on";
          break;
        case "string":
          device[header] = value;
          break;
        default:
          // device[header] = value;
          break;
      }
    }
    if (device.id && device.location && device.id !== "") {
      const parsedUrl = url.parse(device.location);
      device.host = parsedUrl.hostname || "";
      device.port = Number(parsedUrl.port);
      this.emit("didDiscoverDevice", device);
    }
  };
}
