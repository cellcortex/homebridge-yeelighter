const assert = require("node:assert/strict");
const { LightService } = require("../dist/lightservice.js");
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
function fixture() {
  const s = Object.create(LightService.prototype);
  s.debounceTimers = {};
  s.hsvGeneration = 0;
  s.state = { hue: 359, sat: 100, bg_hue: 120, bg_sat: 50 };
  s.calls = [];
  s.attributes = async () => ({ ...s.state });
  s.ensurePowerMode = async () => {};
  s.sendAnimatedCommand = async (method, values) => s.calls.push([method, values]);
  s.setAttributes = (values) => Object.assign(s.state, values);
  s.saveDefaultIfNeeded = () => {};
  s.warn = (...args) => {
    throw new Error(JSON.stringify(args));
  };
  return s;
}
(async () => {
  let s = fixture();
  s.lastHue = 120;
  await s.setHSV();
  await wait(160);
  assert.deepEqual(s.calls, [["set_hsv", [120, 100]]]);
  s.lastSat = 50;
  await s.setHSV();
  await wait(160);
  assert.deepEqual(s.calls.at(-1), ["set_hsv", [120, 50]]);
  s.lastHue = 0;
  await s.setHSV();
  s.lastSat = 0;
  await s.setHSV();
  await wait(160);
  assert.deepEqual(s.calls.at(-1), ["set_hsv", [0, 0]]);
  assert.equal(s.calls.length, 3);
  s = fixture();
  for (let hue = 1; hue <= 20; hue++) {
    s.lastHue = hue;
    await s.setHSV();
  }
  s.lastSat = 75;
  await s.setHSV();
  await wait(160);
  assert.deepEqual(s.calls, [["set_hsv", [20, 75]]]);
  s = fixture();
  s.lastHue = 30;
  await s.setHSV();
  s.cancelAllDebounces();
  await wait(160);
  assert.equal(s.calls.length, 0);
  s.lastSat = 25;
  await s.setHSV();
  await wait(160);
  assert.deepEqual(s.calls, [["set_hsv", [359, 25]]]);
  s = fixture();
  let finishFirst;
  s.sendAnimatedCommand = async (method, values) => {
    s.calls.push([method, values]);
    if (s.calls.length === 1) await new Promise((r) => (finishFirst = r));
  };
  s.lastHue = 60;
  s.lastSat = 30;
  await s.setHSV();
  await wait(160);
  s.lastHue = 90;
  await s.setHSV();
  await wait(160);
  finishFirst();
  await wait(10);
  assert.deepEqual(s.calls, [
    ["set_hsv", [60, 30]],
    ["set_hsv", [90, 30]]
  ]);
  assert.deepEqual(s.state.hue, 90);
  assert.deepEqual(s.state.sat, 30);
  s = fixture();
  s.lastHue = 0;
  await s.setHSV("bg_");
  await wait(160);
  assert.deepEqual(s.calls, [["bg_set_hsv", [0, 50]]]);
  console.log(
    "PASS: hue-only, saturation-only, zero values, burst coalescing, power-off cancellation, in-flight final color, background fallback."
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
