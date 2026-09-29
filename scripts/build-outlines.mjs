// Builds lib/data/outlines.json for the Outline Guesser.
//
// Source: Natural Earth 1:10m Admin 0 Countries (public domain,
// naturalearthdata.com). Every sovereign country plus inhabited/islands
// territories with an ISO code. For each one this script:
//   1. picks the "main" landmass (largest polygon) and keeps nearby parts
//      (so France is the mainland, not French Guiana too),
//   2. projects it with a conic equal-area projection centred on it (polar
//      azimuthal near the poles) and fits it to a 100x100 box,
//   3. simplifies the rings and writes one compact SVG path per country,
//   4. records a centroid (largest landmass) for distance and bearing.
//
// Get the data: https://github.com/nvkelso/natural-earth-vector (geojson/ne_10m_admin_0_countries.geojson)
// Run:  node scripts/build-outlines.mjs <path-to-ne_10m_admin_0_countries.geojson>

import fs from "node:fs";
import {
    geoArea,
    geoAzimuthalEqualArea,
    geoBounds,
    geoCentroid,
    geoConicEqualArea,
    geoDistance,
} from "d3-geo";

const src = process.argv[2];
if (!src) throw new Error("Pass the Natural Earth GeoJSON path.");
const data = JSON.parse(fs.readFileSync(src, "utf8"));

// Disputed zones, bases, buffer zones and unnamed-ISO oddities are not
// guessable countries.
const EXCLUDE = new Set([
    "Baikonur", "Brazilian I.", "Indian Ocean Ter.", "Coral Sea Is.",
    "Ashmore and Cartier Is.", "Dhekelia", "Akrotiri", "Somaliland",
    "N. Cyprus", "Cyprus U.N. Buffer Zone", "USNB Guantanamo Bay",
    "Siachen Glacier", "Southern Patagonian Ice Field", "Bir Tawil",
    "Spratly Is.", "Bajo Nuevo Bank", "Serranilla Bank", "Scarborough Reef",
]);

const NAME_FIX = {
    "United States of America": "United States",
    "Dem. Rep. Congo": "DR Congo",
    "Democratic Republic of the Congo": "DR Congo",
    "Republic of the Congo": "Republic of the Congo",
    "Czech Republic": "Czechia",
    "eSwatini": "Eswatini",
    "Swaziland": "Eswatini",
    "Macedonia": "North Macedonia",
    "People's Republic of China": "China",
    "The Bahamas": "Bahamas",
    "The Gambia": "Gambia",
    "Federated States of Micronesia": "Micronesia",
    "East Timor": "Timor-Leste",
    "Cape Verde": "Cabo Verde",
    "Åland": "Åland Islands",
    "French Southern and Antarctic Lands": "French Southern Territories",
    "Palestine": "Palestine",
};

// Difficulty tier: 0 easy, 1 medium, 2 hard, 3 expert. Mostly by population
// (how well known a place is), with a few well-known outliers nudged.
const TIER_OVERRIDE = {
    AQ: 0, NZ: 0, GL: 1, IE: 1, IL: 1, IS: 1, SG: 1, HK: 1, PR: 2, CY: 2,
};
const tierOf = (code, pop) =>
    TIER_OVERRIDE[code] ??
    (pop >= 25e6 ? 0 : pop >= 5e6 ? 1 : pop >= 5e5 ? 2 : 3);

const rad = Math.PI / 180;
const toKm = 6371;

function polygonsOf(geometry) {
    return geometry.type === "Polygon"
        ? [geometry.coordinates]
        : geometry.coordinates;
}
const asFeature = (coordinates) => ({
    type: "Polygon",
    coordinates,
});

// Douglas-Peucker on an open point list.
function dp(points, tol) {
    if (points.length < 3) return points;
    const keep = new Uint8Array(points.length);
    keep[0] = keep[points.length - 1] = 1;
    const stack = [[0, points.length - 1]];
    while (stack.length) {
        const [a, b] = stack.pop();
        let max = 0;
        let idx = -1;
        const [ax, ay] = points[a];
        const [bx, by] = points[b];
        const dx = bx - ax;
        const dy = by - ay;
        const len = Math.hypot(dx, dy) || 1e-9;
        for (let i = a + 1; i < b; i++) {
            const d =
                Math.abs(dy * points[i][0] - dx * points[i][1] + bx * ay - by * ax) / len;
            if (d > max) {
                max = d;
                idx = i;
            }
        }
        if (max > tol && idx > 0) {
            keep[idx] = 1;
            stack.push([a, idx], [idx, b]);
        }
    }
    return points.filter((_, i) => keep[i]);
}

// A closed ring has coincident endpoints, which breaks Douglas-Peucker's
// baseline: split it at the point farthest from the start first.
function simplifyRing(ring, tol) {
    const pts = ring.slice(0, -1);
    if (pts.length < 4) return pts;
    let far = 1;
    let best = 0;
    for (let i = 1; i < pts.length; i++) {
        const d = Math.hypot(pts[i][0] - pts[0][0], pts[i][1] - pts[0][1]);
        if (d > best) {
            best = d;
            far = i;
        }
    }
    const a = dp(pts.slice(0, far + 1), tol);
    const b = dp([...pts.slice(far), pts[0]], tol);
    return [...a, ...b.slice(1, -1)];
}

