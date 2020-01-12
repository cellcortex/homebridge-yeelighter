import {
  Accessory,
  LightService,
  POWERMODE_HSV,
  convertColorTemperature,
  POWERMODE_CT,
  powerModeFromColorModeAndActiveMode,
  Attributes
} from "./lightservice";
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
        const attributes = await this.attributes();
        this.log(`getHue: ${JSON.stringify(attributes)}`);
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
        const attributes = await this.attributes();
        if (this.light.detailedLogging) {
          this.log(`getSat: ${JSON.stringify(attributes)}`);
        }
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
        const attributes = await this.attributes();
        if (this.light.detailedLogging) {
          this.log(`getCT: ${JSON.stringify(attributes)} -> ${convertColorTemperature(attributes.ct)}`);
        }
        return convertColorTemperature(attributes.ct);
      },
      value => {
        this.ensurePowerMode(POWERMODE_CT);
        if (this.light.detailedLogging) {
          this.log(`setCT: ${convertColorTemperature(value)}`);
        }
        this.sendSuddenCommand("set_ct_abx", convertColorTemperature(value));
        this.updateColorFromCT(value);
        this.saveDefaultIfNeeded();
      }
    );
    characteristic.setProps({
      ...characteristic.props,
      maxValue: convertColorTemperature(this.specs.colorTemperature.min),
      minValue: convertColorTemperature(this.specs.colorTemperature.max)
    });
  }

  public onAttributesUpdated = (newAttributes: Attributes) => {
    if (this.light.detailedLogging) {
      this.log(`color light updated ${JSON.stringify(newAttributes)}`);
    }
    this.powerMode = powerModeFromColorModeAndActiveMode(newAttributes.color_mode, newAttributes.active_mode);
    if (this.updateCharateristics) {
      this.updateCharacteristic(this.homebridge.hap.Characteristic.Saturation, newAttributes.sat);
      this.updateCharacteristic(this.homebridge.hap.Characteristic.Hue, newAttributes.hue);
      this.updateCharacteristic(this.homebridge.hap.Characteristic.Brightness, newAttributes.bright);
      this.updateCharacteristic(
        this.homebridge.hap.Characteristic.ColorTemperature,
        convertColorTemperature(newAttributes.ct)
      );
      this.updateCharacteristic(this.homebridge.hap.Characteristic.On, newAttributes.power);
    }
  };
}
