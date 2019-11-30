/// <reference types="node" />

declare module "homebridge" {
  import { EventEmitter } from "events";
  import { EventAccessory, Service } from "hap-nodejs";
  export interface API extends EventEmitter {
    hap: any;
    accessory: (name: string) => HomeBridgeAccessory;
    registerAccessory: (
      pluginName: string,
      accessoryName: string,
      instance?: HomeBridgeConstructableAccessory,
      configurationRequestHandler?: () => void
    ) => void;
    registerPlatform: (
      pluginName: string,
      platformName: string,
      instance?: HomeBridgeConstructablePlatform,
      dynamic?: boolean
    ) => void;
    platform: (name: string) => EventAccessory;
    registerPlatformAccessories(pluginName: string, accessoryName: string, accessories: Array<any>);
  }

  export interface Configuration {
    [key: string]: any;
  }

  export interface HomeBridgeAccessory {
    getServices: () => Array<Service>;
  }

  export interface HomeBridgePlatform {
    accessories(callback: (accessories: HomeBridgeAccessory[]) => void);
  }

  interface HomeBridgeConstructableAccessory {
    new (
      log: (message?: any, ...optionalParams: any[]) => void,
      config?: Configuration,
      api?: API
    ): HomeBridgeAccessory;
  }

  interface HomeBridgeConstructablePlatform {
    new (log: (message?: any, ...optionalParams: any[]) => void, config: Configuration, api: API): HomeBridgePlatform;
  }
}
