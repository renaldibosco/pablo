// Pablo's IDE — board database.
// Every header is listed in PHYSICAL order, top to bottom, as printed on the board
// (USB / antenna at the top unless noted). Data from the official pinouts/datasheets:
// Arduino (Uno R3, Nano, Mega 2560 R3, Leonardo), Espressif (ESP32 DevKitC v4, ESP32/ESP8266
// datasheets), DOIT ESP32 DevKit V1, NodeMCU v2 (Amica), WEMOS D1 mini, Raspberry Pi Pico /
// Pico W datasheets, Raspberry Pi 4/5 GPIO documentation.
//
// pin fields:
//   n     label printed on the board
//   t     'io' | 'pwr' | 'gnd' | 'nc' | 'ctl'
//   g     GPIO / Arduino pin number used in code
//   caps  space separated: din dout pwm adc sda scl rx tx spi int dac
//   rail  for power pins: '5V' | '3V3' | 'VIN'
//   alias other pin label that is the SAME electrical pin
//   flags: inputOnly, noPull, usb, strap(msg), flash, led, adc2, softpwm, hwpwm, fixedPullup, reserved
//   note  human note

const caps = (s) => s.split(' ').filter(Boolean);
const io = (n, g, c, extra = {}) => ({ n, g, t: 'io', caps: caps(c), ...extra });
const pw = (n, rail, note) => ({ n, t: 'pwr', rail, note });
const gnd = () => ({ n: 'GND', t: 'gnd' });
const nc = (n, note) => ({ n, t: 'nc', note });
const ctl = (n, note) => ({ n, t: 'ctl', note });

// ---------- Arduino AVR helpers ----------
function avrD(num, pwmSet, extra = {}) {
  const c = ['din', 'dout'];
  if (pwmSet.includes(num)) c.push('pwm');
  return { n: 'D' + num, g: String(num), t: 'io', caps: c, ...extra };
}

// ================= Arduino Uno R3 =================
const UNO_PWM = [3, 5, 6, 9, 10, 11];
const uno = {
  id: 'uno', name: 'Arduino Uno R3', short: 'Uno', family: 'arduino', mcu: 'ATmega328P @ 16 MHz',
  logicV: 5, fiveVTolerant: true, adcBits: 10, lang: 'Arduino C++',
  wireless: null,
  memory: '32 KB flash · 2 KB SRAM · 1 KB EEPROM',
  power: {
    inputs: [
      { pin: 'VIN', range: [7, 12], label: 'VIN / DC jack 7–12 V (6–20 V absolute)' },
      { pin: '5V', range: [4.75, 5.25], label: '5V pin: regulated 5 V only (bypasses the regulator)' },
      { pin: 'USB', range: [4.75, 5.25], label: 'USB-B 5 V' },
    ],
    railMax: { '5V': 400, '3V3': 50 },
    railNote: { '5V': 'Practical budget for modules. From USB the polyfuse trips at 500 mA total; from VIN the regulator overheats above ~400 mA at 9 V+.', '3V3': '3.3 V pin is limited to 50 mA.' },
    draw: { avg: 50, peak: 60 },
    boardFeed: 'VIN',
  },
  pinRec: 20, pinMax: 40, totalIO: 200,
  i2c: { sda: 'A4', scl: 'A5' },
  spi: { sck: 'D13', mosi: 'D11', miso: 'D12' },
  uart: [{ soft: true, name: 'SoftwareSerial' }],
  cols: {
    left: [
      ctl('IOREF', 'Tells shields the logic level (5 V on Uno)'), ctl('RESET', 'Pull LOW to reset'),
      pw('3.3V', '3V3', 'Max 50 mA'), pw('5V', '5V'), gnd(), gnd(), pw('VIN', 'VIN', '7–12 V input'),
      io('A0', 'A0', 'din dout adc'), io('A1', 'A1', 'din dout adc'), io('A2', 'A2', 'din dout adc'),
      io('A3', 'A3', 'din dout adc'), io('A4', 'A4', 'din dout adc sda', { note: 'I2C SDA (same pin as the SDA header pin)' }),
      io('A5', 'A5', 'din dout adc scl', { note: 'I2C SCL (same pin as the SCL header pin)' }),
    ],
    right: [
      { n: 'SCL', t: 'io', alias: 'A5', caps: [] }, { n: 'SDA', t: 'io', alias: 'A4', caps: [] },
      ctl('AREF', 'Analog reference input'), gnd(),
      avrD(13, UNO_PWM, { led: true, caps: ['din', 'dout', 'spi'], note: 'Onboard LED "L" + SPI SCK' }),
      avrD(12, UNO_PWM, { caps: ['din', 'dout', 'spi'], note: 'SPI MISO' }),
      avrD(11, UNO_PWM, { caps: ['din', 'dout', 'pwm', 'spi'], note: 'SPI MOSI' }),
      avrD(10, UNO_PWM, { caps: ['din', 'dout', 'pwm', 'spi'], note: 'SPI SS' }),
      avrD(9, UNO_PWM), avrD(8, UNO_PWM), avrD(7, UNO_PWM), avrD(6, UNO_PWM), avrD(5, UNO_PWM), avrD(4, UNO_PWM),
      avrD(3, UNO_PWM, { caps: ['din', 'dout', 'pwm', 'int'], note: 'Interrupt 1' }),
      avrD(2, UNO_PWM, { caps: ['din', 'dout', 'int'], note: 'Interrupt 0' }),
      avrD(1, UNO_PWM, { caps: ['din', 'dout', 'tx'], usb: true, n: 'D1/TX', note: 'Hardware Serial TX — shared with USB. Leave free for uploading.' }),
      avrD(0, UNO_PWM, { caps: ['din', 'dout', 'rx'], usb: true, n: 'D0/RX', note: 'Hardware Serial RX — shared with USB. Leave free for uploading.' }),
    ],
  },
};

