import {
  Accessory,
  LightService,
  Configuration,
  POWERMODE_CT,
  POWERMODE_MOON,
  convertColorTemperature,
  Attributes,
  powerModeFromColorModeAndActiveMode,
  ConcreteLightService
} from "./lightservice";
import { Light } from "./light";

export class TemperatureLightService extends LightService implements ConcreteLightService {
  constructor(
    log: (message?: any, ...optionalParams: any[]) => void,
    config: Configuration,
    light: Light,
    homebridge: any,
    accessory: Accessory
  ) {
    super(log, config, light, homebridge, accessory, "main");
    this.service.displayName = "Temperature Light";

    this.installHandlers();
  }

  private getBrightness(attributes): number {
    if (this.specs.nightLight) {
      // eslint-disable-next-line @typescript-eslint/camelcase
      const { bright, nl_br, active_mode } = attributes;
      const br1 = Number(bright);
      const br2 = Number(nl_br);
      // eslint-disable-next-line @typescript-eslint/camelcase
      if (active_mode === 0) {
        return br1 / 2 + 50;
      } else {
        return br2 / 2;
      }
    } else {
      return attributes.bright;
    }
  }

  private async installHandlers() {
    this.handleCharacteristic(
      this.homebridge.hap.Characteristic.On,
      async () => {
        const attributes = await this.attributes();
        return attributes.power;
      },
      async value => {
        await this.sendCommand("set_power", [value ? "on" : "off", "smooth", 500, this.powerMode || POWERMODE_CT]);
        this.setAttributes({ power: value });
        this.updateCharacteristic(this.homebridge.hap.Characteristic.On, value);
      }
    );
    this.handleCharacteristic(
      this.homebridge.hap.Characteristic.Brightness,
      async () => {
        return this.getBrightness(await this.attributes());
      },
      async value => {
        let valueToSet = value;
        if (this.specs.nightLight) {
          if (value < 50) {
            if (this.powerMode !== 5) {
              this.ensurePowerMode(POWERMODE_MOON);
              if (this.light.detailedLogging) {
                this.log(`debug: Moonlight on`);
              }
            }
            valueToSet = value * 2;
          } else {
            if (this.powerMode !== 1) {
              this.ensurePowerMode(POWERMODE_CT);
              if (this.light.detailedLogging) {
                this.log(`debug: Moonlight off`);
              }
            }
            valueToSet = (value - 50) * 2;
          }
        } 
        await this.sendSuddenCommand("set_bright", valueToSet);
        this.setAttributes({ bright: valueToSet });
        this.updateCharacteristic(this.homebridge.hap.Characteristic.Brightness, this.getBrightness(valueToSet));
        this.saveDefaultIfNeeded();
      }
    );
    const characteristic = await this.handleCharacteristic(
      this.homebridge.hap.Characteristic.ColorTemperature,
      async () => convertColorTemperature((await this.attributes()).ct),
      async value => {
        this.ensurePowerMode(POWERMODE_CT);
        await this.sendSuddenCommand("set_ct_abx", convertColorTemperature(value));
        this.setAttributes({ ct: convertColorTemperature(value) });
        this.updateCharacteristic(
          this.homebridge.hap.Characteristic.ColorTemperature,
          value
        );

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
      this.log(`debug: temperature light updated ${JSON.stringify(newAttributes)}`);
    }
    this.powerMode = powerModeFromColorModeAndActiveMode(newAttributes.color_mode, newAttributes.active_mode);
    this.updateCharacteristic(this.homebridge.hap.Characteristic.On, newAttributes.power);
    this.updateCharacteristic(this.homebridge.hap.Characteristic.Brightness, this.getBrightness(newAttributes));
    this.updateCharacteristic(
      this.homebridge.hap.Characteristic.ColorTemperature,
      convertColorTemperature(newAttributes.ct)
    );
  };
}
