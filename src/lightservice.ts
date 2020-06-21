/* eslint-disable @typescript-eslint/camelcase */
// import { Service, Characteristic, CharacteristicEventTypes, WithUUID, Accessory } from "hap-nodejs";

import { Light } from "./light";
import { convertHomeKitColorTemperatureToHomeKitColor } from "./colortools";
import { Specs } from "./specs";

// HACK: since importing these types will somehow create a dependency to hap-nodejs
export type Accessory = any;
export type Service = any;
export type Characteristic = any;

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

export interface Configuration {
  [key: string]: any;
}

export function convertColorTemperature(value: number): number {
  return Math.round(1000000 / value);
}

export interface ConcreteLightService {
  service: Service;
  onAttributesUpdated: (newAttributes: Attributes) => void;
  onPowerOff: () => void;
}

export class LightService {
  public service: Service;
  protected powerMode: number;
  protected lastHue?: number;
  protected lastSat?: number;

  constructor(
    protected log: (message?: any, ...optionalParams: any[]) => void,
    protected config: Configuration,
    protected light: Light,
    protected homebridge: any,
    accessory: any,
    protected subtype?: string
  ) {
    // we use powerMode to store the currently set mode
    switch (light.info.color_mode) {
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
    const service = accessory.getServiceByUUIDAndSubType(this.homebridge.hap.Service.Lightbulb, subtype);
    if (!service) {
      this.log(`Creating new service of subtype '${subtype}' and adding it`);
      const newService = new this.homebridge.hap.Service.Lightbulb(this.specs.name || "Main", subtype);
      accessory.addService(newService);
      this.service = newService;
    } else {
      this.log(`Re-using service of subtype '${subtype}'.`);
      this.service = service;
    }
  }

  get specs(): Specs {
    return this.light.specs;
  }

  public async attributes() {
    return this.light.getAttributes();
  }

  public setAttributes(attributes: Partial<Attributes>) {
    this.light.setAttributes(attributes);
  }

  protected async handleCharacteristic(
    uuid: any,
    getter: () => Promise<any>,
    setter: (value: any) => void
  ): Promise<Characteristic> {
    const characteristic = this.service.getCharacteristic(uuid);
    if (!characteristic) {
      return Promise.reject();
    }
    characteristic.on("get", async callback => {
      if (this.light.connected) {
        callback(null, await getter());
      } else {
        callback("light disconnected");
      }
    });
    characteristic.on("set", async (value, callback) => {
      if (this.light.connected) {
        await setter(value);
      }
      callback();
    });
    return characteristic;
  }

  protected async updateCharacteristic(uuid: any, value: boolean | number | string) {
    const characteristic = this.service.getCharacteristic(uuid);
    if (!characteristic) {
      return Promise.reject();
    }
    characteristic.updateValue(value);
  }

  public onPowerOff = () => {
    this.updateCharacteristic(this.homebridge.hap.Characteristic.On, false);
  };

  protected async sendCommand(method: string, parameters: Array<string | number | boolean>): Promise<void> {
    return this.light.sendCommandPromise(method, parameters);
  }

  protected async sendSuddenCommand(method: string, parameter: string | number | boolean) {
    return this.light.sendCommandPromise(method, [parameter, "sudden", 0]);
  }

  protected async sendSmoothCommand(method: string, parameter: string | number | boolean) {
    return this.light.sendCommandPromise(method, [parameter, "smooth", 500]);
  }

  protected saveDefaultIfNeeded() {
    if (this.config?.saveDefault) {
      this.sendCommand("set_default", []);
    }
  }

  protected async ensurePowerMode(mode: number, prefix = "") {
    if (this.powerMode !== mode) {
      await this.light.sendCommand(`${prefix}set_power`, ["on", "sudden", 0, mode]);
      this.powerMode = mode;
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
    this.service.getCharacteristic(this.homebridge.hap.Characteristic.Hue).updateValue(h);
    this.service.getCharacteristic(this.homebridge.hap.Characteristic.Saturation).updateValue(s);
  }
}

/* eslint-enable @typescript-eslint/camelcase */
