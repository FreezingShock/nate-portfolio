import type { SagaId } from "@/lib/fractured-idle/sagas";

// A tiny hand-off so other tabs can open the Level page on a particular view or saga
// (the Farm tab's saga card, the notices, the Skills tab). The Level tab reads it once on mount.

export type LevelView = "chapters" | "sagas" | "timeline" | "sources" | "badges";

let want: { view: LevelView; saga?: SagaId } | null = null;
export const wantLevel = (view: LevelView, saga?: SagaId) => {
    want = { view, saga };
};
export const takeLevelWant = () => {
    const w = want;
    want = null;
    return w;
};
