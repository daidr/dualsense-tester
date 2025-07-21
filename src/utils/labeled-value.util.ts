import type { VNode } from 'vue'

export function createLabeledValueItem(label: string, value: string, valueLocalePrefix?: string, tooltip?: VNode): LabeledValueItem {
  return {
    label,
    value,
    valueLocalePrefix,
    tooltip,
  }
}

export interface LabeledValueItem {
  label: string
  value: string
  valueLocalePrefix?: string
  tooltip?: VNode
}
