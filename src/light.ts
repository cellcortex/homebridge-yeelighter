// import { Service, Characteristic, Accessory } from "hap-nodejs";
import {
  Attributes,
  LightService,
  Specs,
  EMPTY_ATTRIBUTES,
  MODEL_SPECS,
  EMPTY_SPECS,
  Configuration
} from "./lightservice";
import { Device } from "./yeedevice";
import { ColorLightService } from "./colorlightservice";
import { WhiteLightService } from "./whitelightservice";
import { TemperatureLightService } from "./temperaturelightservice";
import { BackgroundLightService } from "./backgroundlightservice";

// HACK: since importing these types will somehow create a dependency to hap-nodejs
type Accessory = any;

export const TRACKED_ATTRIBUTES = Object.keys(EMPTY_ATTRIBUTES);

export class Light {
  public name: string;
  private services = new Array<LightService>();
  private support: string[];
  private updateTimestamp: number;
  private updateResolve?: (update: string[]) => void;
  private updateReject?: () => void;
  private updatePromise?: Promise<string[]>;
  private attributes: Attributes = { ...EMPTY_ATTRIBUTES };
  private lastCommandId = 1;
  public specs: Specs;

  constructor(
    private log: (message?: any, ...optionalParams: any[]) => void,
    private config: Configuration,
    private device: Device,
    private homebridge: any,
    private accessory: Accessory
  ) {
    this.support = device.info.support.split(" ");
    this.specs = MODEL_SPECS[device.info.model];

    if (!this.specs) {
      const specs = { ...EMPTY_SPECS };
      this.log(
        `no specs for light ${device.info.id} ${device.info.model}. It supports: ${device.info.support}. Using fallback. This will not give you moonlight support.`
      );
      specs.name = device.info.model;
      specs.color = this.support.includes("set_hsv");
      specs.backgroundLight = this.support.includes("bg_set_hsv");
      specs.nightLight = false;
      if (!this.support.includes("set_ct_abx")) {
        specs.colorTemperature.min = 0;
        specs.colorTemperature.max = 0;
      }
      this.specs = specs;
    }
    const overrideConfig = this.config?.override?.find(item => item.id === device.info.id);
    if (overrideConfig?.backgroundLight) {
      this.specs.backgroundLight = overrideConfig.backgroundLight;
    }
    if (overrideConfig?.color) {
      this.specs.color = overrideConfig.color;
    }
    if (overrideConfig?.nightLight) {
      this.specs.nightLight = overrideConfig.nightLight;
    }

    // this.log(`light ${device.info.id} ${device.info.model} created. It supports: ${device.info.support}`);
    this.name = device.info.id;
    this.support = device.info.support.split(" ");
    this.connectDevice();
    if (this.specs.color) {
      this.services.push(new ColorLightService(log, config, this, homebridge, accessory));
    } else {
      if (this.specs.colorTemperature.min === 0 && this.specs.colorTemperature.max === 0) {
        this.services.push(new WhiteLightService(log, config, this, homebridge, accessory));
      } else {
        this.services.push(new TemperatureLightService(log, config, this, homebridge, accessory));
      }
    }
    if (this.support.includes("bg_set_power")) {
      this.services.push(new BackgroundLightService(log, config, this, homebridge, accessory));
    }
    this.updateTimestamp = 0;
    this.setInfoService();
  }

  get info() {
    return this.device.info;
  }

  public getAttributes = async (): Promise<Attributes> => {
    // make sure we don't query in parallel and not more often than every second
    if (/*this.updateTimestamp < Date.now() - 1000 && */ !this.updatePromise) {
      this.updatePromise = new Promise<string[]>((resolve, reject) => {
        this.updateResolve = resolve;
        this.updateReject = reject;
        this.requestAttributes();
      });
    }
    // this promise will be awaited for by everybody entering here while a request is still in the air
    if (this.updatePromise) {
      await this.updatePromise;
    }
    return this.attributes;
  };

  private onDeviceUpdate = ({ id, result, error }) => {
    this.log(`${this.info.id} update (${id}): ${result}`);
    if (result && result.length == 1 && result[0] == "ok") {
      // simple ok
    } else if (result && result.length > 3) {
      if (this.updateResolve) {
        // resolve the promise and delete the resolvers
        this.updateResolve(result);
        delete this.updateResolve;
        delete this.updateReject;
      }
      for (const key of Object.keys(this.attributes)) {
        const index = TRACKED_ATTRIBUTES.indexOf(key);
        switch (typeof EMPTY_ATTRIBUTES[key]) {
          case "number":
            this.attributes[key] = Number(result[index]);
            break;
          case "boolean":
            this.attributes[key] = result[index] == "on";
            break;
          default:
            this.attributes[key] = result[index];
            break;
        }
      }
      this.updateTimestamp = Date.now();
      this.log(`Attributes for ${this.info.id} updated ${JSON.stringify(this.attributes)}`);
      this.services.forEach(service => service.onAttributesUpdated(this.attributes));
    } else if (error) {
      this.log(`Device ${this.device.info.id}: Error returned for ${id}: ${error}`);
      // reject any pending waits
      if (this.updateReject) {
        this.updateReject();
      }
    }
  };

  private onDeviceConnected = () => {
    this.log("Connected", this.name);
    this.accessory.reachable = true;
    this.requestAttributes();
  };

  private onDeviceDisconnected = () => {
    this.log("Disconnected", this.name);
    this.accessory.reachable = false;
  };

  private onDeviceError = error => {
    this.log("Device Error", error);
  };

  connectDevice() {
    this.device.connect();
    this.device.on("deviceUpdate", this.onDeviceUpdate);
    this.device.on("connected", this.onDeviceConnected);
    this.device.on("disconnected", this.onDeviceDisconnected);
    this.device.on("deviceError", this.onDeviceError);
  }

  // Respond to identify request
  identify(callback: () => void): void {
    this.log(`Hi ${this.device.info.model}`);
    callback();
  }

  setInfoService() {
    // type helpers
    const Characteristic = this.homebridge.hap.Characteristic;
    const Service = this.homebridge.hap.Service;
    const infoService = this.accessory.getService(Service.AccessoryInformation);
    if (!infoService) {
      const infoService = new Service.AccessoryInformation();
      infoService
        .updateCharacteristic(Characteristic.Manufacturer, "Yeelighter")
        .updateCharacteristic(Characteristic.Model, this.specs.name)
        .updateCharacteristic(Characteristic.SerialNumber, this.device.info.id)
        .updateCharacteristic(Characteristic.FirmwareRevision, this.device.info.fw_ver);
      this.accessory.addService(infoService);
      return infoService;
    } else {
      // re-use service from cache
      infoService
        .updateCharacteristic(Characteristic.Manufacturer, "Yeelighter")
        .updateCharacteristic(Characteristic.Model, this.specs.name)
        .updateCharacteristic(Characteristic.SerialNumber, this.device.info.id)
        .updateCharacteristic(Characteristic.FirmwareRevision, this.device.info.fw_ver);
    }
    return infoService;
  }

  sendCommand(method: string, parameters: Array<string | number | boolean>) {
    const supportedCommands = this.device.info.support.split(",");
    if (!supportedCommands.includes) {
      this.log(`WARN: sending ${method} to ${this.device.info.id} although unsupported.`);
    }
    this.device.sendCommand({ id: this.lastCommandId++, method, params: parameters });
  }

  requestAttributes() {
    this.sendCommand("get_prop", this.device.info.trackedAttributes);
  }
}
