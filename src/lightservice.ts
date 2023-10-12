import { Service, PlatformAccessory, Characteristic } from "homebridge";
import { convertHomeKitColorTemperatureToHomeKitColor } from "./colortools";
import { YeelighterPlatform } from "./platform";
import { YeeAccessory, OverrideLightConfiguration } from "./yeeaccessory";
import { Specs } from "./specs";
import { Device } from "./yeedevice";

export const POWERMODE_DEFAULT = 0;
export const POWERMODE_CT = 1;
export const POWERMODE_HSV = 3;
export const POWERMODE_MOON = 5;

// PowerMode:
// 0: Normal turn on operation(default value)
// 1: Turn on and switch to CT mode.   (used for white lights)
// 2: Turn on and switch to RGB mode.  (never used here)
// 3: Turn on and switch to HSV mode.  (used for color lights)
// 4: Turn on and switch to color flow mode.
// 5: Turn on and switch to Night light mode. (Ceiling light only).

// ColorMode:
// 1 means color mode, (rgb -- never used here)
// 2 means color temperature mode, (CT used for white light)
// 3 means HSV mode (used for color lights)

export interface Attributes {
  power: boolean;
  color_mode: number;
  bright: number;
  hue: number;
  sat: number;
  ct: number;
  bg_power: boolean;
  bg_bright: number;
  bg_hue: number;
  bg_sat: number;
  bg_ct: number; // ct of background light
  bg_lmode: number; // colormode of background light
  nl_br: number; // brightness of night mode
  active_mode: number; // 0: daylight mode / 1: moonlight mode (ceiling light only)
  name: string;
}

export const EMPTY_ATTRIBUTES: Attributes = {
  power: false,
  color_mode: 0,
  bright: 0,
  hue: 0,
  sat: 0,
  ct: 0,
  bg_power: false,
  bg_bright: 0,
  bg_hue: 0,
  bg_sat: 0,
  bg_ct: 0,
  bg_lmode: 0,
  nl_br: 0,
  active_mode: 0,
  name: "unknown"
};

export function powerModeFromColorModeAndActiveMode(color_mode: number, active_mode: number) {
  // PowerMode:
  // 0: Normal turn on operation(default value)
  // 1: Turn on and switch to CT mode.   (used for white lights)
  // 2: Turn on and switch to RGB mode.  (never used here)
  // 3: Turn on and switch to HSV mode.  (used for color lights)
  // 4: Turn on and switch to color flow mode.
  // 5: Turn on and switch to Night light mode. (Ceiling light only).

  // ColorMode:
  // 1 means color mode, (rgb -- never used here)
  // 2 means color temperature mode, (CT used for white light)
  // 3 means HSV mode (used for color lights)
  if (active_mode === 1) {
    return POWERMODE_MOON;
  }
  switch (color_mode) {
    case 1:
      // this is never used
      return POWERMODE_DEFAULT;
    case 2:
      return POWERMODE_CT;
    case 3:
      return POWERMODE_HSV;
    default:
      // this should never happen!
      return POWERMODE_DEFAULT;
  }
}

export function convertColorTemperature(value: number): number {
  // check if value is valid
  if (Number.isFinite(value) && value > 0) {
    return Math.round(1_000_000 / value);
  }
  return 1000;
}

export function isValidValue(value: unknown) {
  switch (typeof value) {
    case "boolean":
      return true;
    case "number":
      return Number.isFinite(value);
    case "string":
      return true;
    default:
      return false;
  }
}

export interface ConcreteLightService {
  service: Service;
  onAttributesUpdated: (newAttributes: Attributes) => void;
  onPowerOff: () => void;
  updateName(value: string);
}

export interface LightServiceParameters {
  platform: YeelighterPlatform;
  readonly accessory: PlatformAccessory;
  light: YeeAccessory;
}

export class LightService {
  public service: Service;
  protected powerMode: number;
  protected lastHue?: number;
  protected lastSat?: number;
  protected readonly platform: YeelighterPlatform;
  protected readonly accessory: PlatformAccessory;
  protected light: YeeAccessory;
  protected name: string;

  constructor(
    parameters: LightServiceParameters,
    protected subtype?: string
  ) {
    this.platform = parameters.platform;
    this.accessory = parameters.accessory;
    this.light = parameters.light;

    // we use powerMode to store the currently set mode
    switch (this.light.info.color_mode) {
      case 2:
        this.powerMode = POWERMODE_CT;
        break;
      case 3:
        this.powerMode = POWERMODE_HSV;
        break;
      default:
        // this should never happen!
        this.powerMode = POWERMODE_DEFAULT;
        break;
    }
    this.name = this.config?.name || this.device.info.id;

    // get the LightBulb service if it exists, otherwise create a new LightBulb service
    // we create multiple services for lights that have a subtype set
    if (subtype) {
      const subtypeUid = `${this.light.info.id}#${subtype}`;
      this.log(`registering subtype ${subtypeUid}`);
      this.service =
        this.accessory.getService(subtypeUid) ||
        this.accessory.addService(this.platform.Service.Lightbulb, `${this.name} ${subtype}`, subtypeUid);
    } else {
      this.log(`no subtype`);
      this.service =
        this.accessory.getService(this.platform.Service.Lightbulb) ||
        this.accessory.addService(this.platform.Service.Lightbulb);
    }

    // name handling
    this.service.getCharacteristic(this.platform.Characteristic.ConfiguredName).on("set", (value, callback) => {
      this.log("setConfiguredName", value);
      const name = value.toString();
      this.service.displayName = name;
      this.name = name;
      this.service.setCharacteristic(this.platform.Characteristic.Name, value);
      this.platform.api.updatePlatformAccessories([this.accessory]);
      callback();
    });
  }

