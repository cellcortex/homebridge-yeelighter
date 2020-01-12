/* eslint-disable @typescript-eslint/camelcase */

import { DeviceInfo, Device } from "./yeedevice";
import { Discovery } from "./yeediscovery";
import { Configuration } from "./lightservice";
import { Light, TRACKED_ATTRIBUTES, OverrideLightConfiguration } from "./light";

const PLUGINNAME = "homebridge-yeelighter";
const PLATFORMNAME = "Yeelighter";

type Accessory = any;

class YeelighterPlatform {
  private myAccessories = new Map<string, any>();
  private agent: Discovery;
  private devices = new Map<string, Device>();
  private cachedAccessories: Map<string, Accessory> = new Map();

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

  private onDeviceDiscovery = (detectedInfo: DeviceInfo) => {
    const overrideConfig: OverrideLightConfiguration | undefined = this.config?.override?.find(
      item => item.id === detectedInfo.id
    );
    if (overrideConfig) {
      this.log(`Override config for ${detectedInfo.id}: ${JSON.stringify(overrideConfig)}`);
      if (overrideConfig.ignored) {
        this.log(`Ignoring ${detectedInfo.id} as configured.`);
        return;
      }
    }
    const oldDevice = this.devices.get(detectedInfo.id);
    // const supportedAttributes = detectedInfo.support.split(",");
    const trackedAttributes = TRACKED_ATTRIBUTES; // .filter(attribute => supportedAttributes.includes(attribute));
    // this.log(`${detectedInfo.id} tracking [${trackedAttributes}] of [${supportedAttributes}]`);
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
      trackedAttributes
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
    }
  };

  configureAccessory(accessory: Accessory) {
    this.log(`Configure Accessory ${accessory.UUID}`);
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
