// A tiny hand-off so other tabs (goals, notices, the old tab ids) can open the Prestige page on a given view.
// The Prestige tab reads it once when it opens.

export type PrestigeView = "overview" | "rebirth" | "ascension" | "transcend" | "milestones" | "auto";

let want: PrestigeView | null = null;
export const wantPrestige = (view: PrestigeView) => {
    want = view;
};
export const takePrestigeWant = () => {
    const w = want;
    want = null;
    return w;
};
