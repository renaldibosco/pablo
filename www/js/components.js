// Pablo's IDE — real module database (common Indian-market hobby modules).
// Pins are listed in the order printed on the module's header.
//
// pin fields:
//   role  'vcc' | 'gnd' | 'sig' | 'pin' (plain terminal, e.g. motor/relay contacts)
//   dir   for sig: 'in' (board drives it) | 'out' (module drives the board) | 'io'
//   outV  voltage the module outputs on this pin: number or 'vcc'
//   inMax max voltage the pin tolerates: number or 'vcc'
//   vih   minimum voltage the pin reliably reads as HIGH
//   pull  true if the line needs a pull-up resistor on the board side
//   i2c   true for I2C lines (pulled up to VCC on the module)

export const COMPONENTS = {
  l298n: {
    name: 'L298N motor driver module', short: 'L298N', cat: 'Motor driver',
    vcc: null, logicmA: 36,
    desc: 'Dual H-bridge, 2 A per channel. Motor supply 5–35 V. Onboard 78M05 gives 5 V out when the 5V-EN jumper is on and the motor supply is ≤ 12 V. Bipolar driver: loses ~2 V (up to ~3 V) before the motors.',
    pins: [
      { id: 'ENA', role: 'sig', dir: 'in', vih: 2.3, inMax: 7, note: 'Remove the ENA jumper to control speed with PWM' },
      { id: 'IN1', role: 'sig', dir: 'in', vih: 2.3, inMax: 7 },
      { id: 'IN2', role: 'sig', dir: 'in', vih: 2.3, inMax: 7 },
      { id: 'IN3', role: 'sig', dir: 'in', vih: 2.3, inMax: 7 },
      { id: 'IN4', role: 'sig', dir: 'in', vih: 2.3, inMax: 7 },
      { id: 'ENB', role: 'sig', dir: 'in', vih: 2.3, inMax: 7, note: 'Remove the ENB jumper to control speed with PWM' },
      { id: '12V', role: 'pin', note: 'Motor supply input (5–35 V)' },
      { id: 'GND', role: 'gnd' },
      { id: '5V', role: 'pin', note: '5 V output from the onboard regulator (max ~500 mA)' },
      { id: 'OUT1', role: 'pin' }, { id: 'OUT2', role: 'pin' }, { id: 'OUT3', role: 'pin' }, { id: 'OUT4', role: 'pin' },
    ],
    drop: 2.0, maxA: 2000, regOut: 500, vsMax: 35, vsRegMax: 12,
  },
  ttmotor: {
    name: 'TT gear motor (1:48, yellow)', short: 'TT motor', cat: 'Actuator',
    desc: 'Rated 3–6 V. Runs ~150–250 mA, stall current up to ~1 A at 6 V.',
    motor: { vmin: 3, vmax: 6, run: 200, stall: 1000 },
    pins: [{ id: 'M+', role: 'pin' }, { id: 'M-', role: 'pin' }],
  },
  hc05: {
    name: 'HC-05 Bluetooth module (Classic SPP)', short: 'HC-05', cat: 'Wireless',
    vcc: [3.6, 6], mA: { avg: 25, peak: 40 },
    desc: 'Bluetooth Classic serial. VCC 3.6–6 V (onboard 3.3 V regulator), but the logic pins are 3.3 V. Default 9600 baud, PIN 1234. Works with Android, NOT with iPhone.',
    pins: [
      { id: 'STATE', role: 'sig', dir: 'out', outV: 3.3, opt: true, note: 'HIGH when connected (optional)' },
      { id: 'RXD', role: 'sig', dir: 'in', inMax: 3.3, vih: 2.0, note: '3.3 V only!' },
      { id: 'TXD', role: 'sig', dir: 'out', outV: 3.3 },
      { id: 'GND', role: 'gnd' },
      { id: 'VCC', role: 'vcc' },
      { id: 'EN', role: 'sig', dir: 'in', opt: true, note: 'AT-command mode (optional)' },
    ],
  },
  hcsr04: {
    name: 'HC-SR04 ultrasonic sensor', short: 'HC-SR04', cat: 'Sensor',
    vcc: [4.5, 5.5], mA: { avg: 15, peak: 15 },
    desc: 'Range 2–400 cm. Needs 5 V. The ECHO pin outputs 5 V — 3.3 V boards need a voltage divider.',
    pins: [
      { id: 'VCC', role: 'vcc' },
      { id: 'Trig', role: 'sig', dir: 'in', vih: 2.0, inMax: 'vcc', note: '10 µs pulse starts a measurement; 3.3 V is enough' },
      { id: 'Echo', role: 'sig', dir: 'out', outV: 'vcc' },
      { id: 'GND', role: 'gnd' },
    ],
  },
  dht22: {
    name: 'DHT22 (AM2302) temperature & humidity module', short: 'DHT22', cat: 'Sensor',
    vcc: [3.3, 6], mA: { avg: 1.5, peak: 1.5 },
    desc: '−40…80 °C (±0.5 °C), 0–100 % RH (±2 %). One reading every 2 s. The 3-pin module already has the 10k pull-up.',
    pins: [
      { id: '+', role: 'vcc', prefer: 'logic' },
      { id: 'OUT', role: 'sig', dir: 'io', outV: 'vcc', inMax: 'vcc', vih: 0.7, vihRel: true },
      { id: '-', role: 'gnd' },
    ],
  },
  ssd1306: {
    name: '0.96" OLED 128×64 (SSD1306, I2C)', short: 'OLED', cat: 'Display',
    vcc: [3.3, 5], mA: { avg: 20, peak: 25 }, i2cAddr: '0x3C',
    desc: 'I2C address 0x3C. Onboard 3.3 V regulator; pull-ups go to VCC, so power it from 3.3 V on 3.3 V boards.',
    pins: [
      { id: 'GND', role: 'gnd' }, { id: 'VCC', role: 'vcc', prefer: 'logic' },
      { id: 'SCL', role: 'sig', dir: 'io', i2c: true, outV: 'vcc', inMax: 'vcc' },
      { id: 'SDA', role: 'sig', dir: 'io', i2c: true, outV: 'vcc', inMax: 'vcc' },
    ],
  },
  lcd1602: {
    name: '16×2 LCD with I2C backpack (PCF8574)', short: 'LCD 16×2', cat: 'Display',
    vcc: [4.5, 5.5], mA: { avg: 30, peak: 40 }, i2cAddr: '0x27',
    desc: 'Needs 5 V (contrast). Address 0x27 (some backpacks 0x3F). Turn the blue pot until text appears. Backpack pull-ups go to 5 V.',
    pins: [
      { id: 'GND', role: 'gnd' }, { id: 'VCC', role: 'vcc' },
      { id: 'SDA', role: 'sig', dir: 'io', i2c: true, outV: 'vcc', inMax: 'vcc' },
      { id: 'SCL', role: 'sig', dir: 'io', i2c: true, outV: 'vcc', inMax: 'vcc' },
    ],
  },
  relay1: {
    name: '1-channel 5 V relay module (SRD-05VDC-SL-C)', short: 'Relay', cat: 'Actuator',
    vcc: [4.75, 5.25], mA: { avg: 70, peak: 75 },
    desc: 'Coil 5 V ~70 mA. Contacts 10 A 250 VAC / 30 VDC. IN is active-LOW on most modules (LOW = relay ON).',
    activeLow: true, alt3v3: 'relay1hl',
    pins: [
      { id: 'DC+', role: 'vcc' }, { id: 'DC-', role: 'gnd' },
      { id: 'IN', role: 'sig', dir: 'in', vih: 'relay', inMax: 'vcc' },
      { id: 'NO', role: 'pin', note: 'Normally Open' }, { id: 'COM', role: 'pin', note: 'Common' }, { id: 'NC', role: 'pin', note: 'Normally Closed' },
    ],
  },
  relay1hl: {
    name: '1-channel 5 V relay module with H/L trigger jumper', short: 'Relay (H/L)', cat: 'Actuator',
    vcc: [4.75, 5.25], mA: { avg: 70, peak: 75 },
    desc: 'Same 5 V relay, but with a trigger-select jumper. Set the jumper to H (high-level trigger): a 3.3 V HIGH on IN switches it ON reliably. Contacts 10 A 250 VAC / 30 VDC.',
    activeLow: false,
    pins: [
      { id: 'DC+', role: 'vcc' }, { id: 'DC-', role: 'gnd' },
      { id: 'IN', role: 'sig', dir: 'in', vih: 2.0, inMax: 'vcc' },
      { id: 'NO', role: 'pin', note: 'Normally Open' }, { id: 'COM', role: 'pin', note: 'Common' }, { id: 'NC', role: 'pin', note: 'Normally Closed' },
    ],
  },
  tcrt5000: {
    name: 'TCRT5000 IR line-tracking sensor module', short: 'IR line sensor', cat: 'Sensor',
    vcc: [3.3, 5], mA: { avg: 18, peak: 20 },
    desc: 'IR LED + phototransistor with an LM393 comparator. DO goes LOW over a white/shiny surface and HIGH over a black line (set the threshold with the pot). Mount 1–2 cm above the floor.',
    pins: [
      { id: 'VCC', role: 'vcc', prefer: 'logic' }, { id: 'GND', role: 'gnd' },
      { id: 'DO', role: 'sig', dir: 'out', outV: 'vcc' },
      { id: 'AO', role: 'sig', dir: 'out', outV: 'vcc', analog: true, opt: true },
    ],
  },
  fc51: {
    name: 'FC-51 IR obstacle sensor module', short: 'IR obstacle', cat: 'Sensor',
    vcc: [3.3, 5], mA: { avg: 15, peak: 20 },
    desc: 'Detects objects 2–30 cm away (set with the pot). OUT goes LOW when something is in front. Sunlight can cause false triggers.',
    pins: [
      { id: 'OUT', role: 'sig', dir: 'out', outV: 'vcc' },
      { id: 'GND', role: 'gnd' }, { id: 'VCC', role: 'vcc', prefer: 'logic' },
    ],
  },
  sg90: {
    name: 'SG90 micro servo (180°)', short: 'SG90 servo', cat: 'Actuator',
    vcc: [4.8, 6],
    desc: '4.8–6 V. Signal: 50 Hz pulses, 0.5–2.4 ms = 0–180°. Draws ~100–250 mA moving and up to ~650 mA when stalled, so power it from its own 5–6 V supply (shared GND), not from the board.',
    servo: { vmin: 4.8, vmax: 6, run: 220, stall: 650 },
    pins: [
      { id: 'GND', role: 'pin', label: 'GND (brown)' },
      { id: '+V', role: 'pin', label: '+V (red)' },
      { id: 'PWM', role: 'sig', dir: 'in', vih: 2.0, inMax: 'vcc', label: 'PWM (orange)' },
    ],
  },
  mg90s: {
    name: 'MG90S metal-gear micro servo', short: 'MG90S servo', cat: 'Actuator',
    vcc: [4.8, 6],
    desc: '4.8–6 V, metal gears, ~2 kg·cm. ~150–300 mA moving, up to ~700 mA stalled.',
    servo: { vmin: 4.8, vmax: 6, run: 250, stall: 700 },
    pins: [
      { id: 'GND', role: 'pin', label: 'GND (brown)' },
      { id: '+V', role: 'pin', label: '+V (red)' },
      { id: 'PWM', role: 'sig', dir: 'in', vih: 2.0, inMax: 'vcc', label: 'PWM (orange)' },
    ],
  },
  pca9685: {
    name: 'PCA9685 16-channel PWM / servo driver', short: 'PCA9685', cat: 'Motor driver',
    vcc: [2.3, 5.5], mA: { avg: 10, peak: 10 }, i2cAddr: '0x40',
    desc: 'I2C address 0x40. Logic VCC 3.3–5 V (pull-ups go to VCC). Servo power goes into the green V+ terminal (5–6 V, separate supply). Each channel is a 3-pin header (PWM, V+, GND): the servos plug straight in.',
    pins: [
      { id: 'GND', role: 'gnd' }, { id: 'OE', role: 'sig', dir: 'in', opt: true, note: 'Output enable (leave unconnected)' },
      { id: 'SCL', role: 'sig', dir: 'io', i2c: true, outV: 'vcc', inMax: 'vcc' },
      { id: 'SDA', role: 'sig', dir: 'io', i2c: true, outV: 'vcc', inMax: 'vcc' },
      { id: 'VCC', role: 'vcc', prefer: 'logic' },
      { id: 'V+', role: 'pin', note: 'Servo power terminal (5–6 V)' }, { id: 'T-GND', role: 'pin', label: 'GND (terminal)' },
      { id: 'CH0', role: 'pin', label: 'CH0 header' }, { id: 'CH1', role: 'pin', label: 'CH1 header' },
      { id: 'CH2', role: 'pin', label: 'CH2 header' }, { id: 'CH3', role: 'pin', label: 'CH3 header' },
    ],
    servoHub: true,
  },
  relay4: {
    name: '4-channel 5 V relay module (optocoupled, JD-VCC jumper)', short: '4-relay', cat: 'Actuator',
    vcc: [4.75, 5.25], mA: { avg: 140, peak: 300 },
    desc: 'Four 10 A relays, ~70 mA per coil (≈300 mA with all four ON). IN1–IN4 are active-LOW. For mains loads use proper insulated wiring and a fused supply — or practise with 5–12 V DC loads first.',
    activeLow: true, alt3v3: 'relay4jd',
    pins: [
      { id: 'GND', role: 'gnd' },
      { id: 'IN1', role: 'sig', dir: 'in', vih: 'relay4', inMax: 'vcc' }, { id: 'IN2', role: 'sig', dir: 'in', vih: 'relay4', inMax: 'vcc' },
      { id: 'IN3', role: 'sig', dir: 'in', vih: 'relay4', inMax: 'vcc' }, { id: 'IN4', role: 'sig', dir: 'in', vih: 'relay4', inMax: 'vcc' },
      { id: 'VCC', role: 'vcc' },
    ],
  },
  relay4jd: {
    name: '4-channel 5 V relay module — JD-VCC split for 3.3 V boards', short: '4-relay (JD-VCC)', cat: 'Actuator',
    vcc: [3.3, 5], mA: { avg: 8, peak: 16 }, coil: { rail: '5V', avg: 140, peak: 300 },
    desc: 'The same optocoupled 4-relay board, wired the standard way for 3.3 V boards: remove the JD-VCC jumper, feed VCC (opto side) from 3.3 V and JD-VCC (coil side) from 5 V. A 3.3 V HIGH then switches each channel fully OFF. IN1–IN4 are active-LOW.',
    activeLow: true,
    pins: [
      { id: 'GND', role: 'gnd' },
      { id: 'IN1', role: 'sig', dir: 'in', vih: 2.0, inMax: 'vcc' }, { id: 'IN2', role: 'sig', dir: 'in', vih: 2.0, inMax: 'vcc' },
      { id: 'IN3', role: 'sig', dir: 'in', vih: 2.0, inMax: 'vcc' }, { id: 'IN4', role: 'sig', dir: 'in', vih: 2.0, inMax: 'vcc' },
      { id: 'VCC', role: 'vcc', prefer: 'logic', label: 'VCC (opto, 3.3 V)' },
      { id: 'JD-VCC', role: 'vcc2', label: 'JD-VCC (coils, 5 V)' },
    ],
  },
  rc522: {
    name: 'RC522 RFID reader (13.56 MHz, MFRC522)', short: 'RC522 RFID', cat: 'Sensor',
    vcc: [3.0, 3.6], mA: { avg: 26, peak: 30 },
    desc: 'Reads MIFARE cards and key tags over SPI. 3.3 V ONLY — never connect its 3.3V pin to 5 V. Its inputs are not 5 V tolerant.',
    pins: [
      { id: 'SDA', role: 'sig', dir: 'in', inMax: 3.6, label: 'SDA (chip select)' },
      { id: 'SCK', role: 'sig', dir: 'in', inMax: 3.6 },
      { id: 'MOSI', role: 'sig', dir: 'in', inMax: 3.6 },
      { id: 'MISO', role: 'sig', dir: 'out', outV: 3.3 },
      { id: 'IRQ', role: 'sig', dir: 'out', opt: true, note: 'Not used' },
      { id: 'GND', role: 'gnd' },
      { id: 'RST', role: 'sig', dir: 'in', inMax: 3.6 },
      { id: '3V3', role: 'vcc', label: '3.3V' },
    ],
  },
  neo6m: {
    name: 'GY-NEO6MV2 GPS module (u-blox NEO-6M)', short: 'NEO-6M GPS', cat: 'Wireless',
    vcc: [3.3, 5], mA: { avg: 45, peak: 67 },
    desc: 'Serial at 9600 baud. Needs a clear view of the sky: first fix can take 1–5 minutes outdoors. The blue LED blinks once a second when it has a fix. RX is 3.3 V logic.',
    pins: [
      { id: 'VCC', role: 'vcc' },
      { id: 'RX', role: 'sig', dir: 'in', inMax: 3.6 },
      { id: 'TX', role: 'sig', dir: 'out', outV: 3.3 },
      { id: 'GND', role: 'gnd' },
    ],
  },
  mq135: {
    name: 'MQ-135 air quality (gas) sensor module', short: 'MQ-135', cat: 'Sensor',
    vcc: [4.75, 5.25], mA: { avg: 150, peak: 160 },
    desc: 'Heater needs 5 V and ~150 mA, gets warm. Run it 24–48 h once to burn in, then ~2 min warm-up each start. Senses NH3, NOx, alcohol, benzene, smoke, CO2 — gives a relative reading, not calibrated ppm.',
    pins: [
      { id: 'VCC', role: 'vcc' }, { id: 'GND', role: 'gnd' },
      { id: 'DO', role: 'sig', dir: 'out', outV: 'vcc' },
      { id: 'AO', role: 'sig', dir: 'out', outV: 'vcc', analog: true },
    ],
  },
  mq2: {
    name: 'MQ-2 gas & smoke sensor module', short: 'MQ-2', cat: 'Sensor',
    vcc: [4.75, 5.25], mA: { avg: 150, peak: 160 },
    desc: 'Senses LPG, propane, methane, smoke. Heater needs 5 V ~150 mA; ~2 min warm-up. Good for leak alerts, not for exact measurements.',
    pins: [
      { id: 'VCC', role: 'vcc' }, { id: 'GND', role: 'gnd' },
      { id: 'DO', role: 'sig', dir: 'out', outV: 'vcc' },
      { id: 'AO', role: 'sig', dir: 'out', outV: 'vcc', analog: true },
    ],
  },
  flame: {
    name: 'IR flame sensor module (760–1100 nm)', short: 'Flame sensor', cat: 'Sensor',
    vcc: [3.3, 5], mA: { avg: 5, peak: 6 },
    desc: 'Sees the infrared from a flame up to ~80 cm. DO goes LOW when a flame is detected (threshold pot). Sunlight and IR remotes can trigger it.',
    pins: [
      { id: 'VCC', role: 'vcc', prefer: 'logic' }, { id: 'GND', role: 'gnd' },
      { id: 'DO', role: 'sig', dir: 'out', outV: 'vcc' },
      { id: 'AO', role: 'sig', dir: 'out', outV: 'vcc', analog: true, opt: true },
    ],
  },
  rain: {
    name: 'Rain sensor (FC-37 plate + LM393 board)', short: 'Rain sensor', cat: 'Sensor',
    vcc: [3.3, 5], mA: { avg: 5, peak: 6 },
    desc: 'AO falls as more water covers the plate. DO goes LOW when wet past the threshold. The plate corrodes if powered all the time.',
    pins: [
      { id: 'VCC', role: 'vcc', prefer: 'logic' }, { id: 'GND', role: 'gnd' },
      { id: 'DO', role: 'sig', dir: 'out', outV: 'vcc' },
      { id: 'AO', role: 'sig', dir: 'out', outV: 'vcc', analog: true },
    ],
  },
  keypad: {
    name: '4×4 membrane keypad', short: 'Keypad 4×4', cat: 'Input',
    desc: '16 keys on 8 wires. The Keypad library sets rows as inputs with pull-ups and scans the columns. Connector order left to right: R1 R2 R3 R4 C1 C2 C3 C4.',
    pins: [
      { id: 'R1', role: 'sig', dir: 'out', outV: 0, pull: true }, { id: 'R2', role: 'sig', dir: 'out', outV: 0, pull: true },
      { id: 'R3', role: 'sig', dir: 'out', outV: 0, pull: true }, { id: 'R4', role: 'sig', dir: 'out', outV: 0, pull: true },
      { id: 'C1', role: 'sig', dir: 'in' }, { id: 'C2', role: 'sig', dir: 'in' }, { id: 'C3', role: 'sig', dir: 'in' }, { id: 'C4', role: 'sig', dir: 'in' },
    ],
  },
  irrecv: {
    name: 'VS1838B IR receiver (38 kHz)', short: 'IR receiver', cat: 'Sensor',
    vcc: [2.7, 5.5], mA: { avg: 1.5, peak: 1.5 },
    desc: 'Receives TV-remote codes (NEC etc.) with the IRremote library. Pin order with the dome facing you: OUT, GND, VCC. Range ~8–15 m.',
    pins: [
      { id: 'OUT', role: 'sig', dir: 'out', outV: 'vcc' },
      { id: 'GND', role: 'gnd' }, { id: 'VCC', role: 'vcc', prefer: 'logic' },
    ],
  },
  microsd: {
    name: 'MicroSD card module (with 3.3 V regulator + level shifter)', short: 'MicroSD', cat: 'Storage',
    vcc: [4.5, 5.5], mA: { avg: 30, peak: 100 },
    desc: 'SPI, needs 5 V on VCC (onboard AMS1117 + 74LVC125 shifter), so its pins work with 3.3 V and 5 V boards. Format the card FAT32. Its MISO line does not release the SPI bus — keep it as the last device on the bus.',
    pins: [
      { id: 'GND', role: 'gnd' }, { id: 'VCC', role: 'vcc' },
      { id: 'MISO', role: 'sig', dir: 'out', outV: 3.3 },
      { id: 'MOSI', role: 'sig', dir: 'in', inMax: 5.5 },
      { id: 'SCK', role: 'sig', dir: 'in', inMax: 5.5 },
      { id: 'CS', role: 'sig', dir: 'in', inMax: 5.5 },
    ],
  },
  joystick: {
    name: 'Joystick module (KY-023, 2-axis + button)', short: 'Joystick', cat: 'Input',
    vcc: [3.3, 5], mA: { avg: 1, peak: 1 },
    desc: 'Two 10 kΩ pots (X/Y) and a push button (SW, LOW when pressed). Rests at about half of VCC on both axes.',
    pins: [
      { id: 'GND', role: 'gnd' }, { id: '+5V', role: 'vcc', prefer: 'logic', label: '+5V (VCC)' },
      { id: 'VRx', role: 'sig', dir: 'out', outV: 'vcc', analog: true },
      { id: 'VRy', role: 'sig', dir: 'out', outV: 'vcc', analog: true },
      { id: 'SW', role: 'sig', dir: 'out', outV: 0, pull: true },
    ],
  },
  buck: {
    name: 'LM2596 buck converter module (set to 5.0 V)', short: 'LM2596 → 5V', cat: 'Power',
    desc: 'Steps a higher battery voltage down to 5 V at up to ~2 A (3 A peak, with heat). Turn the brass pot until the output reads 5.0 V on a multimeter BEFORE connecting anything. Needs at least ~1.5 V more input than output.',
    buck: { vout: 5, maxmA: 2000, dropout: 1.5, eff: 0.85 },
    pins: [{ id: 'IN+', role: 'pin' }, { id: 'IN-', role: 'pin' }, { id: 'OUT+', role: 'pin' }, { id: 'OUT-', role: 'pin' }],
  },
  solenoid: {
    name: '12 V solenoid door lock (fail-secure)', short: '12V solenoid', cat: 'Actuator',
    desc: 'Pulls the latch while powered (~0.6 A at 12 V). Always add a 1N4007 flyback diode across it (stripe to +). Do not keep it powered for more than a few seconds — it overheats.',
    load: { v: 12, tol: 1.2, mA: 600 },
    pins: [{ id: '+', role: 'pin' }, { id: '-', role: 'pin' }],
  },
  pump: {
    name: 'Mini submersible water pump (DC 3–6 V)', short: 'Pump', cat: 'Actuator',
    desc: '3–6 V, ~100–200 mA, ~80–120 L/h. Must be under water — running dry damages it.',
    motor: { vmin: 3, vmax: 6, run: 180, stall: 300 },
    pins: [{ id: '+', role: 'pin' }, { id: '-', role: 'pin' }],
  },
  soil: {
    name: 'Soil moisture sensor (FC-28 probe + LM393 board)', short: 'Soil sensor', cat: 'Sensor',
    vcc: [3.3, 5], mA: { avg: 5, peak: 6 },
    desc: 'AO = analog moisture (higher = drier). DO = digital LOW when wetter than the threshold set by the pot. Resistive probes corrode if powered all the time.',
    pins: [
      { id: 'VCC', role: 'vcc', prefer: 'logic' }, { id: 'GND', role: 'gnd' },
      { id: 'DO', role: 'sig', dir: 'out', outV: 'vcc' },
      { id: 'AO', role: 'sig', dir: 'out', outV: 'vcc', analog: true },
    ],
  },
  ldr: {
    name: 'LDR light sensor module (LM393)', short: 'LDR module', cat: 'Sensor',
    vcc: [3.3, 5], mA: { avg: 3, peak: 4 },
    desc: 'AO = analog light level. DO = digital threshold set by the pot.',
    pins: [
      { id: 'VCC', role: 'vcc', prefer: 'logic' }, { id: 'GND', role: 'gnd' },
      { id: 'DO', role: 'sig', dir: 'out', outV: 'vcc' },
      { id: 'AO', role: 'sig', dir: 'out', outV: 'vcc', analog: true },
    ],
  },
  pir: {
    name: 'HC-SR501 PIR motion sensor', short: 'PIR', cat: 'Sensor',
    vcc: [4.5, 20], mA: { avg: 0.1, peak: 0.1 },
    desc: 'Needs 4.5–20 V on VCC but its OUTPUT is 3.3 V, so it is safe for every board. Needs ~1 minute to settle after power-up. Two pots: sensitivity and hold time.',
    pins: [
      { id: 'VCC', role: 'vcc' },
      { id: 'OUT', role: 'sig', dir: 'out', outV: 3.3 },
      { id: 'GND', role: 'gnd' },
    ],
  },
  buzzer: {
    name: 'Active buzzer module (3-pin, with transistor)', short: 'Buzzer', cat: 'Output',
    vcc: [3.3, 5], mA: { avg: 30, peak: 30 },
    desc: 'Beeps when I/O is driven (check your module — most are active-HIGH, some active-LOW). The transistor means the board pin only supplies ~1 mA.',
    pins: [
      { id: 'VCC', role: 'vcc' },
      { id: 'I/O', role: 'sig', dir: 'in', vih: 2.0, inMax: 'vcc' },
      { id: 'GND', role: 'gnd' },
    ],
  },
  led: {
    name: 'LED + series resistor', short: 'LED', cat: 'Output',
    desc: 'Long leg (anode) → resistor → board pin. Short leg (cathode, flat side) → GND.',
    isLed: true,
    pins: [
      { id: 'A', role: 'sig', dir: 'in', label: 'Anode (via resistor)' },
      { id: 'K', role: 'gnd', label: 'Cathode' },
    ],
  },
  button: {
    name: 'Push button (tactile switch)', short: 'Button', cat: 'Input',
    desc: 'Wired between the pin and GND, using the board\'s internal pull-up: reads LOW when pressed.',
    pins: [{ id: 'S', role: 'sig', dir: 'out', outV: 0, pull: true }, { id: 'G', role: 'gnd' }],
  },
};

