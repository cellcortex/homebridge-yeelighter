# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

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
