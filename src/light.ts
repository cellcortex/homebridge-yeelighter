import { Configuration } from "homebridge";
import { Device } from "yeelight-platform";
import { Service } from "hap-nodejs";

export class Light {
  constructor(
    private log: (message?: any, ...optionalParams: any[]) => void,
    private config: Configuration,
    private device: Device
  ) {}

  // Respond to identify request
  identify(callback: () => void): void {
    this.log(`Hi ${this.device.device}`);
    callback();
  }

  getServices(): Array<Service> {
    return [];
  }
}
