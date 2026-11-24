// Dashboard / payments date ranges. A plain module (not "use client"), so server pages can import it too.
export const RANGES = [
  { value: "today", label: "Today", days: 1 },
  { value: "7d", label: "Last 7 days", days: 7 },
  { value: "30d", label: "Last 30 days", days: 30 },
  { value: "90d", label: "Last 90 days", days: 90 },
] as const
export type RangeValue = (typeof RANGES)[number]["value"]

export const rangeDays = (v: string | undefined) => RANGES.find((r) => r.value === v)?.days ?? 7