// ================= Arduino Nano (ATmega328P) =================
const nano = {
  id: 'nano', name: 'Arduino Nano', short: 'Nano', family: 'arduino', mcu: 'ATmega328P @ 16 MHz',
  logicV: 5, fiveVTolerant: true, adcBits: 10, lang: 'Arduino C++', wireless: null,
  memory: '32 KB flash · 2 KB SRAM · 1 KB EEPROM',
  layoutNote: 'Pin 1 (D1/TX) top-left, USB at the top. Right column runs pin 30 → 16.',
  power: {
    inputs: [
      { pin: 'VIN', range: [7, 12], label: 'VIN 7–12 V' },
      { pin: '5V', range: [4.75, 5.25], label: '5V pin: regulated 5 V only' },
      { pin: 'USB', range: [4.75, 5.25], label: 'Mini/Micro-USB 5 V' },
    ],
    railMax: { '5V': 400, '3V3': 50 },
    railNote: { '5V': 'USB is limited to 500 mA total; the small regulator overheats with big loads from VIN.', '3V3': '3V3 comes from the USB chip: ~50 mA max.' },
    draw: { avg: 25, peak: 35 },
    boardFeed: 'VIN',
  },
  pinRec: 20, pinMax: 40, totalIO: 200,
  i2c: { sda: 'A4', scl: 'A5' },
  spi: { sck: 'D13', mosi: 'D11', miso: 'D12' },
  uart: [{ soft: true, name: 'SoftwareSerial' }],
  cols: {
    left: [
      avrD(1, UNO_PWM, { n: 'D1/TX', caps: ['din', 'dout', 'tx'], usb: true, note: 'Serial TX — shared with USB' }),
      avrD(0, UNO_PWM, { n: 'D0/RX', caps: ['din', 'dout', 'rx'], usb: true, note: 'Serial RX — shared with USB' }),
      ctl('RESET'), gnd(),
      avrD(2, UNO_PWM, { caps: ['din', 'dout', 'int'], note: 'Interrupt 0' }),
      avrD(3, UNO_PWM, { caps: ['din', 'dout', 'pwm', 'int'], note: 'Interrupt 1' }),
      avrD(4, UNO_PWM), avrD(5, UNO_PWM), avrD(6, UNO_PWM), avrD(7, UNO_PWM), avrD(8, UNO_PWM), avrD(9, UNO_PWM),
      avrD(10, UNO_PWM, { caps: ['din', 'dout', 'pwm', 'spi'], note: 'SPI SS' }),
      avrD(11, UNO_PWM, { caps: ['din', 'dout', 'pwm', 'spi'], note: 'SPI MOSI' }),
      avrD(12, UNO_PWM, { caps: ['din', 'dout', 'spi'], note: 'SPI MISO' }),
    ],
    right: [
      pw('VIN', 'VIN', '7–12 V input'), gnd(), ctl('RESET'), pw('5V', '5V'),
      io('A7', 'A7', 'adc', { note: 'Analog INPUT only — cannot be used as digital' }),
      io('A6', 'A6', 'adc', { note: 'Analog INPUT only — cannot be used as digital' }),
      io('A5', 'A5', 'din dout adc scl', { note: 'I2C SCL' }), io('A4', 'A4', 'din dout adc sda', { note: 'I2C SDA' }),
      io('A3', 'A3', 'din dout adc'), io('A2', 'A2', 'din dout adc'), io('A1', 'A1', 'din dout adc'), io('A0', 'A0', 'din dout adc'),
      ctl('AREF'), pw('3V3', '3V3', '~50 mA max'),
      avrD(13, UNO_PWM, { led: true, caps: ['din', 'dout', 'spi'], note: 'Onboard LED + SPI SCK' }),
    ],
  },
};

// ================= Arduino Mega 2560 R3 =================
const MEGA_PWM = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 44, 45, 46];
const megaA = [];
for (let i = 0; i < 16; i++) {
  const extra = {};
  megaA.push(io('A' + i, 'A' + i, 'din dout adc', extra));
}
const megaDigitalTop = [];
for (let i = 13; i >= 0; i--) {
  const e = {};
  if (i === 13) Object.assign(e, { led: true, note: 'Onboard LED' });
  if (i === 1) Object.assign(e, { n: 'D1/TX0', usb: true, caps: ['din', 'dout', 'tx'], note: 'Serial TX — shared with USB' });
  if (i === 0) Object.assign(e, { n: 'D0/RX0', usb: true, caps: ['din', 'dout', 'rx'], note: 'Serial RX — shared with USB' });
  if (i === 2 || i === 3) Object.assign(e, { caps: ['din', 'dout', 'pwm', 'int'] });
  megaDigitalTop.push(avrD(i, MEGA_PWM, e));
}
const megaComm = [
  avrD(14, MEGA_PWM, { n: 'D14/TX3', caps: ['din', 'dout', 'tx'], note: 'Serial3 TX' }),
  avrD(15, MEGA_PWM, { n: 'D15/RX3', caps: ['din', 'dout', 'rx'], note: 'Serial3 RX' }),
  avrD(16, MEGA_PWM, { n: 'D16/TX2', caps: ['din', 'dout', 'tx'], note: 'Serial2 TX' }),
  avrD(17, MEGA_PWM, { n: 'D17/RX2', caps: ['din', 'dout', 'rx'], note: 'Serial2 RX' }),
  avrD(18, MEGA_PWM, { n: 'D18/TX1', caps: ['din', 'dout', 'tx', 'int'], note: 'Serial1 TX' }),
  avrD(19, MEGA_PWM, { n: 'D19/RX1', caps: ['din', 'dout', 'rx', 'int'], note: 'Serial1 RX' }),
  avrD(20, MEGA_PWM, { n: 'D20/SDA', caps: ['din', 'dout', 'sda', 'int'], note: 'I2C SDA (has 10k pull-up to 5 V on board)' }),
  avrD(21, MEGA_PWM, { n: 'D21/SCL', caps: ['din', 'dout', 'scl', 'int'], note: 'I2C SCL (has 10k pull-up to 5 V on board)' }),
];
const megaDouble = [pw('5V', '5V'), pw('5V', '5V')];
for (let i = 22; i <= 53; i++) {
  const e = {};
  if (i === 50) Object.assign(e, { caps: ['din', 'dout', 'spi'], note: 'SPI MISO' });
  if (i === 51) Object.assign(e, { caps: ['din', 'dout', 'spi'], note: 'SPI MOSI' });
  if (i === 52) Object.assign(e, { caps: ['din', 'dout', 'spi'], note: 'SPI SCK' });
  if (i === 53) Object.assign(e, { caps: ['din', 'dout', 'spi'], note: 'SPI SS' });
  if (i >= 44 && i <= 46) Object.assign(e, { caps: ['din', 'dout', 'pwm'] });
  megaDouble.push(avrD(i, MEGA_PWM, e));
}
megaDouble.push(gnd(), gnd());
const mega = {
  id: 'mega', name: 'Arduino Mega 2560 R3', short: 'Mega', family: 'arduino', mcu: 'ATmega2560 @ 16 MHz',
  logicV: 5, fiveVTolerant: true, adcBits: 10, lang: 'Arduino C++', wireless: null,
  memory: '256 KB flash · 8 KB SRAM · 4 KB EEPROM',
  layoutNote: 'Right column = top digital header (SCL → D0), then the communication header (D14–D21), then the 2-row end header (5V, D22–D53, GND).',
  power: {
    inputs: [
      { pin: 'VIN', range: [7, 12], label: 'VIN / DC jack 7–12 V' },
      { pin: '5V', range: [4.75, 5.25], label: '5V pin: regulated 5 V only' },
      { pin: 'USB', range: [4.75, 5.25], label: 'USB-B 5 V' },
    ],
    railMax: { '5V': 400, '3V3': 50 },
    railNote: { '5V': 'USB polyfuse 500 mA total; regulator overheats with big loads from VIN.', '3V3': '50 mA max.' },
    draw: { avg: 80, peak: 90 },
    boardFeed: 'VIN',
  },
  pinRec: 20, pinMax: 40, totalIO: 200,
  i2c: { sda: 'D20/SDA', scl: 'D21/SCL' },
  spi: { sck: 'D52', mosi: 'D51', miso: 'D50' },
  uart: [{ name: 'Serial1', tx: 'D18/TX1', rx: 'D19/RX1' }, { name: 'Serial2', tx: 'D16/TX2', rx: 'D17/RX2' }],
  cols: {
    left: [ctl('IOREF'), ctl('RESET'), pw('3.3V', '3V3', '50 mA max'), pw('5V', '5V'), gnd(), gnd(), pw('VIN', 'VIN', '7–12 V'), ...megaA],
    right: [
      { n: 'SCL', t: 'io', alias: 'D21/SCL', caps: [] }, { n: 'SDA', t: 'io', alias: 'D20/SDA', caps: [] },
      ctl('AREF'), gnd(), ...megaDigitalTop, ...megaComm, ...megaDouble,
    ],
  },
};