  public get detailedLogging() {
    return this.light.detailedLogging;
  }

  public updateName(value: string) {
    this.log("Ingoring updateName", value);
    // this.name = value;
    // this.service.setCharacteristic(this.platform.Characteristic.Name, `${value} ${this.subtype}`);
    // this.platform.api.updatePlatformAccessories([this.accessory]);
  }

  protected get device(): Device {
    return this.light.device;
  }

  private get logPrefix(): string {
    if (this.subtype) {
      return `[${this.name}#${this.subtype}]`;
    }
    return `[${this.name}]`;
  }

  public log = (message?: unknown, ...optionalParameters: unknown[]): void => {
    this.platform.log.info(`${this.logPrefix} ${message}`, optionalParameters);
  };

  public warn = (message?: unknown, ...optionalParameters: unknown[]): void => {
    this.platform.log.warn(`${this.logPrefix} ${message}`, optionalParameters);
  };

  public error = (message?: unknown, ...optionalParameters: unknown[]): void => {
    this.platform.log.error(`${this.logPrefix} ${message}`, optionalParameters);
  };

  public debug = (message?: unknown, ...optionalParameters: unknown[]): void => {
    if (this.light.detailedLogging) {
      this.platform.log.info(`${this.logPrefix} ${message}`, optionalParameters);
    } else {
      this.platform.log.debug(`${this.logPrefix} ${message}`, optionalParameters);
    }
  };

  protected get config(): OverrideLightConfiguration {
    const override = (this.platform.config.override || []) as OverrideLightConfiguration[];
    const { info } = this.device;
    const overrideConfig: OverrideLightConfiguration | undefined = override.find((item) => item.id === info.id);

    return overrideConfig || { id: info.id };
  }

  get specs(): Specs {
    return this.light.specs;
  }

  public async attributes() {
    return this.light.getAttributes();
  }

  public async getAttribute<U extends keyof Attributes>(attribute: U) {
    // this should never throw
    const a = await this.attributes();
    return a[attribute];
  }

  public setAttributes(attributes: Partial<Attributes>) {
    this.light.setAttributes(attributes);
  }

  protected handleCharacteristic(uuid: any, getter: () => Promise<any>, setter: (value: any) => void): Characteristic {
    const characteristic = this.service.getCharacteristic(uuid);
    if (!characteristic) {
      throw new Error("Could not get Characteristic");
    }
    characteristic.on("get", async (callback) => {
      if (this.light.connected) {
        callback(undefined, await getter());
      } else {
        callback(new Error("light disconnected"));
      }
    });
    characteristic.on("set", async (value, callback) => {
      if (this.light.connected && isValidValue(value)) {
        await setter(value);
        callback();
      } else {
        this.log(`failed to set to value`, value, this.light.connected);
        callback(new Error("light disconnected or invalid value"));
      }
    });
    return characteristic;
  }

  protected async updateCharacteristic(uuid: any, value: boolean | number | string) {
    const characteristic = this.service.getCharacteristic(uuid);
    if (!characteristic) {
      return Promise.reject();
    }
    if (isValidValue(value)) {
      characteristic.updateValue(value);
    } else {
      this.error("updateCharacteristic value is not finite", value);
    }
  }

  public onPowerOff = () => {
    this.updateCharacteristic(this.platform.Characteristic.On, false);
  };

  protected async sendCommandPromiseWithErrorHandling(
    method: string,
    parameters: Array<string | number | boolean>
  ): Promise<void> {
    try {
      await this.light.sendCommandPromise(method, parameters);
    } catch (error) {
      // catch all errors so Homebridge doesn't crash
      this.warn("Command failed", error);
    }
  }

  protected async sendCommand(method: string, parameters: Array<string | number | boolean>): Promise<void> {
    return this.sendCommandPromiseWithErrorHandling(method, parameters);
  }

  protected async sendSuddenCommand(method: string, parameter: string | number | boolean) {
    return this.sendCommandPromiseWithErrorHandling(method, [parameter, "sudden", 0]);
  }

  protected async sendSmoothCommand(method: string, parameter: string | number | boolean) {
    return this.sendCommandPromiseWithErrorHandling(method, [parameter, "smooth", 500]);
  }

  protected saveDefaultIfNeeded() {
    if (this.config?.saveDefault) {
      this.sendCommand("set_default", []);
    }
  }

  protected async ensurePowerMode(mode: number, prefix = "") {
    if (this.powerMode !== mode) {
      await this.sendCommand(`${prefix}set_power`, ["on", "sudden", 0, mode]);
      this.powerMode = mode;
      if (prefix == "bg") {
        this.setAttributes({ bg_power: true });
      } else {
        this.setAttributes({ power: true, active_mode: mode == POWERMODE_MOON ? 1 : 0 });
      }
    }
  }

  protected async setHSV(prefix = "") {
    const hue = this.lastHue;
    const sat = this.lastSat;
    if (hue && sat) {
      await this.ensurePowerMode(POWERMODE_HSV, prefix);
      const hsv = [hue, sat, "sudden", 0];
      delete this.lastHue;
      delete this.lastSat;
      await this.sendCommand(`${prefix}set_hsv`, hsv);
      if (prefix == "bg") {
        this.setAttributes({ bg_hue: hue, bg_sat: sat });
      } else {
        this.setAttributes({ hue, sat });
      }
      this.saveDefaultIfNeeded();
    }
  }

  protected updateColorFromCT(value: number) {
    const { h, s } = convertHomeKitColorTemperatureToHomeKitColor(value);
    this.service.getCharacteristic(this.platform.Characteristic.Hue).updateValue(h);
    this.service.getCharacteristic(this.platform.Characteristic.Saturation).updateValue(s);
  }
}
