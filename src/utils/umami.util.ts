import { gitDefine } from "./env.util";

export function track(name: string, data?: Record<string, any>) {
    umami?.track(name, {
        version: gitDefine.shortCommitHash,
        ...data || {}
    })
}
