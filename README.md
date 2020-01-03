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

> Yeelight support for Homebridge: https://github.com/nfarina/homebridge with particular focus on supporting the special features of ceiling lights.

> There are many plugins for Yeelight already. This one is unique (so far) in supporting the
> background light that some yeelights have and also has a diffent approach to the moonlight mode (exposed as just another range for brightness).

### 🏠 [Homepage](https://github.com/cellcortex/homebridge-yeelighter)

## Prerequisites

- node >=10.0.0
- homebridge >=0.2.0

## Installation

You might want to update npm through:
`$ sudo npm -g i npm@latest`
Install homebridge through:
`$ sudo npm -g i homebridge`
Follow the instructions on GitHub to create a config.json in ~/.homebridge, as described;
Install the homebridge-hue plugin through:
`$ sudo npm -g i homebridge-yeelighter`
Edit `~/.homebridge/config.json` and add the yeelighter platform provided by homebridge-yeelighter, see Configuration;

## Configuration

In homebridge's config.json you need to specify homebridge-yeelighter as a platform plugin. Furthermore, you need to specify what you want to expose to HomeKit, see the example below.

```
"platforms": [
  {
    "platform": "yeelighter",
  }
]
```

## Author

👤 **Thomas Kroeber**

- Twitter: [@cellcortex](https://twitter.com/cellcortex)
- Github: [@cellcortex](https://github.com/cellcortex)

## 🤝 Contributing

Contributions, issues and feature requests are welcome!<br />Feel free to check [issues page](http://github.com/cellcortex/homebridge-yeelighter/issues). You can also take a look at the [contributing guide](git://github.com/cellcortex/homebridge-yeelighter/blob/master/CONTRIBUTING.md).

## Show your support

Give a ⭐️ if this project helped you!

---

_This README was generated with ❤️ by [readme-md-generator](https://github.com/kefranabg/readme-md-generator)_
