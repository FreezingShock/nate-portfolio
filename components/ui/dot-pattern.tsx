"use client"

import React, { useId } from "react"

import { cn } from "@/lib/utils"

/**
 *  DotPattern Component Props
 *
 * @param {number} [width=16] - The horizontal spacing between dots
 * @param {number} [height=16] - The vertical spacing between dots
 * @param {number} [x=0] - The x-offset of the entire pattern
 * @param {number} [y=0] - The y-offset of the entire pattern
 * @param {number} [cx=1] - The x-offset of individual dots
 * @param {number} [cy=1] - The y-offset of individual dots
 * @param {number} [cr=1] - The radius of each dot
 * @param {string} [className] - Additional CSS classes to apply to the container
 * @param {boolean} [glow=false] - Whether a scattering of dots should twinkle
 */
interface DotPatternProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: number
  height?: number
  x?: number
  y?: number
  cx?: number
  cy?: number
  cr?: number
  className?: string
  glow?: boolean
}

// Which cells of a 3x3 block each twinkle layer lights up, plus how long its
// (slow, stepped) pulse takes and when it starts — staggered so the layers
// never pulse in unison.
const TWINKLE_LAYERS = [
  { cell: [0, 0], duration: 5, delay: 0 },
  { cell: [2, 1], duration: 6.5, delay: 1.5 },
  { cell: [1, 2], duration: 4.5, delay: 3 },
  { cell: [1, 0], duration: 7, delay: 4.5 },
]

/**
 * DotPattern Component
 *
 * A dot-grid background. The original MagicUI version rendered one
 * `motion.circle` per grid cell — with `glow` on, each one ran its own
 * infinite JS-driven opacity/scale animation, which at desktop sizes meant
 * thousands of animated nodes (measured: ~3,400 circles, ~1 fps on the blog
 * page). This version draws the whole grid as ONE SVG `<pattern>` fill, and
 * fakes the twinkle with a handful of extra full-size pattern layers whose
 * opacity is pulsed by CSS — a few composited layers instead of thousands
 * of live animations.
 *
 * The pulse is deliberately `steps()`-timed and slow: the Dock, footer and
 * nav bubble sit on top of this background with a `backdrop-filter`, and a
 * smooth every-frame fade underneath would force that (SVG-filtered) blur
 * to be recomputed every frame. Stepping it means the backdrop only changes
 * about once a second per layer.
 *
 * Dot color is controlled via the text color (`currentColor`).
 */
export function DotPattern({
  width = 16,
  height = 16,
  x = 0,
  y = 0,
  cx = 1,
  cy = 1,
  cr = 1,
  className,
  glow = false,
  ...props
}: DotPatternProps) {
  const id = useId()

  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 h-full w-full text-neutral-400/80",
        className
      )}
      {...props}
    >
      <svg className="absolute inset-0 h-full w-full" style={{ opacity: glow ? 0.4 : 1 }}>
        <defs>
          <pattern
            id={`${id}-dots`}
            width={width}
            height={height}
            patternUnits="userSpaceOnUse"
            x={x}
            y={y}
          >
            <circle cx={cx} cy={cy} r={cr} fill="currentColor" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${id}-dots)`} />
      </svg>

      {glow &&
        TWINKLE_LAYERS.map(({ cell, duration, delay }, i) => (
          <svg
            key={i}
            className="dot-twinkle absolute inset-0 h-full w-full"
            style={{ animationDuration: `${duration}s`, animationDelay: `${delay}s` }}
          >
            <defs>
              <radialGradient id={`${id}-glow-${i}`}>
                <stop offset="0%" stopColor="currentColor" stopOpacity="1" />
                <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
              </radialGradient>
              <pattern
                id={`${id}-twinkle-${i}`}
                width={width * 3}
                height={height * 3}
                patternUnits="userSpaceOnUse"
                x={x}
                y={y}
              >
                <circle
                  cx={cx + cell[0] * width}
                  cy={cy + cell[1] * height}
                  r={cr * 1.5}
                  fill={`url(#${id}-glow-${i})`}
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill={`url(#${id}-twinkle-${i})`} />
          </svg>
        ))}
    </div>
  )
}
