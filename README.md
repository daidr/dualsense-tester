# DualSense Tester

Test your DualSense controller in the browser.

<https://ds.daidr.me>

## Features

* Test all buttons and axes
* Test the touchpad
* Test the gyroscope and accelerometer
* Test the vibration motors
* Test the lights
* Test the adaptive triggers
* DualSense Edge Basic Support
* **TODO**: DualSense Edge Full Support (2025Q1)
* **TODO**: Multiple Controllers Support (2025Q1)
* **TODO**: DualSense Edge Profile Customization (2025Q2)

## Project Setup

```sh
pnpm install
```

### 1. Compile dualsense.js first

```sh
pnpm build:lib
```

### 1. (Optional) Compile and Watch dualsense.js for Development

```sh
pnpm dev:lib
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
