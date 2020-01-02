/* eslint-disable eslint-comments/disable-enable-pair */
/* eslint-disable @typescript-eslint/camelcase */

import { Discovery, DeviceInfo, Device } from "yeelight-platform";
import { Service, Characteristic, CharacteristicEventTypes, Accessory, WithUUID } from "hap-nodejs";

/*
const trackedAttributes = [
  "power",
  "color_mode",
  "bright",
  "hue",
  "sat",
  "ct",
  "bg_power",
  "bg_bright",
  "bg_hue",
  "bg_sat",
  "nl_br", // brightness of night mode
  "active_mode", // 0: daylight mode / 1: moonlight mode (ceiling light only)
  "name"
];
*/

interface Attributes {
  power: boolean;
  color_mode: number;
  bright: number;
  hue: number;
  sat: number;
  ct: number;
  bg_power: boolean;
  bg_bright: number;
  bg_hue: number;
  bg_sat: number;
  nl_br: number; // brightness of night mode
  active_mode: number; // 0: daylight mode / 1: moonlight mode (ceiling light only)
  name: string;
}

const EMPTY_ATTRIBUTES: Attributes = {
  power: false,
  color_mode: 0,
  bright: 0,
  hue: 0,
  sat: 0,
  ct: 0,
  bg_power: false,
  bg_bright: 0,
  bg_hue: 0,
  bg_sat: 0,
  nl_br: 0,
  active_mode: 0,
  name: "unknown"
};

const TRACKED_ATTRIBUTES = Object.keys(EMPTY_ATTRIBUTES);

function convertColorTemperature(value: number): number {
  return 1000000 / value;
}

const modelMap = {
  ceiling1: "Ceiling Light",
  ceiling2: "Ceiling Light - Youth Version",
  ceiling3: "Ceiling Light (Jiaoyue 480)",
  ceiling4: "Moon Pro (Jiaoyue 650)",
  ceiling15: "Ceiling Light (YLXD42YL)",
  ceilong20: "GuangCan",
  mono: "Serene Eye-Friendly Desk Lamp"
};

const PLUGINNAME = "homebridge-yeelighter";
const PLATFORMNAME = "Yeelighter";

interface Configuration {
  [key: string]: any;
}
interface HomeBridgeAccessory {
  getServices: () => Array<any>;
}

class LightService {
  public service: Service;
  constructor(
    protected log: (message?: any, ...optionalParams: any[]) => void,
    protected config: Configuration,
    protected device: Device,
    protected homebridge: any,
    protected subtype?: string
  ) {
    this.service = new this.homebridge.hap.Service.Lightbulb(modelMap[device.device.model] || "Main", subtype);
  }

  async handleCharacteristic<T extends WithUUID<typeof Characteristic>>(
    uuid: T,
    getter: () => Promise<any>,
    setter: (value: any) => void
  ): Promise<Characteristic> {
    const characteristic = this.service.getCharacteristic(uuid);
    if (!characteristic) {
      return Promise.reject();
    }
    characteristic.on(CharacteristicEventTypes.GET, async callback => callback(null, await getter()));
    characteristic.on(CharacteristicEventTypes.SET, async (value, callback) => {
      await setter(value);
      callback();
    });
    return characteristic;
  }

  sendCommand(method: string, parameters: Array<string | number | boolean>) {
    this.device.sendCommand({ id: -1, method, params: parameters });
  }

  sendSuddenCommand(method: string, parameter: string | number | boolean) {
    this.device.sendCommand({ id: -1, method, params: [parameter, "sudden", 0] });
  }

  sendSmoothCommand(method: string, parameter: string | number | boolean) {
    this.device.sendCommand({ id: -1, method, params: [parameter, "smooth", 500] });
  }
}

class WhiteLightService extends LightService {
  private lastBrightness?: number;
  private powerMode?: number;
  constructor(
    log: (message?: any, ...optionalParams: any[]) => void,
    config: Configuration,
    device: Device,
    homebridge: any,
    private propertyGetter: (names: string) => Promise<string>
  ) {
    super(log, config, device, homebridge, "main");
    this.installHandlers();
  }

