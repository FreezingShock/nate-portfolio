// Tiny shared mailbox between the big button and the skill dock: things that
// happen on a click that have no other event (Arcane Dust finds). The mining and
// farming events come from onSwing (mine.ts) and onWater (farm.ts).

export const dockBus = {
    dust: { t: 0, n: 0 },
    crit: { t: 0 },
};
