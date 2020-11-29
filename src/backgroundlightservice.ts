import {
  LightServiceParameters,
  LightService,
  POWERMODE_HSV,
  POWERMODE_CT,
  convertColorTemperature,
  powerModeFromColorModeAndActiveMode,
  Attributes,
  ConcreteLightService,
} from "./lightservice";

export class BackgroundLightService extends LightService implements ConcreteLightService {
  lastHue: any;
  lastSat: any;
  constructor(parameters: LightServiceParameters) {
    super(parameters, "background");
    this.service.displayName = "Background Light";
    this.installHandlers();
  }

  private async installHandlers() {
    this.handleCharacteristic(
      this.platform.Characteristic.On,
      async () => (await this.attributes()).bg_power,
      value => this.sendCommand("bg_set_power", [value ? "on" : "off", "smooth", 500, POWERMODE_HSV]),
    );
    this.handleCharacteristic(
      this.platform.Characteristic.Brightness,
      async () => (await this.attributes()).bg_bright,
      async value => {
        this.log("set brightness", value);
        await this.sendSuddenCommand("bg_set_bright", value);
        this.setAttributes({ bg_bright: value });
        // this.updateCharacteristic(this.platform.Characteristic.Brightness, value);
        this.saveDefaultIfNeeded();
      },
    );
    if (this.config.ctforcolor === undefined || this.config.ctforcolor) {
      const characteristic = await this.handleCharacteristic(
        this.platform.Characteristic.ColorTemperature,
        async () => {
          return convertColorTemperature((await this.attributes()).bg_ct);
        },
        async value => {
          await this.ensurePowerMode(POWERMODE_CT, "bg_");
          this.debug(`setCT ${convertColorTemperature(value)}`);
          await this.sendSuddenCommand("bg_set_ct_abx", convertColorTemperature(value));
          this.updateColorFromCT(value);
          this.saveDefaultIfNeeded();
        },
      );
      characteristic.setProps({
        ...characteristic.props,
        maxValue: convertColorTemperature(this.specs.colorTemperature.min),
        minValue: convertColorTemperature(this.specs.colorTemperature.max),
      });
    }
    this.handleCharacteristic(
      this.platform.Characteristic.Hue,
      async () => (await this.attributes()).bg_hue,
      async value => {
        this.lastHue = value;
        await this.setHSV("bg_");
      },
    );
    this.handleCharacteristic(
      this.platform.Characteristic.Saturation,
      async () => (await this.attributes()).bg_sat,
      async value => {
        this.lastSat = value;
        await this.setHSV("bg_");
      },
    );
  }

  public onAttributesUpdated = (newAttributes: Attributes) => {
    this.debug(`backlight updated ${JSON.stringify(newAttributes)}`);
    this.powerMode = powerModeFromColorModeAndActiveMode(newAttributes.bg_lmode, 0);

    this.updateCharacteristic(this.platform.Characteristic.Saturation, newAttributes.bg_sat);
    this.updateCharacteristic(this.platform.Characteristic.Hue, newAttributes.bg_hue);
    this.updateCharacteristic(this.platform.Characteristic.On, newAttributes.bg_power);
    this.updateCharacteristic(this.platform.Characteristic.Brightness, newAttributes.bg_bright);
  };
}
