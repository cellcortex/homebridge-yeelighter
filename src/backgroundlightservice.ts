import {
  Accessory,
  LightService,
  POWERMODE_HSV,
  POWERMODE_CT,
  convertColorTemperature,
  powerModeFromColorModeAndActiveMode,
  Attributes,
  ConcreteLightService
} from "./lightservice";
import { Configuration } from "homebridge";
import { Light } from "./light";

export class BackgroundLightService extends LightService implements ConcreteLightService {
  service: any;
  homebridge: any;
  lastHue: any;
  lastSat: any;
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
      value => this.sendCommand("bg_set_power", [value ? "on" : "off", "smooth", 500, POWERMODE_HSV])
    );
    this.handleCharacteristic(
      this.homebridge.hap.Characteristic.Brightness,
      async () => (await this.attributes()).bg_bright,
      value => {
        this.sendSuddenCommand("bg_set_bright", value);
        this.saveDefaultIfNeeded();
      }
    );
    if (this.config.ctforcolor) {
      const characteristic = await this.handleCharacteristic(
        this.homebridge.hap.Characteristic.ColorTemperature,
        async () => {
          return convertColorTemperature((await this.attributes()).bg_ct);
        },
        value => {
          this.ensurePowerMode(POWERMODE_CT, "bg_");
          this.sendSuddenCommand("bg_set_ct_abx", convertColorTemperature(value));
          if (this.light.detailedLogging) {
            this.log(`setCT: ${convertColorTemperature(value)}`);
          }
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
    this.handleCharacteristic(
      this.homebridge.hap.Characteristic.Hue,
      async () => (await this.attributes()).bg_hue,
      async value => {
        this.lastHue = value;
        this.setHSV("bg_");
      }
    );
    this.handleCharacteristic(
      this.homebridge.hap.Characteristic.Saturation,
      async () => (await this.attributes()).bg_sat,
      async value => {
        this.lastSat = value;
        this.setHSV("bg_");
      }
    );
  }

  public onAttributesUpdated = (newAttributes: Attributes) => {
    if (this.light.detailedLogging) {
      this.log(`backlight updated ${JSON.stringify(newAttributes)}`);
    }
    this.powerMode = powerModeFromColorModeAndActiveMode(newAttributes.bg_lmode, 0);

    this.updateCharacteristic(this.homebridge.hap.Characteristic.Saturation, newAttributes.bg_sat);
    this.updateCharacteristic(this.homebridge.hap.Characteristic.Hue, newAttributes.bg_hue);
    this.updateCharacteristic(this.homebridge.hap.Characteristic.On, newAttributes.bg_power);
    this.updateCharacteristic(this.homebridge.hap.Characteristic.Brightness, newAttributes.bg_bright);
    this.updateCharacteristic(
      this.homebridge.hap.Characteristic.ColorTemperature,
      convertColorTemperature(newAttributes.bg_ct)
    );
  };
}
