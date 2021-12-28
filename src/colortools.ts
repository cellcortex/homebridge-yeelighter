/* Based on works of:
 * Tanner Helland (http://www.tannerhelland.com/4435/convert-temperature-rgb-algorithm-code/)
 * Neil Bartlett (http://www.zombieprototypes.com/?p=210)
 * AMoo-Miki https://github.com/AMoo-Miki/homebridge-tuya-lan/blob/master/lib/BaseAccessory.js#L136
 */

export function convertHomeKitColorTemperatureToHomeKitColor(value) {
  const dKelvin = 10_000 / value;
  const rgb = [
    dKelvin > 66
      ? 351.976_905_668_056_93 + 0.114_206_453_784_165 * (dKelvin - 55) - 40.253_663_093_321_27 * Math.log(dKelvin - 55)
      : 255,
    dKelvin > 66
      ? 325.449_412_571_197_4 + 0.079_434_565_366_623_42 * (dKelvin - 50) - 28.085_296_350_795_7 * Math.log(dKelvin - 55)
      : 104.492_161_993_938_88 * Math.log(dKelvin - 2) - 0.445_969_504_695_791_33 * (dKelvin - 2) - 155.254_855_627_091_79,
    dKelvin > 66
      ? 255
      : 115.679_944_010_661_47 * Math.log(dKelvin - 10) + 0.827_409_606_400_739_5 * (dKelvin - 10) - 254.769_351_841_209_02
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
