// Builds the data behind the Outline Guesser's second round (Neighbours):
//   lib/data/neighbors.json  code -> codes of countries it shares a land border with
//   lib/data/world.topo.json simplified TopoJSON of all countries, shared borders
//
// Neighbours come from the geometry itself: in a TopoJSON topology, a border
// two countries share is ONE arc used by both, so "shares an arc" means "shares
// a land border" (Spain-Morocco at Ceuta and Melilla, France-Brazil in French
// Guiana, and so on), with no hand-kept list. The same shared arcs are why the
// simplified map has no gaps or overlaps between neighbours.
//
// Source: Natural Earth 1:10m Admin 0 Countries (public domain).
// Run:  node scripts/build-neighbors.mjs <path-to-ne_10m_admin_0_countries.geojson>

import fs from "node:fs";
import { topology } from "topojson-server";
import { presimplify, simplify, sphericalTriangleArea } from "topojson-simplify";
import { quantize } from "topojson-client";
import { codeOf } from "./ne-filter.mjs";

const src = process.argv[2];
if (!src) throw new Error("Pass the Natural Earth GeoJSON path.");
const MIN_WEIGHT = Number(process.argv[3] ?? 3e-7); // spherical area, steradians

const raw = JSON.parse(fs.readFileSync(src, "utf8"));
const seen = new Set();
const features = [];
for (const f of raw.features) {
    const code = codeOf(f.properties);
    if (!code || !f.geometry || seen.has(code)) continue;
    seen.add(code);
    features.push({
        type: "Feature",
        id: code,
        properties: {},
        geometry: f.geometry,
    });
}

const topo = topology({ countries: { type: "FeatureCollection", features } });

// Arc -> countries using it (negative indices are reversed arcs: ~i).
const users = new Map();
const collect = (arcs, code) => {
    for (const a of arcs) {
        if (Array.isArray(a)) collect(a, code);
        else {
            const i = a < 0 ? ~a : a;
            if (!users.has(i)) users.set(i, new Set());
            users.get(i).add(code);
        }
    }
};
for (const g of topo.objects.countries.geometries) collect(g.arcs, g.id);

const neighbors = {};
for (const set of users.values()) {
    if (set.size < 2) continue;
    for (const a of set) {
        for (const b of set) {
            if (a === b) continue;
            (neighbors[a] ??= new Set()).add(b);
        }
    }
}
// Borders Natural Earth draws with a sliver of water between the polygons.
for (const [a, b] of [["MO", "CN"]]) {
    (neighbors[a] ??= new Set()).add(b);
    (neighbors[b] ??= new Set()).add(a);
}
const out = {};
for (const code of [...seen].sort()) {
    const list = neighbors[code] ? [...neighbors[code]].sort() : [];
    if (list.length) out[code] = list;
}
fs.writeFileSync("lib/data/neighbors.json", JSON.stringify(out));

// Simplify shared arcs once (Visvalingam), then quantize to keep it small.
const simplified = simplify(
    presimplify(topo, sphericalTriangleArea),
    MIN_WEIGHT
);
const small = quantize(simplified, 1e5);
// Keep only what the client needs: geometry ids and arcs.
small.objects.countries.geometries.forEach((g) => delete g.properties);
fs.writeFileSync("lib/data/world.topo.json", JSON.stringify(small));

const kb = (f) => (fs.statSync(f).size / 1024).toFixed(0);
console.log(
    `${features.length} countries, ${Object.keys(out).length} with neighbours; ` +
        `neighbors.json ${kb("lib/data/neighbors.json")} KB, ` +
        `world.topo.json ${kb("lib/data/world.topo.json")} KB`
);
