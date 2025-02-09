function percentageToNumber(percentage: string) {
    return parseFloat(percentage.replace('%', '')) / 100
}

export async function crowdinDefine() {
    try {
        const resp = await fetch('https://badges.awesome-crowdin.com/stats-13635559-758431.json');
        const data = await resp.json() as any;
        const result = data.progress.map((i: any) => ({
            locale: i.data.language.locale,
            translationProgress: percentageToNumber(i.data.translationProgress),
            approvalProgress: percentageToNumber(i.data.approvalProgress)
        }));
        const resultMap: Record<string, any> = {};
        for (const item of result) {
            resultMap[item.locale as string] = item
        }
        return {
            __CROWDIN_PROGRESS__: JSON.stringify(resultMap),
        }
    } catch (error) {
        console.error("Failed to fetch crowdin data", error);
        return {
            __CROWDIN_PROGRESS__: JSON.stringify({}),
        };
    }
}