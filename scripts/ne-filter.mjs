// Which Natural Earth Admin-0 features count as playable countries, shared by
// build-outlines.mjs and build-neighbors.mjs so both use the same set.

// Disputed zones, bases, buffer zones and unnamed-ISO oddities are not
// guessable countries.
export const EXCLUDE = new Set([
    "Baikonur", "Brazilian I.", "Indian Ocean Ter.", "Coral Sea Is.",
    "Ashmore and Cartier Is.", "Dhekelia", "Akrotiri", "Somaliland",
    "N. Cyprus", "Cyprus U.N. Buffer Zone", "USNB Guantanamo Bay",
    "Siachen Glacier", "Southern Patagonian Ice Field", "Bir Tawil",
    "Spratly Is.", "Bajo Nuevo Bank", "Serranilla Bank", "Scarborough Reef",
]);

/** ISO alpha-2 code for a feature's properties, or null if it has none. */
export function codeOf(p) {
    if (EXCLUDE.has(p.NAME)) return null;
    if (p.ISO_A2_EH !== "-99") return p.ISO_A2_EH;
    if (p.ISO_A2 !== "-99") return p.ISO_A2;
    return null;
}
