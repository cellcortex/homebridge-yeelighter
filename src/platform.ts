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
    this.log.info("Loading accessory from cache:", accessory.displayName);

    // add the restored accessory to the accessories cache so we can track if it has already been registered
    this.accessories.push(accessory);
  }

  private onDeviceDiscovery = (detectedInfo: DeviceInfo) => {
    const trackedAttributes = TRACKED_ATTRIBUTES; // .filter(attribute => supportedAttributes.includes(attribute));

    const override: OverrideLightConfiguration[] = this.config.override as OverrideLightConfiguration[] || [];
    const overrideConfig: OverrideLightConfiguration | undefined = override.find(
      item => item.id === detectedInfo.id,
    );
    if (overrideConfig) {
      this.log.info(`Override config for ${detectedInfo.id}: ${JSON.stringify(overrideConfig)}`);
      if (overrideConfig.ignored) {
        this.log.info(`Ignoring ${detectedInfo.id} as configured.`);
        return;
      }
    }
    const newDeviceInfo: DeviceInfo = {
      ...detectedInfo,
      trackedAttributes,
    };

    // generate a unique id for the accessory this should be generated from
    // something globally unique, but constant, for example, the device serial
    // number or MAC address
    const uuid = this.api.hap.uuid.generate(newDeviceInfo.id);
    const device = new Device(newDeviceInfo);

    // see if an accessory with the same uuid has already been registered and restored from
    // the cached devices we stored in the `configureAccessory` method above
    const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);
    
    if (existingAccessory) {
      // the accessory already exists
      if (device) {
        this.log.info(`Cached ${newDeviceInfo.model} [${newDeviceInfo.id}] found at ${newDeviceInfo.location}`);

        // update the accessory.context
        existingAccessory.context.device = device;
        YeeAccessory.instance(newDeviceInfo.id, this, existingAccessory);
         
        this.api.updatePlatformAccessories([existingAccessory]);
        // update accessory cache with any changes to the accessory details and information
        this.api.updatePlatformAccessories([existingAccessory]);

      } else if (!device) {
        // it is possible to remove platform accessories at any time using `api.unregisterPlatformAccessories`, eg.:
        // remove platform accessories when no longer present
        this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [existingAccessory]);
        this.log.info("Removing existing accessory from cache:", existingAccessory.displayName);
      }
    } else {
      // the accessory does not yet exist, so we need to create it
      this.log.info(`New ${newDeviceInfo.model} [${newDeviceInfo.id}] found at ${newDeviceInfo.location}`);
      const accessory = new this.api.platformAccessory(newDeviceInfo.id, uuid);
      this.accessories.push(accessory);
      this.log.info(`Accessory created with UUID ${uuid}`);

      // store a copy of the device object in the `accessory.context`
      // the `context` property can be used to store any data about the accessory you may need
      accessory.context.device = device;

      // create the accessory handler for the newly create accessory
      // this is imported from `platformAccessory.ts`
      YeeAccessory.instance(newDeviceInfo.id, this, accessory);

      // link the accessory to your platform
      this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
    }
  };
}