  private async installHandlers() {
    this.handleCharacteristic(
      Characteristic.On,
      async () => {
        return (await this.propertyGetter("power")) === "on";
      },
      value => this.sendCommand("set_power", [value ? "on" : "off", "smooth", 500, this.powerMode || 2])
    );
    this.handleCharacteristic(
      Characteristic.Brightness,
      async () => {
        const power = await this.propertyGetter("bright");
        const nlBr = await this.propertyGetter("nl_br");
        const br1 = Number(power);
        const br2 = Number(nlBr);
        const mode = Number(await this.propertyGetter("active_mode"));
        if (mode !== 1) {
          return br1 / 2 + 50;
        } else {
          return br2 / 2;
        }
      },
      value => {
        if (value < 50) {
          if (!this.lastBrightness || this.lastBrightness >= 50) {
            this.log("Moonlight on");
            this.sendCommand("set_power", ["on", "sudden", 0, 5]);
            this.powerMode = 5;
          }
          this.sendSuddenCommand("set_bright", value * 2);
        } else {
          if (!this.lastBrightness || this.lastBrightness < 50) {
            this.log("Moonlight off");
            this.sendCommand("set_power", ["on", "sudden", 0, 1]);
            this.powerMode = 2;
          }
          this.sendSuddenCommand("set_bright", (value - 50) * 2);
        }
        this.lastBrightness = value;
      }
    );
    const characteristic = await this.handleCharacteristic(
      Characteristic.ColorTemperature,
      async () => convertColorTemperature(Number(await this.propertyGetter("ct"))),
      value => {
        this.sendSuddenCommand("set_ct_abx", Number(convertColorTemperature(value).toFixed()));
      }
    );
    if (this.device.device.model.includes("bslamp")) {
      characteristic.setProps({ ...characteristic.props, maxValue: 588, minValue: 153 });
    } else {
      characteristic.setProps({ ...characteristic.props, maxValue: 370, minValue: 153 });
    }
  }
}

class BackgroundLightService extends LightService {
  private lastHue?: number;
  private lastSat?: number;
  constructor(
    log: (message?: any, ...optionalParams: any[]) => void,
    config: Configuration,
    device: Device,
    homebridge: any,
    private propertyGetter: (name: string) => Promise<string>
  ) {
    super(log, config, device, homebridge, "background");
    this.installHandlers();
  }

  private async installHandlers() {
    this.handleCharacteristic(
      Characteristic.On,
      async () => (await this.propertyGetter("bg_power")) === "on",
      value => this.sendCommand("bg_set_power", [value ? "on" : "off", "smooth", 500, 3])
    );
    this.handleCharacteristic(
      Characteristic.Brightness,
      async () => Number(await this.propertyGetter("bg_bright")),
      value => this.sendSuddenCommand("bg_set_bright", value)
    );
    this.handleCharacteristic(
      Characteristic.Hue,
      async () => Number(await this.propertyGetter("bg_hue")),
      async value => {
        this.lastHue = value;
        if (this.lastHue && this.lastSat) {
          const hsv = [this.lastHue, this.lastSat, "sudden", 0];
          this.sendCommand("bg_set_hsv", hsv);
          delete this.lastHue;
          delete this.lastSat;
        }
        // this.sendCommand("bg_set_power", ["on", "smooth", 500, 3]);
      }
    );
    this.handleCharacteristic(
      Characteristic.Saturation,
      async () => Number(await this.propertyGetter("bg_sat")),
      async value => {
        this.lastSat = value;
        if (this.lastHue && this.lastSat) {
          const hsv = [this.lastHue, this.lastSat, "sudden", 0];
          this.sendCommand("bg_set_hsv", hsv);
          delete this.lastHue;
          delete this.lastSat;
        }
        /*
        const hsv = [Number(await this.propertyGetter("bg_hue")), value, "sudden", 0];
        this.log("set Sat", hsv);
        this.sendCommand("bg_set_power", ["on", "smooth", 500, 3]);
        this.sendCommand("bg_set_hsv", hsv);
        */
      }
    );
  }
}

export class Light {
  public name: string;
  public model: string;
  private infoService?: Service;
  private connected = false;
  private lastProps: string[] = [];
  private main: LightService;
  private background?: LightService;
  private support: Array<string>;
  private updateTimestamp: number;
  private updateResolve?: (update: string[]) => void;
  private updateReject?: () => void;
  private attributes: Attributes = EMPTY_ATTRIBUTES;

  constructor(
    private log: (message?: any, ...optionalParams: any[]) => void,
    private config: Configuration,
    private device: Device,
    private homebridge: any,
    private accessory: Accessory
  ) {
    // super(device.device.id, global.hap.uuid.generate(device.device.id));
    this.log(`light ${device.device.id} ${device.device.model} created, support: ${device.device.support}`);
    this.model = modelMap[device.device.model] || device.device.model;
    this.name = device.device.id;
    this.support = device.device.support.split(" ");
    this.connectDevice();
    this.main = new WhiteLightService(log, config, device, homebridge, this.propertyGetter);
    if (this.support.includes("bg_set_power")) {
      this.background = new BackgroundLightService(log, config, device, homebridge, this.propertyGetter);
    }
    this.updateTimestamp = 0;
  }

  private propertyGetter = async (name: string): Promise<string> => {
    if (this.updateTimestamp < Date.now() - 400 && !this.updateResolve) {
      const updatePromise = new Promise<string[]>((resolve, reject) => {
        this.updateResolve = resolve;
        this.updateReject = reject;
        this.device.sendHeartBeat();
      });
      await updatePromise;
    }
    const index = TRACKED_ATTRIBUTES.indexOf(name);
    return this.lastProps[index];
  };

