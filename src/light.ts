// import { Service, Characteristic, Accessory } from "hap-nodejs";
import { Attributes, EMPTY_ATTRIBUTES, Configuration, ConcreteLightService } from "./lightservice";
import { Specs, MODEL_SPECS, EMPTY_SPECS } from "./specs";
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
  offOnDisconnect?: boolean;
  [k: string]: any;
}

export interface ColorTemperatureConfiguration {
  min: number;
  max: number;
}

function timeout(ms: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => {
      clearTimeout(id);
      reject("timeout");
    }, ms);
  });
}

export class Light {
  public name: string;
  private services = new Array<ConcreteLightService>();
  private support: string[];
  private updateTimestamp: number;
  private updateResolve?: (update: string[]) => void;
  private updateReject?: () => void;
  private updatePromise?: Promise<string[]>;
  private updatePromisePending: boolean;
  private attributes: Attributes = { ...EMPTY_ATTRIBUTES };
  private lastCommandId = 1;
  private queryTimestamp = 0;
  public specs: Specs;
  public overrideConfig?: OverrideLightConfiguration;
  private pluginLog: (message?: any, ...optionalParams: any[]) => void;
  public detailedLogging = false;
  public connected = false;
  private interval?: NodeJS.Timeout;

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
        `no specs for light ${device.info.id} ${device.info.model}. It supports: ${device.info.support}. Using fallback. This will not give you nightLight support.`
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
    if (this.config?.blocking) {
      if (this.updateTimestamp < Date.now() - 1000 && (!this.updatePromise || !this.updatePromisePending)) {
        // make sure we don't query in parallel and not more often than every second
        this.updatePromise = new Promise<string[]>((resolve, reject) => {
          this.updatePromisePending = true;
          this.updateResolve = resolve;
          this.updateReject = reject;
          this.requestAttributes();
        });
      }
      // this promise will be awaited for by everybody entering here while a request is still in the air
      if (this.updatePromise && this.connected) {
        try {
          await Promise.race([this.updatePromise, timeout(this.config?.timeout)]);
        } catch (error) {
          this.log("retrieving attributes failed. Using last attributes.", error);
        }
      }
    }
    return this.attributes;
  };

  private onDeviceUpdate = ({ id, result, error }) => {
    if (result && result.length == 1 && result[0] == "ok") {
      this.accessory.reachable = true;
      this.connected = true;
      if (this.detailedLogging) {
        this.log(`received ${id}: OK`);
      }
      // simple ok
    } else if (result && result.length > 3) {
      this.accessory.reachable = true;
      this.connected = true;
      if (this.lastCommandId - 1 !== id) {
        this.log(`WARN: update with unexpected id: ${id}, expected: ${this.lastCommandId - 1}`);
      }
      if (this.detailedLogging) {
        const seconds = Date.now() - this.queryTimestamp;
        this.log(`received update ${id} after ${seconds}s: ${JSON.stringify(result)}`);
      }
      if (this.updateResolve) {
        // resolve the promise and delete the resolvers
        this.updateResolve(result);
        this.updatePromisePending = false;
        delete this.updateResolve;
        delete this.updateReject;
      }
      const newAttributes = { ...EMPTY_ATTRIBUTES };
      for (const key of Object.keys(this.attributes)) {
        const index = TRACKED_ATTRIBUTES.indexOf(key);
        switch (typeof EMPTY_ATTRIBUTES[key]) {
          case "number":
            newAttributes[key] = Number(result[index]);
            break;
          case "boolean":
            newAttributes[key] = result[index] == "on";
            break;
          default:
            newAttributes[key] = result[index];
            break;
        }
      }
      this.updateTimestamp = Date.now();
      this.onUpdateAttributes(newAttributes);
    } else if (error) {
      this.log(`Error returned for request [${id}]: ${JSON.stringify(error)}`);
      // reject any pending waits
      if (this.updateReject) {
        this.updateReject();
        this.updatePromisePending = false;
        delete this.updateResolve;
        delete this.updateReject;
      }
    }
  };

  private onUpdateAttributes = (newAttributes: Attributes) => {
    if (JSON.stringify(this.attributes) !== JSON.stringify(newAttributes)) {
      if (!this.config?.blocking) {
        this.services.forEach(service => service.onAttributesUpdated(newAttributes));
      }
      this.attributes = { ...newAttributes };
    }
  };

  private onDeviceConnected = async () => {
    this.connected = true;
    this.log("Connected");
    this.requestAttributes();
    if (this.config.interval !== 0) {
      this.interval = setInterval(this.onInterval, this.config.interval || 60000);
    }
  };

  private onDeviceDisconnected = () => {
    this.connected = false;
    this.log("Disconnected");
    if (this.overrideConfig?.offOnDisconnect) {
      this.attributes.power = false;
      // eslint-disable-next-line @typescript-eslint/camelcase
      this.attributes.bg_power = false;
      this.log("configured to mark as powered-off when disconnected");
      this.services.forEach(service => service.onPowerOff());
    }
    if (this.updateReject) {
      this.updateReject();
      this.updatePromisePending = false;
    }
    this.accessory.reachable = false;
    if (this.interval) {
      clearInterval(this.interval);
      delete this.interval;
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
    if (!this.connected) {
      this.log(`WARN: send command but device doesn't seem connected`);
    }
    if (!this.accessory.reachable) {
      this.log(`WARN: send command but device doesn't seem reachable`);
    }
    const supportedCommands = this.device.info.support.split(",");
    if (!supportedCommands.includes) {
      this.log(`WARN: sending ${method} although unsupported.`);
    }
    if (this.detailedLogging) {
      this.log(`sendCommand(${this.lastCommandId}, ${method}, ${JSON.stringify(parameters)})`);
    }
    this.device.sendCommand({ id: this.lastCommandId++, method, params: parameters });
  }

  private onInterval = () => {
    if (this.connected && this.accessory.reachable) {
      const updateSince = (Date.now() - this.updateTimestamp);
      if (this.updateTimestamp !== 0 && this.updateTimestamp < Date.now() - this.config.interval * 2) {
        this.log(`No update received since ${updateSince}s - switching to unreachable`);
        this.connected = false;
        this.accessory.reachable = false;
      }
      this.requestAttributes();
    } else {
      if (this.interval) {
        clearInterval(this.interval);
        delete this.interval;
      }
    }
  };

  requestAttributes() {
    this.queryTimestamp = Date.now();
    this.sendCommand("get_prop", this.device.info.trackedAttributes);
  }
}
