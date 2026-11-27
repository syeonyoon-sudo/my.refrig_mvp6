import type { AppData } from '../lib/types'
export { addSamples } from '../lib/actions'
export function onboard(d: AppData): AppData { return { ...d, onboarded: true } }
