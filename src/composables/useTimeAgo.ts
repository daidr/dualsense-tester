import type { MaybeRefOrGetter, UseTimeAgoMessages, UseTimeAgoUnitNamesDefault } from '@vueuse/core'
import { formatTimeAgo as _formatTimeAgo, useNow } from '@vueuse/core'
import { computed, toValue } from 'vue'
import { useI18n } from 'vue-i18n'

export function useTimeAgo(time: MaybeRefOrGetter<Date | number | string>) {
  const { t } = useI18n()
  const messages = computed(() => {
    return {
      justNow: t('time_ago.just_now'),
      past: n => n.match(/\d/)
        ? t('time_ago.ago', {
            time_string: n,
          })
        : n,
      future: n => n.match(/\d/)
        ? t('time_ago.future', {
            time_string: n,
          })
        : n,
      month: (n, past) => n === 1
        ? past
          ? t('time_ago.last_month')
          : t('time_ago.next_month')
        : t('time_ago.n_months', {
            num: n,
          }),
      year: (n, past) => n === 1
        ? past
          ? t('time_ago.last_year')
          : t('time_ago.next_year')
        : t('time_ago.n_years', {
            num: n,
          }),
      day: (n, past) => n === 1
        ? past
          ? t('time_ago.yesterday')
          : t('time_ago.tomorrow')
        : t('time_ago.n_days', {
            num: n,
          }),
      week: (n, past) => n === 1
        ? past
          ? t('time_ago.last_week')
          : t('time_ago.next_week')
        : t('time_ago.n_weeks', {
            num: n,
          }),
      hour: n => t('time_ago.n_hours', {
        num: n,
      }),
      minute: n => t('time_ago.n_minutes', {
        num: n,
      }),
      second: n => t('time_ago.n_seconds', {
        num: n,
      }),
      invalid: '',
    } as UseTimeAgoMessages<UseTimeAgoUnitNamesDefault>
  })

  const { now } = useNow({ interval: 30_000, controls: true })
  const timeAgo = computed(() => _formatTimeAgo(new Date(toValue(time)), {
    messages: messages.value,
  }, toValue(now)))

  return timeAgo
}
