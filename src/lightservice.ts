/* eslint-disable @typescript-eslint/camelcase */
// import { Service, Characteristic, CharacteristicEventTypes, WithUUID, Accessory } from "hap-nodejs";

import { Light } from "./light";

// HACK: since importing these types will somehow create a dependency to hap-nodejs
type Accessory = any;
type Service = any;
type Characteristic = any;

// PowerMode:
// 0: Normal turn on operation(default value)
// 1: Turn on and switch to CT mode.   (used for white lights)
// 2: Turn on and switch to RGB mode.  (never used here)
// 3: Turn on and switch to HSV mode.  (used for color lights)
// 4: Turn on and switch to color flow mode.
// 5: Turn on and switch to Night light mode. (Ceiling light only).

// ColorMode:
// 1 means color mode, (never used here)
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
  nl_br: 0,
  active_mode: 0,
  name: "unknown"
};

function powerModeFromColorModeAndActiveMode(color_mode: number, active_mode: number) {
  if (active_mode === 1) {
    return 5;
  }
  switch (color_mode) {
    case 1:
      return 2;
    case 2:
      return 1;
    case 3:
      return 3;
    default:
      // this should never happen!
      return 0;
  }
}

export const EMPTY_SPECS: Specs = {
  colorTemperature: { min: 2700, max: 2700 },
  nightLight: false,
  backgroundLight: false,
  name: "unknown",
  color: false
};

// Model specs, thanks to https://gitlab.com/stavros/python-yeelight
export const MODEL_SPECS: { [index: string]: Specs } = {
  mono: {
    colorTemperature: { min: 2700, max: 2700 },
    nightLight: false,
    backgroundLight: false,
    name: "Serene Eye-Friendly Desk Lamp",
    color: false
  },
  stripe: {
    colorTemperature: { min: 1700, max: 6500 },
    nightLight: false,
    backgroundLight: false,
    name: "Lightstrip Plus",
    color: true
  },
  mono1: {
    colorTemperature: { min: 2700, max: 2700 },
    nightLight: false,
    backgroundLight: false,
    name: "mono1",
    color: false
  },
  color: {
    colorTemperature: { min: 1700, max: 6500 },
    nightLight: false,
    backgroundLight: false,
    name: "color",
    color: true
  },
  color1: {
    colorTemperature: { min: 1700, max: 6500 },
    nightLight: false,
    backgroundLight: false,
    name: "color1",
    color: true
  },
  strip1: {
    colorTemperature: { min: 1700, max: 6500 },
    nightLight: false,
    backgroundLight: false,
    name: "strip1",
    color: true
  },
  bslamp1: {
    colorTemperature: { min: 1700, max: 6500 },
    nightLight: false,
    backgroundLight: false,
    name: "bslamp1",
    color: true
  },
  bslamp2: {
    colorTemperature: { min: 1700, max: 6500 },
    nightLight: true,
    backgroundLight: false,
    name: "Bedside Lamp",
    color: true
  },
  ceiling1: {
    colorTemperature: { min: 2700, max: 6500 },
    nightLight: true,
    backgroundLight: false,
    name: "Ceiling Light",
    color: false
  },
  ceiling2: {
    colorTemperature: { min: 2700, max: 6500 },
    nightLight: true,
    backgroundLight: false,
    name: "Ceiling Light - Youth Version",
    color: false
  },
  ceiling3: {
    colorTemperature: { min: 2700, max: 6500 },
    nightLight: true,
    backgroundLight: false,
    name: "Ceiling Light (Jiaoyue 480)",
    color: false
  },
  ceiling4: {
    colorTemperature: { min: 2700, max: 6500 },
    nightLight: true,
    backgroundLight: true,
    name: "Moon Pro (Jiaoyue 650)",
    color: false
  },
  ceiling11: {
    colorTemperature: { min: 2700, max: 6500 },
    nightLight: true,
    backgroundLight: false,
    name: "Ceiling Light (YLXD41YL)",
    color: false
  },
  ceiling15: {
    colorTemperature: { min: 2700, max: 6500 },
    nightLight: true,
    backgroundLight: false,
    name: "Ceiling Light (YLXD42YL)",
    color: false
  },
  ceiling20: {
    colorTemperature: { min: 2700, max: 6500 },
    nightLight: true,
    backgroundLight: true,
    name: "GuangCan",
    color: false
  },
  color2: {
    colorTemperature: { min: 2700, max: 6500 },
    nightLight: false,
    backgroundLight: false,
    name: "color2",
    color: true
  }
};

