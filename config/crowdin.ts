import process from 'node:process'

function percentageToNumber(percentage: number) {
  return percentage / 100
}

const isDev = process.env.NODE_ENV === 'development'

export async function crowdinDefine(env: Record<string, string>) {
  try {
    if (isDev) {
      return {
        __CROWDIN_PROGRESS__: JSON.stringify({}),
      }
    }
    if (!env.CROWDIN_API_KEY) {
      console.error('CROWDIN_API_KEY is not set')
      return {
        __CROWDIN_PROGRESS__: JSON.stringify({}),
      }
    }
    const resp = await fetch('https://api.crowdin.com/api/v2/projects/758431/languages/progress?limit=500', {
      headers: {
        Authorization: `Bearer ${env.CROWDIN_API_KEY}`,
      },
    })
    const data = await resp.json() as any
    const result = data.data.map((i: any) => ({
      locale: i.data.language.locale,
      translationProgress: percentageToNumber(i.data.translationProgress),
      approvalProgress: percentageToNumber(i.data.approvalProgress),
    }))
    const resultMap: Record<string, any> = {}
    for (const item of result) {
      resultMap[item.locale as string] = item
    }
    return {
      __CROWDIN_PROGRESS__: JSON.stringify(resultMap),
    }
  }
  catch (error) {
    console.error('Failed to fetch crowdin data', error)
    return {
      __CROWDIN_PROGRESS__: JSON.stringify({}),
    }
  }
}
