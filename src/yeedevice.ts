/**
 * Device Handling
 */

import EventEmitter from "events";
import net from "net";

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
  interval: number;
  debug: boolean;
  trackedAttributes: string[];
  fw_ver: number;
  name: string;
}

export const EMPTY_DEVICEINFO: DeviceInfo = {
  location: "",
  id: "",
  model: "string",
  support: "string",
  power: false,
  bright: 0,
  // eslint-disable-next-line @typescript-eslint/camelcase
  color_mode: -1,
  ct: 0,
  rgb: "string",
  hue: 0,
  sat: 0,
  host: "string",
  port: 0,
  interval: 0,
  debug: false,
  // eslint-disable-next-line @typescript-eslint/camelcase
  trackedAttributes: [],
  // eslint-disable-next-line @typescript-eslint/camelcase
  fw_ver: 0,
  name: "string"
};

export interface Command {
  id: number;
  method: string;
  params: Array<number | string | boolean>;
}

export class Device extends EventEmitter {
  device: DeviceInfo;
  debug: boolean;
  connected: boolean;
  forceDisconnect: boolean;
  polligInterval: number;
  retryTimer?: NodeJS.Timeout;
  socket?: net.Socket;
  constructor(device: DeviceInfo) {
    super();
    this.device = device;
    this.debug = this.device.debug || false;
    this.connected = false;
    this.forceDisconnect = false;
    this.polligInterval = this.device.interval || 5000;
  }

  connect() {
    try {
      this.forceDisconnect = false;
      this.socket = new net.Socket({ allowHalfOpen: true });
      this.bindSocket();
      this.socket.connect({ host: this.device.host, port: this.device.port }, () => {
        this.didConnect();
        this.emit("connected");
      });
    } catch (error) {
      this.socketClosed(error);
    }
  }

  disconnect(forceDisconnect = true) {
    console.log("XXX manual disconnect");
    this.forceDisconnect = forceDisconnect;
    this.connected = false;
    /*if (this.timer) {
      clearInterval(this.timer);
      delete this.timer;
    }*/
    this.socket?.destroy();
    delete this.socket;
    this.emit("disconnected");
    if (this.forceDisconnect && this.retryTimer) {
      clearTimeout(this.retryTimer);
      delete this.retryTimer;
    }
  }

  bindSocket() {
    this.socket?.on("data", data => {
      this.didReceiveResponse(data);
    });

    this.socket?.on("error", error => {
      console.log("socket error", error);
      this.emit("socketError", error);
      this.socketClosed(error);
    });

    this.socket?.on("end", () => {
      console.log("socket end");
      this.emit("socketEnd");
      this.socketClosed("no error");
    });
  }

  socketClosed(error) {
    console.log("XXX socket closed", error);
    if (this.forceDisconnect) return;

    if (error && this.debug) {
      console.log("Socket Closed :", error);
      console.log("Reconnecting in 5 secs");
    }
    this.disconnect(false);
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      delete this.retryTimer;
    }
    this.retryTimer = setTimeout(this.connect.bind(this), 5000);
  }

  didConnect() {
    this.connected = true;
  }

  requestAttributes() {
    this.sendCommand({
      id: 199,
      method: "get_prop",
      params: this.device.trackedAttributes
    });
  }

  didReceiveResponse(data) {
    const dataArray = data.toString("utf8").split("\r\n");
    dataArray.forEach(dataString => {
      if (dataString.length === 0) return;
      try {
        const response = JSON.parse(dataString);
        this.emit("deviceUpdate", response);
      } catch (error) {
        console.error(error, dataString);
      }
    });
  }

  sendCommand(data) {
    const cmd = JSON.stringify(data);
    if (this.connected && this.socket) {
      try {
        this.socket.write(cmd + "\r\n");
      } catch (error) {
        this.socketClosed(error);
      }
    }
  }

  updateDevice(device) {
    this.device = device;
  }
}
