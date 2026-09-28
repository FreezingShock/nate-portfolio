"use client"

import React, { useEffect, useRef, type PropsWithChildren } from "react"
import { cva, type VariantProps } from "class-variance-authority"
import {
  motion,
  MotionValue,
  useMotionValue,
  useSpring,
  useTransform,
} from "motion/react"
import type { MotionProps } from "motion/react"

import { cn } from "@/lib/utils"

export interface DockProps extends VariantProps<typeof dockVariants> {
  className?: string
  iconSize?: number
  iconMagnification?: number
  disableMagnification?: boolean
  iconDistance?: number
  direction?: "top" | "middle" | "bottom"
  children: React.ReactNode
}

const DEFAULT_SIZE = 40
const DEFAULT_MAGNIFICATION = 60
const DEFAULT_DISTANCE = 140
const DEFAULT_DISABLEMAGNIFICATION = false

const dockVariants = cva(
  "mx-auto mt-8 flex h-[58px] w-max items-center justify-center gap-2 rounded-2xl p-2"
)

const Dock = React.forwardRef<HTMLDivElement, DockProps>(
  (
    {
      className,
      children,
      iconSize = DEFAULT_SIZE,
      iconMagnification = DEFAULT_MAGNIFICATION,
      disableMagnification = DEFAULT_DISABLEMAGNIFICATION,
      iconDistance = DEFAULT_DISTANCE,
      direction = "middle",
      ...props
    },
    ref
  ) => {
    const mouseX = useMotionValue(Infinity)

    const renderChildren = () => {
      return React.Children.map(children, (child) => {
        if (
          React.isValidElement<DockIconProps>(child) &&
          child.type === DockIcon
        ) {
          return React.cloneElement(child, {
            ...child.props,
            mouseX: mouseX,
            size: iconSize,
            magnification: iconMagnification,
            disableMagnification: disableMagnification,
            distance: iconDistance,
          })
        }
        return child
      })
    }

    return (
      <motion.div
        ref={ref}
        onMouseMove={(e) => mouseX.set(e.pageX)}
        onMouseLeave={() => mouseX.set(Infinity)}
        {...props}
        className={cn(dockVariants({ className }), {
          "items-start": direction === "top",
          "items-center": direction === "middle",
          "items-end": direction === "bottom",
        })}
      >
        {renderChildren()}
      </motion.div>
    )
  }
)

Dock.displayName = "Dock"

export interface DockIconProps extends Omit<
  MotionProps & React.HTMLAttributes<HTMLDivElement>,
  "children"
> {
  size?: number
  magnification?: number
  disableMagnification?: boolean
  distance?: number
  mouseX?: MotionValue<number>
  className?: string
  children?: React.ReactNode
  props?: PropsWithChildren
}

const DockIcon = ({
  size = DEFAULT_SIZE,
  magnification = DEFAULT_MAGNIFICATION,
  disableMagnification,
  distance = DEFAULT_DISTANCE,
  mouseX,
  className,
  children,
  style,
  ...props
}: DockIconProps) => {
  const ref = useRef<HTMLDivElement>(null)
  const defaultMouseX = useMotionValue(Infinity)

  // Cached instead of read inside the mousemove-driven transform below.
  // getBoundingClientRect() forces the browser to flush any pending layout
  // work synchronously — calling it once per icon on EVERY mousemove event
  // (7 icons × however many events a mouse fires per second) is a classic
  // layout-thrashing pattern, and combined with the old width/height-based
  // magnification (see below) it was almost certainly the real cause of the
  // reported freezing and the "have to click twice" symptom: a click's
  // mouseup can land on a different element than its mousedown if the box
  // is still mid-resize between the two. Recomputed only on mount and on
  // resize, never on every pointer move.
  const bounds = useRef({ x: 0, width: size })
  useEffect(() => {
    const measure = () => {
      if (!ref.current) return
      const rect = ref.current.getBoundingClientRect()
      bounds.current = { x: rect.x, width: rect.width }
    }
    measure()
    window.addEventListener("resize", measure)
    return () => window.removeEventListener("resize", measure)
  }, [])

  const distanceCalc = useTransform(mouseX ?? defaultMouseX, (val: number) => {
    return val - bounds.current.x - bounds.current.width / 2
  })

  const targetScale = disableMagnification ? 1 : magnification / size

  const scaleTransform = useTransform(
    distanceCalc,
    [-distance, 0, distance],
    [1, targetScale, 1]
  )

  // Snappier settle (higher stiffness, more damping) than the MagicUI
  // default — the floaty original spring made rapid clicking between pages
  // feel laggy since each icon kept animating size for a while after the
  // cursor had already moved on.
  const scale = useSpring(scaleTransform, {
    mass: 0.1,
    stiffness: 300,
    damping: 25,
  })

  // Magnification animates `scale` (a compositor-only transform), not
  // `width`/`height`. The old version animated width/height directly, which
  // are LAYOUT properties — every spring tick forced the browser to reflow
  // and repaint the whole row (and everything visually behind the
  // liquid-glass backdrop-filter/SVG-distortion Dock, which is expensive to
  // repaint) on every single animation frame, for as long as the spring
  // kept settling. `scale` only ever touches compositing, never triggers
  // layout, and never moves what the mouse is actually over mid-animation —
  // the fixed-size box below is real hit-testing area from the very first
  // frame, it just visually grows on top of its neighbors instead of
  // physically pushing them apart.
  return (
    <motion.div
      ref={ref}
      style={{ width: size, height: size, scale, ...style }}
      className={cn(
        "flex aspect-square cursor-pointer items-center justify-center rounded-full p-2",
        disableMagnification && "hover:bg-muted-foreground transition-colors",
        className
      )}
      {...props}
    >
      <div>{children}</div>
    </motion.div>
  )
}

DockIcon.displayName = "DockIcon"

export { Dock, DockIcon, dockVariants }
