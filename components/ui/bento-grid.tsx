import { type ComponentPropsWithoutRef, type ReactNode } from "react"
import Link from "next/link"

import { cn } from "@/lib/utils"
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button"

interface BentoGridProps extends ComponentPropsWithoutRef<"div"> {
  children: ReactNode
  className?: string
}

interface BentoCardProps extends ComponentPropsWithoutRef<"div"> {
  name: string
  className: string
  background: ReactNode
  Icon: React.ElementType
  description: string
  href: string
  cta: string
  // Themes the icon and the CTA button to whatever section this card
  // belongs to (e.g. aqua for Projects, gold for Renovations) instead of
  // a flat neutral gray for every card everywhere.
  accentColor?: string
}

const BentoGrid = ({ children, className, ...props }: BentoGridProps) => {
  return (
    <div
      className={cn(
        "grid w-full auto-rows-[22rem] grid-cols-3 gap-4",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

const BentoCard = ({
  name,
  className,
  background,
  Icon,
  description,
  href,
  cta,
  accentColor = "var(--primary)",
  ...props
}: BentoCardProps) => (
  <div
    key={name}
    className={cn(
      "group relative col-span-3 flex flex-col overflow-hidden rounded-xl",
      // light styles
      "bg-background [box-shadow:0_0_0_1px_rgba(0,0,0,.03),0_2px_4px_rgba(0,0,0,.05),0_12px_24px_rgba(0,0,0,.05)]",
      // dark styles
      "dark:bg-background transform-gpu dark:[box-shadow:0_-20px_80px_-20px_#ffffff1f_inset] dark:[border:1px_solid_rgba(255,255,255,.1)]",
      className
    )}
    {...props}
  >
    <div>{background}</div>
    <div className="flex h-full flex-col p-4">
      <div className="pointer-events-none z-10 flex flex-1 transform-gpu flex-col gap-1 transition-all duration-300 lg:group-hover:-translate-y-2">
        <Icon
          className="h-12 w-12 origin-left transform-gpu transition-all duration-300 ease-in-out group-hover:scale-75"
          style={{ color: accentColor }}
        />
        <h3 className="font-serif text-xl font-semibold text-neutral-700 dark:text-neutral-300">
          {name}
        </h3>
        <p className="max-w-lg text-neutral-400">{description}</p>
      </div>

      {/* mt-auto pins this to the bottom of the flex column consistently
          regardless of description length (was previously two duplicate
          CTA rows that showed up at inconsistent heights — see git history
          on this file). The whole button, not just a text link, is the
          click target now. */}
      <div className="pointer-events-auto mt-auto flex w-full border-t border-border/40 pt-3">
        <Link href={href} tabIndex={-1}>
          <InteractiveHoverButton
            accentColor={accentColor}
            className="text-xs"
          >
            {cta}
          </InteractiveHoverButton>
        </Link>
      </div>
    </div>

    <div className="pointer-events-none absolute inset-0 transform-gpu transition-all duration-300 group-hover:bg-black/3 group-hover:dark:bg-neutral-800/10" />
  </div>
)

export { BentoCard, BentoGrid }
