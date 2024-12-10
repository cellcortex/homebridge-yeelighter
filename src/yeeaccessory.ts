import { PlatformAccessory, Service } from "homebridge";
import { YeelighterPlatform } from "./platform";
import { MODEL_SPECS, EMPTY_SPECS, Specs } from "./specs";
import { Device, DeviceInfo } from "./yeedevice";
import { Attributes, EMPTY_ATTRIBUTES, ConcreteLightService } from "./lightservice";
import { ColorLightService } from "./colorlightservice";
import { WhiteLightService } from "./whitelightservice";
import { TemperatureLightService } from "./temperaturelightservice";
import { BackgroundLightService } from "./backgroundlightservice";

export const TRACKED_ATTRIBUTES = Object.keys(EMPTY_ATTRIBUTES);

interface IncomingMessage {
  id?: number;
  result?: any[];
  error?: any;
}

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
  useNameAsId?: boolean;
  separateAmbient?: boolean;
  [k: string]: any;
}

export interface ColorTemperatureConfiguration {
  min: number;
  max: number;
}

const nameCount = new Map<string, number>();

interface Deferred<T> {
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  timestamp: number;
}

function withTimeout<T>(promise: Promise<T>, ms: number, timeoutError = new Error("__timeout__")): Promise<T> {
  // create a promise that rejects in milliseconds
  const timeout = new Promise<never>((_resolve, reject) => {
    setTimeout(() => {
      reject(timeoutError);
    }, ms);
  });

  // returns a race between timeout and the passed promise
  return Promise.race<T>([promise, timeout]);
}

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class YeeAccessory {
  private services: ConcreteLightService[] = [];
  private _detailedLogging = false;
  public connected: boolean;
  public name: string;
  public readonly specs: Specs;
  public displayName = "unset";
  private support: string[];
  private updateTimestamp: number;
  private attributes: Attributes = { ...EMPTY_ATTRIBUTES };
  private lastCommandId = 1;
  private heartbeatTimestamp = 0;
  public overrideConfig?: OverrideLightConfiguration;
  private interval?: NodeJS.Timeout;
  private transactions = new Map<number, Deferred<void>>();
  private keepAlives = new Set<number>();

  private static handledAccessories = new Map<string, YeeAccessory>();
  private floodAlarm?: number;

  public static instance(
    device: Device,
    platform: YeelighterPlatform,
    accessory: PlatformAccessory,
    ambientAccessory?: PlatformAccessory
  ) {
    const cache = YeeAccessory.handledAccessories.get(device.info.id);
    if (cache) {
      cache.debug("cache hit");
      cache.device.reconnect();
      return cache;
    }
    const a = new YeeAccessory(platform, device, accessory, ambientAccessory);
    YeeAccessory.handledAccessories.set(device.info.id, a);
    return a;
  }

  public get detailedLogging() {
    return this._detailedLogging;
  }

  private constructor(
    private readonly platform: YeelighterPlatform,
    public readonly device: Device,
    private readonly accessory: PlatformAccessory,
    private readonly ambientAccessory?: PlatformAccessory
  ) {
    const deviceInfo: DeviceInfo = device.info;
    if (!deviceInfo || !deviceInfo.support || !deviceInfo.model) {
      this.error(`deviceInfo is corrupt or emtpy: ${JSON.stringify(deviceInfo)}`);
    }
    const support = deviceInfo.support.split(" ");
    let specs = MODEL_SPECS[deviceInfo.model];
    let name = deviceInfo.id;
    this.connected = false;
    const override: OverrideLightConfiguration[] = (platform.config.override as OverrideLightConfiguration[]) || [];

    if (!specs) {
      specs = { ...EMPTY_SPECS };
      this.warn(
        `no specs for light ${deviceInfo.id} ${deviceInfo.model}. 
        It supports: ${deviceInfo.support}. Using fallback. This will not give you nightLight support.`
      );
      specs.name = deviceInfo.model;
      specs.color = support.includes("set_hsv");
      specs.backgroundLight = support.includes("bg_set_hsv");
      specs.nightLight = false;
      if (!support.includes("set_ct_abx")) {
        specs.colorTemperature.min = 0;
        specs.colorTemperature.max = 0;
      }
    }
    const overrideConfig: OverrideLightConfiguration | undefined = override?.find((item) => item.id === deviceInfo.id);
    if (overrideConfig?.backgroundLight) {
      specs.backgroundLight = overrideConfig.backgroundLight;
    }
    if (overrideConfig?.color) {
      specs.color = overrideConfig.color;
    }
    if (overrideConfig?.name) {
      name = overrideConfig.name;
    }
    this.name = name;
    if (overrideConfig?.nightLight) {
      specs.nightLight = overrideConfig.nightLight;
    }
    this.specs = specs;
    this._detailedLogging = !!overrideConfig?.log;

    this.connectDevice(this.device);

    let typeString = "UNKNOWN";
    const parameters = {
      accessory,
      platform,
      light: this
    };
    if (specs.color) {
      this.services.push(new ColorLightService(parameters));
      typeString = "Color light";
    } else {
      if (specs.colorTemperature.min === 0 && specs.colorTemperature.max === 0) {
        this.services.push(new WhiteLightService(parameters));
        typeString = "White light";
      } else {
        this.services.push(new TemperatureLightService(parameters));
        typeString = "Color temperature light";
      }
    }
    if (support.includes("bg_set_power")) {
      if (this.config.separateAmbient && ambientAccessory) {
        this.services.push(new BackgroundLightService({ ...parameters, accessory: ambientAccessory }));
      } else {
        this.services.push(new BackgroundLightService(parameters));
      }
      typeString = `${typeString} with ambience light`;
    }

    this.support = support;
    this.updateTimestamp = 0;

    this.setInfoService(overrideConfig, accessory);
    if (ambientAccessory) {
      this.setInfoService(overrideConfig, ambientAccessory);
    }

    // name handling
    this.log(`installed as ${typeString}`);
  }

  get info() {
    return this.device.info;
  }

  protected get config(): OverrideLightConfiguration {
    const override = (this.platform.config.override || []) as OverrideLightConfiguration[];
    const { device } = this.accessory.context;
    const overrideConfig: OverrideLightConfiguration | undefined = override.find((item) => item.id === device.id);

    return overrideConfig || { id: device.id };
  }

  public debug = (message?: unknown, ...optionalParameters: unknown[]): void => {
    this.platform.log.debug(`[${this.name}] ${message}`, optionalParameters);
  };

  public log = (message?: unknown, ...optionalParameters: unknown[]): void => {
    this.platform.log.info(`[${this.name}] ${message}`, optionalParameters);
  };

  public warn = (message?: unknown, ...optionalParameters: unknown[]): void => {
    this.platform.log.warn(`[${this.name}] ${message}`, optionalParameters);
  };

  public error = (message?: unknown, ...optionalParameters: unknown[]): void => {
    this.platform.log.error(`[${this.name}] ${message}`, optionalParameters);
  };

  private lastFetchTime?: number;
  private fetchInProgress?: Promise<Attributes>;

  public getAttributes = async (): Promise<Attributes> => {
    const now = Date.now();

    // Check if we have a cached response and if it's less than a second old
    if (this.lastFetchTime && now - this.lastFetchTime < 1000) {
      return this.attributes;
    }

    if (this.fetchInProgress) {
      return this.fetchInProgress;
    }

    // Start a new fetch
    this.fetchInProgress = (async () => {
      try {
        await withTimeout(
          this.sendCommandPromise("get_prop", this.device.info.trackedAttributes),
          this.platform.config.timeout || 1000
        );
        // Cache the response with the current timestamp
        this.lastFetchTime = now;
        return this.attributes;
      } catch (error: unknown) {
        if (error instanceof Error && error.message === "__timeout__") {
          if (this.attributes.name == "unknown") {
            this.warn("Retrieving attributes timed out. Using last attributes.");
          } else {
            this.error("Retrieving attributes timed out. Returning EMPTY attributes.");
            // can't throw here - it would take down homebridge
            // throw new Error("timeout");
          }
          // If the request times out, return the cached response
          return this.attributes;
        }
        this.warn("Retrieving attributes failed. Using last attributes.", error);
        // If there's an error and we have a cached response, return it
        return this.attributes;
      } finally {
        // Clear the fetchInProgress flag
        this.fetchInProgress = undefined;
      }
    })();
    return this.attributes;
  };

  public setAttributes(attributes: Partial<Attributes>) {
    this.attributes = { ...this.attributes, ...attributes };
  }

  private onDeviceUpdate = (update: IncomingMessage) => {
    const { id, result, error } = update;

    this.updateTimestamp = Date.now();

    if (!id) {
      // this is some strange unknown message
      this.warn("unknown response", update);
      return;
    }
    // the the promise for the transaction
    const transaction = this.transactions.get(id);
    const keepAlive = this.keepAlives.delete(id);
    if (!transaction && !keepAlive) {
      this.warn(`no transactions found for ${id}`);
    }
    if (transaction) {
      const seconds = (Date.now() - transaction.timestamp) / 1000;
      this.debug(`transaction ${id} took ${seconds}s`, update);
      this.transactions.delete(id);
    }
    if (result && result.length === 1 && result[0] === "ok") {
      this.connected = true;
      this.debug(`received ${id}: OK`);
      transaction?.resolve();
      // simple ok
    } else if (result && result.length > 3) {
      this.connected = true;
      if (this.lastCommandId != id) {
        this.warn(`update with unexpected id: ${id}, expected: ${this.lastCommandId}`);
        this.lastCommandId = id;
      }

      const seconds = (Date.now() - this.heartbeatTimestamp) / 1000;
      this.debug(`received update ${id} after ${seconds}s: ${JSON.stringify(result)}`);
      const newAttributes = { ...EMPTY_ATTRIBUTES };
      for (const key of Object.keys(this.attributes)) {
        const index = TRACKED_ATTRIBUTES.indexOf(key);
        switch (typeof EMPTY_ATTRIBUTES[key]) {
          case "number": {
            if (!Number.isNaN(Number(result[index]))) {
              newAttributes[key] = Number(result[index]);
            }
            break;
          }
          case "boolean": {
            newAttributes[key] = result[index] === "on";
            break;
          }
          default: {
            newAttributes[key] = result[index];
            break;
          }
        }
      }

      this.onUpdateAttributes(newAttributes);
      transaction?.resolve();
    } else if (error) {
      if (error.message.includes("quota")) {
        this.warn(`quota exceeded for request [${id}]`);
        this.floodAlarm = Date.now();
        // this.onDeviceDisconnected();
      } else {
        this.error(`Error returned for request [${id}]: ${JSON.stringify(error)}`);
      }
      transaction?.reject(error);
    } else {
      this.warn(`received unhandled ${id}:`, update);
      transaction?.resolve();
    }
  };

  private onUpdateAttributes = (newAttributes: Attributes) => {
    if (JSON.stringify(this.attributes) !== JSON.stringify(newAttributes)) {
      if (!this.config?.blocking) {
        for (const service of this.services) {
          service.onAttributesUpdated(newAttributes);
        }
      }
      this.attributes = { ...newAttributes };
    }
  };

  private onDeviceConnected = async () => {
    this.connected = true;
    this.log(`${this.info.model} Connected`);

    try {
      // dont await. We're in an interval handler.
      this.sendHeartbeat();
    } catch (error) {
      this.error("Failed to retrieve attributes", error);
    }

    if (this.platform.config.interval !== 0) {
      this.interval = setInterval(this.onInterval, this.platform.config.interval || 60_000);
    }
  };

  private onDeviceDisconnected = () => {
    if (this.connected) {
      this.connected = false;
      this.log("Disconnected");
      if (this.config?.offOnDisconnect) {
        this.attributes.power = false;
        this.attributes.bg_power = false;
        this.log("configured to mark as powered-off when disconnected");
        for (const service of this.services) service.onPowerOff();
      }
    }
    if (this.interval) {
      clearInterval(this.interval);
      delete this.interval;
    }
  };

  private onDeviceError = (error) => {
    this.log("Device Error", error);
  };

  connectDevice(device: Device) {
    device.connect();
    device.on("deviceUpdate", this.onDeviceUpdate);
    device.on("connected", this.onDeviceConnected);
    device.on("disconnected", this.onDeviceDisconnected);
    device.on("deviceError", this.onDeviceError);
  }

  // Respond to identify request
  identify(callback: () => void): void {
    this.log(`Hi ${this.info.model}`);
    callback();
  }

  setNameService(service: Service) {
    service.getCharacteristic(this.platform.Characteristic.ConfiguredName).on("set", (value, callback) => {
      this.log(`setting name to "${value}".`);
      service.displayName = value.toString();
      this.displayName = value.toString();
      service.setCharacteristic(this.platform.Characteristic.Name, value);
      for (const service of this.services) {
        service.updateName(value.toString());
      }
      this.platform.api.updatePlatformAccessories([this.accessory]);
      callback();
    });
  }

  setInfoService(override: OverrideLightConfiguration | undefined, accessory: PlatformAccessory) {
    const { platform, specs, info } = this;
    // set accessory information
    let infoService = accessory.getService(platform.Service.AccessoryInformation);
    let name = override?.name || specs.name;
    let count = nameCount.get(name) || 0;
    count = count + 1;
    nameCount.set(name, count);
    if (count > 1) {
      name = `${name} ${count}`;
    }
    if (infoService) {
      // re-use service from cache
      infoService
        .updateCharacteristic(platform.Characteristic.Manufacturer, "Yeelighter")
        .updateCharacteristic(platform.Characteristic.Model, specs.name)
        .updateCharacteristic(platform.Characteristic.Name, name)
        .updateCharacteristic(platform.Characteristic.SerialNumber, info.id)
        .updateCharacteristic(platform.Characteristic.FirmwareRevision, info.fw_ver);
    } else {
      infoService = new platform.Service.AccessoryInformation();
      infoService
        .updateCharacteristic(platform.Characteristic.Manufacturer, "Yeelighter")
        .updateCharacteristic(platform.Characteristic.Model, specs.name)
        .updateCharacteristic(platform.Characteristic.Name, name)
        .updateCharacteristic(platform.Characteristic.SerialNumber, info.id)
        .updateCharacteristic(platform.Characteristic.FirmwareRevision, info.fw_ver);
      accessory.addService(infoService);
    }
    this.setNameService(infoService);

    return infoService;
  }

  public sendCommand(method: string, parameters: Array<string | number | boolean>) {
    if (!this.connected) {
      this.warn("send command but device doesn't seem connected");
    }
    const supportedCommands = this.device.info.support.split(",");
    if (!supportedCommands.includes) {
      this.warn(`sending ${method} although unsupported.`);
    }
    const id = this.lastCommandId + 1;
    this.debug(`sendCommand(${id}, ${method}, ${JSON.stringify(parameters)})`);
    this.device.sendCommand({ id, method, params: parameters });
    this.lastCommandId = id;
    return id;
  }

  private sendHeartbeat() {
    this.debug("sending heartbeat");
    this.heartbeatTimestamp = Date.now();
    const id = this.sendCommand("get_prop", this.device.info.trackedAttributes);
    this.keepAlives.add(id);
  }

  async sendCommandPromise(method: string, parameters: Array<string | number | boolean>): Promise<void> {
    return new Promise((resolve, reject) => {
      const timestamp = Date.now();
      const id = this.sendCommand(method, parameters);
      this.debug(`sent command ${id}: ${method}`, parameters);
      this.transactions.set(id, { resolve, reject, timestamp });
    });
  }

  private clearOldTransactions() {
    for (const [key, item] of this.transactions.entries()) {
      // clear transactions older than 60s
      if (item.timestamp > Date.now() + 60_000) {
        this.log(`error: timeout for request ${key}`);
        item.reject(new Error("timeout"));
        this.transactions.delete(key);
      }
    }
  }

  private onInterval = () => {
    if (this.connected) {
      // if flooded wait for 5 minutes
      if (this.floodAlarm && Date.now() - this.floodAlarm > 180_000_000) {
        this.log(`flooded. waiting ${(Date.now() - this.floodAlarm) / 60_000}s`);
      } else {
        // seconds since last update
        const updateSince = (Date.now() - this.updateTimestamp) / 1000;
        const updateThreshold =
          ((this.platform.config.timeout || 5000) + (this.platform.config.interval || 60_000)) / 1000;
        if (this.updateTimestamp !== 0 && updateSince > updateThreshold) {
          this.log(
            `No update received within ${updateSince}s (Threshold: ${updateThreshold} (${this.platform.config.timeout}+${this.platform.config.interval}) => switching to unreachable`
          );
          this.onDeviceDisconnected();
        } else {
          this.sendHeartbeat();
        }
      }
      //
    } else {
      if (this.interval) {
        clearInterval(this.interval);
        delete this.interval;
      }
    }
    this.clearOldTransactions();
  };
}
