/* eslint-disable ts/no-duplicate-enum-values */
export enum DualSenseConnectionType {
  Unknown = 'unknown',
  /** The controller is connected over USB */
  USB = 'usb',
  /** The controller is connected over Bluetooth */
  Bluetooth = 'bluetooth',
}

export enum DualSenseType {
  DualSense = 'DualSense',
  DualSenseEdge = 'DualSenseEdge',
  Unknown = 'Unknown',
}

export interface DualSenseDeviceInfo {
  deviceName: string
  vendorId: number
  productId: number
  atSerialNoLeft: string
  atSerialNoRight: string
  atMotorInfoLeft: string
  atMotorInfoRight: string
}

export interface DualSenseFirmwareInfo {
  buildDate: string
  buildTime: string
  fwType: number
  swSeries: number
  hwInfo: number
  mainFwVersion: number
  deviceInfo: DataView // 12 bytes
  updateVersion: number
  updateImageInfo: DataView // 1 byte
  sblFwVersion: number
  dspFwVersion: number
  spiderDspFwVersion: number
  pcbaId: bigint
  pcbaIdFull: DataView // 24 bytes
  uniqueId: bigint
  bdMacAddress: bigint
  btPatchVersion: number
  serialNumber: DataView // 32 bytes
  assemblePartsInfo: DataView // 32 bytes
  batteryBarcode: DataView // 32 bytes
  vcmRightBarcode: DataView // 32 bytes
  vcmLeftBarcode: DataView // 32 bytes
  individualDataVerifyStatus: string
}

export type DualSenseInitialFirmwareInfo = Pick<DualSenseFirmwareInfo, 'buildDate' | 'buildTime' | 'fwType' | 'swSeries' | 'hwInfo' | 'mainFwVersion' | 'deviceInfo' | 'updateVersion' | 'updateImageInfo' | 'sblFwVersion' | 'dspFwVersion' | 'spiderDspFwVersion'>

export enum DualSenseTestDeviceId {
  SYSTEM = 1,
  POWER = 2,
  MEMORY = 3,
  ANALOG_DATA = 4,
  TOUCH = 5,
  AUDIO = 6,
  ADAPTIVE_TRIGGER = 7,
  BULLET = 8,
  BLUETOOTH = 9,
  MOTION = 10,
  TRIGGER = 11,
  STICK = 12,
  LED = 13,
  BT_PATCH = 14,
  DSP_FW = 15,
  SPIDER_DSP_FW = 16,
  FINGER = 17,
  POSITION_TRACKING = 19,
  BUILTIN_MIC_CALIB_DATA = 20,
}

