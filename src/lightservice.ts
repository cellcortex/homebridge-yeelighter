/* eslint-disable @typescript-eslint/camelcase */
import { Service, Characteristic, CharacteristicEventTypes, WithUUID, Accessory } from "hap-nodejs";
import { Device } from "./yeedevice";

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

// Model specs, thanks to https://gitlab.com/stavros/python-yeelight
export const MODEL_SPECS: { [index: string]: Specs } = {
  mono: {
    colorTemperature: { min: 2700, max: 2700 },
    nightLight: false,
    backgroundLight: false,
    name: "Serene Eye-Friendly Desk Lamp"
  },
  mono1: { colorTemperature: { min: 2700, max: 2700 }, nightLight: false, backgroundLight: false, name: "mono1" },
  color: { colorTemperature: { min: 1700, max: 6500 }, nightLight: false, backgroundLight: false, name: "color" },
  color1: { colorTemperature: { min: 1700, max: 6500 }, nightLight: false, backgroundLight: false, name: "color1" },
  strip1: { colorTemperature: { min: 1700, max: 6500 }, nightLight: false, backgroundLight: false, name: "strip1" },
  bslamp1: { colorTemperature: { min: 1700, max: 6500 }, nightLight: false, backgroundLight: false, name: "bslamp1" },
  bslamp2: {
    colorTemperature: { min: 1700, max: 6500 },
    nightLight: true,
    backgroundLight: false,
    name: "Bedside Lamp"
  },
  ceiling1: {
    colorTemperature: { min: 2700, max: 6500 },
    nightLight: true,
    backgroundLight: false,
    name: "Ceiling Light"
  },
  ceiling2: {
    colorTemperature: { min: 2700, max: 6500 },
    nightLight: true,
    backgroundLight: false,
    name: "Ceiling Light - Youth Version"
  },
  ceiling3: {
    colorTemperature: { min: 2700, max: 6500 },
    nightLight: true,
    backgroundLight: false,
    name: "Ceiling Light (Jiaoyue 480)"
  },
  ceiling4: {
    colorTemperature: { min: 2700, max: 6500 },
    nightLight: true,
    backgroundLight: true,
    name: "Moon Pro (Jiaoyue 650)"
  },
  ceiling15: {
    colorTemperature: { min: 2700, max: 6500 },
    nightLight: true,
    backgroundLight: false,
    name: "Ceiling Light (YLXD42YL)"
  },
  ceiling20: {
    colorTemperature: { min: 2700, max: 6500 },
    nightLight: true,
    backgroundLight: true,
    name: "GuangCan"
  },
  color2: { colorTemperature: { min: 2700, max: 6500 }, nightLight: false, backgroundLight: false, name: "color2" }
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
}

export class LightService {
  public service: Service;
  protected specs: Specs;
  constructor(
    protected log: (message?: any, ...optionalParams: any[]) => void,
    protected config: Configuration,
    protected device: Device,
    protected homebridge: any,
    private accessory: any,
    protected subtype?: string
  ) {
    this.specs = MODEL_SPECS[device.info.model];
    this.log(`checking if ${subtype} already exists on accessory`);
    const service = accessory.getServiceByUUIDAndSubType(Service.Lightbulb, subtype);
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

  async handleCharacteristic<T extends WithUUID<typeof Characteristic>>(
    uuid: T,
    getter: () => Promise<any>,
    setter: (value: any) => void
  ): Promise<Characteristic> {
    const characteristic = this.service.getCharacteristic(uuid);
    if (!characteristic) {
      return Promise.reject();
    }
    characteristic.on(CharacteristicEventTypes.GET, async callback => callback(null, await getter()));
    characteristic.on(CharacteristicEventTypes.SET, async (value, callback) => {
      await setter(value);
      callback();
    });
    return characteristic;
  }

  sendCommand(method: string, parameters: Array<string | number | boolean>) {
    this.device.sendCommand({ id: -1, method, params: parameters });
  }

  sendSuddenCommand(method: string, parameter: string | number | boolean) {
    this.device.sendCommand({ id: -1, method, params: [parameter, "sudden", 0] });
  }

  sendSmoothCommand(method: string, parameter: string | number | boolean) {
    this.device.sendCommand({ id: -1, method, params: [parameter, "smooth", 500] });
  }
}

export class WhiteLightService extends LightService {
  private lastBrightness?: number;
  private powerMode?: number;
  constructor(
    log: (message?: any, ...optionalParams: any[]) => void,
    config: Configuration,
    device: Device,
    homebridge: any,
    private attributes: () => Promise<Attributes>,
    accessory: Accessory
  ) {
    super(log, config, device, homebridge, accessory, "main");
    this.service.displayName = "White Light";
    this.installHandlers();
  }

  private async installHandlers() {
    this.handleCharacteristic(
      Characteristic.On,
      async () => (await this.attributes()).power,
      value => this.sendCommand("set_power", [value ? "on" : "off", "smooth", 500, this.powerMode || 2])
    );
    this.handleCharacteristic(
      Characteristic.Brightness,
      async () => {
        if (this.specs.nightLight) {
          const { bright, nl_br, active_mode } = await this.attributes();
          const br1 = Number(bright);
          const br2 = Number(nl_br);
          if (active_mode !== 1) {
            return br1 / 2 + 50;
          } else {
            return br2 / 2;
          }
        } else {
          return (await this.attributes()).bg_bright;
        }
      },
      value => {
        if (this.specs.nightLight) {
          if (value < 50) {
            if (!this.lastBrightness || this.lastBrightness >= 50) {
              this.log("Moonlight on");
              this.sendCommand("set_power", ["on", "sudden", 0, 5]);
              this.powerMode = 5;
            }
            this.sendSuddenCommand("set_bright", value * 2);
          } else {
            if (!this.lastBrightness || this.lastBrightness < 50) {
              this.log("Moonlight off");
              this.sendCommand("set_power", ["on", "sudden", 0, 1]);
              this.powerMode = 2;
            }
            this.sendSuddenCommand("set_bright", (value - 50) * 2);
          }
        } else {
          this.sendSuddenCommand("set_bright", value);
        }
        this.lastBrightness = value;
      }
    );
    const characteristic = await this.handleCharacteristic(
      Characteristic.ColorTemperature,
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
    device: Device,
    homebridge: any,
    private attributes: () => Promise<Attributes>,
    accessory: Accessory
  ) {
    super(log, config, device, homebridge, accessory, "background");
    this.service.displayName = "Background Light";
    this.installHandlers();
  }

  private async installHandlers() {
    this.handleCharacteristic(
      Characteristic.On,
      async () => (await this.attributes()).bg_power,
      value => this.sendCommand("bg_set_power", [value ? "on" : "off", "smooth", 500, 3])
    );
    this.handleCharacteristic(
      Characteristic.Brightness,
      async () => (await this.attributes()).bg_bright,
      value => this.sendSuddenCommand("bg_set_bright", value)
    );
    this.handleCharacteristic(
      Characteristic.Hue,
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
      Characteristic.Saturation,
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

/* eslint-enable @typescript-eslint/camelcase */