// LED forward voltages (typical, 5 mm)
export const LED_VF = { red: 2.0, yellow: 2.1, green: 2.2, blue: 3.0, white: 3.0 };
// Standard E12 resistor values
export const E12 = [10, 12, 15, 18, 22, 27, 33, 39, 47, 56, 68, 82];
export function nextE12(ohms) {
  for (let dec = 1; dec <= 100000; dec *= 10) for (const v of E12) if (v * dec >= ohms) return v * dec;
  return ohms;
}

// Power sources
export const SOURCES = {
  b2x18650: { name: '2× 18650 Li-ion in series', short: '2× 18650', v: 7.4, vFull: 8.4, vEmpty: 6.0, mAh: 2500, maxmA: 5000, note: 'Use protected cells or a 2S BMS board. Charge with a proper Li-ion charger.' },
  b4xAA: { name: '4× AA alkaline pack', short: '4× AA', v: 6.0, vFull: 6.4, vEmpty: 4.4, mAh: 2000, maxmA: 1000, note: 'Voltage sags quickly under motor load.' },
  b9v: { name: '9 V PP3 battery', short: '9 V PP3', v: 9.0, vFull: 9.5, vEmpty: 6.5, mAh: 500, maxmA: 300, note: 'Very low capacity and current — fine for a small circuit, bad for motors.' },
  usb5v: { name: 'USB 5 V phone charger (2 A)', short: 'USB 5V 2A', v: 5.0, vFull: 5.1, vEmpty: 5.0, mAh: null, maxmA: 2000, viaUsb: true },
  usbPc: { name: 'Laptop USB port', short: 'PC USB', v: 5.0, vFull: 5.0, vEmpty: 5.0, mAh: null, maxmA: 500, viaUsb: true },
  powerbank: { name: 'USB power bank 10 000 mAh (2.1 A)', short: 'Power bank', v: 5.0, vFull: 5.0, vEmpty: 5.0, mAh: 10000 * 3.7 / 5 * 0.85, maxmA: 2100, viaUsb: true, note: 'Usable capacity at 5 V ≈ 6300 mAh after conversion losses.' },
  usbc3a: { name: 'Official USB-C 5.1 V 3 A supply (15 W)', short: 'USB-C 3A', v: 5.1, vFull: 5.1, vEmpty: 5.1, mAh: null, maxmA: 3000, viaUsb: true },
  usbc5a: { name: 'Official USB-C 5.1 V 5 A supply (27 W)', short: 'USB-C 5A', v: 5.1, vFull: 5.1, vEmpty: 5.1, mAh: null, maxmA: 5000, viaUsb: true },
  adapter5v3a: { name: '5 V 3 A DC adapter + DC-jack terminal', short: '5V 3A adapter', v: 5.0, vFull: 5.1, vEmpty: 5.0, mAh: null, maxmA: 3000, note: 'Regulated 5 V. Check the polarity of the barrel jack (centre +).' },
  adapter12v2a: { name: '12 V 2 A DC adapter + DC-jack terminal', short: '12V 2A adapter', v: 12.0, vFull: 12.2, vEmpty: 12.0, mAh: null, maxmA: 2000, note: 'Regulated 12 V for the lock. Shares GND with the board.' },
  pbank3a: { name: 'USB-C PD power bank (5 V 3 A)', short: 'PD bank 3A', v: 5.0, vFull: 5.0, vEmpty: 5.0, mAh: 20000 * 3.7 / 5 * 0.85, maxmA: 3000, viaUsb: true, note: '20 000 mAh bank ≈ 12 600 mAh usable at 5 V.' },
};