export enum DualSenseTestActionId {
  ANALOG_TRIGGER = 1,
  BUILTIN_MIC_CALIB_DATA_INIT = 1,
  GET_INFO = 1,
  NVS_LOCK = 1,
  RESET = 1,
  SLEEP = 1,
  SOLOMON_SELF_TEST = 1,
  WRITE_BDADR = 1,
  WRITE_INIT = 1,
  WRITE_RAW_CALIBRATION_DATA = 1,
  ANALOG_STICK = 2,
  BUILTIN_MIC_CALIB_DATA_SEND = 2,
  CHG_FORCE_ENABLE = 2,
  DATA_SEND = 2,
  NVS_UNLOCK = 2,
  READ_BDADR = 2,
  READ_RAW_CALIBRATION_DATA = 2,
  SET_SENS_STATUS = 2,
  SOLOMON_UID = 2,
  WAVEOUT_CTRL = 2,
  BATTERY = 3,
  BUILTIN_MIC_CALIB_DATA_STORE = 3,
  CHG_FORCE_DISABLE = 3,
  DATA_START_VERIFY = 3,
  ERASE_CALIBRATION_DATA = 3,
  GET_SENS_STATUS = 3,
  NVS_GET_STATUS = 3,
  READ_CODEC_FW_INFO = 3,
  SET_BULLET_TYPE = 3,
  SET_VCOM = 3,
  SOLOMON_DIAG = 3,
  WRITE_PCBAID = 3,
  BUILTIN_MIC_CALIB_DATA_VERIFY = 4,
  CHG_ENABLE_SET = 4,
  GET_BULLET_TYPE = 4,
  READ_PCBAID = 4,
  SET_FILTER_LENGTH = 4,
  SET_PATH_SELECTOR = 4,
  SOLOMON_VERSION = 4,
  SPIDER_DSP_FW_DATA_VERISION = 4,
  BUILTIN_MIC_CALIB_DATA_GET = 5,
  CHG_ENABLE_CLR = 5,
  CHIP_READ = 5,
  CTRL_SPK_COMP = 5,
  DATA_FINALIZE = 5,
  GET_FILTER_LENGTH = 5,
  SET_BT_ENABLE = 5,
  WRITE_HWVERSION = 5,
  BATTERY_VOLTAGE = 6,
  GET_BT_ENABLE = 6,
  READ_HWVERSION = 6,
  SET_NOISE_CANCELLER_TYPE = 6,
  SET_ONOFF_HYSTERESIS = 6,
  DATA_GET_VERIFY_STATUS = 7,
  GET_FORCE_ENABLE = 7,
  GET_ONOFF_HYSTERESIS = 7,
  SET_DUT_MODE = 7,
  SET_MIC_GAIN = 7,
  WRITE_FACTORY_DATA = 7,
  GET_CHG_ENABLE = 8,
  READ_EFUSE = 8,
  READ_FACTORY_DATA = 8,
  SET_CAP_SENS_OFFSET_CORRECT = 8,
  SET_SPK_FIXED_GAIN_CMD = 8,
  CLEAR_CAP_SENS_OFFSET_CORRECT = 9,
  GET_MCU_UNIQUE_ID = 9,
  WRITE_EFUSE = 9,
  WRITE_SPK_FIXED_GAIN_CMD = 9,
  GET_XTAL_TXPOWER = 10, // 0x0000000A
  READ_PANIC_LOG = 10, // 0x0000000A
  READ_SPK_FIXED_GAIN = 10, // 0x0000000A
  SAVE_CONFIG = 10, // 0x0000000A
  CLEAR_PANIC_LOG = 11, // 0x0000000B
  ERASE_CONFIG = 11, // 0x0000000B
  SET_LED_BRIGHTNESS = 11, // 0x0000000B
  TRY_MIC_CALIB_GAIN_CMD = 11, // 0x0000000B
  WRITE_XTAL_OFFSET = 11, // 0x0000000B
  SET_COMP_STATUS = 12, // 0x0000000C
  SET_LED_BRIGHTNESS_ALL = 12, // 0x0000000C
  WRITE_XTAL_TXPOWER = 12, // 0x0000000C
  GET_COMP_STATUS = 13, // 0x0000000D
  READ_PATCH_INFO = 13, // 0x0000000D
  EXEC_FORCE_COMP = 14, // 0x0000000E
  GET_RAW_RSSI = 14, // 0x0000000E
  AGING_STATE = 15, // 0x0000000F
  GET_LED_BRIGHTNESS_ALL = 15, // 0x0000000F
  SET_AUTO_CALIB_STATUS = 15, // 0x0000000F
  WRITE_HW_INFO_WITH_DEVICE_INFO = 15, // 0x0000000F
  AGING_INIT = 16, // 0x00000010
  GET_AUTO_CALIB_STATUS = 16, // 0x00000010
  WRITE_PCBAID_FULL = 16, // 0x00000010
  READ_PCBAID_FULL = 17, // 0x00000011
  DATA_SEND_ALL = 18, // 0x00000012
  SET_PARAM_ENABLE_LR = 18, // 0x00000012
  SET_POSITION_TRACKING_ENABLE = 18, // 0x00000012
  READ_SERIAL_NUMBER = 19, // 0x00000013
  SET_MODE_PARAM_LR_FOR_MANU = 19, // 0x00000013
  SET_POSITION_TRACKING_DISABLE = 19, // 0x00000013
  SET_ALWAYS_ON_STARTUP_ENABLE = 20, // 0x00000014
  SET_MODE_PARAM_LR = 20, // 0x00000014
  GET_CALIB_DATA_LR = 21, // 0x00000015
  READ_ASSEMBLE_PARTS_INFO = 21, // 0x00000015
  SET_ALWAYS_ON_STARTUP_DISABLE = 21, // 0x00000015
  GET_POSITION_TRACKING_STATE = 22, // 0x00000016
  GET_VALUES = 22, // 0x00000016
  GET_ALWAYS_ON_STARTUP_STATE = 23, // 0x00000017
  READ_BATTERY_BARCODE = 24, // 0x00000018
  READ_VCM_LEFT_BARCODE = 26, // 0x0000001A
  READ_VCM_RIGHT_BARCODE = 28, // 0x0000001C
  SET_AUTO_SWITCHOFF_ENABLE = 30, // 0x0000001E
  SET_AUTO_SWITCHOFF_DISABLE = 31, // 0x0000001F
  GET_AUTO_SWITCHOFF_FLG = 32, // 0x00000020
  CYPRESS_VERSION = 33, // 0x00000021
  WRITE_CALIB_DATA = 33, // 0x00000021
  CYPRESS_UNIQUE_ID = 34, // 0x00000022
  READ_CALIB_DATA = 34, // 0x00000022
  CYPRESS_CALIBRATION = 35, // 0x00000023
  ERASE_CALIB_DATA = 35, // 0x00000023
  CYPRESS_SIGNAL_STEP_1 = 36, // 0x00000024
  WRITE_TRACABILITY_INFO = 36, // 0x00000024
  CYPRESS_SIGNAL_STEP_2 = 37, // 0x00000025
  READ_TRACABILITY_INFO = 37, // 0x00000025
  CYPRESS_SELF_TEST = 38, // 0x00000026
  ERASE_TRACABILITY_INFO = 38, // 0x00000026
  CYPRESS_DEVICE_SELECT = 39, // 0x00000027
  WRITE_CALIB_DATA_DEV = 49, // 0x00000031
  READ_CALIB_DATA_DEV = 50, // 0x00000032
  ERASE_CALIB_DATA_DEV = 51, // 0x00000033
  WRITE_TRACABILITY_INFO_DEV = 52, // 0x00000034
  READ_TRACABILITY_INFO_DEV = 53, // 0x00000035
  ERASE_TRACABILITY_INFO_DEV = 54, // 0x00000036
  WRITE_CALIBRATION_COEFFICIENT = 64, // 0x00000040
  READ_CALIBRATION_COEFFICIENT = 65, // 0x00000041
  SET_VALID_CALIBRATION_METHOD = 66, // 0x00000042
  GET_VALID_CALIBRATION_METHOD = 67, // 0x00000043
  TEST_ACTION_BOOTLOADER_ENTER = 112, // 0x00000070
  TEST_ACTION_BOOTLOADER_LEAVE = 113, // 0x00000071
  TEST_ACTION_BOOTLOADER_FORMAT = 114, // 0x00000072
  TEST_ACTION_BOOTLOADER_WRITE = 115, // 0x00000073
  TEST_ACTION_BOOTLOADER_FLUSH = 116, // 0x00000074
  CTRL_CODEC_REG_WRITE = 128, // 0x00000080
  GET_CALIB_DATA = 128, // 0x00000080
  CTRL_CODEC_REG_READ = 129, // 0x00000081
  GET_SENS_DATA = 129, // 0x00000081
  WRITE_CIRQUE_REG = 162, // 0x000000A2
  READ_CIRQUE_REG = 163, // 0x000000A3
  SET_CIRQUE_GAIN = 164, // 0x000000A4
  GET_CIRQUE_GAIN = 165, // 0x000000A5
  SET_CIRQUE_OFFSET = 166, // 0x000000A6
  GET_CIRQUE_OFFSET = 167, // 0x000000A7
  SET_OLYMPUS_0p1_CONFIG = 168, // 0x000000A8
  GET_OLYMPUS_0p1_CONFIG = 169, // 0x000000A9
  SET_OLYMPUS_CONFIG = 170, // 0x000000AA
  GET_OLYMPUS_CONFIG = 171, // 0x000000AB
}