// ================= Arduino Leonardo =================
const LEO_PWM = [3, 5, 6, 9, 10, 11, 13];
const leoAnalogOnD = { 4: 'A6', 6: 'A7', 8: 'A8', 9: 'A9', 10: 'A10', 12: 'A11' };
function leoD(i, e = {}) {
  const p = avrD(i, LEO_PWM, e);
  if (leoAnalogOnD[i] && !p.caps.includes('adc')) { p.caps.push('adc'); p.note = (p.note ? p.note + ' · ' : '') + 'Also analog input ' + leoAnalogOnD[i]; }
  return p;
}
const leonardo = {
  id: 'leonardo', name: 'Arduino Leonardo', short: 'Leonardo', family: 'arduino', mcu: 'ATmega32U4 @ 16 MHz (native USB)',
  logicV: 5, fiveVTolerant: true, adcBits: 10, lang: 'Arduino C++', wireless: null,
  memory: '32 KB flash (4 KB bootloader) · 2.5 KB SRAM · 1 KB EEPROM',
  layoutNote: 'Same shape as the Uno, but I2C is on D2/D3 and D0/D1 are a free hardware serial (Serial1). SPI is only on the 6-pin ICSP header.',
  power: {
    inputs: [
      { pin: 'VIN', range: [7, 12], label: 'VIN / DC jack 7–12 V' },
      { pin: '5V', range: [4.75, 5.25], label: '5V pin: regulated 5 V only' },
      { pin: 'USB', range: [4.75, 5.25], label: 'Micro-USB 5 V' },
    ],
    railMax: { '5V': 400, '3V3': 50 },
    railNote: { '5V': 'USB polyfuse 500 mA total.', '3V3': '50 mA max.' },
    draw: { avg: 45, peak: 55 },
    boardFeed: 'VIN',
  },
  pinRec: 20, pinMax: 40, totalIO: 200,
  i2c: { sda: 'D2/SDA', scl: 'D3/SCL' },
  spi: null, spiNote: 'Leonardo has SPI only on the 6-pin ICSP header (pin 1 MISO, 3 SCK, 4 MOSI), not on D11–D13. Wire the module there; use any digital pin for chip select.',
  uart: [{ name: 'Serial1', tx: 'D1/TX', rx: 'D0/RX' }],
  cols: {
    left: [ctl('IOREF'), ctl('RESET'), pw('3.3V', '3V3', '50 mA max'), pw('5V', '5V'), gnd(), gnd(), pw('VIN', 'VIN', '7–12 V'),
      io('A0', 'A0', 'din dout adc'), io('A1', 'A1', 'din dout adc'), io('A2', 'A2', 'din dout adc'),
      io('A3', 'A3', 'din dout adc'), io('A4', 'A4', 'din dout adc'), io('A5', 'A5', 'din dout adc')],
    right: [
      { n: 'SCL', t: 'io', alias: 'D3/SCL', caps: [] }, { n: 'SDA', t: 'io', alias: 'D2/SDA', caps: [] },
      ctl('AREF'), gnd(),
      leoD(13, { led: true, note: 'Onboard LED' }), leoD(12), leoD(11), leoD(10), leoD(9), leoD(8), leoD(7, { caps: ['din', 'dout', 'int'] }),
      leoD(6), leoD(5), leoD(4),
      leoD(3, { n: 'D3/SCL', caps: ['din', 'dout', 'pwm', 'scl', 'int'], note: 'I2C SCL' }),
      leoD(2, { n: 'D2/SDA', caps: ['din', 'dout', 'sda', 'int'], note: 'I2C SDA' }),
      leoD(1, { n: 'D1/TX', caps: ['din', 'dout', 'tx', 'int'], note: 'Serial1 TX (USB is separate — free to use)' }),
      leoD(0, { n: 'D0/RX', caps: ['din', 'dout', 'rx', 'int'], note: 'Serial1 RX (USB is separate — free to use)' }),
    ],
  },
};

