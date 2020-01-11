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
      value => {
        this.sendSuddenCommand("set_bright", value);
        this.saveDefaultIfNeeded();
      }
    );
    this.handleCharacteristic(
      this.homebridge.hap.Characteristic.Hue,
      async () => {
        this.ensurePowerMode(POWERMODE_HSV);
        const attributes = await this.attributes();
        this.log(`${this.light.info.id} getHue: ${JSON.stringify(attributes)}`);
        return attributes.hue;
      },
      async value => {
        this.lastHue = value;
        this.setHSV();
      }
    );
    this.handleCharacteristic(
      this.homebridge.hap.Characteristic.Saturation,
      async () => {
        this.ensurePowerMode(POWERMODE_HSV);
        const attributes = await this.attributes();
        this.log(`${this.light.info.id} getSat: ${JSON.stringify(attributes)}`);
        return attributes.sat;
      },
      async value => {
        this.lastSat = value;
        this.setHSV();
      }
    );
    const characteristic = await this.handleCharacteristic(
      this.homebridge.hap.Characteristic.ColorTemperature,
      async () => {
        this.ensurePowerMode(POWERMODE_CT);
        const attributes = await this.attributes();
        this.log(
          `${this.light.info.id} getCT: ${JSON.stringify(attributes)} -> ${convertColorTemperature(attributes.ct)}`
        );
        return convertColorTemperature(attributes.ct);
      },
      value => {
        this.ensurePowerMode(POWERMODE_CT);
        this.log(`${this.light.info.id} setCT: ${convertColorTemperature(value)}`);
        this.sendSuddenCommand("set_ct_abx", convertColorTemperature(value));
        this.saveDefaultIfNeeded();
      }
    );
    characteristic.setProps({
      ...characteristic.props,
      maxValue: convertColorTemperature(this.specs.colorTemperature.min),
      minValue: convertColorTemperature(this.specs.colorTemperature.max)
    });
  }
}
