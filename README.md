# DualSense Tester

Test your DualSense controller in the browser.

<https://ds.daidr.me>

## Features

* Test all buttons and axes
* Test the touchpad
* Test the gyroscope and accelerometer
* Test the vibration motors
* Test the lights
* **TODO:** Test the adaptive triggers

## Project Setup

```sh
pnpm install
```

### Compile dualsense.js first

```sh
pnpm build:lib
```

### Compile and Hot-Reload for Development

```sh
pnpm dev:fe
```

### Type-Check, Compile and Minify for Production

```sh
pnpm build:fe
```

## Credits

* [Ohjurot/DualSense-Windows](https://github.com/Ohjurot/DualSense-Windows)
* [flok/pydualsense](https://github.com/flok/pydualsense/)
* [nondebug/dualsense](https://github.com/nondebug/dualsense)
