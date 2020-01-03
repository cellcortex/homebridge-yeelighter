import { Service, Characteristic, Accessory } from "hap-nodejs";
import {
  Attributes,
  LightService,
  BackgroundLightService,
  WhiteLightService,
  Specs,
  EMPTY_ATTRIBUTES,
  MODEL_SPECS,
  Configuration
} from "./lightservice";
import { Device } from "./yeedevice";

export const TRACKED_ATTRIBUTES = Object.keys(EMPTY_ATTRIBUTES);

export class Light {
  public name: string;
  private infoService?: Service;
  private connected = false;
  private lastProps: string[] = [];
  private main: LightService;
  private background?: LightService;
  private support: Array<string>;
  private updateTimestamp: number;
  private updateResolve?: (update: string[]) => void;
  private updateReject?: () => void;
  private attributes: Attributes = EMPTY_ATTRIBUTES;
  protected specs: Specs;

  constructor(
    private log: (message?: any, ...optionalParams: any[]) => void,
    private config: Configuration,
    private device: Device,
    private homebridge: any,
    private accessory: Accessory
  ) {
    this.specs = MODEL_SPECS[device.info.model];
    // super(device.device.id, global.hap.uuid.generate(device.device.id));
    this.log(`light ${device.info.id} ${device.info.model} created, support: ${device.info.support}`);
    this.name = device.info.id;
    this.support = device.info.support.split(" ");
    this.connectDevice();
    this.main = new WhiteLightService(log, config, device, homebridge, this.updateAttributes);
    if (this.support.includes("bg_set_power")) {
      this.background = new BackgroundLightService(log, config, device, homebridge, this.updateAttributes);
    }
    this.updateTimestamp = 0;
  }

  private updateAttributes = async (): Promise<Attributes> => {
    if (this.updateTimestamp < Date.now() - 400 && !this.updateResolve) {
      const updatePromise = new Promise<string[]>((resolve, reject) => {
        this.updateResolve = resolve;
        this.updateReject = reject;
        this.device.requestAttributes();
      });
      await updatePromise;
    }
    return this.attributes;
  };

  private onDeviceUpdate = ({ id, result }) => {
    if (id === 199) {
      if (result) {
        if (this.updateResolve) {
          this.updateResolve(result);
          delete this.updateResolve;
          delete this.updateReject;
        }
        this.lastProps = [...result];
        for (const key of Object.keys(this.attributes)) {
          const index = TRACKED_ATTRIBUTES.indexOf(key);
          switch (typeof EMPTY_ATTRIBUTES[key]) {
            case "number":
              this.attributes[key] = Number(this.lastProps[index]);
              break;
            case "boolean":
              this.attributes[key] = this.lastProps[index] == "on";
              break;
            default:
              this.attributes[key] = this.lastProps[index];
              break;
          }
        }
        // this.log(`Attributes: ${JSON.stringify(this.attributes)}`);
        this.updateTimestamp = Date.now();
      }
    }
  };

  private onDeviceConnected = () => {
    this.log("Connected", this.name);
    this.connected = true;
    this.device.requestAttributes();
  };

  private onDeviceDisconnected = () => {
    this.log("Disconnected", this.name);
    this.connected = false;
  };

  connectDevice() {
    this.device.connect();
    this.device.on("deviceUpdate", this.onDeviceUpdate);
    this.device.on("connected", this.onDeviceConnected);
    this.device.on("disconnected", this.onDeviceDisconnected);
  }

  // Respond to identify request
  identify(callback: () => void): void {
    this.log(`Hi ${this.device.info.model}`);
    callback();
  }

  getServices(): Array<Service> {
    this.log(`getServices for ${this.device.info.id}`);
    const services: Array<Service> = [this.getInfoService(), this.main.service];
    if (this.background) {
      services.push(this.background.service);
    }
    return services;
  }

  getInfoService(): Service {
    if (!this.infoService) {
      this.log("infoService created");
      const infoService = new this.homebridge.hap.Service.AccessoryInformation();
      infoService
        .updateCharacteristic(Characteristic.Manufacturer, "Yeelighter")
        .updateCharacteristic(Characteristic.Model, this.specs.name)
        .updateCharacteristic(Characteristic.SerialNumber, this.device.info.id)
        .updateCharacteristic(Characteristic.FirmwareRevision, this.device.info.fw_ver);

      this.infoService = infoService;
      return infoService;
    }
    return this.infoService;
  }

  sendCommand(method: string, parameters: Array<string | number | boolean>) {
    this.device.sendCommand({ id: -1, method, params: parameters });
  }
}