// ================= ESP32 helpers =================
function e32(label, g, extraCaps = '', extra = {}) {
  const c = ['din', 'dout', 'pwm', ...caps(extraCaps)];
  return { n: label, g: String(g), t: 'io', caps: c, ...extra };
}
function e32in(label, g, extra = {}) {
  return { n: label, g: String(g), t: 'io', caps: ['din', 'adc'], inputOnly: true, noPull: true, ...extra };
}
const ESP32_COMMON = {
  family: 'esp32', mcu: 'ESP32-D0WD (Xtensa dual-core @ 240 MHz)', logicV: 3.3, fiveVTolerant: false, adcBits: 12,
  lang: 'Arduino C++ (ESP32 core)', wireless: { wifi: true, bt: 'Classic + BLE' },
  memory: '4 MB flash · 520 KB SRAM',
  pinRec: 20, pinMax: 40, totalIO: 1200,
  i2c: { sda: 'D21', scl: 'D22' },
};

// DOIT ESP32 DevKit V1 (30 pin). Antenna at top, USB at bottom.
const esp32_30 = {
  ...ESP32_COMMON, id: 'esp32-30', name: 'ESP32 DevKit V1 (30-pin)', short: 'ESP32-30',
  layoutNote: 'DOIT DevKit V1 layout, antenna at the top. GPIO 0 and the flash pins (6–11) are not on the header.',
  power: {
    inputs: [
      { pin: 'VIN', range: [4.5, 9], label: 'VIN 5 V recommended (AMS1117 regulator, 4.5–9 V)' },
      { pin: '3V3', range: [3.0, 3.6], label: '3V3 pin: regulated 3.3 V only' },
      { pin: 'USB', range: [4.75, 5.25], label: 'Micro-USB 5 V' },
    ],
    railMax: { '5V': 450, '3V3': 500 },
    railNote: { '5V': 'VIN pin = USB 5 V (when on USB) or your 5 V input. Limited by your supply / USB port.', '3V3': 'AMS1117 is rated 1 A but heats up; keep ESP32 + modules under ~500 mA.' },
    draw: { avg: 100, peak: 240 },
    boardFeed: 'VIN',
  },
  i2c: { sda: 'D21', scl: 'D22' },
  spi: { sck: 'D18', mosi: 'D23', miso: 'D19' },
  uart: [{ name: 'Serial2', tx: 'TX2', rx: 'RX2' }, { soft: true, hw: true, name: 'Serial1 (remapped to free pins)' }],
  cols: {
    left: [
      ctl('EN', 'Reset (active LOW)'),
      e32in('VP', 36, { note: 'GPIO36 · input only · ADC1_CH0 · no pull-ups' }),
      e32in('VN', 39, { note: 'GPIO39 · input only · ADC1_CH3 · no pull-ups' }),
      e32in('D34', 34, { note: 'Input only · ADC1_CH6 · no pull-ups' }),
      e32in('D35', 35, { note: 'Input only · ADC1_CH7 · no pull-ups' }),
      e32('D32', 32, 'adc', { note: 'ADC1_CH4 · touch 9' }),
      e32('D33', 33, 'adc', { note: 'ADC1_CH5 · touch 8' }),
      e32('D25', 25, 'adc dac', { adc2: true, note: 'ADC2_CH8 · DAC1' }),
      e32('D26', 26, 'adc dac', { adc2: true, note: 'ADC2_CH9 · DAC2' }),
      e32('D27', 27, 'adc', { adc2: true, note: 'ADC2_CH7' }),
      e32('D14', 14, 'adc', { adc2: true, boot: 'Outputs a PWM signal at boot', note: 'ADC2_CH6 · HSPI CLK' }),
      e32('D12', 12, 'adc', { adc2: true, strap: 'Strapping pin (MTDI): must be LOW at boot or the flash runs at 1.8 V and boot fails. Avoid pull-ups here.', note: 'ADC2_CH5' }),
      e32('D13', 13, 'adc', { adc2: true, note: 'ADC2_CH4' }),
      gnd(),
      pw('VIN', '5V', '5 V in/out — same as USB 5 V when on USB'),
    ],
    right: [
      e32('D23', 23, 'spi', { note: 'VSPI MOSI' }),
      e32('D22', 22, 'scl', { note: 'Default I2C SCL' }),
      e32('TX0', 1, 'tx', { usb: true, note: 'GPIO1 · UART0 TX — USB serial. Leave free.' }),
      e32('RX0', 3, 'rx', { usb: true, note: 'GPIO3 · UART0 RX — USB serial. Leave free.' }),
      e32('D21', 21, 'sda', { note: 'Default I2C SDA' }),
      e32('D19', 19, 'spi', { note: 'VSPI MISO' }),
      e32('D18', 18, 'spi', { note: 'VSPI SCK' }),
      e32('D5', 5, 'spi', { strap: 'Strapping pin: outputs PWM at boot, must be HIGH during boot.', note: 'VSPI SS' }),
      e32('TX2', 17, 'tx', { note: 'GPIO17 · UART2 TX' }),
      e32('RX2', 16, 'rx', { note: 'GPIO16 · UART2 RX' }),
      e32('D4', 4, 'adc', { adc2: true, note: 'ADC2_CH0' }),
      e32('D2', 2, 'adc', { adc2: true, led: true, strap: 'Strapping pin: must be LOW/floating to enter flashing mode.', note: 'ADC2_CH2 · onboard blue LED' }),
      e32('D15', 15, 'adc', { adc2: true, strap: 'Strapping pin: outputs PWM at boot, controls boot log.', note: 'ADC2_CH3' }),
      gnd(),
      pw('3V3', '3V3', 'Regulated 3.3 V out'),
    ],
  },
};

