export function createLabeledValueItem(label: string, value: string, valueLocalePrefix?: string): LabeledValueItem {
  return {
    label,
    value,
    valueLocalePrefix,
  }
}

export interface LabeledValueItem {
  label: string
  value: string
  valueLocalePrefix?: string
}
