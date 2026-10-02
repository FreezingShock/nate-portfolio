import type { McSymbolName } from "@/components/mc-symbol";
import type { CropKind } from "@/lib/fractured-idle/farm";

/** One icon per kind of crop (and so per tool line). */
export const KIND_ICON_MAP: Record<CropKind, McSymbolName> = { stalk: "sunburst", root: "spade", fruit: "scissors", fungus: "atom", bloom: "blossom" };
