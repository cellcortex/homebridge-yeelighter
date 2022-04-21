import {
  LightServiceParameters as LightServiceParameters,
  LightService,
  POWERMODE_CT,
  POWERMODE_MOON,
  convertColorTemperature,
  Attributes,
  powerModeFromColorModeAndActiveMode,
  ConcreteLightService,
} from "./lightservice";

export class TemperatureLightService extends LightService implements ConcreteLightService {
  constructor(parameters: LightServiceParameters) {
    super(parameters);
    this.service.displayName = "Temperature Light";

    this.installHandlers();
  }

  private getBrightness(attributes): number {
    if (this.specs.nightLight) {
      const { bright, nl_br, active_mode } = attributes;
      const br1 = Number(bright);
      const br2 = Number(nl_br);
      return active_mode === 0 ? br1 / 2 + 50 : br2 / 2;
    } else {
      return attributes.bright;
    }
  }

  private async installHandlers() {
    this.handleCharacteristic(
      this.platform.Characteristic.On,
      async () => {
        const attributes = await this.attributes();
        return attributes.power;
      },
      async value => {
        if (this.config.ignorePower && value) {
          this.log(`Ignoring explicit power on`);
        } else {
          this.debug(`Manual power setting with powerMode: ${this.powerMode}`, value);
          // eslint-disable-next-line unicorn/prefer-ternary
          if (value) {
            await this.sendCommand("set_power", ["on", "sudden", 0, this.powerMode || POWERMODE_CT]);
          } else {
            await this.sendCommand("set_power", ["off", "smooth", 500]);
          }
        
          this.powerMode ||= POWERMODE_CT;
          this.setAttributes({ power: value });
      }
        // this.updateCharacteristic(this.platform.Characteristic.On, value);
      },
    );
    this.handleCharacteristic(
      this.platform.Characteristic.Brightness,
      async () => {
        return this.getBrightness(await this.attributes());
      },
      async value => {
        if (value > 0) {
          let valueToSet = value;
          if (this.specs.nightLight) {
            if (value < 50) {
              if (this.powerMode !== 5) {
                await this.ensurePowerMode(POWERMODE_MOON);
                this.debug("Moonlight", "on");
                
              }
              valueToSet = value * 2;
            } else {
              if (this.powerMode !== 1) {
                await this.ensurePowerMode(POWERMODE_CT);
                this.debug("Moonlight", "off");
                
              }
              valueToSet = Math.max(1, (value - 50) * 2);
            }
          }
          this.log(`set brightness ${value} (translated to ${valueToSet})`);
          await this.sendSuddenCommand("set_bright", valueToSet);
          if (value < 50) {
            this.setAttributes({ nl_br: valueToSet });
          } else {
            this.setAttributes({ bright: valueToSet });
          }
          // this.updateCharacteristic(this.platform.Characteristic.Brightness, this.getBrightness(valueToSet));
        } else {
          this.log(`set brightness to 0, power off`);
          await this.sendSuddenCommand("set_power", "off");
        }
        this.saveDefaultIfNeeded();
      },
    );
    const characteristic = await this.handleCharacteristic(
      this.platform.Characteristic.ColorTemperature,
      async () => {
        const attributes = await this.attributes();
        return convertColorTemperature(attributes.ct);
      },
      async value => {
        await this.ensurePowerMode(POWERMODE_CT);
        await this.sendSuddenCommand("set_ct_abx", convertColorTemperature(value));
        this.setAttributes({ ct: convertColorTemperature(value) });
        /*this.updateCharacteristic(
          this.platform.Characteristic.ColorTemperature,
          value
        );\*/

        this.saveDefaultIfNeeded();
      },
    );
    characteristic.setProps({
      ...characteristic.props,
      maxValue: convertColorTemperature(this.specs.colorTemperature.min),
      minValue: convertColorTemperature(this.specs.colorTemperature.max),
    });
  }

  public onAttributesUpdated = (newAttributes: Attributes) => {
    this.log(`temperature light updated ${JSON.stringify(newAttributes)}`);
    this.powerMode = powerModeFromColorModeAndActiveMode(newAttributes.color_mode, newAttributes.active_mode);
    this.updateCharacteristic(this.platform.Characteristic.On, newAttributes.power);
    this.updateCharacteristic(this.platform.Characteristic.Brightness, this.getBrightness(newAttributes));
    this.updateCharacteristic(
      this.platform.Characteristic.ColorTemperature,
      convertColorTemperature(newAttributes.ct),
    );
  };
}
