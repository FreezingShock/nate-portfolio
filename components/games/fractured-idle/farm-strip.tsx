"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { McSymbol } from "@/components/mc-symbol";
import type { State } from "@/lib/fractured-idle/data";
import { CROP_BY_ID, bumperLen, bumperMult, hoeOf, onWater, plotReady, type WaterOut } from "@/lib/fractured-idle/farm";

// The Farming twin of the Mining strip: on every tab, under the big button, so a
// press that waters the garden is visible on a phone where the Farm tab is far
// down the page. Shows the plot just watered, how many are ripe, and the Bloom meter.

export function FarmStrip({ s, onOpen }: { s: State; onOpen: () => void }) {
    const last = useRef<WaterOut | null>(null);
    useEffect(() => onWater((e) => (last.current = e)), []);
    const f = s.farm;
    const bump = f.bumper > 0;
    const ripe = f.plots.filter((p) => plotReady(s, p)).length;
    const lo = last.current;
    const crop = lo && lo.crop ? CROP_BY_ID[lo.crop] : null;
    return (
        <button
            type="button"
            onClick={onOpen}
            className="fi-ms fi-fs"
            data-rush={bump}
            style={{ ["--pc" as string]: hoeOf(s).color } as CSSProperties}
            aria-label={`Open the Farm. ${ripe} plots ripe. ${bump ? `Bumper Crop, ${f.bumper} harvests left` : `Bloom ${Math.floor(f.bloom * 100)} percent to a Bumper Crop`}`}
        >
            <span className="fi-ms-i">
                <McSymbol name="fortune" />
            </span>
            <span className="fi-ms-b">
                <span className="fi-ms-t">
                    {bump ? <b className="rush">BUMPER CROP x{bumperMult(s).toFixed(1)} · {f.bumper} left</b> : ripe > 0 ? <><b style={{ color: "#9be04a" }}>{ripe} ripe</b> in the garden</> : crop ? <>Watered <b style={{ color: crop.color }}>{crop.name}</b></> : <>Every press waters a plot</>}
                </span>
                <span className="fi-ms-bar">
                    <i style={{ width: `${(bump ? f.bumper / bumperLen(s) : f.bloom) * 100}%` }} />
                </span>
            </span>
            <span className="fi-ms-go">Farm ▸</span>
        </button>
    );
}

export const FARM_STRIP_CSS = `
.fi-fs{border-color:color-mix(in oklch,#9be04a 38%,transparent);background:linear-gradient(120deg,color-mix(in oklch,#9be04a 10%,transparent),transparent 75%)}
.fi-fs:hover{background:linear-gradient(120deg,color-mix(in oklch,#9be04a 18%,transparent),transparent 75%)}
.fi-fs .fi-ms-bar i{background:linear-gradient(90deg,#5aa02a,#9be04a)}
.fi-fs[data-rush="true"] .fi-ms-bar i{background:linear-gradient(90deg,#ffb020,#ffe066)}
.fi-fs .fi-ms-go{color:#9be04a}
`;
