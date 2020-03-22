export interface Specs {
  colorTemperature: {
    min: number;
    max: number;
  };
  nightLight: boolean;
  backgroundLight: boolean;
  name: string;
  color: boolean;
}

export const EMPTY_SPECS: Specs = {
  colorTemperature: { min: 2700, max: 2700 },
  nightLight: false,
  backgroundLight: false,
  name: "unknown",
  color: false
};

// Model specs, thanks to https://gitlab.com/stavros/python-yeelight
export const MODEL_SPECS: { [index: string]: Specs } = {
  mono: {
    colorTemperature: { min: 0, max: 0 },
    nightLight: false,
    backgroundLight: false,
    name: "Serene Eye-Friendly Desk Lamp",
    color: false
  },
  stripe: {
    colorTemperature: { min: 1700, max: 6500 },
    nightLight: false,
    backgroundLight: false,
    name: "Lightstrip Plus",
    color: true
  },
  mono1: {
    colorTemperature: { min: 0, max: 0 },
    nightLight: false,
    backgroundLight: false,
    name: "Mono Light",
    color: false
  },
  color: {
    colorTemperature: { min: 1700, max: 6500 },
    nightLight: false,
    backgroundLight: false,
    name: "Color Light",
    color: true
  },
  color1: {
    colorTemperature: { min: 1700, max: 6500 },
    nightLight: false,
    backgroundLight: false,
    name: "Color Light",
    color: true
  },
  strip1: {
    colorTemperature: { min: 1700, max: 6500 },
    nightLight: false,
    backgroundLight: false,
    name: "Light Strip",
    color: true
  },
  RGBW: {
    colorTemperature: { min: 1700, max: 6500 },
    nightLight: false,
    backgroundLight: false,
    name: "RGBW",
    color: true
  },
  bslamp1: {
    colorTemperature: { min: 1700, max: 6500 },
    nightLight: false,
    backgroundLight: false,
    name: "Bedside Lamp",
    color: true
  },
  bslamp2: {
    colorTemperature: { min: 1700, max: 6500 },
    nightLight: false,
    backgroundLight: false,
    name: "Bedside Lamp 2",
    color: true
  },
  ceiling1: {
    colorTemperature: { min: 2700, max: 6500 },
    nightLight: true,
    backgroundLight: false,
    name: "Ceiling Light",
    color: false
  },
  ceiling2: {
    colorTemperature: { min: 2700, max: 6500 },
    nightLight: true,
    backgroundLight: false,
    name: "Ceiling Light - Youth Version",
    color: false
  },
  ceiling3: {
    colorTemperature: { min: 2700, max: 6500 },
    nightLight: true,
    backgroundLight: false,
    name: "Ceiling Light (Jiaoyue 480)",
    color: false
  },
  ceiling4: {
    colorTemperature: { min: 2700, max: 6500 },
    nightLight: true,
    backgroundLight: true,
    name: "Moon Pro (Jiaoyue 650)",
    color: false
  },
  ceiling5: {
    colorTemperature: { min: 2700, max: 6500 },
    nightLight: true,
    backgroundLight: false,
    name: "Mi LED Ceiling Light",
    color: false
  },
  ceiling10: {
    colorTemperature: { min: 2700, max: 6500 },
    nightLight: false,
    backgroundLight: true,
    name: "Meteorite",
    color: false
  },
  ceiling11: {
    colorTemperature: { min: 2700, max: 6500 },
    nightLight: true,
    backgroundLight: false,
    name: "Ceiling Light (YLXD41YL)",
    color: false
  },
  ceiling15: {
    colorTemperature: { min: 2700, max: 6500 },
    nightLight: true,
    backgroundLight: false,
    name: "Ceiling Light (YLXD42YL)",
    color: false
  },
  ceiling20: {
    colorTemperature: { min: 2700, max: 6500 },
    nightLight: true,
    backgroundLight: true,
    name: "GuangCan Ceiling Light",
    color: false
  },
  color2: {
    colorTemperature: { min: 2700, max: 6500 },
    nightLight: false,
    backgroundLight: false,
    name: "color2",
    color: true
  },
  lamp1: {
    colorTemperature: { min: 2700, max: 6500 },
    nightLight: false,
    backgroundLight: false,
    name: "Color Temperature bulb",
    color: false
  }
};