// Espressif ESP32-DevKitC V4 (38 pin, WROOM-32).
const esp32_38 = {
  ...ESP32_COMMON, id: 'esp32-38', name: 'ESP32 DevKitC (38-pin)', short: 'ESP32-38',
  layoutNote: 'Espressif DevKitC V4, antenna at the top. Bottom 3 pins on each side are wired to the internal flash — never use them.',
  power: {
    inputs: [
      { pin: '5V', range: [4.75, 5.25], label: '5V pin 5 V (AMS1117 → 3.3 V)' },
      { pin: '3V3', range: [3.0, 3.6], label: '3V3 pin: regulated 3.3 V only' },
      { pin: 'USB', range: [4.75, 5.25], label: 'Micro-USB 5 V' },
    ],
    railMax: { '5V': 450, '3V3': 500 },
    railNote: { '5V': '5V pin = USB 5 V or your 5 V input. Limited by your supply.', '3V3': 'Keep ESP32 + modules under ~500 mA on the 3.3 V regulator.' },
    draw: { avg: 100, peak: 240 },
    boardFeed: '5V',
  },
  uart: [{ name: 'Serial2', tx: 'IO17', rx: 'IO16' }, { soft: true, hw: true, name: 'Serial1 (remapped to free pins)' }],
  i2c: { sda: 'IO21', scl: 'IO22' },
  spi: { sck: 'IO18', mosi: 'IO23', miso: 'IO19' },
  cols: {
    left: [
      pw('3V3', '3V3'), ctl('EN', 'Reset (active LOW)'),
      e32in('VP', 36, { note: 'GPIO36 SENSOR_VP · input only · ADC1_CH0' }),
      e32in('VN', 39, { note: 'GPIO39 SENSOR_VN · input only · ADC1_CH3' }),
      e32in('IO34', 34, { note: 'Input only · ADC1_CH6' }), e32in('IO35', 35, { note: 'Input only · ADC1_CH7' }),
      e32('IO32', 32, 'adc', { note: 'ADC1_CH4' }), e32('IO33', 33, 'adc', { note: 'ADC1_CH5' }),
      e32('IO25', 25, 'adc dac', { adc2: true, note: 'ADC2_CH8 · DAC1' }), e32('IO26', 26, 'adc dac', { adc2: true, note: 'ADC2_CH9 · DAC2' }),
      e32('IO27', 27, 'adc', { adc2: true, note: 'ADC2_CH7' }),
      e32('IO14', 14, 'adc', { adc2: true, boot: 'Outputs a PWM signal at boot', note: 'ADC2_CH6' }),
      e32('IO12', 12, 'adc', { adc2: true, strap: 'Strapping pin (MTDI): must be LOW at boot or boot fails.', note: 'ADC2_CH5' }),
      gnd(), e32('IO13', 13, 'adc', { adc2: true, note: 'ADC2_CH4' }),
      { n: 'SD2', g: '9', t: 'io', caps: [], flash: true, note: 'GPIO9 — connected to internal SPI flash. DO NOT USE.' },
      { n: 'SD3', g: '10', t: 'io', caps: [], flash: true, note: 'GPIO10 — connected to internal SPI flash. DO NOT USE.' },
      { n: 'CMD', g: '11', t: 'io', caps: [], flash: true, note: 'GPIO11 — connected to internal SPI flash. DO NOT USE.' },
      pw('5V', '5V', '5 V in/out'),
    ],
    right: [
      gnd(), e32('IO23', 23, 'spi', { note: 'VSPI MOSI' }), e32('IO22', 22, 'scl', { note: 'Default I2C SCL' }),
      e32('TXD0', 1, 'tx', { usb: true, note: 'GPIO1 · USB serial TX. Leave free.' }),
      e32('RXD0', 3, 'rx', { usb: true, note: 'GPIO3 · USB serial RX. Leave free.' }),
      e32('IO21', 21, 'sda', { note: 'Default I2C SDA' }), gnd(),
      e32('IO19', 19, 'spi', { note: 'VSPI MISO' }), e32('IO18', 18, 'spi', { note: 'VSPI SCK' }),
      e32('IO5', 5, 'spi', { strap: 'Strapping pin: outputs PWM at boot, must be HIGH during boot.', note: 'VSPI SS' }),
      e32('IO17', 17, 'tx', { note: 'UART2 TX' }), e32('IO16', 16, 'rx', { note: 'UART2 RX' }),
      e32('IO4', 4, 'adc', { adc2: true, note: 'ADC2_CH0' }),
      e32('IO0', 0, 'adc', { adc2: true, strap: 'BOOT button pin: pulled LOW at boot = flashing mode. Avoid.', note: 'ADC2_CH1' }),
      e32('IO2', 2, 'adc', { adc2: true, strap: 'Strapping pin: must be LOW/floating to enter flashing mode.', note: 'ADC2_CH2' }),
      e32('IO15', 15, 'adc', { adc2: true, strap: 'Strapping pin: outputs PWM at boot, controls boot log.', note: 'ADC2_CH3' }),
      { n: 'SD1', g: '8', t: 'io', caps: [], flash: true, note: 'GPIO8 — internal flash. DO NOT USE.' },
      { n: 'SD0', g: '7', t: 'io', caps: [], flash: true, note: 'GPIO7 — internal flash. DO NOT USE.' },
      { n: 'CLK', g: '6', t: 'io', caps: [], flash: true, note: 'GPIO6 — internal flash. DO NOT USE.' },
    ],
  },
};

