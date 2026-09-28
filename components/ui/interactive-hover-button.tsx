import { ArrowRight } from "lucide-react"

import { cn } from "@/lib/utils"

interface InteractiveHoverButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  // Stock MagicUI hardcodes `bg-primary` for the expanding dot — themed
  // per caller instead (e.g. a card's own section accent) so this reads as
  // "this card's button," not always the site's one brand color.
  accentColor?: string
}

export function InteractiveHoverButton({
  children,
  className,
  accentColor = "var(--primary)",
  ...props
}: InteractiveHoverButtonProps) {
  return (
    <button
      className={cn(
        "group bg-background relative w-auto cursor-pointer overflow-hidden rounded-full border p-2 px-6 text-center font-semibold",
        className
      )}
      style={{ borderColor: `color-mix(in oklch, ${accentColor} 40%, transparent)` }}
      {...props}
    >
      <div className="flex items-center justify-center gap-2">
        <div
          className="h-2 w-2 rounded-full transition-all duration-300 group-hover:scale-[100.8]"
          style={{ backgroundColor: accentColor }}
        />
        <span className="inline-block transition-all duration-300 group-hover:translate-x-12 group-hover:opacity-0">
          {children}
        </span>
      </div>
      <div className="absolute top-0 z-10 flex h-full w-full translate-x-12 items-center justify-center gap-2 text-neutral-900 opacity-0 transition-all duration-300 group-hover:-translate-x-5 group-hover:opacity-100">
        <span>{children}</span>
        <ArrowRight className="size-4" />
      </div>
    </button>
  )
}
