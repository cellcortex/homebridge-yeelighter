/// <reference types="node" />
import { Service } from "hap-nodejs";
export declare class PlatformAccessory {
  constructor(displayName: string, UUID: string, category?: any);
  addService(service: Service): Service;
  removeService(service: Service): void;
  /**
   * searchs for a Service in the services collection and returns the first Service object that matches.
   * If multiple services of the same type are present in one accessory, use getServiceByUUIDAndSubType instead.
   * @param {ServiceConstructor|string} name
   * @returns Service
   */
  getService(name: string): Service;

  /**
   * searchs for a Service in the services collection and returns the first Service object that matches.
   * If multiple services of the same type are present in one accessory, use getServiceByUUIDAndSubType instead.
   * @param {string} UUID Can be an UUID, a service.displayName, or a constructor of a Service
   * @param {string} subtype A subtype string to match
   * @returns Service
   */
  getServiceByUUIDAndSubType(UUID: string, subtype: string);
  updateReachability(reachable: boolean);
}
