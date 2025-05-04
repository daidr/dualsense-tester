import { ref } from 'vue'

export class OutputStruct {
  constructor() { }

  #length = 73

  private sort = [
    'hwControl',
    'audioControl',
    'validFlag0',
    'validFlag1',
    'reserved',
    'motorRight',
    'motorLeft',
    'ledRed',
    'ledGreen',
    'ledBlue',
    'ledBlinkOn',
    'ledBlinkOff',
  ] as const

  hwControl = ref(0xC4)
  audioControl = ref(0)
  validFlag0 = ref(0)
  validFlag1 = ref(0)
  reserved = ref(0)
  motorRight = ref(0)
  motorLeft = ref(0)
  ledRed = ref(0)
  ledGreen = ref(0)
  ledBlue = ref(0)
  ledBlinkOn = ref(0)
  ledBlinkOff = ref(0)

  get reportData() {
    const usedLength = this.sort.length
    const data = new Uint8Array(this.#length)
    for (let i = 0; i < usedLength; i++) {
      data[i] = this[this.sort[i]].value
    }
    return data
  }
}