export enum TestResult {
  TEST_RESULT_COMPLETE,
  TEST_RESULT_COMPLETE_2,
  TEST_RESULT_FAIL,
  TEST_RESULT_SET_FAIL,
  TEST_RESULT_TIMEOUT,
  TEST_RESULT_UNKNOWN,
}
export enum TestStatus {
  TEST_STATUS_IDLE = 0,
  TEST_STATUS_RUNNING = 1,
  TEST_STATUS_COMPLETE = 2,
  TEST_STATUS_COMPLETE_2 = 3,
  TEST_STATUS_TIMEOUT = 255, // 0x000000FF
}

export enum ChargeStatus {
  DISCHARGING = 0,
  CHARGING = 1,
  COMPLETE = 2,
  ABNORMAL_VOLTAGE = 10, // 0x0000000A
  ABNORMAL_TEMPERATURE = 11, // 0x0000000B
  CHARGING_ERROR = 15, // 0x0000000F
}

export enum BatteryLevel {
  /** 0-9% */
  LEVEL1 = 0,
  /** 10-19% */
  LEVEL2 = 1,
  /** 20-29% */
  LEVEL3 = 2,
  /** 30-39% */
  LEVEL4 = 3,
  /** 40-49% */
  LEVEL5 = 4,
  /** 50-59% */
  LEVEL6 = 5,
  /** 60-69% */
  LEVEL7 = 6,
  /** 70-79% */
  LEVEL8 = 7,
  /** 80-89% */
  LEVEL9 = 8,
  /** 90-99% */
  LEVEL10 = 9,
  /** 100% */
  LEVEL11 = 10,
  UNKNOWN = 11,
}