  private onDeviceUpdate = ({ id, result }) => {
    if (id === 199) {
      if (result) {
        if (this.updateResolve) {
          this.updateResolve(result);
          delete this.updateResolve;
          delete this.updateReject;
        }
        this.lastProps = [...result];
        for (const key of Object.keys(this.attributes)) {
          const index = TRACKED_ATTRIBUTES.indexOf(key);
          switch (typeof EMPTY_ATTRIBUTES[key]) {
            case "number":
              this.attributes[key] = Number(this.lastProps[index]);
              break;
            case "boolean":
              this.attributes[key] = this.lastProps[index] == "on";
              break;
            default:
              this.attributes[key] = this.lastProps[index];
              break;
          }
        }
        this.log("Attributes", this.attributes);
        this.updateTimestamp = Date.now();
      } /*else {
        if (this.updateReject) {
          this.log("Rejecting");
          this.updateReject();
          delete this.updateResolve;
          delete this.updateReject;
        } 
    }*/
    }
  };

  private onDeviceConnected = () => {
    this.log("Connected", this.name);
    this.connected = true;
    this.device.sendHeartBeat();
  };

  private onDeviceDisconnected = () => {
    this.log("Disconnected", this.name);
    this.connected = false;
  };

  connectDevice() {
    this.device.connect();
    this.device.on("deviceUpdate", this.onDeviceUpdate);
    this.device.on("connected", this.onDeviceConnected);
    this.device.on("disconnected", this.onDeviceDisconnected);
  }

  // Respond to identify request
  identify(callback: () => void): void {
    this.log(`Hi ${this.device.device.model}`);
    callback();
  }

  getServices(): Array<Service> {
    this.log(`getServices for ${this.device.device.id}`);
    const services: Array<Service> = [this.getInfoService(), this.main.service];
    if (this.background) {
      services.push(this.background.service);
    }
    return services;
  }

  getInfoService(): Service {
    if (!this.infoService) {
      this.log("infoService created");
      const infoService = new this.homebridge.hap.Service.AccessoryInformation();
      infoService
        .updateCharacteristic(Characteristic.Manufacturer, "Yeelighter")
        .updateCharacteristic(Characteristic.Model, this.model)
        .updateCharacteristic(Characteristic.SerialNumber, this.device.device.id);
      // XXX this is not exposed from the library currently
      // .updateCharacteristic(Characteristic.FirmwareRevision, this.device.device.fw_ver);
      this.infoService = infoService;
      return infoService;
    }
    return this.infoService;
  }

  sendCommand(method: string, parameters: Array<string | number | boolean>) {
    this.device.sendCommand({ id: -1, method, params: parameters });
  }
}

class YeelighterPlatform {
  private myAccessories = new Map<string, HomeBridgeAccessory>();
  private agent: Discovery;
  private devices = new Map<string, any>();
  private initialization: Promise<void>;

  constructor(
    private log: (message?: any, ...optionalParams: any[]) => void,
    private config: Configuration,
    private api: any
  ) {
    this.initialization = new Promise(resolve => {
      setTimeout(resolve, 2000);
    });
    this.agent = new Discovery();
    this.agent.on("started", () => {
      this.log("** Discovery Started **");
    });
    this.agent.on("didDiscoverDevice", this.onDeviceDiscovery);
    this.api.on("didFinishLaunching", this.onFinishLaunching);
  }

  async accessories(callback: (accessories: any) => void) {
    await this.initialization;
    const lights = [...this.myAccessories.values()];
    this.log(`returning ${lights.length} accessories`);
    callback(lights);
  }

  private onFinishLaunching = () => {
    this.agent.listen();
    return null;
  };

  private onDeviceDiscovery = (device: DeviceInfo) => {
    this.log(`Accessory ${device.id} found ${device.model} at ${device.Location}`);
    const oldDevice = this.devices.get(device.id);
    if (oldDevice) {
      // Device already exists
      if (oldDevice.device.Location !== device.Location) {
        device.tracked_attrs = TRACKED_ATTRIBUTES;
        oldDevice.updateDevice(device);
        this.devices.set(device.id, oldDevice);
      }
      return;
    }
    const newDevice: DeviceInfo = {
      ...device,
      tracked_attrs: TRACKED_ATTRIBUTES,
      interval: 10000
    };
    const createdDevice = new Device(newDevice);
    this.log(`Registering new Accessory ${newDevice.id} found ${newDevice.model} at ${newDevice.Location}`);
    this.devices.set(device.id, createdDevice);
    const uuid = this.api.hap.uuid.generate(device.id);
    const accessory = new this.api.platformAccessory(device.id, uuid);
    const light = new Light(this.log, this.config, createdDevice, this.api, accessory);
    // this.api.registerPlatformAccessories(PLUGINNAME, PLATFORNAME, [accessory]);
    // this.log(`Accessory created with UUID ${uuid}`);
    this.myAccessories.set(device.id, light);
  };
}

export default function(homeBridgeApi: any) {
  homeBridgeApi.registerPlatform(PLUGINNAME, PLATFORMNAME, YeelighterPlatform);
}
