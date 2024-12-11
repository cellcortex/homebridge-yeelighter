import {
  LightServiceParameters,
  LightService,
  POWERMODE_HSV,
  POWERMODE_CT,
  convertColorTemperature,
  powerModeFromColorModeAndActiveMode,
  Attributes,
  ConcreteLightService
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
      async () => this.getAttribute("bg_power"),
      async (value) => {
        if (this.platform.config.faultyYeelightBackgroundToggling && value) {
          // We have to set lastSat & lastHue as it is used by setHSV command
          if (!this.lastSat) {
            this.lastSat = await this.getAttribute("bg_sat");
          }
          if (!this.lastHue) {
            this.lastHue = await this.getAttribute("bg_hue");
          }
          // Then to workaround issue with turning the light ON, we send set_scene command with built-in scene id 9_055_202
          await this.sendCommandPromiseWithErrorHandling("bg_set_scene", ["color", 9_055_202, -1]);
          // And to get the colors we wanted, not the one from the scene, we send set_hsv command
          await this.setHSV("bg_");
        } else {
          await this.sendCommandPromiseWithErrorHandling("bg_set_power", [
            value ? "on" : "off",
            "smooth",
            500,
            POWERMODE_HSV
          ]);
        }
      }
    );
    this.handleCharacteristic(
      this.platform.Characteristic.Brightness,
      async () => this.getAttribute("bg_bright"),
      async (value) => {
        if (value > 0) {
          this.log(`set bg brightness to ${value}`);
          await this.sendAnimatedCommand("bg_set_bright", value);
          this.setAttributes({ bg_bright: value });
          // this.updateCharacteristic(this.platform.Characteristic.Brightness, value);
        } else {
          this.log(`set brightness to 0, power off`);
          this.cancelAllDebounces();
          this.updateCharacteristic(this.platform.Characteristic.Brightness, 0);
          await this.sendSuddenCommand("bg_set_power", "off");
        }
        this.saveDefaultIfNeeded();
      }
    );
    if (this.platform.config.ctforcolor === undefined || this.platform.config.ctforcolor) {
      const characteristic = this.handleCharacteristic(
        this.platform.Characteristic.ColorTemperature,
        async () => {
          const ct = await this.getAttribute("bg_ct");
          return convertColorTemperature(ct);
        },
        async (value) => {
          await this.ensurePowerMode(POWERMODE_CT, "bg_");
          this.debug(`setCT ${convertColorTemperature(value)}`);
          await this.sendAnimatedCommand("bg_set_ct_abx", convertColorTemperature(value));
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
      this.platform.Characteristic.Hue,
      async () => this.getAttribute("bg_hue"),
      async (value) => {
        this.lastHue = value;
        await this.setHSV("bg_");
      }
    );
    this.handleCharacteristic(
      this.platform.Characteristic.Saturation,
      async () => this.getAttribute("bg_sat"),
      async (value) => {
        this.lastSat = value;
        await this.setHSV("bg_");
      }
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
