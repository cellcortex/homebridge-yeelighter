import {
  Accessory,
  LightService,
  Configuration,
  POWERMODE_CT,
  POWERMODE_MOON,
  convertColorTemperature
} from "./lightservice";
import { Light } from "./light";

export class TemperatureLightService extends LightService {
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

  private async installHandlers() {
    this.handleCharacteristic(
      this.homebridge.hap.Characteristic.On,
      async () => {
        const attributes = await this.attributes();
        return attributes.power;
      },
      value => this.sendCommand("set_power", [value ? "on" : "off", "smooth", 500, this.powerMode || POWERMODE_CT])
    );
    this.handleCharacteristic(
      this.homebridge.hap.Characteristic.Brightness,
      async () => {
        const attributes = await this.attributes();
        if (this.specs.nightLight) {
          // eslint-disable-next-line @typescript-eslint/camelcase
          const { bright, nl_br, active_mode } = attributes;
          this.log(`${this.light.info.id} getting brightness`, attributes);
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
      },
      value => {
        if (this.specs.nightLight) {
          if (value < 50) {
            if (this.powerMode !== 5) {
              this.ensurePowerMode(POWERMODE_MOON);
              this.log("Moonlight on");
            }
            this.sendSuddenCommand("set_bright", value * 2);
          } else {
            if (this.powerMode !== 1) {
              this.ensurePowerMode(POWERMODE_CT);
              this.log("Moonlight off");
            }
            this.sendSuddenCommand("set_bright", (value - 50) * 2);
          }
        } else {
          this.sendSuddenCommand("set_bright", value);
        }
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
