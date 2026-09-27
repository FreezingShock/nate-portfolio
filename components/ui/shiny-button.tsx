"use client"

import React from "react"
import { motion, type MotionProps } from "motion/react"

import { cn } from "@/lib/utils"

const animationProps: MotionProps = {
  initial: { "--x": "100%", scale: 0.8 },
  animate: { "--x": "-100%", scale: 1 },
  whileTap: { scale: 0.95 },
  transition: {
    repeat: Infinity,
    repeatType: "loop",
    repeatDelay: 1,
    type: "spring",
    stiffness: 20,
    damping: 15,
    mass: 2,
    scale: {
      type: "spring",
      stiffness: 200,
      damping: 5,
      mass: 0.5,
    },
  },
}

interface ShinyButtonProps
  extends
    Omit<React.HTMLAttributes<HTMLElement>, keyof MotionProps>,
    MotionProps {
  children: React.ReactNode
  className?: string
  // Stock MagicUI hardcodes `var(--primary)` for the shine sweep/glow —
  // parameterized here so a caller can theme it to something else (e.g. a
  // page's own Minecraft accent) instead of always the site's brand color.
  accentColor?: string
}

export const ShinyButton = React.forwardRef<
  HTMLButtonElement,
  ShinyButtonProps
>(({ children, className, accentColor = "var(--primary)", ...props }, ref) => {
  return (
    <motion.button
      ref={ref}
      className={cn(
        "relative cursor-pointer rounded-lg border px-6 py-2 font-medium backdrop-blur-xl transition-shadow duration-300 ease-in-out hover:shadow",
        className
      )}
      style={
        {
          "--shine-accent": accentColor,
          borderColor: `color-mix(in oklch, ${accentColor} 40%, transparent)`,
          backgroundImage: `radial-gradient(circle at 50% 0%, color-mix(in oklch, ${accentColor} 12%, transparent) 0%, transparent 60%)`,
        } as React.CSSProperties
      }
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 0 20px color-mix(in oklch, ${accentColor} 25%, transparent)`
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.boxShadow = ""
      }}
      {...animationProps}
      {...props}
    >
      <span
        className="relative block size-full text-sm font-semibold tracking-wide text-[rgb(0,0,0,85%)] dark:text-[rgb(255,255,255,90%)]"
        style={{
          maskImage:
            "linear-gradient(-75deg,var(--shine-accent) calc(var(--x) + 20%),transparent calc(var(--x) + 30%),var(--shine-accent) calc(var(--x) + 100%))",
        }}
      >
        {children}
      </span>
      <span
        style={{
          mask: "linear-gradient(rgb(0,0,0), rgb(0,0,0)) content-box exclude,linear-gradient(rgb(0,0,0), rgb(0,0,0))",
          WebkitMask:
            "linear-gradient(rgb(0,0,0), rgb(0,0,0)) content-box exclude,linear-gradient(rgb(0,0,0), rgb(0,0,0))",
          backgroundImage:
            "linear-gradient(-75deg,color-mix(in oklch,var(--shine-accent) 10%,transparent) calc(var(--x)+20%),color-mix(in oklch,var(--shine-accent) 50%,transparent) calc(var(--x)+25%),color-mix(in oklch,var(--shine-accent) 10%,transparent) calc(var(--x)+100%))",
        }}
        className="absolute inset-0 z-10 block rounded-[inherit] p-px"
      />
    </motion.button>
  )
})

ShinyButton.displayName = "ShinyButton"
