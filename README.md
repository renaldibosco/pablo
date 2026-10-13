# Pablo's IDE

All-in-one maker app for Arduino, ESP32, ESP8266, Raspberry Pi Pico and Raspberry Pi projects:
**blueprint → parts → pins → wiring → power → checks**, all generated from real board pinouts and real module specs.

## Stage 1 (this build)
- **12 boards** with their real headers in physical order: Arduino Uno R3, Nano, Mega 2560, Leonardo · ESP32 DevKit V1 (30-pin), ESP32 DevKitC (38-pin) · NodeMCU (ESP8266), WEMOS D1 mini · Raspberry Pi Pico, Pico W · Raspberry Pi 4, Pi 5
- **6 project templates**: Bluetooth RC car, smart plant watering, weather station, ultrasonic distance meter, motion alarm, traffic light — each with basic parts and advanced add-ons
- **Automatic pin assignment** per board (avoids flash, boot/strapping, USB-serial, input-only pins; keeps I2C/UART on the right pins)
- **Wiring diagrams** drawn only from the computed connections, plus a step-by-step build checklist
- **Pin checker**: conflicts, wrong pin types, 5 V into 3.3 V pins, 3.3 V-only inputs, pull-ups, Pico PWM slices, I2C addresses, LED/pin current — and it adds voltage dividers / level shifters automatically where needed
- **Power calculator**: battery vs. motor stall current, L298N voltage drop and regulator limits, board rail budgets, runtime estimate
- **Board pinout explorer** with every pin's functions and warnings

## Roadmap
2. Code editor, cloud compile, plain-English error fixer, upload
3. Bluetooth controller, custom controller designer, live serial monitor with graphs
4. Project assistant (free/offline), share & export

## Build
`npm ci && node test/run.mjs` checks every project on every board. Pushing to `main` builds a signed APK with GitHub Actions.
