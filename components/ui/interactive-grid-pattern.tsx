import React from "react"

import { cn } from "@/lib/utils"

/**
 * InteractiveGridPattern is a component that renders a grid pattern with interactive squares.
 *
 * @param width - The width of each square.
 * @param height - The height of each square.
 * @param squares - The number of squares in the grid. The first element is the number of horizontal squares, and the second element is the number of vertical squares.
 * @param className - The class name of the grid.
 * @param squaresClassName - The class name of the squares.
 */
interface InteractiveGridPatternProps extends React.SVGProps<SVGSVGElement> {
  width?: number
  height?: number
  squares?: [number, number] // [horizontal, vertical]
  className?: string
  squaresClassName?: string
}

/**
 * The InteractiveGridPattern component.
 *
 * Hover is pure CSS (`:hover` via the `hover:` variant on each `<rect>`) —
 * not JS state tracked with onMouseEnter/onMouseLeave. That removes 2x the
 * square count in event listeners (1152 of them at the default 24x24), lets
 * the browser's own compositor handle the highlight with zero React
 * re-renders, and — since it's a native CSS pseudo-class — sidesteps any
 * bug where pointer-events inheritance from a `pointer-events-none`
 * ancestor silently ate a JS mouseenter/mouseleave handler (which is
 * exactly what broke this component before: the fix there still needed
 * `pointer-events-auto` on the SVG, but CSS `:hover` alone doesn't depend
 * on any JS handler actually being reached to work — one less moving part
 * to go wrong). Cheaper to mount and unmount for the same reason: no
 * `useState`, no state teardown, nothing for React to reconcile per hover.
 *
 * @see InteractiveGridPatternProps for the props interface.
 * @returns A React component.
 */
export function InteractiveGridPattern({
  width = 40,
  height = 40,
  squares = [24, 24],
  className,
  squaresClassName,
  ...props
}: InteractiveGridPatternProps) {
  const [horizontal, vertical] = squares

  return (
    <svg
      width={width * horizontal}
      height={height * vertical}
      // Without a viewBox, an SVG's content coordinates never rescale when
      // CSS stretches the element past its intrinsic width/height attrs —
      // the drawn grid stays a fixed WxH pixel canvas (960x960 at the
      // defaults) and everything past that in a wider box is just empty.
      // That's why this pattern stopped covering the right/bottom of the
      // screen on any desktop wider/taller than the default grid size.
      // `preserveAspectRatio="none"` lets it stretch to fill whatever box
      // it's given instead of preserving the grid's original aspect ratio.
      viewBox={`0 0 ${width * horizontal} ${height * vertical}`}
      preserveAspectRatio="none"
      className={cn(
        // pointer-events-auto: the parent PageBackground wrapper is
        // pointer-events-none (so the background never blocks clicks on
        // real content), and pointer-events is an inherited CSS property —
        // without this override the whole SVG (and everything under it)
        // would never receive pointer input, including the plain CSS
        // :hover below, since a hidden-from-hit-testing element can't
        // match :hover at all.
        "pointer-events-auto absolute inset-0 h-full w-full border border-gray-400/30",
        className
      )}
      {...props}
    >
      {Array.from({ length: horizontal * vertical }).map((_, index) => {
        const x = (index % horizontal) * width
        const y = Math.floor(index / horizontal) * height
        return (
          <rect
            key={index}
            x={x}
            y={y}
            width={width}
            height={height}
            className={cn(
              "fill-transparent stroke-gray-400/30 transition-colors duration-150 ease-in-out hover:fill-gray-300/30",
              squaresClassName
            )}
          />
        )
      })}
    </svg>
  )
}
