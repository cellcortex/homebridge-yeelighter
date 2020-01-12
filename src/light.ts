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

export interface OverrideLightConfiguration {
  id: string;
  name?: string;
  color?: boolean;
  backgroundLight?: boolean;
  nightLight?: boolean;
  ignored?: boolean;
  colorTemperature?: ColorTemperatureConfiguration;
  log?: boolean;
  [k: string]: any;
}

export interface ColorTemperatureConfiguration {
  min: number;
  max: number;
}

export class Light {
  public name: string;
  private services = new Array<LightService>();
  private support: string[];
  private updateTimestamp: number;
  private updateResolve?: (update: string[]) => void;
  private updateReject?: () => void;
  private updatePromise?: Promise<string[]>;
  private updatePromisePending: boolean;
  private attributes: Attributes = { ...EMPTY_ATTRIBUTES };
  private lastCommandId = 1;
  public specs: Specs;
  public overrideConfig?: OverrideLightConfiguration;
  private pluginLog: (message?: any, ...optionalParams: any[]) => void;
  public detailedLogging = false;

  constructor(
    log: (message?: any, ...optionalParams: any[]) => void,
    private config: Configuration,
    private device: Device,
    private homebridge: any,
    private accessory: Accessory
  ) {
    this.support = device.info.support.split(" ");
    this.specs = MODEL_SPECS[device.info.model];
    this.name = device.info.id;
    this.pluginLog = log;

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
    const overrideConfig: OverrideLightConfiguration | undefined = this.config?.override?.find(
      item => item.id === device.info.id
    );
    if (overrideConfig?.backgroundLight) {
      this.specs.backgroundLight = overrideConfig.backgroundLight;
    }
    if (overrideConfig?.color) {
      this.specs.color = overrideConfig.color;
    }
    if (overrideConfig?.name) {
      this.name = overrideConfig.name;
    }
    if (overrideConfig?.nightLight) {
      this.specs.nightLight = overrideConfig.nightLight;
    }
    this.overrideConfig = overrideConfig;
    this.detailedLogging = !!overrideConfig?.log;

    this.support = device.info.support.split(" ");
    this.connectDevice();
    let typeString = "UNKNOWN";
    if (this.specs.color) {
      this.services.push(new ColorLightService(this.log, config, this, homebridge, accessory));
      typeString = "Color light";
    } else {
      if (this.specs.colorTemperature.min === 0 && this.specs.colorTemperature.max === 0) {
        this.services.push(new WhiteLightService(this.log, config, this, homebridge, accessory));
        typeString = "White light";
      } else {
        this.services.push(new TemperatureLightService(this.log, config, this, homebridge, accessory));
        typeString = "Color temperature light";
      }
    }
    if (this.support.includes("bg_set_power")) {
      this.services.push(new BackgroundLightService(this.log, config, this, homebridge, accessory));
      typeString = `${typeString} with mood light`;
    }
    this.log(`installed as ${typeString}`);
    this.updateTimestamp = 0;
    this.updatePromisePending = false;
    this.setInfoService();
  }

  get info() {
    return this.device.info;
  }

  public log = (message?: any, ...optionalParameters: any[]): void => {
    this.pluginLog(`[${this.name}] ${message}`, optionalParameters);
  };

  public getAttributes = async (): Promise<Attributes> => {
    // make sure we don't query in parallel and not more often than every second
    if (this.updateTimestamp < Date.now() - 500 && (!this.updatePromise || !this.updatePromisePending)) {
      this.updatePromise = new Promise<string[]>((resolve, reject) => {
        this.updatePromisePending = true;
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
    if (result && result.length == 1 && result[0] == "ok") {
      if (this.detailedLogging) {
        this.log(`received ${id}: OK`);
      }
      // simple ok
    } else if (result && result.length > 3) {
      if (this.detailedLogging) {
        this.log(`received update ${id}: ${JSON.stringify(result)}`);
      }
      if (this.updateResolve) {
        // resolve the promise and delete the resolvers
        this.updateResolve(result);
        this.updatePromisePending = false;
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
      // this.log(`Attributes for ${this.info.id} updated ${JSON.stringify(this.attributes)}`);
      this.services.forEach(service => service.onAttributesUpdated(this.attributes));
    } else if (error) {
      this.log(`Error returned for request [${id}]: ${JSON.stringify(error)}`);
      // reject any pending waits
      if (this.updateReject) {
        this.updateReject();
        this.updatePromisePending = false;
      }
    }
  };

  private onDeviceConnected = () => {
    this.log("Connected");
    this.accessory.reachable = true;
    this.requestAttributes();
  };

  private onDeviceDisconnected = () => {
    if (this.accessory.reachable) {
      this.log("Disconnected");
      if (this.updateReject) {
        this.updateReject();
        this.updatePromisePending = false;
      }

      this.accessory.reachable = false;
    }
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
      this.log(`WARN: sending ${method} although unsupported.`);
    }
    this.device.sendCommand({ id: this.lastCommandId++, method, params: parameters });
    if (this.detailedLogging) {
      this.log(`sendCommand(${this.lastCommandId}, ${method}, ${JSON.stringify(parameters)})`);
    }
  }

  requestAttributes() {
    this.sendCommand("get_prop", this.device.info.trackedAttributes);
  }
}
