/* eslint-disable @typescript-eslint/camelcase */

import { DeviceInfo, Device } from "./yeedevice";
import { Discovery } from "./yeediscovery";
import { Configuration } from "./lightservice";
import { Light, TRACKED_ATTRIBUTES } from "./light";

const PLUGINNAME = "homebridge-yeelighter";
const PLATFORMNAME = "Yeelighter";

interface HomeBridgeAccessory {
  getServices: () => Array<any>;
}

class YeelighterPlatform {
  private myAccessories = new Map<string, HomeBridgeAccessory>();
  private agent: Discovery;
  private devices = new Map<string, Device>();
  private initialization: Promise<void>;

  constructor(
    private log: (message?: any, ...optionalParams: any[]) => void,
    private config: Configuration,
    private api: any
  ) {
    this.initialization = new Promise(resolve => {
      setTimeout(resolve, 3000);
    });
    this.agent = new Discovery();
    this.agent.on("started", () => {
      this.log("** Discovery Started - searching for 3 seconds **");
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

  private onDeviceDiscovery = (info: DeviceInfo) => {
    this.log(`Accessory ${info.id} found ${info.model} at ${info.location}`);
    const oldDevice = this.devices.get(info.id);
    if (oldDevice) {
      // Device already exists
      if (oldDevice.info.location !== info.location) {
        info.trackedAttributes = TRACKED_ATTRIBUTES;
        oldDevice.updateDevice(info);
        this.devices.set(info.id, oldDevice);
      }
      return;
    }
    const newDeviceInfo: DeviceInfo = {
      ...info,
      trackedAttributes: TRACKED_ATTRIBUTES,
      interval: 10000
    };
    const createdDevice = new Device(newDeviceInfo);
    this.log(`Registering new Accessory ${newDeviceInfo.id} found ${newDeviceInfo.model} at ${newDeviceInfo.location}`);
    this.devices.set(info.id, createdDevice);
    const uuid = this.api.hap.uuid.generate(info.id);
    const accessory = new this.api.platformAccessory(info.id, uuid);
    const light = new Light(this.log, this.config, createdDevice, this.api, accessory);
    // this.api.registerPlatformAccessories(PLUGINNAME, PLATFORMNAME, [accessory]);
    // this.log(`Accessory created with UUID ${uuid}`);
    this.myAccessories.set(info.id, light);
  };
}

export default function(homeBridgeApi: any) {
  homeBridgeApi.registerPlatform(PLUGINNAME, PLATFORMNAME, YeelighterPlatform);
}

/* eslint-enable @typescript-eslint/camelcase */
