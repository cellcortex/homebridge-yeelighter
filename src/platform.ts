import url from "node:url";
import {
  API,
  DynamicPlatformPlugin,
  Logger,
  PlatformAccessory,
  PlatformConfig,
  Service,
  Characteristic
} from "homebridge";
import { PLATFORM_NAME, PLUGIN_NAME } from "./settings";
import { DeviceInfo, Device, EMPTY_DEVICEINFO } from "./yeedevice";
import { YeeAccessory } from "./yeeaccessory";
import { Discovery } from "./discovery";
import { TRACKED_ATTRIBUTES, OverrideLightConfiguration } from "./yeeaccessory";

interface ManualOverride {
  id: string;
  address: string;
  model: string;
  name?: string;
  log?: boolean;
  color: boolean;
  backgroundLight: boolean;
  nightLight: boolean;
  separateAmbient?: boolean;
  support: string;
}

/**
 * HomebridgePlatform
 * This class is the main constructor for your plugin, this is where you should
 * parse the user config and discover/register accessories with Homebridge.
 */
export class YeelighterPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;
  public readonly AdaptiveLightingController = this.api.hap.AdaptiveLightingController;

  // this is used to track restored cached accessories
  public readonly accessories: PlatformAccessory[] = [];
  private agent: Discovery;

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API
  ) {
    this.log.debug("Finished initializing platform:", this.config.name);
    this.agent = new Discovery();
    this.agent.on("started", () => {
      this.log.debug("** Discovery Started **");
    });
    this.agent.on("didDiscoverDevice", this.onDeviceDiscovery);
    // When this event is fired it means Homebridge has restored all cached accessories from disk.
    // Dynamic Platform plugins should only register new accessories after this event was fired,
    // in order to ensure they weren't added to homebridge already. This event can also be used
    // to start discovery of new accessories.
    this.api.on("didFinishLaunching", () => {
      this.log.debug("Executed didFinishLaunching callback");
      this.agent.listen();
      this.addHardCodedAccessories();
    });
  }

  /**
   * This function is invoked when homebridge restores cached accessories from disk at startup.
   * It should be used to setup event handlers for characteristics and update respective values.
   */
  configureAccessory(accessory: PlatformAccessory) {
    if (this.accessories.some((a) => a.UUID === accessory.UUID)) {
      this.log.warn(
        `Ingnoring duplicate accessory from cache: ${accessory.displayName} (${
          accessory.context?.device?.model || "unknown"
        })`
      );
      return;
    }
    this.log.info(
      `Loading accessory from cache: ${accessory.displayName} (${accessory.context?.device?.model || "unknown"})`
    );

    // add the restored accessory to the accessories cache so we can track if it has already been registered
    this.accessories.push(accessory);
  }

  // called when a Yeelight has responded to the discovery query
  private onDeviceDiscovery = (detectedInfo: DeviceInfo) => {
    try {
      if (!detectedInfo.id) {
        this.log.warn("ingoring device with corrupt DeviceInfo", detectedInfo);
        return;
      }

      const trackedAttributes = TRACKED_ATTRIBUTES; // .filter(attribute => supportedAttributes.includes(attribute));

      const override: OverrideLightConfiguration[] = (this.config.override as OverrideLightConfiguration[]) || [];
      const overrideConfig: OverrideLightConfiguration | undefined = override.find(
        (item) => item.id === detectedInfo.id
      );
      const separateAmbient =
        ((this.config?.split && overrideConfig?.separateAmbient !== false) ||
          overrideConfig?.separateAmbient === true) &&
        (detectedInfo.support.includes("bg_set_power") || !!overrideConfig?.backgroundLight);

      const newDeviceInfo: DeviceInfo = {
        ...detectedInfo,
        trackedAttributes
      };

      // generate a unique id for the accessory this should be generated from
      // something globally unique, but constant, for example, the device serial
      // number or MAC address
      const uuid = this.api.hap.uuid.generate(newDeviceInfo.id);
      // if the device has a secondary (ambient) light and is configured to have
      // this shown as a separate top-level light, generate a separate UUID for it
      const ambientUuid = this.api.hap.uuid.generate(`${newDeviceInfo.id}#ambient`);

      if (overrideConfig) {
        this.log.info(`Override config for ${detectedInfo.id}: ${JSON.stringify(overrideConfig)}`);
        if (overrideConfig.ignored) {
          this.log.info(`Ignoring ${detectedInfo.id} as configured.`);
          // see if an accessory with the same uuid has already been registered and restored from
          // the cached devices we stored in the `configureAccessory` method above
          const existingAccessory = this.accessories.find((accessory) => accessory.UUID === uuid);
          const purgeList: PlatformAccessory[] = [];
          if (existingAccessory) {
            this.log.info("Removing ignored accessory from cache:", existingAccessory.displayName);
            purgeList.push(existingAccessory);
          }
          const existingAmbientAccessory = this.accessories.find((accessory) => accessory.UUID === ambientUuid);
          if (existingAmbientAccessory) {
            purgeList.push(existingAmbientAccessory);
            this.log.info("Removing ignored ambient accessory from cache:", existingAmbientAccessory.displayName);
          }
          if (purgeList.length > 0) {
            try {
              for (const item of purgeList) {
                const index = this.accessories.indexOf(item);
                if (index >= 0) {
                  this.accessories.splice(index, 1);
                }
              }
              this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, purgeList);
            } catch (error) {
              this.log.warn("Failed to unregister", purgeList, error);
            }
          }
          return;
        }
      }
      const device = new Device(newDeviceInfo);

      // see if an accessory with the same uuid has already been registered and restored from
      // the cached devices we stored in the `configureAccessory` method above
      const existingAccessory = this.accessories.find((accessory) => accessory.UUID === uuid);
      let ambientAccessory = this.accessories.find((accessory) => accessory.UUID === ambientUuid);

      if (ambientAccessory && !separateAmbient) {
        try {
          this.log.info(`Separate Ambient Accessory not wanted anymore. Unregistering`, ambientAccessory.UUID);
          const index = this.accessories.indexOf(ambientAccessory);
          if (index >= 0) {
            this.accessories.splice(index, 1);
          }
          this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [ambientAccessory]);
          // TODO: remove from this.accessories
        } catch (error) {
          this.log.warn("failed to unregister", ambientAccessory.UUID, error);
        }
        ambientAccessory = undefined;
      }

      if (existingAccessory) {
        // the accessory already exists
        if (device) {
          this.log.info(`New (cached) ${newDeviceInfo.model} [${newDeviceInfo.id}] found at ${newDeviceInfo.location}`);
          // update the accessory.context
          existingAccessory.context.device = newDeviceInfo;
          const updateAccessories = [existingAccessory];

          if (!ambientAccessory && separateAmbient) {
            ambientAccessory = new this.api.platformAccessory(newDeviceInfo.id, ambientUuid);
            ambientAccessory.context.device = newDeviceInfo;
            this.log.info(`Separate Ambient Accessory created with UUID ${ambientUuid}`);
            // link the accessory to your platform
            this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [ambientAccessory]);
            updateAccessories.push(ambientAccessory);
          }
          YeeAccessory.instance(device, this, existingAccessory, ambientAccessory);
          // update accessory cache with any changes to the accessory details and information
          this.api.updatePlatformAccessories(updateAccessories);
        } else {
          // it is possible to remove platform accessories at any time using `api.unregisterPlatformAccessories`, eg.:
          // remove platform accessories when no longer present
          try {
            this.log.info("Removing existing accessory from cache:", existingAccessory.displayName);
            this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [existingAccessory]);
            const index = this.accessories.indexOf(existingAccessory);
            if (index >= 0) {
              this.accessories.splice(index, 1);
            }
          } catch (error) {
            this.log.warn("Failed to remove accessory", existingAccessory, error);
          }
        }
      } else {
        const addedAccessories: PlatformAccessory[] = [];
        // the accessory does not yet exist, so we need to create it
        this.log.info(`New ${newDeviceInfo.model} [${newDeviceInfo.id}] found at ${newDeviceInfo.location}`);
        const accessory = new this.api.platformAccessory(newDeviceInfo.id, uuid);
        // store a copy of the device object in the `accessory.context`
        // the `context` property can be used to store any data about the accessory you may need
        accessory.context.device = newDeviceInfo;
        this.configureAccessory(accessory);
        addedAccessories.push(accessory);
        this.log.info(`Accessory created with UUID ${uuid}`);
        if (separateAmbient && !ambientAccessory) {
          ambientAccessory = new this.api.platformAccessory(newDeviceInfo.id, ambientUuid);
          ambientAccessory.context.device = newDeviceInfo;
          this.configureAccessory(ambientAccessory);
          addedAccessories.push(ambientAccessory);
          this.log.info(`Separate Ambient Accessory created with UUID ${ambientUuid}`);
        }

        // create the accessory handler for the newly create accessory
        YeeAccessory.instance(device, this, accessory, ambientAccessory);

        // link the accessory to your platform
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, addedAccessories);
      }
    } catch (error) {
      this.log.error("Device discovery handling failed", error);
    }
  };

  private addHardCodedAccessories() {
    const manualAccessories: ManualOverride[] = (this.config?.manual as ManualOverride[]) || [];
    this.log.info(`adding ${manualAccessories.length} manual accessories`);
    for (const manualAccessory of manualAccessories) {
      const deviceInfo: DeviceInfo = { ...EMPTY_DEVICEINFO };
      deviceInfo.location = `yeelight://${manualAccessory.address}`;
      const parsedUrl = url.parse(deviceInfo.location);
      deviceInfo.host = parsedUrl.hostname || "";
      deviceInfo.port = Number(parsedUrl.port || "55443");
      deviceInfo.id = manualAccessory.id;
      deviceInfo.model = manualAccessory.model;
      deviceInfo.support = manualAccessory.support;
      this.onDeviceDiscovery(deviceInfo);
    }
  }
}