export interface InputReportOffset {
  analogStickLX: number
  analogStickLY: number
  analogStickRX: number
  analogStickRY: number
  analogTriggerL: number
  analogTriggerR: number
  sequenceNum: number
  digitalKeys: number
  incrementalNumber: number
  gyroPitch: number
  gyroYaw: number
  gyroRoll: number
  accelX: number
  accelY: number
  accelZ: number
  motionTimeStamp: number
  motionTemperature: number
  touchData: number
  atStatus0: number
  atStatus1: number
  hostTimestamp: number
  atStatus2: number
  activeProfile: number
  deviceTimestamp: number
  triggerLevel: number
  status0: number
  status1: number
  status2: number
  aesCmac: number
  seqTag: number
  crc32: number
}

export interface TouchPadItem {
  id: number
  x: number
  y: number
}

export interface DualSenseVisualResult {
  triangle: boolean
  circle: boolean
  square: boolean
  cross: boolean
  r3: boolean
  l3: boolean
  option: boolean
  create: boolean
  r2: boolean
  l2: boolean
  r1: boolean
  l1: boolean
  mic: boolean
  touchpad: boolean
  ps: boolean
  up: boolean
  right: boolean
  down: boolean
  left: boolean
  fnR: boolean
  fnL: boolean
  bR: boolean
  bL: boolean
  triggerLevelL: number
  triggerLevelR: number
  triggerL: number
  triggerR: number
  stickLX: number
  stickLY: number
  stickRX: number
  stickRY: number
  gyroPitch: number
  gyroYaw: number
  gyroRoll: number
  accelX: number
  accelY: number
  accelZ: number
  touchpadID1: number
  touchpadX1: number
  touchpadY1: number
  touchpadID2: number
  touchpadX2: number
  touchpadY2: number
}

export interface LabeledValueItem {
  label: string
  value: string
  valueLocalePrefix?: string
}

export interface InputInfo {
  seqNum: number
  labelResult: LabeledValueItem[]
  visualResult: DualSenseVisualResult
}

export interface DSEProfileItem {
  id: number
  default?: boolean
  assigned: boolean
  name?: string
}

export enum DPadDirection {
  U,
  UR,
  R,
  RD,
  D,
  LD,
  L,
  UL,
}
