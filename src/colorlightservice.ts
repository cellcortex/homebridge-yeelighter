import { Accessory, LightService, POWERMODE_HSV, convertColorTemperature, POWERMODE_CT } from "./lightservice";
import { Configuration } from "homebridge";
import { Light } from "./light";

export class ColorLightService extends LightService {
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
      value => this.sendCommand("set_power", [value ? "on" : "off", "smooth", 500, POWERMODE_HSV])
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
        this.setHSV();
      }
    );
    this.handleCharacteristic(
      this.homebridge.hap.Characteristic.Saturation,
      async () => (await this.attributes()).sat,
      async value => {
        this.lastSat = value;
        this.setHSV();
      }
    );
    const characteristic = await this.handleCharacteristic(
      this.homebridge.hap.Characteristic.ColorTemperature,
      async () => convertColorTemperature((await this.attributes()).ct),
      value => {
        this.ensurePowerMode(POWERMODE_CT);
        this.sendSuddenCommand("set_ct_abx", convertColorTemperature(value));
      }
    );
    characteristic.setProps({
      ...characteristic.props,
      maxValue: convertColorTemperature(this.specs.colorTemperature.min),
      minValue: convertColorTemperature(this.specs.colorTemperature.max)
    });
  }
}