export interface Configuration {
  [key: string]: any;
}

function convertColorTemperature(value: number): number {
  return Math.round(1000000 / value);
}

export interface Specs {
  colorTemperature: { min: number; max: number };
  nightLight: boolean;
  backgroundLight: boolean;
  name: string;
  color: boolean;
}

export class LightService {
  public service: Service;
  protected powerMode: number;

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
      case 1:
        this.powerMode = 2;
        break;
      case 2:
        this.powerMode = 1;
        break;
      case 3:
        this.powerMode = 3;
        break;
      default:
        // this should never happen!
        this.powerMode = 0;
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

  async handleCharacteristic(
    uuid: any,
    getter: () => Promise<any>,
    setter: (value: any) => void
  ): Promise<Characteristic> {
    const characteristic = this.service.getCharacteristic(uuid);
    if (!characteristic) {
      return Promise.reject();
    }
    characteristic.on("get", async callback => callback(null, await getter()));
    characteristic.on("set", async (value, callback) => {
      await setter(value);
      callback();
    });
    return characteristic;
  }

  onAttributesUpdated = (newAttributes: Attributes) => {
    this.powerMode = powerModeFromColorModeAndActiveMode(newAttributes.color_mode, newAttributes.active_mode);
  };

  sendCommand(method: string, parameters: Array<string | number | boolean>) {
    this.light.sendCommand(method, parameters);
  }

  sendSuddenCommand(method: string, parameter: string | number | boolean) {
    this.light.sendCommand(method, [parameter, "sudden", 0]);
  }

  sendSmoothCommand(method: string, parameter: string | number | boolean) {
    this.light.sendCommand(method, [parameter, "smooth", 500]);
  }
}

export class WhiteLightService extends LightService {
  constructor(
    log: (message?: any, ...optionalParams: any[]) => void,
    config: Configuration,
    light: Light,
    homebridge: any,
    accessory: Accessory
  ) {
    super(log, config, light, homebridge, accessory, "main");
    this.service.displayName = "White Light";

    this.installHandlers();
  }

  private async installHandlers() {
    this.handleCharacteristic(
      this.homebridge.hap.Characteristic.On,
      async () => {
        const attributes = await this.attributes();
        return attributes.power;
      },
      value => this.sendCommand("set_power", [value ? "on" : "off", "smooth", 500, this.powerMode || 1])
    );
    this.handleCharacteristic(
      this.homebridge.hap.Characteristic.Brightness,
      async () => {
        const attributes = await this.attributes();
        if (this.specs.nightLight) {
          const { bright, nl_br, active_mode } = attributes;
          const br1 = Number(bright);
          const br2 = Number(nl_br);
          if (active_mode !== 1) {
            return br1 / 2 + 50;
          } else {
            return br2 / 2;
          }
        } else {
          return attributes.bright;
        }
      },
      value => {
        if (this.specs.nightLight) {
          if (value < 50) {
            if (this.powerMode !== 5) {
              this.sendCommand("set_power", ["on", "sudden", 0, 5]);
              this.powerMode = 5;
              this.log("Moonlight on");
            }
            this.sendSuddenCommand("set_bright", value * 2);
          } else {
            if (this.powerMode !== 1) {
              this.sendCommand("set_power", ["on", "sudden", 0, 1]);
              this.powerMode = 1;
              this.log("Moonlight off");
            }
            this.sendSuddenCommand("set_bright", (value - 50) * 2);
          }
        } else {
          if (this.powerMode !== 1) {
            this.sendCommand("set_power", ["on", "sudden", 0, 1]);
          }
          this.sendSuddenCommand("set_bright", value);
        }
      }
    );
    const characteristic = await this.handleCharacteristic(
      this.homebridge.hap.Characteristic.ColorTemperature,
      async () => convertColorTemperature((await this.attributes()).ct),
      value => this.sendSuddenCommand("set_ct_abx", convertColorTemperature(value))
    );
    characteristic.setProps({
      ...characteristic.props,
      maxValue: convertColorTemperature(this.specs.colorTemperature.min),
      minValue: convertColorTemperature(this.specs.colorTemperature.max)
    });
  }
}

