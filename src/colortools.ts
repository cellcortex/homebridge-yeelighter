/*    export updateColorByColorTemperature: function(colorTemperature) {
        if (!this.hue && !this.saturation)
            return;

        const rgbObject = temperatureToRGB(colorTemperature);
        const hsvObject = RGBtoHSV(rgbObject.red, rgbObject.green, rgbObject.blue);

        if (this.hue)
            this.homebridgeService.getCharacteristic(Characteristic.Hue).updateValue(hsvObject.hue);
        if (this.saturation)
            this.homebridgeService.getCharacteristic(Characteristic.Saturation).updateValue(hsvObject.saturation);
    },
*/

export interface HSV {
  hue: number;
  saturation: number;
  value: number;
}

export function ctToHSV(miredTemperature: number): HSV {
  // temperature gets passed in in Mired
  const temperature = 1000000 / miredTemperature / 100; // algorithm needs temperature in Kelvin

  // temperature to RGB
  let red = 255;
  let green = 0;
  let blue = 255;

  if (temperature > 66) {
    red = temperature - 60;
    red = 329.698727446 * (red ^ -0.1332047592);
    red = Math.min(Math.max(red, 0), 255);
  }

  if (temperature <= 66) {
    green = 99.4708025861 * Math.log(temperature) - 161.1195681661;
    green = Math.min(Math.max(green, 0), 255);
  } else {
    green = 288.1221695283 * ((temperature - 60) ^ -0.0755148492);
    green = Math.min(Math.max(green, 0), 255);
  }

  if (temperature > 66) {
    if (temperature <= 19) {
      blue = 0;
    } else {
      blue = temperature - 10;
      blue = 138.5177312231 * Math.log(blue) - 305.0447927307;
      blue = Math.min(Math.max(blue, 0), 255);
    }
  }
  red /= 255;
  green /= 255;
  blue /= 255;

  const max = Math.max(red, Math.max(green, blue));
  const min = Math.min(red, Math.min(green, blue));
  const delta = max - min;

  let h = 0;
  const s = max === 0 ? 0 : delta / max;

  if (max === min) {
    h = 0;
  } else if (max === red) {
    // noinspection PointlessArithmeticExpressionJS
    h = 60 * (0 + (green - blue) / delta);
  } else if (max === green) {
    h = 60 * (2 + (blue - red) / delta);
  } else if (max === blue) {
    h = 60 * (4 + (red - green) / delta);
  }

  return { hue: Math.round(h), saturation: Math.round(s * 100), value: Math.round(max * 100) };
}
