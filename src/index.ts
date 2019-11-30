// require("@babel/polyfill");
import { Discovery, DeviceInfo, Device } from "yeelight-platform";
import { uuid } from "hap-nodejs";
import { Light } from "./light";

let Service: any, Characteristic: any, api: any, Accessory: any;

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
  "bg_sat"
];

const PLUGINNAME = "homebridge-yeelighter";
const PLATFORNAME = "Yeelighter";

interface Configuration {
  [key: string]: any;
}
interface HomeBridgeAccessory {
  getServices: () => Array<any>;
}

class YeelighterPlatform {
  private myAccessories = new Map<string, HomeBridgeAccessory>();

  async accessories(callback: (accessories: any) => void) {
    callback([] /*this.myAccessories.values()*/);
  }

  private agent: Discovery;
  private devices = new Map<string, any>();

  constructor(
    private log: (message?: any, ...optionalParams: any[]) => void,
    private config: Configuration,
    private api: any
  ) {
    this.agent = new Discovery();
    this.agent.on("started", () => {
      this.log("** Discovery Started **");
    });
    this.agent.on("didDiscoverDevice", this.onDeviceDiscovery);
    this.api.on("didFinishLaunching", this.onFinishLaunching);
  }

  private onFinishLaunching = () => {
    this.agent.listen();
    return null;
  };

  private onDeviceDiscovery = (device: DeviceInfo) => {
    /* eslint-disable @typescript-eslint/camelcase */

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
    this.log(`Accessory ${newDevice.id} found ${newDevice.model} at ${newDevice.Location}`);
    this.devices.set(device.id, createdDevice);
    const light = new Accessory(device.model, uuid.generate(device.id));
    this.api.registerPlatformAccessories(PLUGINNAME, PLATFORNAME, [light]);

    const accessory = new Light(this.log, this.config, createdDevice);
    this.myAccessories.set(device.id, accessory);
  };
  /* eslint-enable @typescript-eslint/camelcase */
}

export default function(homebridge: any) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  api = homebridge;
  Accessory = homebridge.platformAccessory;
  homebridge.registerPlatform(PLUGINNAME, PLATFORNAME, YeelighterPlatform);
}
