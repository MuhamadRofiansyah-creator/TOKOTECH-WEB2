import type { ArtKind } from "@/lib/types"
import { cn } from "@/lib/utils"

// Generated vector product art: a placeholder for real photography that
// keeps the catalog consistent and loads instantly. Swap for <Image> once
// real product photos exist (see ProductImage).

type Props = {
  kind: ArtKind
  accent: string
  /** Body color of the product (first color option) */
  body?: string
  className?: string
  variant?: number
}

const isLight = (hex: string) => {
  const h = hex.replace("#", "")
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16))
  return r * 0.299 + g * 0.587 + b * 0.114 > 186
}

export function ProductArt({ kind, accent, body = "#111827", className, variant = 0 }: Props) {
  const light = isLight(body)
  const stroke = light ? "#cbd5e1" : "#0b1220"
  const detail = light ? "#e2e8f0" : "#1f2937"
  const id = `${kind}-${accent.replace("#", "")}-${variant}`

  return (
    <svg viewBox="0 0 400 400" className={cn("h-full w-full", className)} role="img" aria-hidden>
      <defs>
        <linearGradient id={`scr-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={accent} />
          <stop offset="55%" stopColor="#0b1220" />
          <stop offset="100%" stopColor={accent} stopOpacity="0.6" />
        </linearGradient>
        <radialGradient id={`glow-${id}`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor={accent} stopOpacity="0.35" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </radialGradient>
        <filter id={`sh-${id}`} x="-20%" y="-20%" width="140%" height="160%">
          <feDropShadow dx="0" dy="14" stdDeviation="12" floodColor="#0b1220" floodOpacity="0.18" />
        </filter>
      </defs>

      <circle cx="200" cy="200" r="170" fill={`url(#glow-${id})`} />
      <ellipse cx="200" cy="335" rx="130" ry="10" fill="#0b1220" opacity="0.08" />

      <g filter={`url(#sh-${id})`}>
        {kind === "monitor" && (
          <>
            <path d="M185 262 h30 l10 58 h-50z" fill={detail} />
            <rect x="140" y="316" width="120" height="10" rx="5" fill={body} stroke={stroke} strokeWidth="2" />
            <rect x="52" y="88" width="296" height="178" rx="10" fill={body} stroke={stroke} strokeWidth="2" />
            <rect x="60" y="96" width="280" height="160" rx="5" fill={`url(#scr-${id})`} />
            <path d="M60 210 C 130 170, 200 240, 340 150 L340 256 L60 256Z" fill="#fff" opacity="0.08" />
            <circle cx="290" cy="130" r="18" fill="#fff" opacity="0.12" />
          </>
        )}

        {kind === "keyboard" && (
          <g transform="rotate(-8 200 210)">
            <rect x="40" y="140" width="320" height="130" rx="14" fill={body} stroke={stroke} strokeWidth="2" />
            {Array.from({ length: 5 }).map((_, r) =>
              Array.from({ length: r === 4 ? 1 : 13 }).map((__, c) => {
                const w = r === 4 ? 150 : 18
                const x = r === 4 ? 125 : 54 + c * 23.5
                return (
                  <rect
                    key={`${r}-${c}`}
                    x={x}
                    y={152 + r * 23}
                    width={w}
                    height="18"
                    rx="4"
                    fill={(r === 0 && c === 0) || (r === 2 && c === 12) ? accent : light ? "#fff" : "#273244"}
                    stroke={light ? "#e2e8f0" : "#0b1220"}
                  />
                )
              }),
            )}
            <rect x="40" y="262" width="320" height="6" rx="3" fill={accent} opacity="0.7" />
          </g>
        )}

        {kind === "mouse" && (
          <g transform="rotate(-18 200 200)">
            <path d="M200 70 C 270 70, 285 150, 285 220 C 285 300, 245 340, 200 340 C 155 340, 115 300, 115 220 C 115 150, 130 70, 200 70Z" fill={body} stroke={stroke} strokeWidth="2" />
            <path d="M200 72 V 175" stroke={light ? "#cbd5e1" : "#374151"} strokeWidth="3" />
            <path d="M118 175 C 160 190, 240 190, 282 175" fill="none" stroke={light ? "#e2e8f0" : "#1f2937"} strokeWidth="2" />
            <rect x="192" y="105" width="16" height="36" rx="8" fill={accent} />
            <path d="M150 300 C 175 320, 225 320, 250 300" fill="none" stroke={accent} strokeWidth="5" strokeLinecap="round" opacity="0.8" />
          </g>
        )}

        {kind === "headset" && (
          <>
            <path d="M95 230 C 95 110, 305 110, 305 230" fill="none" stroke={body} strokeWidth="22" strokeLinecap="round" />
            <path d="M95 230 C 95 110, 305 110, 305 230" fill="none" stroke={stroke} strokeWidth="2" opacity="0.4" />
            <rect x="62" y="200" width="70" height="110" rx="32" fill={body} stroke={stroke} strokeWidth="2" />
            <rect x="268" y="200" width="70" height="110" rx="32" fill={body} stroke={stroke} strokeWidth="2" />
            <circle cx="97" cy="255" r="18" fill={accent} opacity="0.9" />
            <circle cx="303" cy="255" r="18" fill={accent} opacity="0.9" />
            <path d="M80 290 C 70 330, 120 345, 160 335" fill="none" stroke={detail} strokeWidth="7" strokeLinecap="round" />
            <circle cx="164" cy="334" r="8" fill={accent} />
          </>
        )}

        {kind === "laptop" && (
          <>
            <path d="M88 96 h224 a10 10 0 0 1 10 10 v150 h-244 v-150 a10 10 0 0 1 10 -10z" fill={body} stroke={stroke} strokeWidth="2" />
            <rect x="92" y="104" width="216" height="146" rx="4" fill={`url(#scr-${id})`} />
            <path d="M92 210 C 150 180, 220 230, 308 170 L308 250 L92 250Z" fill="#fff" opacity="0.08" />
            <path d="M44 262 h312 l-18 34 h-276z" fill={light ? "#e2e8f0" : "#374151"} stroke={stroke} strokeWidth="2" />
            <rect x="170" y="266" width="60" height="6" rx="3" fill={light ? "#cbd5e1" : "#1f2937"} />
          </>
        )}

        {kind === "desktop" && (
          <>
            <rect x="118" y="62" width="164" height="270" rx="12" fill={body} stroke={stroke} strokeWidth="2" />
            <rect x="130" y="76" width="112" height="242" rx="6" fill="#0b1220" opacity="0.9" />
            {[0, 1, 2].map((i) => (
              <g key={i}>
                <circle cx="186" cy={118 + i * 78} r="30" fill="none" stroke={accent} strokeWidth="5" />
                <circle cx="186" cy={118 + i * 78} r="8" fill={accent} opacity="0.7" />
              </g>
            ))}
            <rect x="252" y="80" width="18" height="6" rx="3" fill={accent} />
            <rect x="252" y="94" width="18" height="4" rx="2" fill={detail} />
          </>
        )}

        {kind === "gpu" && (
          <g transform="rotate(-6 200 200)">
            <rect x="40" y="140" width="320" height="120" rx="14" fill={body} stroke={stroke} strokeWidth="2" />
            {[0, 1, 2].map((i) => (
              <g key={i}>
                <circle cx={100 + i * 100} cy="200" r="42" fill="#0b1220" />
                <circle cx={100 + i * 100} cy="200" r="38" fill="none" stroke={light ? "#94a3b8" : "#374151"} strokeWidth="2" />
                <circle cx={100 + i * 100} cy="200" r="12" fill={accent} />
              </g>
            ))}
            <rect x="40" y="252" width="320" height="6" fill={accent} opacity="0.75" />
            <rect x="80" y="260" width="200" height="14" rx="2" fill="#eab308" opacity="0.7" />
          </g>
        )}
      </g>
    </svg>
  )
}
