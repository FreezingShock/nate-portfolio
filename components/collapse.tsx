import { cn } from "@/lib/utils";

// Animated show/hide panel. The height transition is a CSS grid-rows change
// (0fr <-> 1fr), so it animates to the content's real height with no JS
// measuring and no animation library; opacity rides along. `inert` takes the
// collapsed content out of the tab order and away from screen readers.
export function Collapse({
    open,
    children,
    className,
    bleed = false,
    id,
}: {
    open: boolean;
    children: React.ReactNode;
    className?: string;
    /** Let card shadows/glows spill ~24px past the edges instead of being clipped. */
    bleed?: boolean;
    id?: string;
}) {
    return (
        <div
            id={id}
            className={cn(
                "grid transition-[grid-template-rows,opacity] duration-300 ease-out",
                open
                    ? "grid-rows-[1fr] opacity-100"
                    : "grid-rows-[0fr] opacity-0",
                className
            )}
            inert={!open}
        >
            <div
                className={cn(
                    "min-h-0",
                    bleed
                        ? "[overflow-clip-margin:1.5rem] [overflow:clip]"
                        : "overflow-hidden"
                )}
            >
                {children}
            </div>
        </div>
    );
}
