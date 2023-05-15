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
  ceiling13: {
    colorTemperature: { min: 2700, max: 6500 },
    nightLight: true,
    backgroundLight: false,
    name: "Ceiling Light (A2001R900)",
    color: false
  },
  ceiling14: {
    colorTemperature: { min: 2700, max: 6500 },
    nightLight: true,
    backgroundLight: false,
    name: "Ceiling Light (A2001C550)",
    color: false
  },
  ceiling15: {
    colorTemperature: { min: 2700, max: 6500 },
    nightLight: true,
    backgroundLight: true,
    name: "Ceiling Light (YLXD42YL)",
    color: false
  },
  ceiling17: {
    colorTemperature: { min: 3000, max: 5700 },
    nightLight: true,
    backgroundLight: false,
    name: "Ceiling Light (YLXD60YL)",
    color: false
  },
  ceiling18: {
    colorTemperature: { min: 2700, max: 6500 },
    nightLight: true,
    backgroundLight: false,
    name: "Ceiling Light (A2001C450)",
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
  color4: {
    colorTemperature: { min: 2700, max: 6500 },
    nightLight: false,
    backgroundLight: false,
    name: "color4",
    color: true
  },
  lamp1: {
    colorTemperature: { min: 2700, max: 6500 },
    nightLight: false,
    backgroundLight: false,
    name: "Color Temperature bulb",
    color: false
  },
  lamp9: {
    colorTemperature: { min: 2700, max: 6500 },
    nightLight: false,
    backgroundLight: false,
    name: "Staria Bedside Lamp Pro",
    color: false
  },
  desklamp: {
    colorTemperature: { min: 2700, max: 6599 },
    nightLight: false,
    backgroundLight: false,
    name: "Desk Lamp",
    color: false
  },
  ceila: {
    colorTemperature: { min: 2700, max: 6500 },
    nightLight: true,
    backgroundLight: false,
    name: "A2001 Ceiling Light",
    color: false
  },
  ceilc: {
    colorTemperature: { min: 2700, max: 6500 },
    nightLight: true,
    backgroundLight: true,
    name: "Arwen Ceiling Light 550C",
    color: false
  },
  panel3: {
    colorTemperature: { min: 2700, max: 6500 },
    nightLight: true,
    backgroundLight: false,
    name: "Haobai Panel Light",
    color: false
  },
  lamp15: {
    colorTemperature: { min: 2700, max: 6500 },
    nightLight: true,
    backgroundLight: true,
    name: "Monitor Hanging Light",
    color: false
  }
};
