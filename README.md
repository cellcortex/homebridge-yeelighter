<h1 align="center">Welcome to homebridge-yeelighter 👋</h1>
<p>
  <a href="https://www.npmjs.com/package/homebridge-yeelighter" target="_blank">
    <img alt="Version" src="https://img.shields.io/npm/v/homebridge-yeelighter.svg">
  </a>
  <img src="https://img.shields.io/badge/node-%3E%3D10.0.0-blue.svg" />
  <img src="https://img.shields.io/badge/homebridge-%3E%3D0.2.0-blue.svg" />
  <a href="#" target="_blank">
    <img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-yellow.svg" />
  </a>
  <a href="https://twitter.com/cellcortex" target="_blank">
    <img alt="Twitter: cellcortex" src="https://img.shields.io/twitter/follow/cellcortex.svg?style=social" />
  </a>
</p>

Yeelight support for Homebridge: https://github.com/nfarina/homebridge with particular focus on supporting the special features of ceiling lights.

There are many plugins for Yeelight already. This one is unique (so far) in supporting the
background light that some yeelights have and also has a diffent approach to the moonlight mode (exposed as just another range for brightness).

If a light supports a background light, it will show up as a secondary service in the light accessory. If a light supports moonlight mode, the brightness will be adjusted so that the lower 50% are reserved for moonlight brightness and the upper 50% are using the "normal" mode. While this makes it simple to control the moonlight mode, it has the small drawback that setting the color-temperature will only work when in the normal light mode. I could not find an API to set the color temperature of the moonlight.

### 🏠 [Homepage](https://github.com/cellcortex/homebridge-yeelighter)

## Prerequisites

- node >=10.0.0
- homebridge >=0.2.0

## Installation

You might want to update npm through: `$ sudo npm -g i npm@latest`

Install homebridge through: `$ sudo npm -g i homebridge`

Follow the instructions on GitHub to create a config.json in ~/.homebridge, as described;

Install the homebridge-hue plugin through: `$ sudo npm -g i homebridge-yeelighter`

Edit `~/.homebridge/config.json` and add the yeelighter platform provided by homebridge-yeelighter, see Configuration;

## Configuration

In homebridge's config.json you need to specify homebridge-yeelighter as a platform plugin. Furthermore, you need to specify what you want to expose to HomeKit. The simplest form is show below. This will enable the plugin and add all lights with their detected configuration to homekit.

```
"platforms": [
  {
    "platform": "Yeelighter",
    "name": "Yeelighter",
    "timeout": 5000,
    "interval": 60000
  }
]
```

The plugin supports setting the configuration through [homebridge-config-ui-x](https://github.com/oznu/homebridge-config-ui-x).

You can use the override array to override the automatic configuration of the lights. An example for disabling the light with id `0x00000000deadbeef` and enabling moonlight and disabling background for `0x0000000012345678`:

```
"platforms": [
  {
    "platform": "Yeelighter",
    "name": "Yeelighter",
    "override": [
      {
        "id": "0x00000000deadbeef",
        "ignored": true
      },
      {
        "id": "0x0000000012345678",
        "background": false,
        "nightLight": true
      }
    ]
  }
]
```

### Optional per light configuration:

- `id: string` (mandatory) - the id of the light (as reported in the device config of homebridge)
- `name?: string` (optional) - the name to be used in log messages
- `color?: boolean` (optional) - this light is full RGB color
- `backgroundLight?: boolean` (optional) - this light has a secondary color mood light
- `nightLight?: boolean` (optional) - this light supports moonlight mode
- `log?: boolean` (optional) - enalbe detailed logging for this light
- `offOnDisconnect?: boolean` (optional) - switch the light off in homekit when it disconnects (this is for people with old-school wall switches)
- `colorTemperature?: { min: number, max: number }` (optional) - colorTemperature limits in kelvin

## Setting up the lights

Make sure to enable "LAN control" for the lights you want to control. This is done in the Yeelight app either when setting up the light or in the lights settings which hide behind the ⏏ - button.

There are existing configurations for a number of lights. If your light is not supported, it will
hopefully fall back to a decent fallback configuration. You can use the settings to fine-tune it. In those cases, it would be great if you could open a ticket in the [issues page](http://github.com/cellcortex/homebridge-yeelighter/issues) including the homebridge logs for the light being setup so
the configuration can be added for future users.

## Author

👤 **Thomas Kroeber**

- Twitter: [@cellcortex](https://twitter.com/cellcortex)
- Github: [@cellcortex](https://github.com/cellcortex)

## 🤝 Contributing

Contributions, issues and feature requests are welcome!<br />Feel free to check [issues page](http://github.com/cellcortex/homebridge-yeelighter/issues).

## Show your support

Give a ⭐️ if this project helped you!
