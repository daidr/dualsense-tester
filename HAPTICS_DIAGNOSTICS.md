# USB haptics investigation: issue #243

Issue: <https://github.com/daidr/dualsense-tester/issues/243>

## What is established

The report says that haptics stopped about a month before 2026-11-01 and the controller is detected as an output. It does not provide OS, browser, connection type, firmware, sample file, or logs. Detection alone does not establish a working four-channel stream. None of the code findings below establishes the reporter's root cause.

The USB path is:

1. `MediaFilePlayer` enumerates/picks an audio endpoint; `setSinkId` selects it on the main `AudioContext`.
2. A decoded `AudioBufferSourceNode` feeds an analyser and separate speaker/haptic branches.
3. Speaker L/R go to merger inputs 0/1. Haptic L/R pass through a gain and splitter to inputs 2/3. A four-input merger feeds the destination.
4. The destination must actually retain `channelCount=4`, `channelCountMode=explicit`, and `channelInterpretation=discrete` after output selection, including changes during playback.
5. `playingChange` in the DualSense/Edge audio widgets adjusts/restores HID speaker/headphone volumes. Those setters clear legacy rumble flags. The haptic toggle also rebuilds the graph; its default is **off**, and gain defaults to 100%. Bluetooth uses a different HID streaming backend.

An active spectrum only proves signal before the destination; it cannot prove that the controller receives ch2/ch3. “Sync to PC” is another AudioContext and cannot validate this route either.

## Reproducible code findings and fixes

| Finding | Old behavior | Fix |
| --- | --- | --- |
| Four-channel configuration failure | Checks capability (`maxChannelCount`) at selection; catches destination-setting errors at playback, warns, and continues with a possibly stereo/speaker-mixed destination. Switching sinks during playback does not reapply destination settings. | Configure and read back all three destination properties after every sink selection/revalidation/rollback, and before building the graph. Reject failure using the existing quadraphonic error path; never start with an invalid destination. |
| Mono source | `ChannelSplitterNode(2)` outputs silence on output 1 for mono. Right-only haptics are silent; “both” only drives the left motor. Speaker right is also silent. | Reuse output 0 for the right route for mono buffers. Preserve L/R separation for stereo. |
| Auto-picked default alias | The first matching device label can belong to `default` or `communications`, even when a fixed controller endpoint exists. An alias may later follow another output. | Auto-pick only fixed device IDs. System default remains available for deliberate manual selection. |