const out = [];
for (const f of data.features) {
    const p = f.properties;
    if (EXCLUDE.has(p.NAME)) continue;
    const code = p.ISO_A2_EH !== "-99" ? p.ISO_A2_EH : p.ISO_A2 !== "-99" ? p.ISO_A2 : null;
    if (!code || !f.geometry) continue;

    const polys = polygonsOf(f.geometry).map((coordinates) => ({
        coordinates,
        area: geoArea(asFeature(coordinates)),
    }));
    polys.sort((a, b) => b.area - a.area);
    const main = polys[0];
    const mainCentroid = geoCentroid(asFeature(main.coordinates));

    // Scale to the real landmass: keep the main island plus big neighbours
    // (large countries) or close neighbours (island nations), so the main
    // shape always fills the frame instead of shrinking to fit far outliers.
    const mainKm2 = main.area * toKm * toKm;
    const kept = polys.filter((q) => {
        if (q === main) return true;
        const d =
            geoDistance(mainCentroid, geoCentroid(asFeature(q.coordinates))) / rad;
        if (mainKm2 > 20000) {
            return (
                (q.area >= main.area * 0.1 && d < 40) ||
                (q.area >= main.area * 0.02 && d < 6)
            );
        }
        return d < 4 && q.area >= main.area * 0.03;
    });
    // Project `drawSet` with a projection fitted to `fitSet` (100x100 box).
    // `clip` drops polygons that fall outside the box.
    const layout = (fitSet, drawSet, clip) => {
        const multi = {
            type: "MultiPolygon",
            coordinates: fitSet.map((q) => q.coordinates),
        };
        const [[, s], [, n]] = geoBounds(multi);
        const [cLon, cLat] = geoCentroid(multi);
        let projection;
        if (Math.abs(cLat) > 68) {
            projection = geoAzimuthalEqualArea().rotate([
                -cLon,
                -Math.sign(cLat) * 90,
            ]);
        } else {
            const lo = Math.min(s, n);
            const hi = Math.max(s, n);
            const span = hi - lo;
            projection = geoConicEqualArea()
                .rotate([-cLon, 0])
                .parallels([lo + span / 6, hi - span / 6]);
        }
        projection.fitExtent(
            [
                [5, 5],
                [95, 95],
            ],
            multi
        );
        const pts = fitSet.flatMap((q) =>
            q.coordinates[0].map((c) => projection(c))
        );
        const xs = pts.map((q) => q[0]);
        const ys = pts.map((q) => q[1]);
        const ox = 50 - (Math.min(...xs) + Math.max(...xs)) / 2;
        const oy = 50 - (Math.min(...ys) + Math.max(...ys)) / 2;

        const rings = [];
        let mainSize = 0;
        for (const q of drawSet) {
            const group = [];
            q.coordinates.forEach((ring, ri) => {
                const pr = ring.map((c) => {
                    const [x, y] = projection(c);
                    return [x + ox, y + oy];
                });
                const rx = pr.map((t) => t[0]);
                const ry = pr.map((t) => t[1]);
                const size = Math.hypot(
                    Math.max(...rx) - Math.min(...rx),
                    Math.max(...ry) - Math.min(...ry)
                );
                if (q === main && ri === 0) mainSize = size;
                group.push({
                    pr,
                    size,
                    hole: ri > 0,
                    main: q === main && ri === 0,
                    inside:
                        Math.min(...rx) > 1 && Math.max(...rx) < 99 &&
                        Math.min(...ry) > 1 && Math.max(...ry) < 99,
                });
            });
            if (clip && q !== main && !group[0].inside) continue;
            rings.push(...group);
        }
        return { rings, mainSize };
    };

    // If far-flung parts shrink the main landmass to a speck, fit to the
    // main landmass alone and keep only neighbours that land inside the box.
    let { rings, mainSize } = layout(kept, kept, false);
    if (mainSize < (mainKm2 > 20000 ? 8 : 40)) ({ rings } = layout([main], kept, true));

    // Drop specks (but always keep the main landmass), cap ring count.
    const filtered = rings
        .filter((r) => r.main || r.size >= (r.hole ? 2 : 0.5))
        .sort((a, b) => b.size - a.size)
        .slice(0, 160);

    const d = filtered
        .map((r) => {
            const simp = simplifyRing(r.pr, 0.18);
            if (simp.length < 3) return "";
            return (
                "M" +
                simp.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L") +
                "Z"
            );
        })
        .join("");
    if (!d) continue;

    const [lon, lat] = mainCentroid;
    const name = NAME_FIX[p.NAME_EN] ?? p.NAME_EN ?? p.NAME;
    out.push({
        c: code,
        n: name,
        k: p.CONTINENT,
        t: tierOf(code, p.POP_EST ?? 0),
        lat: +lat.toFixed(3),
        lon: +lon.toFixed(3),
        d,
    });
}

// Codes must be unique (a few territories share one in Natural Earth).
const seen = new Set();
const unique = out.filter((c) => {
    if (seen.has(c.c)) return false;
    seen.add(c.c);
    return true;
});
unique.sort((a, b) => a.c.localeCompare(b.c));

fs.mkdirSync("lib/data", { recursive: true });
fs.writeFileSync("lib/data/outlines.json", JSON.stringify(unique));
console.log(
    `${unique.length} countries, ${(fs.statSync("lib/data/outlines.json").size / 1024).toFixed(0)} KB`
);
void toKm;
