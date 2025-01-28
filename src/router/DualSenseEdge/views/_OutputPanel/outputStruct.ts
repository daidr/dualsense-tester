import { ref } from 'vue'

export class OutputStruct {
  constructor() { }
  private sort = [
    'validFlag0',
    'validFlag1',
    'bcVibrationRight',
    'bcVibrationLeft',
    'headphoneVolume',
    'speakerVolume',
    'micVolume',
    'audioControl',
    'muteLedControl',
    'powerSaveMuteControl',
    'adaptiveTriggerRightMode',
    'adaptiveTriggerRightParam0',
    'adaptiveTriggerRightParam1',
    'adaptiveTriggerRightParam2',
    'adaptiveTriggerRightParam3',
    'adaptiveTriggerRightParam4',
    'adaptiveTriggerRightParam5',
    'adaptiveTriggerRightParam6',
    'adaptiveTriggerRightParam7',
    'adaptiveTriggerRightParam8',
    'adaptiveTriggerRightParam9',
    'adaptiveTriggerLeftMode',
    'adaptiveTriggerLeftParam0',
    'adaptiveTriggerLeftParam1',
    'adaptiveTriggerLeftParam2',
    'adaptiveTriggerLeftParam3',
    'adaptiveTriggerLeftParam4',
    'adaptiveTriggerLeftParam5',
    'adaptiveTriggerLeftParam6',
    'adaptiveTriggerLeftParam7',
    'adaptiveTriggerLeftParam8',
    'adaptiveTriggerLeftParam9',
    'Reserved0',
    'Reserved1',
    'Reserved2',
    'Reserved3',
    'hapticVolume',
    'audioControl2',
    'validFlag2',
    'Reserved7',
    'Reserved8',
    'lightbarSetup',
    'ledBrightness',
    'playerIndicator',
    'ledCRed',
    'ledCGreen',
    'ledCBlue',
  ] as const

  validFlag0 = ref(0)
  validFlag1 = ref(0xF7)
  bcVibrationRight = ref(0)
  bcVibrationLeft = ref(0)
  headphoneVolume = ref(0)
  speakerVolume = ref(0)
  micVolume = ref(0)
  audioControl = ref(0)
  muteLedControl = ref(0)
  powerSaveMuteControl = ref(0)
  adaptiveTriggerRightMode = ref(0)
  adaptiveTriggerRightParam0 = ref(0)
  adaptiveTriggerRightParam1 = ref(0)
  adaptiveTriggerRightParam2 = ref(0)
  adaptiveTriggerRightParam3 = ref(0)
  adaptiveTriggerRightParam4 = ref(0)
  adaptiveTriggerRightParam5 = ref(0)
  adaptiveTriggerRightParam6 = ref(0)
  adaptiveTriggerRightParam7 = ref(0)
  adaptiveTriggerRightParam8 = ref(0)
  adaptiveTriggerRightParam9 = ref(0)
  adaptiveTriggerLeftMode = ref(0)
  adaptiveTriggerLeftParam0 = ref(0)
  adaptiveTriggerLeftParam1 = ref(0)
  adaptiveTriggerLeftParam2 = ref(0)
  adaptiveTriggerLeftParam3 = ref(0)
  adaptiveTriggerLeftParam4 = ref(0)
  adaptiveTriggerLeftParam5 = ref(0)
  adaptiveTriggerLeftParam6 = ref(0)
  adaptiveTriggerLeftParam7 = ref(0)
  adaptiveTriggerLeftParam8 = ref(0)
  adaptiveTriggerLeftParam9 = ref(0)
  Reserved0 = ref(0)
  Reserved1 = ref(0)
  Reserved2 = ref(0)
  Reserved3 = ref(0)
  hapticVolume = ref(0)
  audioControl2 = ref(0)
  validFlag2 = ref(0)
  Reserved7 = ref(0)
  Reserved8 = ref(0)
  lightbarSetup = ref(0)
  ledBrightness = ref(0)
  playerIndicator = ref(0)
  ledCRed = ref(0)
  ledCGreen = ref(255)
  ledCBlue = ref(0)

  get reportData() {
    const length = this.sort.length
    const data = new Uint8Array(length)
    for (let i = 0; i < length; i++) {
      data[i] = this[this.sort[i]].value
    }
    return data
  }
}