Relevant Web Audio rules: [destination configuration](https://webaudio.github.io/web-audio-api/#AudioDestinationNode), [splitter silence and discrete channel handling](https://webaudio.github.io/web-audio-api/#ChannelSplitterNode).

The last change to the USB composable on main was 2026-08-14. The 2026-09-15 volume change (#223) maps percentages to existing controller ranges (speaker 0x64, headphone 0x7f). Its timing alone is not evidence of causation, so this fix does not revert it to out-of-range values.

## Minimal reporter run (start here)

1. Record OS/build, browser/full version, DualSense or Edge + firmware, USB or Bluetooth, and the site version/commit. State whether “haptics” means file playback or the heavy/light rumble sliders.
2. For the USB path, connect directly by a data-capable USB cable. Record Steam Input, DSX, DS4Windows, audio processing/virtual devices, and whether closing them changes the result. Do a fresh page load and reconnect for each comparison.
3. Explicitly pick the **fixed controller audio endpoint**. Record its displayed label, OS output channel layout, output volume/mute, spatial sound/enhancements, and whether the same setup still works in another browser/version. Redact device IDs from shared logs.
4. Turn audio off, haptics on, gain 100%, motor “both”, and Sync to PC off. Use the deterministic stereo fixture below. Try left/right/both, then repeat with the mono fixture. Record each motor's result separately. Finally test speaker playback separately with audio on/haptics off.
5. On the patched build, copy the console's `USB output graph` object and any `DualSense player failed` error (including DOMException name/message). It contains context state/sample rate, effective destination configuration, decoded input channels, toggle states, target motor and gain. Record whether playback time advances. Capture the exact moment an error appears, including after endpoint changes/reconnects.

Create two comparable 3-second PCM WAV fixtures using Python's standard library, then upload them through the usual file player:

```python
import math
import struct
import wave

rate = 48000
for channels in (1, 2):
    with wave.open(f'haptic-80hz-{channels}ch.wav', 'wb') as wav:
        wav.setparams((channels, 2, rate, 0, 'NONE', 'not compressed'))
        frames = bytearray()
        for i in range(3 * rate):
            # 20% amplitude, with short fades to avoid sharp edges.
            fade = min(1, i / 480, (3 * rate - 1 - i) / 480)
            sample = round(0.2 * 32767 * fade * math.sin(2 * math.pi * 80 * i / rate))
            frames.extend(struct.pack('<h', sample) * channels)
        wav.writeframes(frames)
```

## Optional independent browser-output probe

Use this only if the fixture still fails. This isolates file decoding and the app's graph from Web Audio output. It **does not initialize HID mode or volume**, so first pause file playback and use the site's Output panel to set speaker volume to 100 (0x64) and headphone volume to 127 (0x7f). Those controls also leave legacy rumble mode. Do not operate rumble sliders or other controller clients during this probe. Record these settings; a failing probe alone cannot distinguish OS/driver failure from an external HID override.

After granting the site's device-list access, enumerate only fixed outputs in DevTools:

```js
window.dsProbeOutputs = (await navigator.mediaDevices.enumerateDevices())
  .filter(d => d.kind === 'audiooutput' && d.deviceId
    && !['default', 'communications'].includes(d.deviceId))
console.table(dsProbeOutputs.map((d, index) => ({ index, label: d.label })))
```

Set `dsProbeIndex` below to the row for the physical controller. Run the snippet, then click the added button. It sends short 80 Hz pulses to ch2, then ch3, with ch0/ch1 disconnected, and closes its context afterward. Do not select a normal speaker endpoint. Record which pulse moves which motor.

```js
const dsProbeIndex = 0 // Replace with the controller row from the table.
const dsProbeDevice = dsProbeOutputs[dsProbeIndex]
if (!dsProbeDevice) throw new Error('Select a controller output first')
const dsProbeButton = document.createElement('button')
dsProbeButton.textContent = 'Probe controller ch2 then ch3'
dsProbeButton.style.cssText = 'position:fixed;top:8px;left:8px;z-index:99999;background:white;color:black;padding:12px'
document.body.append(dsProbeButton)
dsProbeButton.onclick = async () => {
  dsProbeButton.disabled = true
  const ctx = new AudioContext()
  const snapshot = () => ({
    state: ctx.state, sampleRate: ctx.sampleRate,
    maxChannelCount: ctx.destination.maxChannelCount,
    channelCount: ctx.destination.channelCount,
    mode: ctx.destination.channelCountMode,
    interpretation: ctx.destination.channelInterpretation,
  })
  try {
    await ctx.resume() // The click supplies the user gesture.
    console.log('probe before sink', snapshot())
    await ctx.setSinkId(dsProbeDevice.deviceId)
    console.log('probe after sink', snapshot())
    if (ctx.destination.maxChannelCount < 4) throw new Error('Four-channel endpoint required')
    ctx.destination.channelCount = 4
    ctx.destination.channelCountMode = 'explicit'
    ctx.destination.channelInterpretation = 'discrete'
    console.log('probe configured', snapshot())
    if (ctx.destination.channelCount !== 4
      || ctx.destination.channelCountMode !== 'explicit'
      || ctx.destination.channelInterpretation !== 'discrete') throw new Error('Configuration not retained')
    const merger = ctx.createChannelMerger(4)
    merger.connect(ctx.destination)
    for (const channel of [2, 3]) {
      const tone = ctx.createOscillator()
      const gain = ctx.createGain()
      tone.frequency.value = 80
      const at = ctx.currentTime + 0.3
      gain.gain.setValueAtTime(0, at)
      gain.gain.linearRampToValueAtTime(0.2, at + 0.01)
      gain.gain.setValueAtTime(0.2, at + 0.39)
      gain.gain.linearRampToValueAtTime(0, at + 0.4)
      tone.connect(gain).connect(merger, 0, channel)
      console.log('probe pulse', { channel, at, ...snapshot() })
      const ended = new Promise(resolve => { tone.onended = resolve })
      tone.start(at)
      tone.stop(at + 0.4)
      await ended
      tone.disconnect()
      gain.disconnect()
    }
    merger.disconnect()
  }
  catch (error) {
    console.error('USB haptic probe failed', error, snapshot())
  }
  finally {
    await ctx.close()
    dsProbeButton.remove()
  }
}
```

## How to interpret results

| Observation | What it establishes / next check |
| --- | --- |
| `setSinkId` rejects | Output selection/permission/device availability failed. Preserve exception name/message. |
| Four channels unavailable, assignment throws, or readback is not 4/explicit/discrete | The browser cannot establish the required configuration on this endpoint. Compare OS layout, physical vs virtual endpoint, browser and driver. A matching device name is insufficient. |
| Mono right-only fails on old build but works on patched build | Matches the verified mono routing defect. It does not explain a stereo file failing on both motors. |
| App fails but independent probe drives both motors | Browser-to-controller output can work with the recorded HID state. Inspect decoded file, app settings/graph, and HID writes during `playingChange`; compare the patched build. |
| Both fail despite correct configuration and a running clock | No proof of a JavaScript routing defect. Check controller HID state/volumes, exclusive clients, OS mixer/driver and firmware. Browser properties cannot prove physical motor actuation. |
| Legacy rumble works but file haptics fail | Motors can respond to HID rumble, but that is a different signal path and does not validate four-channel USB audio. |
| Bluetooth connection | Investigate `useBtAudioPlayer` / HID 0x36 separately; `setSinkId` is not that path. |

## Regression coverage and limits

`tests/useDualSensePlayer.spec.ts` covers selection failures, stereo rejection, property-assignment failures/readback, reconfiguration after sink switches, rollback, mono/stereo routing, switch-driven graph teardown/rebuild, gain updates, and device disappearance. `tests/MediaFilePlayer.spec.ts` covers fixed endpoint auto-selection and explicit default selection policy, plus existing USB/Bluetooth controls and error feedback.

Run `bun run test`. These are mocked Web Audio tests; they cannot certify actual browser rendering, driver channel mapping, HID volume effects, or hardware actuation. The fixtures and independent probe are the hardware follow-up, with before/after comparisons on the reporter's system.
