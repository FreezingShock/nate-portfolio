import type { TimelineEventData } from "@/components/timeline-event";
import { TimelineEvent } from "@/components/timeline-event";

export interface TimelinePhaseData {
    id: string;
    title: string;
    description: string;
    timeline: string;
    color: string;
    icon?: string;
    events: TimelineEventData[];
}

export function TimelinePhase({ phase }: { phase: TimelinePhaseData }) {
    return (
        <div className="mb-16 scroll-mt-24" id={phase.id}>
            {/* Phase header */}
            <div className="mb-8 border-b border-border/40 pb-6">
                <p
                    className="text-sm font-semibold uppercase tracking-widest"
                    style={{ color: phase.color }}
                >
                    {phase.timeline}
                </p>
                <h2
                    className="mt-3 font-rubik text-3xl font-bold sm:text-4xl"
                    style={{ color: phase.color }}
                >
                    {phase.title}
                </h2>
                <p className="mt-3 max-w-2xl text-base text-muted-foreground">
                    {phase.description}
                </p>
            </div>

            {/* Phase timeline */}
            <div className="relative border-l-2 pl-6 sm:pl-8">
                <div
                    className="absolute left-0 top-0 h-full w-0.5 -translate-x-1/2 opacity-30"
                    style={{ backgroundColor: phase.color }}
                />

                <div className="space-y-8">
                    {phase.events.map((event, idx) => (
                        <TimelineEvent
                            key={event.id}
                            event={event}
                            isExpanded={event.type === "major" && idx === 0}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
