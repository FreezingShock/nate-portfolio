import type { ComponentPropsWithoutRef } from "react"

import { cn } from "@/lib/utils"

interface MarqueeProps extends ComponentPropsWithoutRef<"div"> {
  /** Reverse the scroll direction. */
  reverse?: boolean
  /** Pause the scroll while the pointer is over it. */
  pauseOnHover?: boolean
  vertical?: boolean
  /** How many copies of the children to render (enough to fill the width). */
  repeat?: number
}

// Magic UI Marquee: the children are repeated and each copy slides by exactly
// its own width (the `marquee` keyframes in globals.css), so the loop is
// seamless. Pure CSS transform animation — cheap, and no JS runs while it
// scrolls. Tune speed with `[--duration:..]` and spacing with `[--gap:..]`.
export function Marquee({
  className,
  reverse = false,
  pauseOnHover = false,
  children,
  vertical = false,
  repeat = 4,
  ...props
}: MarqueeProps) {
  return (
    <div
      {...props}
      className={cn(
        "group flex overflow-hidden p-2 [--duration:40s] [--gap:1rem] [gap:var(--gap)]",
        vertical ? "flex-col" : "flex-row",
        className
      )}
    >
      {Array.from({ length: repeat }).map((_, i) => (
        <div
          key={i}
          aria-hidden={i > 0}
          className={cn(
            "flex shrink-0 justify-around [gap:var(--gap)]",
            vertical ? "animate-marquee-vertical flex-col" : "animate-marquee flex-row",
            pauseOnHover && "group-hover:[animation-play-state:paused]",
            reverse && "[animation-direction:reverse]"
          )}
        >
          {children}
        </div>
      ))}
    </div>
  )
}
