// require("@babel/polyfill");
import { Discovery, DeviceInfo, Device } from "yeelight-platform";
import { Service, Characteristic, CharacteristicEventTypes, Accessory, WithUUID } from "hap-nodejs";

const trackedAttributes = [
  "power",
  "bright",
  "rgb",
  "flowing",
  "flow_params",
  "hue",
  "sat",
  "ct",
  "bg_power",
  "bg_bright",
  "bg_rgb",
  "bg_hue",
  "bg_sat",
  "nl_br", // brightness of night mode
  "active_mode", // 0: daylight mode / 1: moonlight mode (ceiling light only)
  "name"
];

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
    protected homebridge: any
  ) {
    this.service = new this.homebridge.hap.Service.Lightbulb(this.device.device.model || "Default", "Main Light");
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
}

class WhiteLightService extends LightService {
  constructor(
    log: (message?: any, ...optionalParams: any[]) => void,
    config: Configuration,
    device: Device,
    homebridge: any,
    private propertyGetter: (name: string) => Promise<string>
  ) {
    super(log, config, device, homebridge);
    this.installHandlers();
  }

  private async installHandlers() {
    this.handleCharacteristic(
      Characteristic.On,
      async () => {
        return (await this.propertyGetter("power")) === "on";
      },
      value => this.sendCommand("set_power", [value ? "on" : "off", "smooth", 500])
    );
    this.handleCharacteristic(
      Characteristic.Brightness,
      async () => {
        const br1 = Number(await this.propertyGetter["power"]);
        const br2 = Number(await this.propertyGetter["nl_br"]);
        const mode = await this.propertyGetter["active_mode"];
        if (mode === "0") {
          return br1 / 2 + 50;
        } else {
          return br2 / 2;
        }
      },
      value => {
        if (value < 50) {
          this.sendCommand("set_power", ["on", "sudden", 30, 5]);
          this.sendCommand("set_bright", [value * 2, "sudden", 30]);
        } else {
          this.sendCommand("set_power", ["on", "sudden", 30, 1]);
          this.sendCommand("set_bright", [(value - 50) * 2, "sudden", 30]);
        }
      }
    );
    const characteristic = await this.handleCharacteristic(
      Characteristic.ColorTemperature,
      async () => {
        const temporary = convertColorTemperature(Number(await this.propertyGetter("ct")));
        this.log(`read temperature ${Number(await this.propertyGetter("ct"))} -> ${temporary}`);

        return temporary;
      },
      value => {
        const temporary = Number(convertColorTemperature(value).toFixed());
        this.log(`write temperature ${value} -> ${temporary}`);
        this.sendCommand("set_ct_abx", [temporary, "sudden", 0]);
      }
    );
    if (this.device.device.model.includes("bslamp")) {
      characteristic.setProps({ ...characteristic.props, maxValue: 588, minValue: 153 });
    } else {
      characteristic.setProps({ ...characteristic.props, maxValue: 370, minValue: 153 });
    }
  }
}

export class Light {
  public name: string;
  public model: string;
  private infoService?: Service;
  private connected = false;
  private lastProps: string[] = [];
  private main: LightService;

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
    this.connectDevice();
    this.main = new WhiteLightService(log, config, device, homebridge, this.propertyGetter);
  }

  private propertyGetter = async (name: string) => {
    const index = trackedAttributes.indexOf(name);
    return this.lastProps[index];
  };

  private onDeviceUpdate = ({ id, result }) => {
    if (id === 199) {
      this.log(`Props updated ${JSON.stringify(result)}`);
      this.lastProps = [...result];
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
    /*
    const lightBulbService: Service = new this.homebridge.hap.Service.Lightbulb(
      this.device.device.model || "Default",
      "Main Light"
    );
    this.handleCharacteristic(
      lightBulbService,
      Characteristic.On,
      () => this.lastProps[0] === "on",
      value => this.sendCommand("set_power", [value ? "on" : "off", "smooth", 500])
    );
    this.handleCharacteristic(
      lightBulbService,
      Characteristic.Brightness,
      () => {
        const br1 = Number(this.lastProps[1]);
        const br2 = Number(this.lastProps[13]);
        const mode = this.lastProps[14];
        if (mode === "0") {
          return br1 / 2 + 50;
        } else {
          return br2 / 2;
        }
      },
      value => {
        if (value < 50) {
          this.sendCommand("set_power", ["on", "sudden", 0, 5]);
          this.sendCommand("set_bright", [value * 2, "sudden", 0]);
        } else {
          this.sendCommand("set_power", ["on", "sudden", 0, 1]);
          this.sendCommand("set_bright", [(value - 50) * 2, "sudden", 0]);
        }
      }
    );
    this.handleCharacteristic(
      lightBulbService,
      Characteristic.ColorTemperature,
      () => Number(this.lastProps[7]),
      value => this.sendCommand("set_ct_abx", [value, "sudden", 0])
    );
    services.push(lightBulbService);
    */
    return services;
  }

  async handleCharacteristic<T extends WithUUID<typeof Characteristic>>(
    service: Service,
    uuid: T,
    getter: () => any,
    setter: (value: any) => void
  ) {
    const characteristic = service.getCharacteristic(uuid);
    characteristic?.on(CharacteristicEventTypes.GET, async callback => callback(null, await getter()));
    characteristic?.on(CharacteristicEventTypes.SET, async (value, callback) => {
      await setter(value);
      callback();
    });
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
    /* eslint-disable @typescript-eslint/camelcase */
    this.log(`Accessory ${device.id} found ${device.model} at ${device.Location}`);
    const oldDevice = this.devices.get(device.id);
    if (oldDevice) {
      // Device already exists
      if (oldDevice.device.Location !== device.Location) {
        device.tracked_attrs = trackedAttributes;
        oldDevice.updateDevice(device);
        this.devices.set(device.id, oldDevice);
      }
      return;
    }
    const newDevice: DeviceInfo = {
      ...device,
      tracked_attrs: trackedAttributes
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
  /* eslint-enable @typescript-eslint/camelcase */
}

export default function(homeBridgeApi: any) {
  homeBridgeApi.registerPlatform(PLUGINNAME, PLATFORMNAME, YeelighterPlatform);
}
