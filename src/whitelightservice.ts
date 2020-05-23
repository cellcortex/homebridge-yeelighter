import { LightService, Accessory, ConcreteLightService, Attributes } from "./lightservice";
import { Configuration } from "homebridge";
import { Light } from "./light";

export class WhiteLightService extends LightService implements ConcreteLightService {
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
      value => this.sendCommand("set_power", [value ? "on" : "off", "smooth", 500, 0])
    );
    this.handleCharacteristic(
      this.homebridge.hap.Characteristic.Brightness,
      async () => {
        const attributes = await this.attributes();
        return attributes.bright;
      },
      value => {
        if (value > 0) {
          this.ensurePowerMode(0);
          this.sendSuddenCommand("set_bright", value);
          this.saveDefaultIfNeeded();
        } else {
          this.sendSmoothCommand("set_power", "off");
        }
      }
    );
  }

  public onAttributesUpdated = (newAttributes: Attributes) => {
    if (this.light.detailedLogging) {
      this.log(`debug: white light updated ${JSON.stringify(newAttributes)}`);
    }
    this.updateCharacteristic(this.homebridge.hap.Characteristic.On, newAttributes.power);
    this.updateCharacteristic(this.homebridge.hap.Characteristic.Brightness, newAttributes.bright);
  };
}