// ================= ESP8266 =================
function e82(label, g, extraCaps = '', extra = {}) {
  return { n: label, g: label.startsWith('D') ? label : String(g), gpio: g, t: 'io', caps: ['din', 'dout', 'pwm', ...caps(extraCaps)], softpwm: true, ...extra };
}
const ESP8266_COMMON = {
  family: 'esp8266', mcu: 'ESP8266EX (Tensilica L106 @ 80/160 MHz)', logicV: 3.3, fiveVTolerant: false, adcBits: 10,
  lang: 'Arduino C++ (ESP8266 core)', wireless: { wifi: true, bt: null }, memory: '4 MB flash · ~80 KB user RAM',
  pinRec: 12, pinMax: 12, totalIO: 200,
  uart: [{ soft: true, name: 'SoftwareSerial' }],
};
const D0_16 = { n: 'D0', g: 'D0', gpio: 16, t: 'io', caps: ['din', 'dout'], noPull: true, noInt: true, note: 'GPIO16 · no PWM, no interrupts, no I2C. Has pull-DOWN only. Used to wake from deep sleep.' };
const espBoot = {
  D3: { strap: 'GPIO0 (FLASH button): pulled HIGH. Boot fails if held LOW at power-on.' },
  D4: { strap: 'GPIO2: pulled HIGH, onboard LED. Boot fails if held LOW at power-on.', led: true },
  D8: { strap: 'GPIO15: pulled LOW. Boot fails if held HIGH at power-on.', noPull: true },
};
const nodemcu = {
  ...ESP8266_COMMON, id: 'nodemcu', name: 'NodeMCU v2/v3 (ESP8266)', short: 'NodeMCU',
  layoutNote: 'Amica v2 layout, antenna at the top. On LoLin v3 boards the two RSV pins are GND and VU (USB 5 V).',
  power: {
    inputs: [
      { pin: 'Vin', range: [4.5, 9], label: 'Vin 5 V recommended (AMS1117 → 3.3 V)' },
      { pin: '3V3', range: [3.0, 3.6], label: '3V3 pin: regulated 3.3 V only' },
      { pin: 'USB', range: [4.75, 5.25], label: 'Micro-USB 5 V' },
    ],
    railMax: { '5V': 450, '3V3': 400 },
    railNote: { '5V': 'Vin carries USB 5 V (minus a diode drop ≈ 4.7 V) when on USB.', '3V3': 'Keep ESP8266 + modules under ~400 mA.' },
    draw: { avg: 80, peak: 170 },
    boardFeed: 'Vin',
  },
  i2c: { sda: 'D2', scl: 'D1' },
  spi: { sck: 'D5', mosi: 'D7', miso: 'D6' },
  cols: {
    left: [
      { n: 'A0', g: 'A0', t: 'io', caps: ['adc'], note: 'The ONLY analog input. 0–3.3 V (board has a divider). 10-bit.' },
      nc('RSV', 'Reserved / not connected'), nc('RSV', 'Reserved / not connected'),
      { n: 'SD3', g: '10', t: 'io', caps: [], flash: true, note: 'GPIO10 — flash pin. Avoid.' },
      { n: 'SD2', g: '9', t: 'io', caps: [], flash: true, note: 'GPIO9 — flash pin. Avoid.' },
      { n: 'SD1', t: 'io', caps: [], flash: true, note: 'Flash pin. DO NOT USE.' },
      { n: 'CMD', t: 'io', caps: [], flash: true, note: 'Flash pin. DO NOT USE.' },
      { n: 'SD0', t: 'io', caps: [], flash: true, note: 'Flash pin. DO NOT USE.' },
      { n: 'CLK', t: 'io', caps: [], flash: true, note: 'Flash pin. DO NOT USE.' },
      gnd(), pw('3V3', '3V3'), ctl('EN', 'Chip enable'), ctl('RST', 'Reset (active LOW)'), gnd(),
      pw('Vin', '5V', '5 V in/out'),
    ],
    right: [
      D0_16,
      e82('D1', 5, 'scl', { note: 'GPIO5 · default I2C SCL' }),
      e82('D2', 4, 'sda', { note: 'GPIO4 · default I2C SDA' }),
      e82('D3', 0, '', { ...espBoot.D3, note: 'GPIO0 · FLASH button' }),
      e82('D4', 2, '', { ...espBoot.D4, note: 'GPIO2 · onboard LED (active LOW)' }),
      pw('3V3', '3V3'), gnd(),
      e82('D5', 14, 'spi', { note: 'GPIO14 · SPI SCK' }),
      e82('D6', 12, 'spi', { note: 'GPIO12 · SPI MISO' }),
      e82('D7', 13, 'spi', { note: 'GPIO13 · SPI MOSI' }),
      e82('D8', 15, 'spi', { ...espBoot.D8, note: 'GPIO15 · SPI SS' }),
      e82('RX', 3, 'rx', { g: 'RX', usb: true, note: 'GPIO3 · USB serial RX. Leave free.' }),
      e82('TX', 1, 'tx', { g: 'TX', usb: true, note: 'GPIO1 · USB serial TX. Leave free.' }),
      gnd(), pw('3V3', '3V3'),
    ],
  },
};

const d1mini = {
  ...ESP8266_COMMON, id: 'd1mini', name: 'WEMOS D1 mini (ESP8266)', short: 'D1 mini',
  layoutNote: 'Viewed from the top with the antenna up: left column RST → 3V3, right column TX → 5V.',
  power: {
    inputs: [
      { pin: '5V', range: [4.5, 5.5], label: '5V pin 5 V (ME6211 → 3.3 V)' },
      { pin: '3V3', range: [3.0, 3.6], label: '3V3 pin: regulated 3.3 V only' },
      { pin: 'USB', range: [4.75, 5.25], label: 'Micro-USB / USB-C 5 V' },
    ],
    railMax: { '5V': 450, '3V3': 400 },
    railNote: { '5V': '5V pin = USB 5 V when on USB.', '3V3': 'ME6211 regulator: 500 mA max incl. the ESP8266.' },
    draw: { avg: 80, peak: 170 },
    boardFeed: '5V',
  },
  i2c: { sda: 'D2', scl: 'D1' },
  spi: { sck: 'D5', mosi: 'D7', miso: 'D6' },
  cols: {
    left: [
      ctl('RST', 'Reset (active LOW)'),
      { n: 'A0', g: 'A0', t: 'io', caps: ['adc'], note: 'The ONLY analog input. 0–3.3 V (board has a divider).' },
      { ...D0_16 },
      e82('D5', 14, 'spi', { note: 'GPIO14 · SPI SCK' }),
      e82('D6', 12, 'spi', { note: 'GPIO12 · SPI MISO' }),
      e82('D7', 13, 'spi', { note: 'GPIO13 · SPI MOSI' }),
      e82('D8', 15, 'spi', { ...espBoot.D8, note: 'GPIO15 · SPI SS' }),
      pw('3V3', '3V3'),
    ],
    right: [
      e82('TX', 1, 'tx', { g: 'TX', usb: true, note: 'GPIO1 · USB serial TX. Leave free.' }),
      e82('RX', 3, 'rx', { g: 'RX', usb: true, note: 'GPIO3 · USB serial RX. Leave free.' }),
      e82('D1', 5, 'scl', { note: 'GPIO5 · default I2C SCL' }),
      e82('D2', 4, 'sda', { note: 'GPIO4 · default I2C SDA' }),
      e82('D3', 0, '', { ...espBoot.D3, note: 'GPIO0' }),
      e82('D4', 2, '', { ...espBoot.D4, note: 'GPIO2 · onboard LED (active LOW)' }),
      gnd(), pw('5V', '5V', '5 V in/out'),
    ],
  },
};

