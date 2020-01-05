/* eslint-disable @typescript-eslint/camelcase */

import { DeviceInfo, Device } from "./yeedevice";
import { Discovery } from "./yeediscovery";
import { Configuration } from "./lightservice";
import { Light, TRACKED_ATTRIBUTES } from "./light";
import { Accessory } from "hap-nodejs";

const PLUGINNAME = "homebridge-yeelighter";
const PLATFORMNAME = "Yeelighter";

class YeelighterPlatform {
  private myAccessories = new Map<string, any>();
  private agent: Discovery;
  private devices = new Map<string, Device>();
  private cachedAccessories: Map<string, Accessory> = new Map();
  // public accessories: Array<any> = [];

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
  /*
  async accessories(callback: (accessories: any) => void) {
    const lights = [...this.myAccessories.values()];
    this.log(`returning ${lights.length} accessories`);
    callback(lights);
  }
*/
  private onFinishLaunching = () => {
    this.agent.listen();
    return null;
  };

  private onDeviceDiscovery = (detectedInfo: DeviceInfo) => {
    const oldDevice = this.devices.get(detectedInfo.id);
    if (oldDevice) {
      // Device already exists
      if (oldDevice.info.location !== detectedInfo.location) {
        // info.trackedAttributes = TRACKED_ATTRIBUTES;
        oldDevice.updateDevice(detectedInfo);
        // this.devices.set(info.id, oldDevice);
      }
      return;
    }
    const newDeviceInfo: DeviceInfo = {
      ...detectedInfo,
      trackedAttributes: TRACKED_ATTRIBUTES,
      interval: 10000
    };
    const createdDevice = new Device(newDeviceInfo);
    this.devices.set(newDeviceInfo.id, createdDevice);
    const uuid = this.api.hap.uuid.generate(newDeviceInfo.id);
    let accessory = this.cachedAccessories.get(uuid);
    let register = false;
    if (!accessory) {
      this.log(`New ${newDeviceInfo.model} [${newDeviceInfo.id}] found  at ${newDeviceInfo.location}`);
      accessory = new this.api.platformAccessory(newDeviceInfo.id, uuid);
      register = true;
      this.log(`Accessory created with UUID ${uuid}`);
    } else {
      this.log(`Cached ${newDeviceInfo.model} [${newDeviceInfo.id}] found at ${newDeviceInfo.location}`);
    }
    // help typescript see this is never null
    if (accessory) {
      accessory["context"] = newDeviceInfo;
      accessory.reachable = true;
      const light = new Light(this.log, this.config, createdDevice, this.api, accessory);
      if (register) {
        this.api.registerPlatformAccessories(PLUGINNAME, PLATFORMNAME, [accessory]);
      }
      this.myAccessories.set(newDeviceInfo.id, light);
      this.log(`Pushing ${newDeviceInfo.model} [${newDeviceInfo.id}] found at ${newDeviceInfo.location}`);
      // this.accessories.push(accessory);
    }
  };

  configureAccessory(accessory: Accessory) {
    this.log("Configure Accessory", accessory);
    this.cachedAccessories.set(accessory.UUID, accessory);
  }

  configurationRequestHandler(context, request, callback) {
    this.log("configurationRequestHandler", context, request, callback);
    callback({});
  }
}

export default function(homeBridgeApi: any) {
  homeBridgeApi.registerPlatform(PLUGINNAME, PLATFORMNAME, YeelighterPlatform, true);
}

/* eslint-enable @typescript-eslint/camelcase */
