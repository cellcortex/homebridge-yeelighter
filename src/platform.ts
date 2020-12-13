import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from "homebridge";
import { PLATFORM_NAME, PLUGIN_NAME } from "./settings";
import { DeviceInfo, Device } from "./yeedevice";
import { YeeAccessory} from "./yeeaccessory";
import { Discovery } from "./discovery";
import { TRACKED_ATTRIBUTES, OverrideLightConfiguration } from "./yeeaccessory";

/**
 * HomebridgePlatform
 * This class is the main constructor for your plugin, this is where you should
 * parse the user config and discover/register accessories with Homebridge.
 */
export class YeelighterPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;

  // this is used to track restored cached accessories
  public readonly accessories: PlatformAccessory[] = [];
  private agent: Discovery;

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
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
      // iscover / register your devices as accessories
      this.agent.listen();
    });
  }

  /**
   * This function is invoked when homebridge restores cached accessories from disk at startup.
   * It should be used to setup event handlers for characteristics and update respective values.
   */
  configureAccessory(accessory: PlatformAccessory) {
    this.log.info(`Loading accessory from cache: ${accessory.displayName} (${accessory.context?.device?.model || "unknown"})`);

    // add the restored accessory to the accessories cache so we can track if it has already been registered
    this.accessories.push(accessory);
  }

  // called when a Yeelight has responded to the discovery query
  private onDeviceDiscovery = (detectedInfo: DeviceInfo) => {
    const trackedAttributes = TRACKED_ATTRIBUTES; // .filter(attribute => supportedAttributes.includes(attribute));

    const override: OverrideLightConfiguration[] = this.config.override as OverrideLightConfiguration[] || [];
    const overrideConfig: OverrideLightConfiguration | undefined = override.find(
      item => item.id === detectedInfo.id,
    );
    const separateAmbient = !!this.config?.split || !!overrideConfig?.separateAmbient;

    const newDeviceInfo: DeviceInfo = {
      ...detectedInfo,
      trackedAttributes,
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
        this.log.info(`Ignoring ${detectedInfo.id} as configured. Removing from cache.`);
        // see if an accessory with the same uuid has already been registered and restored from
        // the cached devices we stored in the `configureAccessory` method above
        const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);
        const purgeList: PlatformAccessory[] = [];
        if (existingAccessory) {
          this.log.info("Removing accessory from cache:", existingAccessory.displayName);
          purgeList.push(existingAccessory);
        }
        const existingAmbientAccessory = this.accessories.find(accessory => accessory.UUID === ambientUuid);            
        if (existingAmbientAccessory) {
          purgeList.push(existingAmbientAccessory);
          this.log.info("Removing accessory from cache:", existingAmbientAccessory.displayName);
        }
        if (purgeList.length > 0) {
          try {
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
    const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);
    let ambientAccessory = this.accessories.find(accessory => accessory.UUID === ambientUuid);

    if (ambientAccessory && !separateAmbient) {
      this.log.info(`Separate Ambient Accessory not wanted anymore. Unregistering`);
      try {
        this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [ambientAccessory]);
      } catch (error) {
        this.log.warn("failed to unregister", ambientAccessory, error);
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
        } catch (error) {
          this.log.warn("Failed to remove accessory", existingAccessory, error);
        }
      }
    } else {
      const addedAccessories: PlatformAccessory[] = [];
      // the accessory does not yet exist, so we need to create it
      this.log.info(`New ${newDeviceInfo.model} [${newDeviceInfo.id}] found at ${newDeviceInfo.location}`);
      const accessory = new this.api.platformAccessory(newDeviceInfo.id, uuid);
      this.accessories.push(accessory);
      addedAccessories.push(accessory);
      this.log.info(`Accessory created with UUID ${uuid}`);
      if (ambientUuid && !ambientAccessory) {
        ambientAccessory = new this.api.platformAccessory(newDeviceInfo.id, ambientUuid);
        ambientAccessory.context.device = newDeviceInfo;
        this.accessories.push(ambientAccessory);
        addedAccessories.push(ambientAccessory);
        this.log.info(`Separate Ambient Accessory created with UUID ${ambientUuid}`);
      }
      // store a copy of the device object in the `accessory.context`
      // the `context` property can be used to store any data about the accessory you may need
      accessory.context.device = newDeviceInfo;

      // create the accessory handler for the newly create accessory
      // this is imported from `platformAccessory.ts`
      YeeAccessory.instance(device, this, accessory, ambientAccessory);

      // link the accessory to your platform
      this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, addedAccessories);
    }
  };
}