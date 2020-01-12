/* Based on works of:
 * Tanner Helland (http://www.tannerhelland.com/4435/convert-temperature-rgb-algorithm-code/)
 * Neil Bartlett (http://www.zombieprototypes.com/?p=210)
 * AMoo-Miki https://github.com/AMoo-Miki/homebridge-tuya-lan/blob/master/lib/BaseAccessory.js#L136
 */

export function convertHomeKitColorTemperatureToHomeKitColor(value) {
  const dKelvin = 10000 / value;
  const rgb = [
    dKelvin > 66
      ? 351.97690566805693 + 0.114206453784165 * (dKelvin - 55) - 40.25366309332127 * Math.log(dKelvin - 55)
      : 255,
    dKelvin > 66
      ? 325.4494125711974 + 0.07943456536662342 * (dKelvin - 50) - 28.0852963507957 * Math.log(dKelvin - 55)
      : 104.49216199393888 * Math.log(dKelvin - 2) - 0.44596950469579133 * (dKelvin - 2) - 155.25485562709179,
    dKelvin > 66
      ? 255
      : 115.67994401066147 * Math.log(dKelvin - 10) + 0.8274096064007395 * (dKelvin - 10) - 254.76935184120902
  ].map(v => Math.max(0, Math.min(255, v)) / 255);
  const max = Math.max(...rgb);
  const min = Math.min(...rgb);
  const d = max - min;
  let h = 0;
  const s = max ? (100 * d) / max : 0;
  const b = 100 * max;

  if (d) {
    switch (max) {
      case rgb[0]:
        h = (rgb[1] - rgb[2]) / d + (rgb[1] < rgb[2] ? 6 : 0);
        break;
      case rgb[1]:
        h = (rgb[2] - rgb[0]) / d + 2;
        break;
      default:
        h = (rgb[0] - rgb[1]) / d + 4;
        break;
    }
    h *= 60;
  }
  return {
    h: Math.round(h),
    s: Math.round(s),
    b: Math.round(b)
  };
}