// ================= Raspberry Pi Pico / Pico W =================
function gp(n, extra = {}) {
  const c = ['din', 'dout', 'pwm'];
  if (n >= 26 && n <= 28) c.push('adc');
  const p = { n: 'GP' + n, g: String(n), t: 'io', caps: c, ...extra };
  p.pwmSlice = (n >> 1) & 7; p.pwmCh = n & 1 ? 'B' : 'A';
  return p;
}
function picoCols() {
  const L = [gp(0, { caps: ['din', 'dout', 'pwm', 'tx'], note: 'UART0 TX (Serial1)' }), gp(1, { caps: ['din', 'dout', 'pwm', 'rx'], note: 'UART0 RX (Serial1)' }), gnd(),
    gp(2), gp(3), gp(4, { caps: ['din', 'dout', 'pwm', 'sda'], note: 'Default I2C0 SDA (Wire)' }), gp(5, { caps: ['din', 'dout', 'pwm', 'scl'], note: 'Default I2C0 SCL (Wire)' }), gnd(),
    gp(6), gp(7), gp(8, { caps: ['din', 'dout', 'pwm', 'tx'], note: 'UART1 TX (Serial2)' }), gp(9, { caps: ['din', 'dout', 'pwm', 'rx'], note: 'UART1 RX (Serial2)' }), gnd(), gp(10), gp(11), gp(12), gp(13), gnd(), gp(14), gp(15)];
  const R = [pw('VBUS', '5V', 'USB 5 V — ONLY powered when USB is plugged in'), pw('VSYS', 'VIN', 'Main power input 1.8–5.5 V'), gnd(),
    ctl('3V3_EN', 'Pull LOW to switch off the 3.3 V regulator'), pw('3V3(OUT)', '3V3', '3.3 V out, keep under 300 mA'),
    ctl('ADC_VREF', 'ADC reference'), gp(28, { note: 'ADC2' }), { n: 'AGND', t: 'gnd' }, gp(27, { note: 'ADC1' }), gp(26, { note: 'ADC0' }),
    ctl('RUN', 'Pull LOW to reset'), gp(22), gnd(), gp(21), gp(20), gp(19, { caps: ['din', 'dout', 'pwm', 'spi'], note: 'SPI0 MOSI (TX)' }), gp(18, { caps: ['din', 'dout', 'pwm', 'spi'], note: 'SPI0 SCK' }), gnd(), gp(17, { caps: ['din', 'dout', 'pwm', 'spi'], note: 'SPI0 CS' }), gp(16, { caps: ['din', 'dout', 'pwm', 'spi'], note: 'SPI0 MISO (RX)' })];
  return { left: L, right: R };
}
const PICO_COMMON = {
  family: 'rp2040', mcu: 'RP2040 (dual Cortex-M0+ @ 133 MHz)', logicV: 3.3, fiveVTolerant: false, adcBits: 12,
  lang: 'Arduino C++ (arduino-pico) or MicroPython', memory: '2 MB flash · 264 KB SRAM',
  layoutNote: 'Viewed from the top, USB at the top. Left column = pins 1–20, right column = pins 40 → 21.',
  pinRec: 4, pinMax: 12, totalIO: 50,
  i2c: { sda: 'GP4', scl: 'GP5' },
  spi: { sck: 'GP18', mosi: 'GP19', miso: 'GP16' },
  uart: [{ name: 'Serial1', tx: 'GP0', rx: 'GP1' }, { name: 'Serial2', tx: 'GP8', rx: 'GP9' }],
};
const pico = {
  ...PICO_COMMON, id: 'pico', name: 'Raspberry Pi Pico', short: 'Pico', wireless: null,
  power: {
    inputs: [
      { pin: 'VSYS', range: [1.8, 5.5], label: 'VSYS 1.8–5.5 V (buck-boost regulator)' },
      { pin: 'USB', range: [4.75, 5.25], label: 'Micro-USB 5 V' },
    ],
    railMax: { '5V': 450, '3V3': 300 },
    railNote: { '5V': 'Use VSYS as the 5 V node: it carries your 5 V input (or USB 5 V minus a diode drop).', '3V3': '3V3(OUT): Raspberry Pi recommends keeping the load under 300 mA.' },
    draw: { avg: 25, peak: 50 },
    boardFeed: 'VSYS', fiveVPin: 'VSYS',
  },
  cols: picoCols(),
};
const picow = {
  ...PICO_COMMON, id: 'picow', name: 'Raspberry Pi Pico W', short: 'Pico W', wireless: { wifi: true, bt: 'Classic + BLE' },
  mcu: 'RP2040 + CYW43439 Wi-Fi/Bluetooth',
  layoutNote: 'Same header as the Pico. The onboard LED is on the wireless chip (LED_BUILTIN / "LED"), not GP25.',
  power: {
    inputs: [
      { pin: 'VSYS', range: [1.8, 5.5], label: 'VSYS 1.8–5.5 V' },
      { pin: 'USB', range: [4.75, 5.25], label: 'Micro-USB 5 V' },
    ],
    railMax: { '5V': 450, '3V3': 300 },
    railNote: { '5V': 'Use VSYS as the 5 V node.', '3V3': 'Keep the 3V3(OUT) load under 300 mA.' },
    draw: { avg: 50, peak: 200 },
    boardFeed: 'VSYS', fiveVPin: 'VSYS',
  },
  cols: picoCols(),
};

