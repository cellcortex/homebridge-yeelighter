/**
 * Yeelight Device Handling.
 */

import { EventEmitter } from "node:events";
import net from "node:net";

export interface DeviceInfo {
  location: string;
  id: string;
  model: string;
  support: string;
  power: boolean;
  bright: number;
  color_mode: number;
  ct: number;
  rgb: string;
  hue: number;
  sat: number;
  host: string;
  port: number;
  debug: boolean;
  trackedAttributes: string[];
  fw_ver: string;
  name: string;
}

export const EMPTY_DEVICEINFO: DeviceInfo = {
  location: "",
  id: "",
  model: "string",
  support: "string",
  power: false,
  bright: 0,
  color_mode: -1,
  ct: 0,
  rgb: "string",
  hue: 0,
  sat: 0,
  host: "string",
  port: 0,
  debug: false,
  trackedAttributes: [],
  fw_ver: "0,0.0",
  name: "string"
};

export interface Command {
  id: number;
  method: string;
  params: Array<number | string | boolean>;
}

/**
 * Handles the connection to a concrete Yee light.
 */
export class Device extends EventEmitter {
  info: DeviceInfo;
  debug: boolean;
  connected: boolean;
  forceDisconnect: boolean;
  retryTimer?: NodeJS.Timeout;
  socket?: net.Socket;
  rest = "";
  constructor(info: DeviceInfo) {
    super();
    this.info = info;
    this.debug = this.info.debug || false;
    this.connected = false;
    this.forceDisconnect = false;
  }

  connect() {
    try {
      this.forceDisconnect = false;
      this.socket = new net.Socket({ allowHalfOpen: false });
      this.bindSocket();
      this.socket.connect({ host: this.info.host, port: this.info.port }, () => {
        this.didConnect();
        this.emit("connected");
      });
    } catch (error: any) {
      this.socketClosed(error);
    }
  }

  disconnect(forceDisconnect = true) {
    this.forceDisconnect = forceDisconnect;
    this.connected = false;
    this.socket?.destroy();
    delete this.socket;
    this.emit("disconnected");
    if (this.forceDisconnect && this.retryTimer) {
      clearTimeout(this.retryTimer);
      delete this.retryTimer;
    }
  }

  bindSocket() {
    this.socket?.on("data", (data) => {
      this.didReceiveResponse(data);
    });

    this.socket?.on("error", (error) => {
      this.emit("socketError", error);
      this.socketClosed(error);
    });

    this.socket?.on("end", () => {
      this.emit("socketEnd");
      this.socketClosed();
    });
  }

  socketClosed(error?: Error) {
    if (this.forceDisconnect) {
      return;
    }

    if (error) {
      if (error.message.includes("EHOSTUNREACH")) {
        // unreachable, no need to retry
        this.disconnect(true);
      } else {
        console.log(`Socket Closed with error "${error.name}, retrying to connect in 5s"`, error.message);
        this.disconnect(false);
        if (this.retryTimer) {
          clearTimeout(this.retryTimer);
          delete this.retryTimer;
        }
        this.retryTimer = setTimeout(this.connect.bind(this), 5000);
  
      }
    } else {
      this.disconnect(false);
    }
  }

  didConnect() {
    this.connected = true;
  }

  didReceiveResponse(data) {
    const combined = this.rest + data.toString("utf8");
    const dataArray = combined.split("\r\n");
    this.rest = dataArray.pop() || "";
    for (const dataString of dataArray) {
      if (dataString.length === 0) {
        continue;
      }
      try {
        const response = JSON.parse(dataString);
        if (response.id) {
          this.emit("deviceUpdate", response);
        } else {
          // invalid message (disabled logging since this seems to happen regularly for some lights)
        }
      } catch (error) {
        console.error(error, dataString);
      }
    }
  }

  sendCommand(data) {
    const cmd = JSON.stringify(data);
    if (this.connected && this.socket) {
      try {
        this.socket.write(cmd + "\r\n");
      } catch (error: any) {
        this.socketClosed(error);
      }
    }
  }

  updateDevice(device) {
    this.info = device;
  }
}
