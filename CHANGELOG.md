# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [1.2.39](https://github.com/cellcortex/homebridge-yeelighter/compare/v1.2.38...v1.2.39) (2020-03-22)

### [1.2.38](https://github.com/cellcortex/homebridge-yeelighter/compare/v1.2.37...v1.2.38) (2020-03-22)


### Features

* converted to non-blocking (slow polling) retrieval of properties ([f48ead3](https://github.com/cellcortex/homebridge-yeelighter/commit/f48ead316109a0615f7f34e0be0751490972cac4))


### Bug Fixes

* check reachable with interval ([c45e00b](https://github.com/cellcortex/homebridge-yeelighter/commit/c45e00b481d6ac202804a5d7751baaa2ecc81a28))

### [1.2.37](https://github.com/cellcortex/homebridge-yeelighter/compare/v1.2.36...v1.2.37) (2020-03-21)


### Bug Fixes

* activate light only when first update received ([62142bc](https://github.com/cellcortex/homebridge-yeelighter/commit/62142bccf2002dc49a210bd8809c9b37e9699e5f))

### [1.2.36](https://github.com/cellcortex/homebridge-yeelighter/compare/v1.2.35...v1.2.36) (2020-03-21)

### [1.2.35](https://github.com/cellcortex/homebridge-yeelighter/compare/v1.2.34...v1.2.35) (2020-03-21)

### [1.2.34](https://github.com/cellcortex/homebridge-yeelighter/compare/v1.2.33...v1.2.34) (2020-03-21)

### [1.2.33](https://github.com/cellcortex/homebridge-yeelighter/compare/v1.2.32...v1.2.33) (2020-03-21)


### Features

* option to disable CT for color lights ([3f527eb](https://github.com/cellcortex/homebridge-yeelighter/commit/3f527ebba0e5f40b44db5fd4fb043493533e5432))
* option to use non-blocking requests and update intervals ([9214e86](https://github.com/cellcortex/homebridge-yeelighter/commit/9214e86e271a38efdc1a7558094cf0324bd1c01b))

### [1.2.32](https://github.com/cellcortex/homebridge-yeelighter/compare/v1.2.31...v1.2.32) (2020-03-19)

### [1.2.30](https://github.com/cellcortex/homebridge-yeelighter/compare/v1.2.29...v1.2.30) (2020-03-19)


### Features

* support for Mi LED Ceiling Light ([21948f9](https://github.com/cellcortex/homebridge-yeelighter/commit/21948f9de93b23fc86e61271a1f8853593f0c8b7))

### [1.2.29](https://github.com/cellcortex/homebridge-yeelighter/compare/v1.2.28...v1.2.29) (2020-01-19)


### Bug Fixes

* off status was not correctly set when disconnected ([707b9ad](https://github.com/cellcortex/homebridge-yeelighter/commit/707b9ad9bc8a92f4b66b63f2a7eb928f03e8e450))

### [1.2.28](https://github.com/cellcortex/homebridge-yeelighter/compare/v1.2.27...v1.2.28) (2020-01-17)


### Features

* 5s timeout when requesting attributes to handle power-off case ([212db99](https://github.com/cellcortex/homebridge-yeelighter/commit/212db9946b5d7d72dba9867999ad43f15c8a05be))

### [1.2.27](https://github.com/cellcortex/homebridge-yeelighter/compare/v1.2.26...v1.2.27) (2020-01-17)


### Bug Fixes

* sending commands to disconnected lights did hang ([65af343](https://github.com/cellcortex/homebridge-yeelighter/commit/65af343fbbf254556ac6ec167dd927c8afe872a8))

### [1.2.26](https://github.com/cellcortex/homebridge-yeelighter/compare/v1.2.25...v1.2.26) (2020-01-17)


### Bug Fixes

* update on power ([5ee59d2](https://github.com/cellcortex/homebridge-yeelighter/commit/5ee59d2dbd9f5768578969d63aa1d59cd7c00093))

### [1.2.25](https://github.com/cellcortex/homebridge-yeelighter/compare/v1.2.24...v1.2.25) (2020-01-17)


### Features

* update attributes when re-connected ([6afc4d6](https://github.com/cellcortex/homebridge-yeelighter/commit/6afc4d6e245d853b604b05124a6782707f7d57cb))

### [1.2.24](https://github.com/cellcortex/homebridge-yeelighter/compare/v1.2.23...v1.2.24) (2020-01-17)


### Features

* handle disconnect ([cd5828a](https://github.com/cellcortex/homebridge-yeelighter/commit/cd5828a82250b418d295eb22ff1cef4c92aff58c))

### [1.2.23](https://github.com/cellcortex/homebridge-yeelighter/compare/v1.2.22...v1.2.23) (2020-01-12)


### Features

* configuration to make a light go 'off' in homekit when it disconnects ([b619e9a](https://github.com/cellcortex/homebridge-yeelighter/commit/b619e9a0999973791006340699f76c011ebc6e4d))

### [1.2.22](https://github.com/cellcortex/homebridge-yeelighter/compare/v1.2.21...v1.2.22) (2020-01-12)


### Bug Fixes

* attribute update promise was not caught ([f62dd4f](https://github.com/cellcortex/homebridge-yeelighter/commit/f62dd4fa3dfc30292eed424035701c1aaa36e0e5))

### [1.2.21](https://github.com/cellcortex/homebridge-yeelighter/compare/v1.2.20...v1.2.21) (2020-01-12)


### Bug Fixes

* added CT first so the presets are used from color hopefully ([afb5156](https://github.com/cellcortex/homebridge-yeelighter/commit/afb515627c1a7f237374fda3bc70b47780d60aeb))

### [1.2.20](https://github.com/cellcortex/homebridge-yeelighter/compare/v1.2.19...v1.2.20) (2020-01-12)


### Bug Fixes

* better function for calculating hue and saturation from colortemp ([85acce2](https://github.com/cellcortex/homebridge-yeelighter/commit/85acce2c74a4657b95ff96f5538181deafba2e25))

### [1.2.19](https://github.com/cellcortex/homebridge-yeelighter/compare/v1.2.18...v1.2.19) (2020-01-12)


### Bug Fixes

* setting color temperature on color lamps ([cc5fa21](https://github.com/cellcortex/homebridge-yeelighter/commit/cc5fa2178358fd1dede20e0aadcc4fef4e9d3212))

### [1.2.18](https://github.com/cellcortex/homebridge-yeelighter/compare/v1.2.17...v1.2.18) (2020-01-12)


### Bug Fixes

* color light was switched on whenever a property was read. ([2eb35d5](https://github.com/cellcortex/homebridge-yeelighter/commit/2eb35d5c9795d070fda389b0cb9a0ce6664055f4))

### [1.2.17](https://github.com/cellcortex/homebridge-yeelighter/compare/v1.2.16...v1.2.17) (2020-01-12)


### Bug Fixes

* logging (now really) ([60c8024](https://github.com/cellcortex/homebridge-yeelighter/commit/60c8024861b23184951642db1406a2a4caf2352a))

### [1.2.16](https://github.com/cellcortex/homebridge-yeelighter/compare/v1.2.15...v1.2.16) (2020-01-12)


### Bug Fixes

* logging ([7b050ef](https://github.com/cellcortex/homebridge-yeelighter/commit/7b050effdbef4596093c0f9af24d890d605e5991))

### [1.2.15](https://github.com/cellcortex/homebridge-yeelighter/compare/v1.2.14...v1.2.15) (2020-01-12)


### Bug Fixes

* overrideconfig would always ignore light ([98bba1f](https://github.com/cellcortex/homebridge-yeelighter/commit/98bba1fccf2a6a74dfb42d0aa8d1150f76c1842c))

### [1.2.14](https://github.com/cellcortex/homebridge-yeelighter/compare/v1.2.13...v1.2.14) (2020-01-12)


### Features

* allow for detailed logging in individual lights in config ([65e7dad](https://github.com/cellcortex/homebridge-yeelighter/commit/65e7dada4f3d84159ded82752832582c6cf0363e))

### [1.2.13](https://github.com/cellcortex/homebridge-yeelighter/compare/v1.2.12...v1.2.13) (2020-01-12)

### [1.2.12](https://github.com/cellcortex/homebridge-yeelighter/compare/v1.2.11...v1.2.12) (2020-01-12)


### Bug Fixes

* Changed default behavior to not update characteristics (yet) ([1741af1](https://github.com/cellcortex/homebridge-yeelighter/commit/1741af1872814ad08b73c4ecf14705865b9d6dcb))

### [1.2.11](https://github.com/cellcortex/homebridge-yeelighter/compare/v1.2.10...v1.2.11) (2020-01-12)


### Features

* update attributes in case some other app has changed them ([23fbd32](https://github.com/cellcortex/homebridge-yeelighter/commit/23fbd32451e8cdefc8ee58372d04825ac81c6599))

### [1.2.10](https://github.com/cellcortex/homebridge-yeelighter/compare/v1.2.9...v1.2.10) (2020-01-11)


### Features

* config setting to save default values (so on power cycle the status is restored) ([b372b13](https://github.com/cellcortex/homebridge-yeelighter/commit/b372b13934e2f79688b63dccdf4cbb967fcaa522))

### [1.2.9](https://github.com/cellcortex/homebridge-yeelighter/compare/v1.2.8...v1.2.9) (2020-01-11)


### Bug Fixes

* disable CT for background light (for now) ([a79f16e](https://github.com/cellcortex/homebridge-yeelighter/commit/a79f16edd5abda3580ede02518468686d847f971))

### [1.2.8](https://github.com/cellcortex/homebridge-yeelighter/compare/v1.2.7...v1.2.8) (2020-01-11)


### Bug Fixes

* background light was setting the front light ct instead ([c2a6caa](https://github.com/cellcortex/homebridge-yeelighter/commit/c2a6caaa4adf8b550444ac0967194e4546d9a6ea))

### [1.2.7](https://github.com/cellcortex/homebridge-yeelighter/compare/v1.2.6...v1.2.7) (2020-01-11)


### Bug Fixes

* do not spam 'Disconnected' if device remains inactive ([1de04c2](https://github.com/cellcortex/homebridge-yeelighter/commit/1de04c24c6eba9c0d182c084cd0d3c576addddc1))

### [1.2.6](https://github.com/cellcortex/homebridge-yeelighter/compare/v1.2.5...v1.2.6) (2020-01-11)


### Features

* support for CT in background light ([48325d9](https://github.com/cellcortex/homebridge-yeelighter/commit/48325d9b4a0341216cf13d268396bad1aca557c1))

### [1.2.5](https://github.com/cellcortex/homebridge-yeelighter/compare/v1.2.4...v1.2.5) (2020-01-11)


### Bug Fixes

* updates were queried only once ([7171222](https://github.com/cellcortex/homebridge-yeelighter/commit/7171222ecdc1278b21b05f13586c11e12f13bb04))

### [1.2.4](https://github.com/cellcortex/homebridge-yeelighter/compare/v1.2.3...v1.2.4) (2020-01-11)


### Bug Fixes

* added background light ct (which was missing from the attributes) ([ef4c479](https://github.com/cellcortex/homebridge-yeelighter/commit/ef4c4793a0c994a2b38705d573afd1812edc7133))

### [1.2.3](https://github.com/cellcortex/homebridge-yeelighter/compare/v1.2.2...v1.2.3) (2020-01-11)


### Features

* detection for meteorite ([bdc06a5](https://github.com/cellcortex/homebridge-yeelighter/commit/bdc06a5535495ee578f79db21efc22bebd55e33b))

### [1.2.2](https://github.com/cellcortex/homebridge-yeelighter/compare/v1.2.1...v1.2.2) (2020-01-10)

### [1.2.1](https://github.com/cellcortex/homebridge-yeelighter/compare/v1.2.0...v1.2.1) (2020-01-10)

### Bug Fixes

- CT was not working correctly for color lights ([cbaf20b](https://github.com/cellcortex/homebridge-yeelighter/commit/cbaf20b678617ca577f67762157e156e4081550d))

## [1.2.0](https://github.com/cellcortex/homebridge-yeelighter/compare/v1.0.8...v1.2.0) (2020-01-10)

### Features

- added template for configuration UI ([214d31c](https://github.com/cellcortex/homebridge-yeelighter/commit/214d31c3ccb54f32ea06ceba2850c422684b0462))
- White light support ([42d768b](https://github.com/cellcortex/homebridge-yeelighter/commit/42d768bb92aee9175531a346a94e8f7d3d1b301b))

### Bug Fixes

- Bedside lamp 2 was false classified as having moonlight ([2b1b547](https://github.com/cellcortex/homebridge-yeelighter/commit/2b1b5471e28db521ae7c2eb9523aa838a2d2a35e))

## [1.1.0](https://github.com/cellcortex/homebridge-yeelighter/compare/v1.0.9...v1.1.0) (2020-01-07)

### Features

- added template for configuration UI ([ececa77](https://github.com/cellcortex/homebridge-yeelighter/commit/ececa77ec2bc32eaa2776647dd06cdb73d8349c9))

## [1.0.9](https://github.com/cellcortex/homebridge-yeelighter/compare/v1.0.8...v1.0.9) (2020-01-07)

- added support for lightstrips and additional ceiling lights
- fallback in case that an unknown model is detected
- added support for color (main) lights

## [1.0.8](https://github.com/cellcortex/homebridge-yeelighter/compare/v1.0.5...v1.0.8) (2020-01-07)