// ================= Raspberry Pi 4 / 5 (40-pin header) =================
function rpi(model) {
  const hw = { 12: 'PWM0', 13: 'PWM1', 18: 'PWM0', 19: 'PWM1' };
  const G = (n, extra = {}) => {
    const p = { n: 'GPIO' + n, g: String(n), t: 'io', caps: ['din', 'dout', 'pwm'], ...extra };
    if (hw[n]) { p.hwpwm = hw[n]; p.note = (p.note ? p.note + ' · ' : '') + 'Hardware ' + hw[n]; } else p.softpwm = true;
    return p;
  };
  const pins = {
    1: pw('3V3', '3V3'), 2: pw('5V', '5V'), 3: G(2, { caps: ['din', 'dout', 'pwm', 'sda'], fixedPullup: true, note: 'I2C1 SDA · fixed 1.8k pull-up to 3.3 V' }),
    4: pw('5V', '5V'), 5: G(3, { caps: ['din', 'dout', 'pwm', 'scl'], fixedPullup: true, note: 'I2C1 SCL · fixed 1.8k pull-up to 3.3 V' }), 6: gnd(),
    7: G(4, { note: 'GPCLK0' }), 8: G(14, { caps: ['din', 'dout', 'pwm', 'tx'], note: 'UART TX' }), 9: gnd(),
    10: G(15, { caps: ['din', 'dout', 'pwm', 'rx'], note: 'UART RX' }), 11: G(17), 12: G(18, { note: 'PCM CLK' }),
    13: G(27), 14: gnd(), 15: G(22), 16: G(23), 17: pw('3V3', '3V3'), 18: G(24),
    19: G(10, { caps: ['din', 'dout', 'pwm', 'spi'], note: 'SPI0 MOSI' }), 20: gnd(),
    21: G(9, { caps: ['din', 'dout', 'pwm', 'spi'], note: 'SPI0 MISO' }), 22: G(25),
    23: G(11, { caps: ['din', 'dout', 'pwm', 'spi'], note: 'SPI0 SCLK' }), 24: G(8, { caps: ['din', 'dout', 'pwm', 'spi'], note: 'SPI0 CE0' }),
    25: gnd(), 26: G(7, { caps: ['din', 'dout', 'pwm', 'spi'], note: 'SPI0 CE1' }),
    27: { n: 'GPIO0', g: '0', t: 'io', caps: [], reserved: true, note: 'ID_SD — reserved for HAT ID EEPROM. Do not use.' },
    28: { n: 'GPIO1', g: '1', t: 'io', caps: [], reserved: true, note: 'ID_SC — reserved for HAT ID EEPROM. Do not use.' },
    29: G(5), 30: gnd(), 31: G(6), 32: G(12), 33: G(13), 34: gnd(), 35: G(19, { note: 'PCM FS' }), 36: G(16),
    37: G(26), 38: G(20, { note: 'PCM DIN' }), 39: gnd(), 40: G(21, { note: 'PCM DOUT' }),
  };
  const left = [], right = [];
  for (let i = 1; i <= 40; i++) { const p = { ...pins[i], phys: i }; (i % 2 ? left : right).push(p); }
  return { left, right };
}
const PI_COMMON = {
  family: 'rpi', logicV: 3.3, fiveVTolerant: false, adcBits: 0,
  wireless: { wifi: true, bt: 'Classic + BLE' },
  pinRec: 8, pinMax: 16, totalIO: 50,
  i2c: { sda: 'GPIO2', scl: 'GPIO3' },
  spi: { sck: 'GPIO11', mosi: 'GPIO10', miso: 'GPIO9' },
  uart: [{ name: 'serial0', tx: 'GPIO14', rx: 'GPIO15' }],
  layoutNote: '40-pin header, pin 1 (3V3) top-left next to the corner. Left = odd pins 1–39, right = even pins 2–40. No analog inputs.',
};
const pi4 = {
  ...PI_COMMON, id: 'pi4', name: 'Raspberry Pi 4 Model B', short: 'Pi 4', mcu: 'BCM2711 (quad Cortex-A72 @ 1.8 GHz)',
  lang: 'Python 3 (gpiozero)', memory: '1–8 GB RAM · microSD',
  power: {
    inputs: [{ pin: 'USB-C', range: [4.75, 5.25], label: 'USB-C 5 V 3 A (official 15 W supply)' }],
    railMax: { '5V': 1000, '3V3': 300 },
    railNote: { '5V': '5V pins come straight from your supply; what\'s left after the Pi itself (~1 A spare on a 3 A supply).', '3V3': 'Conservative budget for the 3.3 V pins.' },
    draw: { avg: 700, peak: 1300 },
    boardFeed: null, ownSupply: 'usbc3a',
  },
  cols: rpi(4),
};
const pi5 = {
  ...PI_COMMON, id: 'pi5', name: 'Raspberry Pi 5', short: 'Pi 5', mcu: 'BCM2712 (quad Cortex-A76 @ 2.4 GHz) + RP1 I/O chip',
  lang: 'Python 3 (gpiozero — RPi.GPIO does NOT work on Pi 5)', memory: '2–16 GB RAM · microSD / NVMe',
  layoutNote: PI_COMMON.layoutNote + ' GPIO is handled by the RP1 chip (gpiochip4 on older OS images).',
  power: {
    inputs: [{ pin: 'USB-C', range: [4.75, 5.25], label: 'USB-C 5 V 5 A (official 27 W supply). With a 3 A supply USB ports are limited to 600 mA.' }],
    railMax: { '5V': 1000, '3V3': 300 },
    railNote: { '5V': '5V pins come straight from your supply.', '3V3': 'Conservative budget for the 3.3 V pins.' },
    draw: { avg: 1000, peak: 2500 },
    boardFeed: null, ownSupply: 'usbc5a',
  },
  cols: rpi(5),
};

export const BOARDS = [uno, nano, mega, leonardo, esp32_30, esp32_38, nodemcu, d1mini, pico, picow, pi4, pi5];

// Assign stable ids and build lookups.
for (const b of BOARDS) {
  b.pins = [];
  for (const side of ['left', 'right']) {
    b.cols[side].forEach((p, i) => {
      p.side = side; p.row = i; p.id = side[0] + i;
      if (!p.caps) p.caps = [];
      b.pins.push(p);
    });
  }
  b.byName = (name) => b.pins.find((p) => p.n === name);
  b.rail = (rail) => b.pins.find((p) => p.t === 'pwr' && p.rail === rail);
  b.hasAdc = b.pins.some((p) => p.caps.includes('adc') && !p.alias);
  b.bt = !!(b.wireless && b.wireless.bt);
}
export const boardById = (id) => BOARDS.find((b) => b.id === id);
