// Pablo's IDE — project templates.
// parts: { id, c: component key | source: true, label, adv (advanced add-on), when(board) }
// links: [ 'part.PIN', target, opts ]
//   target = 'part.PIN' (module-to-module wire) or a board requirement:
//     pwm | dout | din | din-pu (needs pull-up) | dio (bidirectional) | adc | sda | scl
//     uart-rx:<group> (board RX) | uart-tx:<group> (board TX)
//     GND | VCC (auto 5 V / 3.3 V rail) | FEED (board power input)
//   opts = { when(board), alt: ['part.PIN', target] (fallback when the board has no ADC), note }

const isArduino = (b) => b.family === 'arduino';
const isPi = (b) => b.family === 'rpi';
const usbBoard = (b) => !isPi(b);

export const PROJECTS = [
  {
    id: 'rc-car', name: 'Bluetooth RC Car', icon: 'car', level: 'Intermediate',
    summary: '2-wheel-drive car you drive from your Android phone over Bluetooth.',
    how: 'Your phone sends a letter (F, B, L, R, S) over Bluetooth. The board reads it and sets the L298N inputs: IN1–IN4 choose each motor\'s direction, ENA/ENB set the speed with PWM.',
    parts: [
      { id: 'drv', c: 'l298n', label: 'Motor driver' },
      { id: 'mL', c: 'ttmotor', label: 'Left motor' },
      { id: 'mR', c: 'ttmotor', label: 'Right motor' },
      { id: 'batt', source: true, label: 'Battery', options: ['b2x18650', 'b4xAA', 'b9v'], def: 'b2x18650' },
      { id: 'bt', c: 'hc05', label: 'Bluetooth', when: (b) => !b.bt },
      { id: 'pisup', source: true, label: 'Pi power', options: ['pbank3a'], def: 'pbank3a', when: isPi, usbOnly: true },
      { id: 'sonar', c: 'hcsr04', label: 'Front obstacle sensor', adv: true },
      { id: 'lamp', c: 'led', label: 'Headlight', color: 'white', adv: true },
      { id: 'horn', c: 'buzzer', label: 'Horn', adv: true },
    ],
    extras: [
      { name: 'Robot car chassis (2WD) with caster wheel', qty: 1 },
      { name: 'Rocker switch (power ON/OFF) in the battery + wire', qty: 1 },
      { name: 'Jumper wires (male–female, male–male)', qty: 20 },
    ],
    links: [
      ['drv.ENA', 'pwm'], ['drv.IN1', 'dout'], ['drv.IN2', 'dout'], ['drv.IN3', 'dout'], ['drv.IN4', 'dout'], ['drv.ENB', 'pwm'],
      ['drv.GND', 'GND', { note: 'Common ground — the board and the driver MUST share GND' }],
      ['batt.+', 'drv.12V'], ['batt.-', 'drv.GND'],
      ['drv.OUT1', 'mL.M+'], ['drv.OUT2', 'mL.M-'], ['drv.OUT3', 'mR.M+'], ['drv.OUT4', 'mR.M-'],
      ['batt.+', 'FEED', { when: isArduino, note: 'Battery straight into VIN — the Arduino\'s own regulator makes 5 V' }],
      ['drv.5V', 'FEED', { when: (b) => !isArduino(b) && !isPi(b), note: 'L298N 5 V regulator powers the board (keep the 5V-EN jumper ON)' }],
      ['bt.VCC', 'VCC'], ['bt.GND', 'GND'], ['bt.TXD', 'uart-rx:bt'], ['bt.RXD', 'uart-tx:bt'],
      ['sonar.VCC', 'VCC'], ['sonar.GND', 'GND'], ['sonar.Trig', 'dout'], ['sonar.Echo', 'din'],
      ['lamp.A', 'dout'], ['lamp.K', 'GND'],
      ['horn.VCC', 'VCC'], ['horn.I/O', 'dout'], ['horn.GND', 'GND'],
    ],
    steps: ['Mount the motors and the L298N on the chassis.', 'Remove the ENA and ENB jumpers on the L298N (keep the 5V-EN jumper).', 'Wire the battery through the switch to the L298N 12V and GND terminals.', 'Connect the logic wires below, GND first.', 'Pair your phone with the car (HC-05 PIN: 1234).'],
  },
  {
    id: 'plant', name: 'Smart Plant Watering', icon: 'plant', level: 'Beginner',
    summary: 'Measures soil moisture and switches a water pump on when the soil is dry.',
    how: 'The soil sensor\'s resistance drops when the soil is wet. The board reads it and, below your threshold, switches the relay, which connects the pump to its own battery.',
    parts: [
      { id: 'soil', c: 'soil', label: 'Soil moisture sensor' },
      { id: 'relay', c: 'relay1', label: 'Pump relay' },
      { id: 'pump', c: 'pump', label: 'Water pump' },
      { id: 'pbatt', source: true, label: 'Pump battery', options: ['b4xAA'], def: 'b4xAA' },
      { id: 'sup', source: true, label: 'Board power', options: ['usb5v', 'usbPc', 'powerbank'], def: 'usb5v', when: usbBoard, usbOnly: true },
      { id: 'pisup', source: true, label: 'Pi power', options: ['usbc3a', 'usbc5a'], def: 'usbc3a', when: isPi, usbOnly: true },
      { id: 'oled', c: 'ssd1306', label: 'Moisture display', adv: true },
      { id: 'okled', c: 'led', label: 'Status LED', color: 'green', adv: true },
    ],
    extras: [{ name: 'Silicone tube (6 mm) for the pump', qty: 1 }, { name: 'Water container', qty: 1 }, { name: 'Jumper wires', qty: 15 }],
    links: [
      ['soil.VCC', 'VCC'], ['soil.GND', 'GND'], ['soil.AO', 'adc', { alt: ['soil.DO', 'din'] }],
      ['relay.DC+', 'VCC'], ['relay.DC-', 'GND'], ['relay.IN', 'dout'],
      ['pbatt.+', 'relay.COM'], ['relay.NO', 'pump.+'], ['pump.-', 'pbatt.-'],
      ['oled.VCC', 'VCC'], ['oled.GND', 'GND'], ['oled.SDA', 'sda'], ['oled.SCL', 'scl'],
      ['okled.A', 'dout'], ['okled.K', 'GND'],
    ],
    steps: ['Push the probe into the soil, not touching the pot\'s base.', 'Wire the sensor and relay to the board.', 'Wire the pump circuit (battery → relay COM, relay NO → pump +, pump − → battery −).', 'Put the pump in water BEFORE powering it.'],
  },
  {
    id: 'weather', name: 'Mini Weather Station', icon: 'cloud', level: 'Beginner',
    summary: 'Shows temperature and humidity on an OLED screen.',
    how: 'The DHT22 measures temperature and humidity and sends them over its single data wire. The board shows them on the OLED over I2C (2 wires: SDA, SCL).',
    parts: [
      { id: 'dht', c: 'dht22', label: 'Temp & humidity sensor' },
      { id: 'oled', c: 'ssd1306', label: 'Display' },
      { id: 'sup', source: true, label: 'Board power', options: ['usb5v', 'usbPc', 'powerbank'], def: 'usb5v', when: usbBoard, usbOnly: true },
      { id: 'pisup', source: true, label: 'Pi power', options: ['usbc3a', 'usbc5a'], def: 'usbc3a', when: isPi, usbOnly: true },
      { id: 'ldr', c: 'ldr', label: 'Light sensor', adv: true },
    ],
    extras: [{ name: 'Breadboard (400 points)', qty: 1 }, { name: 'Jumper wires', qty: 10 }],
    links: [
      ['dht.+', 'VCC'], ['dht.-', 'GND'], ['dht.OUT', 'dio'],
      ['oled.VCC', 'VCC'], ['oled.GND', 'GND'], ['oled.SDA', 'sda'], ['oled.SCL', 'scl'],
      ['ldr.VCC', 'VCC'], ['ldr.GND', 'GND'], ['ldr.AO', 'adc', { alt: ['ldr.DO', 'din'] }],
    ],
    steps: ['Place the board and modules on the breadboard.', 'Connect the power rails (VCC and GND) first.', 'Connect the data lines.'],
  },
  {
    id: 'distance', name: 'Ultrasonic Distance Meter', icon: 'ruler', level: 'Beginner',
    summary: 'Measures distance with sound and shows it in centimetres on a 16×2 LCD.',
    how: 'TRIG sends a 10 µs pulse; the sensor fires 40 kHz sound and holds ECHO HIGH until the echo returns. Distance (cm) = echo time (µs) ÷ 58.',
    parts: [
      { id: 'sonar', c: 'hcsr04', label: 'Ultrasonic sensor' },
      { id: 'lcd', c: 'lcd1602', label: 'Display' },
      { id: 'sup', source: true, label: 'Board power', options: ['usb5v', 'usbPc', 'powerbank'], def: 'usb5v', when: usbBoard, usbOnly: true },
      { id: 'pisup', source: true, label: 'Pi power', options: ['usbc3a', 'usbc5a'], def: 'usbc3a', when: isPi, usbOnly: true },
      { id: 'beep', c: 'buzzer', label: 'Parking beeper', adv: true },
      { id: 'warn', c: 'led', label: 'Too-close LED', color: 'red', adv: true },
    ],
    extras: [{ name: 'Breadboard (400 points)', qty: 1 }, { name: 'Jumper wires', qty: 12 }],
    links: [
      ['sonar.VCC', 'VCC'], ['sonar.GND', 'GND'], ['sonar.Trig', 'dout'], ['sonar.Echo', 'din'],
      ['lcd.VCC', 'VCC'], ['lcd.GND', 'GND'], ['lcd.SDA', 'sda'], ['lcd.SCL', 'scl'],
      ['beep.VCC', 'VCC'], ['beep.I/O', 'dout'], ['beep.GND', 'GND'],
      ['warn.A', 'dout'], ['warn.K', 'GND'],
    ],
    steps: ['Mount the sensor facing forward with nothing in front of it.', 'Wire power first, then signals.', 'Adjust the LCD contrast pot until you see text.'],
  },
  {
    id: 'alarm', name: 'Motion Alarm', icon: 'alarm', level: 'Beginner',
    summary: 'A PIR sensor detects people moving; a buzzer and LED raise the alarm.',
    how: 'The PIR sees changes in infrared (body heat). When something warm moves, OUT goes HIGH for the hold time and the board sounds the buzzer.',
    parts: [
      { id: 'pir', c: 'pir', label: 'Motion sensor' },
      { id: 'buz', c: 'buzzer', label: 'Siren' },
      { id: 'led', c: 'led', label: 'Alarm LED', color: 'red' },
      { id: 'sup', source: true, label: 'Board power', options: ['usb5v', 'usbPc', 'powerbank'], def: 'usb5v', when: usbBoard, usbOnly: true },
      { id: 'pisup', source: true, label: 'Pi power', options: ['usbc3a', 'usbc5a'], def: 'usbc3a', when: isPi, usbOnly: true },
      { id: 'lamp', c: 'relay1', label: 'Lamp relay', adv: true },
    ],
    extras: [{ name: 'Breadboard (400 points)', qty: 1 }, { name: 'Jumper wires', qty: 12 }],
    links: [
      ['pir.VCC', 'VCC'], ['pir.GND', 'GND'], ['pir.OUT', 'din'],
      ['buz.VCC', 'VCC'], ['buz.I/O', 'dout'], ['buz.GND', 'GND'],
      ['led.A', 'dout'], ['led.K', 'GND'],
      ['lamp.DC+', 'VCC'], ['lamp.DC-', 'GND'], ['lamp.IN', 'dout'],
    ],
    steps: ['Wire the PIR (power from the 5 V side).', 'Wire the buzzer and LED.', 'Wait ~60 s after power-on for the PIR to settle.'],
  },
  {
    id: 'traffic', name: 'Traffic Light + Crossing Button', icon: 'traffic', level: 'Starter',
    summary: 'Red / yellow / green LEDs cycle like a real signal; a button requests the pedestrian crossing.',
    how: 'Each LED gets its own pin and resistor. The button uses the board\'s internal pull-up: the pin reads HIGH normally and LOW while pressed.',
    parts: [
      { id: 'red', c: 'led', label: 'Red LED', color: 'red' },
      { id: 'yel', c: 'led', label: 'Yellow LED', color: 'yellow' },
      { id: 'grn', c: 'led', label: 'Green LED', color: 'green' },
      { id: 'btn', c: 'button', label: 'Crossing button' },
      { id: 'sup', source: true, label: 'Board power', options: ['usb5v', 'usbPc', 'powerbank'], def: 'usbPc', when: usbBoard, usbOnly: true },
      { id: 'pisup', source: true, label: 'Pi power', options: ['usbc3a', 'usbc5a'], def: 'usbc3a', when: isPi, usbOnly: true },
      { id: 'beep', c: 'buzzer', label: 'Crossing beeper', adv: true },
    ],
    extras: [{ name: 'Breadboard (400 points)', qty: 1 }, { name: 'Jumper wires', qty: 10 }],
    links: [
      ['red.A', 'dout'], ['red.K', 'GND'], ['yel.A', 'dout'], ['yel.K', 'GND'], ['grn.A', 'dout'], ['grn.K', 'GND'],
      ['btn.S', 'din-pu'], ['btn.G', 'GND'],
      ['beep.VCC', 'VCC'], ['beep.I/O', 'dout'], ['beep.GND', 'GND'],
    ],
    steps: ['Put the LEDs in the breadboard, long leg towards the resistor.', 'Wire each resistor to its board pin.', 'Wire all short legs to GND.', 'Put the button across the breadboard\'s middle gap.'],
  },
];
export const projectById = (id) => PROJECTS.find((p) => p.id === id);