export class BackgroundLightService extends LightService {
  private lastHue?: number;
  private lastSat?: number;
  constructor(
    log: (message?: any, ...optionalParams: any[]) => void,
    config: Configuration,
    light: Light,
    homebridge: any,
    accessory: Accessory
  ) {
    super(log, config, light, homebridge, accessory, "background");
    this.service.displayName = "Background Light";
    this.installHandlers();
  }

  private async installHandlers() {
    this.handleCharacteristic(
      this.homebridge.hap.Characteristic.On,
      async () => (await this.attributes()).bg_power,
      value => this.sendCommand("bg_set_power", [value ? "on" : "off", "smooth", 500, 3])
    );
    this.handleCharacteristic(
      this.homebridge.hap.Characteristic.Brightness,
      async () => (await this.attributes()).bg_bright,
      value => this.sendSuddenCommand("bg_set_bright", value)
    );
    this.handleCharacteristic(
      this.homebridge.hap.Characteristic.Hue,
      async () => (await this.attributes()).bg_hue,
      async value => {
        this.lastHue = value;
        if (this.lastHue && this.lastSat) {
          const hsv = [this.lastHue, this.lastSat, "sudden", 0];
          this.sendCommand("bg_set_hsv", hsv);
          delete this.lastHue;
          delete this.lastSat;
        }
      }
    );
    this.handleCharacteristic(
      this.homebridge.hap.Characteristic.Saturation,
      async () => (await this.attributes()).bg_sat,
      async value => {
        this.lastSat = value;
        if (this.lastHue && this.lastSat) {
          const hsv = [this.lastHue, this.lastSat, "sudden", 0];
          this.sendCommand("bg_set_hsv", hsv);
          delete this.lastHue;
          delete this.lastSat;
        }
      }
    );
  }
}

export class ColorLightService extends LightService {
  private lastHue?: number;
  private lastSat?: number;
  constructor(
    log: (message?: any, ...optionalParams: any[]) => void,
    config: Configuration,
    light: Light,
    homebridge: any,
    accessory: Accessory
  ) {
    super(log, config, light, homebridge, accessory, "main");
    this.service.displayName = "Color Light";
    this.installHandlers();
  }

  private async installHandlers() {
    this.handleCharacteristic(
      this.homebridge.hap.Characteristic.On,
      async () => (await this.attributes()).power,
      value => this.sendCommand("set_power", [value ? "on" : "off", "smooth", 500, 3])
    );
    this.handleCharacteristic(
      this.homebridge.hap.Characteristic.Brightness,
      async () => (await this.attributes()).bright,
      value => this.sendSuddenCommand("set_bright", value)
    );
    this.handleCharacteristic(
      this.homebridge.hap.Characteristic.Hue,
      async () => (await this.attributes()).hue,
      async value => {
        this.lastHue = value;
        if (this.lastHue && this.lastSat) {
          const hsv = [this.lastHue, this.lastSat, "sudden", 0];
          this.sendCommand("set_hsv", hsv);
          delete this.lastHue;
          delete this.lastSat;
        }
      }
    );
    this.handleCharacteristic(
      this.homebridge.hap.Characteristic.Saturation,
      async () => (await this.attributes()).sat,
      async value => {
        this.lastSat = value;
        if (this.lastHue && this.lastSat) {
          const hsv = [this.lastHue, this.lastSat, "sudden", 0];
          this.sendCommand("set_hsv", hsv);
          delete this.lastHue;
          delete this.lastSat;
        }
      }
    );
  }
}

/* eslint-enable @typescript-eslint/camelcase */
