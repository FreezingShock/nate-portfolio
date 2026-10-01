"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { Expand, Minimize } from "lucide-react";
import { McSymbol } from "@/components/mc-symbol";
import { HOLD_BASE, critColor, holdMax, lookName, unlockedKeys } from "@/lib/fractured-idle/button";
import { COMBO_TIERS, comboFill, holdRate, newCombo, stepCombo, type ComboCfg } from "@/lib/fractured-idle/combo";
import { activeIsland } from "@/lib/fractured-idle/island-logic";
import { EGGS, LEVEL_BONUS, MINIONS, MINION_GROWTH, PETS, PET_LABEL, PET_PERK_AT, RARITIES, SKILLS, UPGRADES, petLevel, rebirthCost, type SkillId } from "@/lib/fractured-idle/data";
import { DUST_CLICK, DUST_CRIT, PROCS, addDust, canRoll, fmtStat, glintColor, slotOpen, SLOT_IDS } from "@/lib/fractured-idle/enchant";
import { claimMilestones, rewardLine } from "@/lib/fractured-idle/skills";
import {
    addPetXp,
    advance,
    type Derived,
    ascPlan,
    bulk,
    checkTrophies,
    colTiers,
    derive,
    eggPrice,
    fmt,
    income,
    loadGame,
    minionBase,
    rebirthPlan,
    skillLevel,
    upAvailable,
    upCost,
    writeSave,
} from "@/lib/fractured-idle/engine";
import type { State } from "@/lib/fractured-idle/data";
import { GOALS_CSS, Goals } from "./goals";
import { Aura, BTN_CSS, ButtonFace, skinAccent } from "./button-face";
import { SKIN_CSS } from "./button-skins";
import { COMBO_CSS, ComboMeter, type ComboApi } from "./combo-meter";
import { BuffBar, POPUP_CSS, Popups } from "./popups";
import { ISLAND_CSS, IslandScene } from "./island-art";
import { IslandsMenu, MENU_CSS } from "./islands-menu";
import { ISLAND_BY_ID, perkText } from "@/lib/fractured-idle/islands";
import { masteryInfo, openIslands } from "@/lib/fractured-idle/island-logic";
import { FXP_PER_LEVEL, fxpTotal, hasReward, levelColor, levelUpText, prefixOf, recentGains, rewardFor, rewardText, symbolOf, updateFxp } from "@/lib/fractured-idle/fxp";
import { LEVEL_CSS, LevelBadge, XpGain } from "./level-badge";
import { LevelTab } from "./tab-level";
import { kick, shake, spawnBurst, spawnCrit, spawnNumber } from "./button-fx";
import { BUTTON_TAB_CSS, ButtonTab } from "./tab-button";
import { Orbit } from "./orbit";
import { BUY_OPTIONS, CSS, FONT_CSS, IconBtn, Kbd, Stat, tint, type Ctx, type TipApi } from "./ui";
import { MinionsTab } from "./tab-minions";
import { PetsTab } from "./tab-pets";
import { AscensionTab } from "./tab-ascension";
import { UpgradeTip, UpgradesTab } from "./tab-upgrades";
import { TrophiesTab, TrophyTip } from "./tab-trophies";
import { IslandsTab } from "./tab-islands";
import { SkillsTab } from "./tab-skills";
import { ENCH_CSS, EnchantTab } from "./tab-enchant";
import { MINE_CSS, MineTab } from "./tab-mine";
import { FARM_CSS, FarmTab } from "./tab-farm";
import { DOCK_CSS, SkillDock } from "./skill-dock";
import { ButtonDock, BUTTON_DOCK_CSS } from "./button-dock";
import { useCloudSync } from "./cloud-sync";
import { dockBus } from "./dock-bus";
import { farmCtx, water } from "@/lib/fractured-idle/farm";
import { COL_AT, ORES, colTierOf, jobsReady, mineCtx, mineLevel, oreIslands, swing } from "@/lib/fractured-idle/mine";
import { oreNote } from "./mine-fx";
import { CROPS, CROP_BY_ID, COL_AT as CROP_COL_AT, colTierOf as cropTierOf, cropIslands, farmLevel, jobsReady as farmJobsReady, plotReady } from "@/lib/fractured-idle/farm";
import { GLINT_CSS, Glint } from "./enchant-glint";
import { PROC_LABEL, dustPop, procBolt, procEcho, procMidas } from "./enchant-fx";
import { PS_CSS } from "./prestige-shop";
import { TIP_CSS, Tip, TipCard, TipProvider, type TipHost } from "./tooltip";
import { TABBAR_CSS, TabBar, type TabGroup, type TabItem } from "./tab-bar";
import { buildTabNotes, newNoteCache } from "./tab-notes";
import { SKILL_TOAST_CSS, SkillToasts, type SkillToastApi } from "./skill-toasts";
import { STATS_CSS, StatsTab } from "./tab-stats";
import { RebirthTab } from "./tab-rebirth";
import { SettingsTab, SoonTab } from "./tab-misc";

// Fractured Idle: a button-simulator incremental with SkyBlock flavor.
// State lives in a ref and is mutated by the pure functions in
// lib/fractured-idle/engine; a 50ms interval advances the simulation and a
// 100ms re-render keeps the UI live, so clicking never waits on React.
// To add a tab: write a component that takes Ctx and register it in TABS.

type TabId = "minions" | "upgrades" | "button" | "pets" | "islands" | "skills" | "mine" | "farm" | "enchant" | "stats" | "rebirth" | "ascension" | "trophies" | "level" | "soon" | "settings";

const GROUPS: TabGroup[] = [
    { id: "play", label: "Play", color: "var(--mc-aqua)" },
    { id: "world", label: "World", color: "var(--mc-green)" },
    { id: "prog", label: "Progress", color: "var(--mc-yellow)" },
    { id: "sys", label: "More", color: "var(--mc-light-purple)" },
];

const TABS: TabItem<TabId>[] = [
    { id: "minions", label: "Minions", symbol: "forge", group: "play", color: "#ffa940", blurb: "Hire and upgrade minions that earn shards for you." },
    { id: "upgrades", label: "Upgrades", symbol: "strength", group: "play", color: "var(--mc-green)", blurb: "Spend shards on click, minion, combo and popup upgrades." },
    { id: "button", label: "Button", symbol: "speed", group: "play", color: "var(--mc-aqua)", blurb: "Customize your button: shapes, skins, effects and loadouts." },
    { id: "pets", label: "Pets", symbol: "petLuck", group: "play", color: "#ff8fc7", blurb: "Hatch eggs, equip pets and level them." },
    { id: "islands", label: "Islands", symbol: "location", group: "world", color: "#6fb4ff", blurb: "Travel between islands and master their perks." },
    { id: "skills", label: "Skills", symbol: "wisdom", group: "world", color: "var(--mc-yellow)", blurb: "Six skills with milestone rewards." },
    { id: "mine", label: "Mine", symbol: "pick", group: "world", color: "#e0b070", blurb: "Break ore, forge pickaxes, build drills and crack geodes. The Mining skill lives here." },
    { id: "farm", label: "Farm", symbol: "fortune", group: "world", color: "#9be04a", blurb: "Grow crops on real timers, cook them, hire farmhands and open seed pods. The Farming skill lives here." },
    { id: "enchant", label: "Enchant", symbol: "intelligence", group: "world", color: "#c58bff", blurb: "Roll enchants for your button, minions, popups and more." },
    { id: "rebirth", label: "Rebirth", symbol: "portal", group: "prog", color: "var(--mc-red)", blurb: "Reset for tokens and a permanent multiplier." },
    { id: "ascension", label: "Ascension", symbol: "comet", group: "prog", color: "var(--mc-light-purple)", blurb: "The prestige above rebirth." },
    { id: "trophies", label: "Trophies", symbol: "pristine", group: "prog", color: "#ffd24a", blurb: "Permanent bonuses for milestones you hit." },
    { id: "level", label: "Level", symbol: "flag", group: "prog", color: "#7dffb8", blurb: "Your Fractured Level, rewards, badges and prefixes." },
    { id: "stats", label: "Stats", symbol: "check", group: "prog", color: "#a9b8ff", blurb: "Every number behind your income." },
    { id: "soon", label: "Soon", symbol: "night", group: "sys", color: "#9a94b0", blurb: "What is planned next." },
    { id: "settings", label: "Settings", symbol: "defense", group: "sys", color: "#c9c9d6", blurb: "Display, saving, import/export and keys." },
];


const NAMES: Record<string, string> = Object.fromEntries(MINIONS.map((m) => [m.id, m.name.replace(" Minion", "")]));

export function FracturedIdle() {
    const ref = useRef<State | null>(null);
    const [ready, setReady] = useState(false);
    const [, render] = useReducer((x: number) => x + 1, 0);
    const [tab, setTab] = useState<TabId>("minions");
    const [toast, setToast] = useState<string | null>(null);
    const [menu, setMenu] = useState<string | null>(null); // travel map: island id to focus, or closed
    const [isFs, setIsFs] = useState(false);
    const [pseudoFs, setPseudoFs] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const floatRef = useRef<HTMLDivElement>(null);
    const btnRef = useRef<HTMLButtonElement>(null);
    const wrapRef = useRef<HTMLDivElement>(null);
    const meterApi = useRef<ComboApi>(null);
    const noteCache = useRef(newNoteCache());
    const combo = useRef(newCombo());
    const cfgRef = useRef<{ cfg: ComboCfg; at: number }>({ cfg: { max: 2, gain: 1, surge: 0.012, cap: 7 }, at: -1e9 });
    // Everything currently holding the button: pointer ids and "space", with
    // their last position (px, relative to the float layer).
    const held = useRef(new Map<string, { x: number; y: number }>());
    const hold = useRef({ raf: 0, last: 0, acc: 0, heat: 0, shown: 0, tier: -1, flip: false, hit: false });
    const clickFn = useRef<(x?: number, y?: number) => void>(() => {});
    const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const getCombo = useCallback(() => combo.current.mult, []);
    const dRef = useRef<Derived | null>(null); // latest derived stats, for the popup scheduler
    const lastTiers = useRef<number[]>([]);
    const lastLooks = useRef<string[]>([]);
    const lastIslands = useRef<string[]>([]);
    const lastOre = useRef<{ open: string[]; tiers: Record<string, number> }>({ open: [], tiers: {} });
    const lastCrop = useRef<{ open: string[]; tiers: Record<string, number> }>({ open: [], tiers: {} });
    const lastSkills = useRef<Partial<Record<SkillId, number>>>({});
    const skillApi = useRef<SkillToastApi>(null);
    const tipHost = useRef<TipHost | null>(null);

    // The Ctx tooltip API used by the upgrade and trophy lists: ids are resolved to content here and drawn by the shared TipProvider.
    const tip: TipApi = useMemo(
        () => ({
            show: (id, src) =>
                tipHost.current?.show(() => {
                    const st = ref.current;
                    const dd = dRef.current;
                    if (!st || !dd) return null;
                    const f = (n: number) => fmt(n, st.sci);
                    return id.startsWith("t:") ? <TrophyTip id={id.slice(2)} s={st} F={f} /> : <UpgradeTip id={id} s={st} d={dd} F={f} />;
                }, src),
            move: (src) => tipHost.current?.move(src),
            hide: () => tipHost.current?.hide(),
        }),
        [],
    );

    const say = useCallback((msg: string) => {
        if (ref.current?.toasts === false) return;
        setToast(msg);
        clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToast(null), 3500);
    }, []);

    // Dev only: window.__fiToast("level" | "milestone", skillIndex) shows a skill notification without touching your save.
    useEffect(() => {
        if (process.env.NODE_ENV === "production") return;
        const w = window as unknown as { __fiToast?: (kind: "level" | "milestone", i?: number) => void };
        w.__fiToast = (kind, i = 0) => {
            const k = SKILLS[i % SKILLS.length];
            const from = 11 + i;
            skillApi.current?.push({ kind, skill: k, from, to: from + 1, perk: [k.bonus(from), k.bonus(from + 1)], title: kind === "milestone" ? "Test Milestone" : undefined, rewards: kind === "milestone" ? ["+2 rebirth tokens", "+1 Wooden Egg", "+5% luck"] : [] });
        };
        return () => {
            delete w.__fiToast;
        };
    }, []);

    // ---- Load + game loop ----
    useEffect(() => {
        const { state, offline } = loadGame();
        ref.current = state;
        lastTiers.current = colTiers(state);
        lastLooks.current = unlockedKeys(state);
        lastIslands.current = openIslands(state).map((i) => i.id);
        lastOre.current = { open: ORES.filter((o) => mineLevel(state) >= o.need).map((o) => o.id), tiers: Object.fromEntries(ORES.map((o) => [o.id, colTierOf(state.mine.mined[o.id] || 0)])) };
        lastCrop.current = { open: CROPS.filter((c) => farmLevel(state) >= c.need).map((c) => c.id), tiers: Object.fromEntries(CROPS.map((c) => [c.id, cropTierOf(state.farm.grown[c.id] || 0)])) };
        const paid = claimMilestones(state); // milestones already earned are paid quietly
        for (const k of SKILLS) lastSkills.current[k.id] = skillLevel(state[k.id], k.id);
        const loadUps = updateFxp(state, true); // existing progress counts, without flooding the screen
        setReady(true);
        if (loadUps.length) say(levelUpText(state.lvl, loadUps));
        else if (paid.length) say(`Skill milestones paid: ${paid.slice(0, 3).map((p) => p.milestone.name).join(", ")}${paid.length > 3 ? ` and ${paid.length - 3} more` : ""}`);
        if (offline > 0) say(`Welcome back! Your minions earned ${fmt(offline, state.sci)} shards while you were away.`);
        const ready = jobsReady(state);
        if (ready > 0) setTimeout(() => say(`${ready} ${ready === 1 ? "craft is" : "crafts are"} ready in the Forge.`), 3800);
        const ripe = state.farm.plots.filter((p) => plotReady(state, p)).length;
        const oven = farmJobsReady(state);
        if (ripe > 0 || oven > 0) setTimeout(() => say(`${ripe ? `${ripe} ${ripe === 1 ? "plot is" : "plots are"} ripe in the Garden` : ""}${ripe && oven ? " and " : ""}${oven ? `${oven} ${oven === 1 ? "craft is" : "crafts are"} ready in the Kitchen` : ""}.`), 7600);

        let last = performance.now();
        let sinceRender = 0;
        let sinceSave = 0;
        let sinceAch = 0;
        const id = setInterval(() => {
            const s = ref.current;
            if (!s) return;
            const now = performance.now();
            const dt = Math.min((now - last) / 1000, 86400);
            last = now;
            const dd = derive(s);
            dRef.current = dd;
            advance(s, dd, dt);
            sinceRender += dt;
            sinceSave += dt;
            sinceAch += dt;

            if (sinceAch >= 1) {
                sinceAch = 0;
                const fresh = checkTrophies(s);
                if (fresh.length) say(`Trophy unlocked: ${fresh.join(", ")}`);
                const tiers = colTiers(s);
                const up = tiers.findIndex((t, i) => t > (lastTiers.current[i] ?? 0));
                if (up >= 0) say(`${MINIONS[up].name.replace(" Minion", "")} collection tier ${tiers[up]} reached!`);
                lastTiers.current = tiers;
                if (s.rebirths > s.btn.rb) s.btn.rb = s.rebirths;
                const lvUps = updateFxp(s);
                if (lvUps.length) say(levelUpText(s.lvl, lvUps));
                const keys = unlockedKeys(s);
                if (keys.length > lastLooks.current.length) {
                    const fresh = keys.filter((k) => !lastLooks.current.includes(k));
                    say(`New button look: ${fresh.slice(0, 2).map(lookName).join(", ")}${fresh.length > 2 ? ` and ${fresh.length - 2} more` : ""}`);
                }
                lastLooks.current = keys;
                const isl = openIslands(s).map((i) => i.id);
                if (isl.length > lastIslands.current.length) {
                    const fresh = isl.filter((id) => !lastIslands.current.includes(id)).map((id) => ISLAND_BY_ID[id].name);
                    say(`Island unlocked: ${fresh.join(", ")}. Press I to travel.`);
                }
                lastIslands.current = isl;
                // Mining: a new ore opens at some levels, and every ore collection pays at each tier.
                const lo = lastOre.current;
                const nowOpen = ORES.filter((o) => mineLevel(s) >= o.need);
                const newOre = nowOpen.filter((o) => !lo.open.includes(o.id));
                if (newOre.length) {
                    const o = newOre[0];
                    say(`New ore: ${o.name}! Find it on ${oreIslands(o.id).slice(0, 2).map((id) => ISLAND_BY_ID[id]?.name ?? id).join(" or ")}.`);
                }
                lo.open = nowOpen.map((o) => o.id);
                // Farming: a new crop opens at some levels, and every crop collection pays at each tier.
                const lc = lastCrop.current;
                const nowCrops = CROPS.filter((c) => farmLevel(s) >= c.need);
                const newCrop = nowCrops.filter((c) => !lc.open.includes(c.id));
                if (newCrop.length) say(`New crop: ${newCrop[0].name}! It grows on ${cropIslands(newCrop[0].id).slice(0, 2).map((id) => ISLAND_BY_ID[id]?.name ?? id).join(" or ")}.`);
                lc.open = nowCrops.map((c) => c.id);
                for (const c of CROPS) {
                    const tier = cropTierOf(s.farm.grown[c.id] || 0);
                    if (tier > (lc.tiers[c.id] ?? 0) && tier <= CROP_COL_AT.length) say(`${CROP_BY_ID[c.id].name} collection tier ${tier}: +${+(c.col[1] * 100).toFixed(1)}% ${c.colText}!`);
                    lc.tiers[c.id] = tier;
                }
                for (const o of ORES) {
                    const tier = colTierOf(s.mine.mined[o.id] || 0);
                    if (tier > (lo.tiers[o.id] ?? 0) && tier <= COL_AT.length) say(`${o.name} collection tier ${tier}: +${+(o.col[1] * 100).toFixed(1)}% ${o.colText}!`);
                    lo.tiers[o.id] = tier;
                }
            }
            if (sinceSave >= 10) {
                sinceSave = 0;
                writeSave(s);
            }
            if (sinceRender >= 0.1) {
                sinceRender = 0;
                const ups: SkillId[] = [];
                for (const k of SKILLS) {
                    const l = skillLevel(s[k.id], k.id);
                    if (l > (lastSkills.current[k.id] ?? l)) ups.push(k.id);
                }
                if (ups.length) {
                    const paid = claimMilestones(s);
                    for (const id of ups) {
                        const k = SKILLS.find((x) => x.id === id)!;
                        const from = lastSkills.current[id] ?? 0;
                        const to = skillLevel(s[id], id);
                        const ms = paid.filter((p) => p.skill === id).map((p) => p.milestone);
                        skillApi.current?.push({
                            kind: ms.length ? "milestone" : "level",
                            skill: k,
                            from,
                            to,
                            perk: [k.bonus(from), k.bonus(to)],
                            title: ms.map((m) => m.name).join(" · "),
                            rewards: ms.flatMap((m) => m.rewards.map((r) => rewardLine(r, fmtStat))),
                        });
                        lastSkills.current[id] = to;
                    }
                }
                render();
            }
        }, 50);

        const flush = () => ref.current && writeSave(ref.current);
        const onVis = () => document.visibilityState === "hidden" && flush();
        window.addEventListener("beforeunload", flush);
        document.addEventListener("visibilitychange", onVis);
        return () => {
            clearInterval(id);
            flush();
            window.removeEventListener("beforeunload", flush);
            document.removeEventListener("visibilitychange", onVis);
        };
    }, [say]);

    // ---- Fullscreen ----
    useEffect(() => {
        const onFs = () => setIsFs(document.fullscreenElement === rootRef.current);
        document.addEventListener("fullscreenchange", onFs);
        return () => document.removeEventListener("fullscreenchange", onFs);
    }, []);

    const toggleFs = useCallback(async () => {
        const el = rootRef.current;
        if (!el) return;
        if (document.fullscreenElement) {
            await document.exitFullscreen().catch(() => {});
        } else if (pseudoFs) {
            setPseudoFs(false);
        } else if (el.requestFullscreen) {
            await el.requestFullscreen().catch(() => setPseudoFs(true));
        } else {
            setPseudoFs(true); // iOS Safari: no Fullscreen API on elements
        }
    }, [pseudoFs]);

    useEffect(() => {
        document.body.style.overflow = pseudoFs ? "hidden" : "";
        return () => {
            document.body.style.overflow = "";
        };
    }, [pseudoFs]);

    // ---- Clicking ----
    const doClick = (x?: number, y?: number) => {
        const s = ref.current;
        if (!s) return;
        const d = derive(s);
        const crit = Math.random() < d.critChance;
        const v = d.click * s.combo * (crit ? 1 + d.critDmg : 1);
        s.shards += v;
        s.total += v;
        s.clicks += 1;
        // Every press is a swing of the pickaxe: it hits an ore from this island's table, harder with the combo.
        const dug = swing(s, mineCtx(d), { combo: s.combo, crit });
        water(s, { combo: s.combo }); // ...and a drop of water on the garden
        // Button enchant procs: Lightning, Midas Touch and Echo pay a multiple of a plain click.
        let hit: (typeof PROCS)[number] | null = null;
        let procV = 0;
        for (const p of PROCS) {
            if (d.procs[p.id] > 0 && Math.random() < d.procs[p.id]) {
                hit = p;
                procV += d.click * s.combo * p.mult;
            }
        }
        if (procV > 0) {
            s.shards += procV;
            s.total += procV;
        }
        const dustHit = Math.random() < (crit ? DUST_CRIT : DUST_CLICK);
        if (dustHit) {
            addDust(s, d.dustMult);
            dockBus.dust = { t: Date.now(), n: d.dustMult };
        }
        if (s.equip.length) addPetXp(s, 0.4 * d.petXp);
        if (crit) {
            s.crits += 1;
            s.combat += 3 * d.xpMult * d.xpSkill.combat;
        }
        const host = floatRef.current;
        if (s.fx && host && x !== undefined && y !== undefined) {
            const isl = activeIsland(s);
            const accent = skinAccent(s.btn.skin, isl.color);
            const col = critColor(s, accent, s.crits);
            spawnNumber(host, x, y - 12, (crit ? "✦ " : "+") + fmt(v, s.sci), { crit, color: col, accent, style: s.btn.nums });
            spawnBurst(host, s.btn.burst, x, y, accent);
            if (crit) {
                spawnCrit(host, s.btn.crit, x, y, col);
                if (s.btn.shake) shake(host.parentElement, 1);
            }
            if (hit && x !== undefined && y !== undefined) {
                const lab = PROC_LABEL[hit.id];
                if (hit.id === "bolt") procBolt(host, x, y);
                else if (hit.id === "midas") procMidas(host, x, y);
                else procEcho(host, x, y);
                spawnNumber(host, x, y - 36, `${lab.text} +${fmt(procV, s.sci)}`, { crit: true, color: lab.color, accent: lab.color, style: s.btn.nums });
            }
            if (dustHit) dustPop(host, x, y - 4, d.dustMult);
            oreNote(host, x, y, dug, s.btn.nums);
            kick(btnRef.current, crit, hold.current.heat);
            const w = wrapRef.current;
            if (w) {
                const h = hold.current;
                h.hit = !h.hit;
                if (crit) w.style.setProperty("--crit", col);
                w.classList.remove("fi-hit-a", "fi-hit-b", "fi-crit-a", "fi-crit-b");
                w.classList.add(`${crit ? "fi-crit" : "fi-hit"}-${h.hit ? "a" : "b"}`);
            }
        }
    };
    useEffect(() => {
        clickFn.current = doClick;
    });

    // Position in the float layer's coordinates.
    const localPos = (clientX: number, clientY: number) => {
        const r = floatRef.current?.getBoundingClientRect();
        return r ? { x: clientX - r.left, y: clientY - r.top } : { x: 0, y: 0 };
    };
    const buttonCenter = () => {
        const r = wrapRef.current?.getBoundingClientRect();
        return r ? localPos(r.left + r.width / 2, r.top + r.height * 0.42) : { x: 0, y: 0 };
    };

    // Holding: the combo (combo.ts) climbs while anything is held and held
    // clicks speed up with it. The loop keeps running while the combo drains.
    const startHold = () => {
        const h = hold.current;
        if (h.raf) return;
        h.last = performance.now();
        const tick = (now: number) => {
            const st = ref.current;
            const dt = Math.min(0.1, (now - h.last) / 1000);
            h.last = now;
            if (!st) {
                h.raf = 0;
                return;
            }
            const holding = st.btn.hold && held.current.size > 0;
            const cf = cfgRef.current;
            if (now - cf.at > 250) {
                const d = derive(st);
                cf.cfg = { max: d.comboMax, gain: d.comboGain, surge: d.surgeChance, cap: holdMax(st) };
                cf.at = now;
            }
            const cfg = cf.cfg;
            const c = combo.current;
            const events = stepCombo(c, cfg, holding, dt);
            st.combo = c.mult;
            if (c.mult > st.bestCombo) st.bestCombo = c.mult;
            const rate = holdRate(c.mult, HOLD_BASE, cfg.cap);
            if (holding) {
                h.acc += rate * dt;
                let n = 0;
                while (h.acc >= 1 && n < 3) {
                    h.acc -= 1;
                    n++;
                    const pts = [...held.current.entries()];
                    const [id, p] = pts[Math.floor(Math.random() * pts.length)];
                    const cc = id === "space" ? buttonCenter() : p;
                    clickFn.current(cc.x + (id === "space" ? (Math.random() - 0.5) * 50 : 0), cc.y + (id === "space" ? (Math.random() - 0.5) * 30 : 0));
                }
                if (h.acc >= 1) h.acc = 0;
            } else h.acc = 0;

            const fill = comboFill(c.mult, cfg.max);
            h.heat = fill;
            // The glow is a blurred drop-shadow: only repaint it when the combo visibly changes.
            const q = Math.round(fill * 20) / 20;
            const w = wrapRef.current;
            if (w && (q !== h.shown || c.tier !== h.tier)) {
                h.shown = q;
                h.tier = c.tier;
                w.style.setProperty("--heat", q.toFixed(2));
                w.style.setProperty("--tier", COMBO_TIERS[c.tier].color);
            }
            const active = holding || c.t > 0.02;
            meterApi.current?.frame({ mult: c.mult, fill, rate: holding ? rate : 0, active, holding, surge: c.surge, tier: c.tier, atMax: c.atMax });
            for (const e of events) {
                if (e.type === "milestone") meterApi.current?.milestone(e.value);
                else if (e.type === "max") meterApi.current?.max();
                else if (e.type === "surge") meterApi.current?.surge();
            }
            if (active || c.surge > 0) h.raf = requestAnimationFrame(tick);
            else {
                st.combo = 1;
                h.raf = 0;
            }
        };
        h.raf = requestAnimationFrame(tick);
    };
    const press = (id: string, pos: { x: number; y: number }) => {
        const first = held.current.size === 0;
        held.current.set(id, pos);
        if (first) hold.current.acc = 0;
        clickFn.current(pos.x, pos.y);
        startHold();
    };
    const release = (id: string) => {
        held.current.delete(id);
    };

    const onPress = (e: React.PointerEvent<HTMLButtonElement>) => {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        e.preventDefault();
        try {
            e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
            /* synthetic or already released pointer */
        }
        press(`p${e.pointerId}`, localPos(e.clientX, e.clientY));
    };
    const onMove = (e: React.PointerEvent<HTMLButtonElement>) => {
        const id = `p${e.pointerId}`;
        if (held.current.has(id)) held.current.set(id, localPos(e.clientX, e.clientY));
    };
    const onLift = (e: React.PointerEvent<HTMLButtonElement>) => release(`p${e.pointerId}`);

    // Never leave a hold stuck if the window loses focus mid-press.
    useEffect(() => {
        const h = hold.current;
        const clear = () => held.current.clear();
        window.addEventListener("blur", clear);
        document.addEventListener("visibilitychange", clear);
        return () => {
            window.removeEventListener("blur", clear);
            document.removeEventListener("visibilitychange", clear);
            cancelAnimationFrame(h.raf);
            h.raf = 0;
        };
    }, []);

    const replaceState = (n: State) => {
        ref.current = n;
        writeSave(n);
        render();
    };
    useCloudSync(ref, ready, replaceState, say);

    // ---- Keyboard ----
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const t = e.target as HTMLElement | null;
            if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
            if (menu !== null) return; // the travel map owns the keyboard while open
            if (e.code === "Space") {
                e.preventDefault();
                if (!e.repeat) press("space", buttonCenter());
            } else if (e.key === "i" || e.key === "I") {
                setMenu("");
            } else if (e.key === "f" || e.key === "F") {
                toggleFs();
            } else if (e.key === "b" || e.key === "B") {
                const s = ref.current;
                if (s) {
                    const order = [1, 10, 100, -1];
                    s.buy = order[(order.indexOf(s.buy) + 1) % order.length];
                    render();
                }
            } else if (/^[0-9]$/.test(e.key)) {
                const i = (Number(e.key) + 9) % 10;
                if (TABS[i]) setTab(TABS[i].id);
            } else if (e.key === "[" || e.key === "]") {
                setTab((cur) => {
                    const i = TABS.findIndex((x) => x.id === cur);
                    return TABS[(i + (e.key === "]" ? 1 : TABS.length - 1)) % TABS.length].id;
                });
            }
        };
        const onUp = (e: KeyboardEvent) => {
            if (e.code === "Space") release("space");
        };
        window.addEventListener("keydown", onKey);
        window.addEventListener("keyup", onUp);
        return () => {
            window.removeEventListener("keydown", onKey);
            window.removeEventListener("keyup", onUp);
        };
    });

    const s = ref.current;
    if (!ready || !s) {
        return (
            <div className="grid min-h-[70dvh] place-items-center border-y border-white/10 font-minecraft font-bold text-sm text-muted-foreground">
                Loading your islands...
            </div>
        );
    }

    const d = derive(s);
    const island = activeIsland(s);
    const plan = rebirthPlan(s);
    const asc = ascPlan(s);
    const F = (n: number) => fmt(n, s.sci);
    const full = isFs || pseudoFs;
    const totalMinions = s.minions.reduce((a, b) => a + b, 0);

    const act = (fn: () => boolean) => {
        if (fn()) render();
    };
    const ctx: Ctx = { s, d, F, act, render, say, tip };
    const glintOn = s.enc.eq.button && s.enc.opts.glint !== "none" ? { id: s.enc.opts.glint, color: glintColor(s), power: s.enc.eq.button.r } : null;

    // Per-tab notices: drive the badges and the tooltip bodies (see tab-notes.ts).
    const notes = buildTabNotes(s, tab, noteCache.current);

    return (
        <div
            ref={rootRef}
            data-fi-root=""
            className={
                full
                    ? "fixed inset-0 z-[100] flex flex-col overflow-y-auto overscroll-contain bg-background lg:overflow-hidden"
                    : "relative flex flex-col overflow-hidden border-y border-white/15 lg:h-[clamp(780px,calc(100dvh-7.5rem),1500px)]"
            }
            style={{
                backgroundImage: `radial-gradient(ellipse at 25% -10%, ${tint(island.color, 24)}, transparent 60%), radial-gradient(ellipse at 90% 110%, ${tint(island.color, 14)}, transparent 55%)`,
                backgroundColor: "color-mix(in oklch, var(--background) 92%, black)",
            }}
        >
            <style>{CSS}{BTN_CSS}{SKIN_CSS}{BUTTON_TAB_CSS}{COMBO_CSS}{POPUP_CSS}{ISLAND_CSS}{MENU_CSS}{LEVEL_CSS}{ENCH_CSS}{GLINT_CSS}{SKILL_TOAST_CSS}{TABBAR_CSS}{STATS_CSS}{MINE_CSS}{FARM_CSS}{DOCK_CSS}{BUTTON_DOCK_CSS}{GOALS_CSS}{PS_CSS}{TIP_CSS}{FONT_CSS}</style>
            <TipProvider hostRef={tipHost}>

            {/* HUD */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-white/10 px-4 py-3">
                <Tip
                    tip={() => (
                        <TipCard
                            title="Shards"
                            color="var(--mc-aqua)"
                            lines={["The main currency. Spend it on minions and upgrades; rebirth resets it for permanent power."]}
                            rows={[["Lifetime", F(s.total)], ["Best income", `${F(s.peakInc)}/s`]]}
                        />
                    )}
                >
                    <div className="min-w-0">
                        <div className="font-minecraft text-[10px] uppercase tracking-widest text-muted-foreground">Shards</div>
                        <div className="rainbow-text truncate font-minecraft font-bold text-3xl leading-none sm:text-4xl">
                            <McSymbol name="speed" /> {F(s.shards)}
                        </div>
                    </div>
                </Tip>
                <Tip
                    tip={() => {
                        const into = fxpTotal(s) - s.lvl * FXP_PER_LEVEL;
                        let nx = s.lvl + 1;
                        while (nx < s.lvl + 50 && !hasReward(rewardFor(nx))) nx++;
                        const reward = rewardFor(nx);
                        const gains = recentGains(Date.now(), 12000).slice(-3).reverse();
                        return (
                            <TipCard
                                title={`Fractured Level ${s.lvl}`}
                                color={levelColor(s.lvl)}
                                tag={`${Math.floor(into)} / ${FXP_PER_LEVEL} EXP`}
                                lines={["Earn Fracture EXP by unlocking things across every system. Each level adds to all shards."]}
                                rows={[["Bonus", `+${(LEVEL_BONUS * s.lvl * 100).toFixed(2)}% all shards`, "var(--mc-green)"], ["To next level", `${Math.max(0, Math.ceil(FXP_PER_LEVEL - into))} EXP`, "var(--mc-yellow)"]]}
                                notes={[
                                    ...(hasReward(reward) ? [{ text: `Lv ${nx} pays ${rewardText(reward)}`, color: "var(--mc-aqua)" }] : []),
                                    ...gains.map((g) => ({ text: `+${g.xp} EXP · ${g.label}`, color: "var(--mc-yellow)" })),
                                ]}
                                cta="Click to open the Level tab!"
                            />
                        );
                    }}
                >
                <button
                    type="button"
                    onClick={() => {
                        tip.hide();
                        setTab("level");
                    }}
                    className="relative text-left"
                >
                    <div className="font-minecraft text-[10px] uppercase tracking-widest text-muted-foreground">Fractured Level</div>
                    <LevelBadge level={s.lvl} sym={symbolOf(s)} prefix={prefixOf(s)} size="sm" />
                    <div className="mt-1 h-1 w-28 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${((fxpTotal(s) - s.lvl * FXP_PER_LEVEL) / FXP_PER_LEVEL) * 100}%`, backgroundColor: "var(--mc-yellow)", boxShadow: "0 0 6px var(--mc-yellow)" }} />
                    </div>
                    <XpGain now={Date.now()} />
                </button>
                </Tip>
                <Tip
                    tip={() => (
                        <TipCard
                            title="Per second"
                            color="var(--mc-green)"
                            lines={["Shards earned every second without clicking."]}
                            rows={[["Minions", F(d.cps)], ["Auto-clicks", `${d.auto.toFixed(2)}/s x ${F(d.avgClick)}`], ["Combo boost", s.combo > 1.01 ? `+${Math.round((s.combo - 1) * 12)}% while held` : "hold the button"]]}
                        />
                    )}
                >
                    <Stat label="Per second" value={F(income(d))} color="var(--mc-green)" />
                </Tip>
                <Tip
                    tip={() => (
                        <TipCard
                            title="Per click"
                            color="var(--mc-aqua)"
                            lines={["What one plain click is worth right now."]}
                            rows={[["Crit chance", `${Math.round(d.critChance * 100)}%`], ["Crit bonus", `+${Math.round(d.critDmg * 100)}%`], ["Average with crits", F(d.avgClick)], ["Combo", `x${s.combo.toFixed(2)}`]]}
                        />
                    )}
                >
                    <Stat label="Per click" value={F(d.click)} color="var(--mc-aqua)" />
                </Tip>
                <Tip
                    tip={() => (
                        <TipCard
                            title="Multiplier"
                            color="var(--mc-gold)"
                            lines={["Applies to everything you earn. It is the product of these:"]}
                            rows={(
                                [
                                    ["Rebirths", d.rMult],
                                    ["Island", d.islandMult],
                                    ["Trophies", d.achMult],
                                    ["Upgrades", d.allUp],
                                    ["Ascension", d.ascMult],
                                    ["Fractured Level", 1 + LEVEL_BONUS * s.lvl],
                                ] as [string, number][]
                            )
                                .filter(([, v]) => Math.abs(v - 1) > 0.0005)
                                .map(([k, v]): [string, string] => [k, `x${v >= 100 ? F(v) : v.toFixed(2)}`])}
                            foot="Pets, enchants, boons and the Codex add on top."
                        />
                    )}
                >
                    <Stat label="Multiplier" value={`x${F(d.all)}`} color="var(--mc-gold)" />
                </Tip>
                <Tip
                    tip={() => (
                        <TipCard
                            title="Rebirth"
                            color="var(--mc-light-purple)"
                            lines={["Reset shards, minions and shop upgrades for tokens and a permanent multiplier."]}
                            rows={[["Rebirths", String(s.rebirths)], ["Tokens", String(s.tokens)], plan.count > 0 ? ["Ready now", `x${plan.count} (+${plan.tokens} tokens)`, "var(--mc-green)"] : ["Next cost", F(rebirthCost(s.rebirths, s.asc))]]}
                        />
                    )}
                >
                <button
                    type="button"
                    onClick={() => {
                        tip.hide();
                        setTab("rebirth");
                    }}
                    className="text-left"
                >
                    <div className="font-minecraft text-[10px] uppercase tracking-widest text-muted-foreground">Rebirth</div>
                    <div className="flex items-center gap-1.5 font-minecraft font-bold text-lg leading-none" style={{ color: "var(--mc-light-purple)" }}>
                        {s.rebirths}
                        {plan.count > 0 && (
                            <span className="fi-afford rounded-full px-1.5 py-0.5 text-[10px] text-black" style={{ backgroundColor: "var(--mc-light-purple)", ["--c" as string]: "var(--mc-light-purple)" }}>
                                x{plan.count} ready
                            </span>
                        )}
                    </div>
                </button>
                </Tip>
                {(s.asc > 0 || asc.can) && (
                    <Tip
                        tip={() => (
                            <TipCard
                                title="Ascension"
                                color="var(--mc-aqua)"
                                lines={["The prestige above rebirth: reset almost everything for gems and permanent upgrades."]}
                                rows={[["Ascensions", String(s.asc)], ["Gems", String(s.ap)], asc.can ? ["Ready", `+${asc.ap} gems`, "var(--mc-green)"] : ["Needs", `${asc.req} rebirths`]]}
                            />
                        )}
                    >
                    <button
                        type="button"
                        onClick={() => {
                            tip.hide();
                            setTab("ascension");
                        }}
                        className="text-left"
                    >
                        <div className="font-minecraft text-[10px] uppercase tracking-widest text-muted-foreground">Ascension</div>
                        <div className="flex items-center gap-1.5 font-minecraft font-bold text-lg leading-none" style={{ color: "var(--mc-aqua)" }}>
                            {s.asc}
                            {asc.can && (
                                <span className="fi-afford rounded-full px-1.5 py-0.5 text-[10px] text-black" style={{ backgroundColor: "var(--mc-aqua)", ["--c" as string]: "var(--mc-aqua)" }}>
                                    ready
                                </span>
                            )}
                        </div>
                    </button>
                    </Tip>
                )}
                <div className="ml-auto flex items-center gap-2">
                    <div className="flex overflow-hidden rounded-lg border border-white/15">
                        {BUY_OPTIONS.map((o) => (
                            <button
                                key={o.v}
                                type="button"
                                onClick={() => {
                                    s.buy = o.v;
                                    render();
                                }}
                                className="px-2.5 py-1.5 font-rubik text-xs font-semibold transition-colors"
                                style={s.buy === o.v ? { backgroundColor: tint("var(--mc-aqua)", 25), color: "var(--mc-aqua)" } : { color: "var(--muted-foreground)" }}
                            >
                                {o.label}
                            </button>
                        ))}
                    </div>
                    <IconBtn label={full ? "Exit fullscreen (F)" : "Fullscreen (F)"} onClick={toggleFs}>
                        {full ? <Minimize className="size-4" /> : <Expand className="size-4" />}
                    </IconBtn>
                </div>
            </div>

            <div className={`grid min-h-0 grid-cols-[minmax(0,1fr)] gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:grid-rows-[minmax(0,1fr)] flex-none lg:flex-1`}>
                {/* Button side */}
                <div className="relative isolate overflow-hidden lg:min-h-0 lg:border-r lg:border-white/10">
                    <IslandScene key={island.id} island={island} variant="backdrop" className="fi-backdrop absolute inset-0 -z-10 size-full" />
                    <div className="fi-side relative flex h-full flex-col px-4 py-3 lg:overflow-y-auto">
                    <div className="my-auto flex w-full flex-col items-center gap-3">
                    <Tip
                        tip={() => (
                            <TipCard
                                title={island.name}
                                color={island.color}
                                tag={`x${island.mult} shards`}
                                lines={island.perks.filter((p) => p.k !== "affinity").map((p) => perkText(p, masteryInfo(s.isec[island.id] || 0).strength, NAMES))}
                                foot="Click or press I to open the travel map."
                            />
                        )}
                    >
                    <button
                        type="button"
                        onClick={() => {
                            tip.hide();
                            setMenu("");
                        }}
                        className="group flex flex-wrap items-center justify-center gap-2 rounded-full border border-white/10 bg-black/25 px-3 py-1 font-minecraft font-bold text-sm backdrop-blur-sm transition-colors hover:bg-black/45"
                        style={{ color: island.color }}
                    >
                        <McSymbol name={island.symbol} color={island.color} /> {island.name}
                        <span className="rounded-full border px-2 py-0.5 font-rubik text-[10px]" style={{ borderColor: tint(island.color, 50) }}>x{island.mult}</span>
                        <span className="rounded-full border border-white/15 px-2 py-0.5 font-rubik text-[10px] text-muted-foreground">
                            {totalMinions.toLocaleString()} minion{totalMinions === 1 ? "" : "s"}
                        </span>
                        <span className="rounded-full border border-white/15 px-2 py-0.5 font-rubik text-[10px] text-muted-foreground transition-colors group-hover:text-foreground">Travel ▸</span>
                    </button>
                    </Tip>

                    {s.equip.length > 0 && (
                        <div className="flex flex-wrap items-center justify-center gap-1.5">
                            {s.equip.map((id) => {
                                const p = PETS.find((x) => x.id === id);
                                const st = s.pets[id];
                                if (!p || !st) return null;
                                const rc = RARITIES[p.rarity].color;
                                return (
                                    <Tip
                                        key={id}
                                        tip={() => {
                                            const lv = petLevel(p, st.xp);
                                            return (
                                                <TipCard
                                                    title={p.name}
                                                    color={p.color}
                                                    tag={`${RARITIES[p.rarity].name} · Lv ${lv}`}
                                                    lines={[p.blurb]}
                                                    rows={[[PET_LABEL[p.stat], `+${+((p.base + p.per * (lv - 1)) * 100).toFixed(1)}%`], ...p.perks.map((pk, n): [string, string, string?] => [pk.name, lv >= PET_PERK_AT[n] ? "unlocked" : `Lv ${PET_PERK_AT[n]}`, lv >= PET_PERK_AT[n] ? "var(--mc-green)" : undefined])]}
                                                    foot="Click to open Pets."
                                                />
                                            );
                                        }}
                                    >
                                    <button
                                        type="button"
                                        onClick={() => {
                                            tip.hide();
                                            setTab("pets");
                                        }}
                                        className="flex items-center gap-1 rounded-full border px-2 py-0.5 font-rubik text-[10px] transition-colors hover:bg-white/10"
                                        style={{ borderColor: tint(rc, 55), color: p.color }}
                                    >
                                        <McSymbol name={p.symbol} /> {p.name} <span className="text-muted-foreground">Lv {petLevel(p, st.xp)}</span>
                                    </button>
                                    </Tip>
                                );
                            })}
                        </div>
                    )}

                    <BuffBar s={s} />
                    <SkillDock
                        s={s}
                        d={d}
                        notes={notes}
                        onOpen={(id) => {
                            tip.hide();
                            setTab(id);
                        }}
                    />

                    <div className="relative my-4">
                        <div className="fi-pulse pointer-events-none absolute -inset-6 rounded-[2.5rem] blur-2xl" style={{ backgroundColor: tint(island.color, 40) }} />
                        <Aura id={s.btn.aura} accent={skinAccent(s.btn.skin, island.color)} />
                        {glintOn && <Glint {...glintOn} />}
                        {s.orbit && <Orbit counts={s.minions} />}
                        <ButtonFace
                            as="button"
                            shape={s.btn.shape}
                            skin={s.btn.skin}
                            glyph={s.btn.glyph}
                            color={island.color}
                            glint={glintOn ?? undefined}
                            className="relative z-[1] size-44 sm:size-52"
                            btnRef={btnRef}
                            wrapRef={wrapRef}
                            btnProps={{ onPointerDown: onPress, onPointerMove: onMove, onPointerUp: onLift, onPointerCancel: onLift, onContextMenu: (e) => e.preventDefault(), "aria-label": "Click for shards" }}
                        />
                    </div>
                    <div ref={floatRef} className="pointer-events-none absolute inset-0 z-[4]" aria-hidden="true" />
                    <Popups stateRef={ref} dRef={dRef} getCombo={getCombo} say={say} enabled={s.popups} />

                    <div className="text-center font-rubik text-xs text-muted-foreground">
                        Press <Kbd>Space</Kbd> or click. Crit {Math.round(d.critChance * 100)}% for +{Math.round(d.critDmg * 100)}%.
                    </div>
                    <ComboMeter
                        ref={meterApi}
                        enabled={s.btn.hold}
                        info={{ max: d.comboMax, gain: d.comboGain, surge: d.surgeChance, cap: holdMax(s), best: s.bestCombo, base: HOLD_BASE }}
                    />

                    <ButtonDock
                        s={s}
                        notes={notes.button ?? []}
                        onOpen={() => {
                            tip.hide();
                            setTab("button");
                        }}
                        render={render}
                        say={say}
                    />

                    <Goals
                        s={s}
                        d={d}
                        F={F}
                        render={render}
                        say={say}
                        open={(id) => {
                            tip.hide();
                            setTab(id as TabId);
                        }}
                    />

                    </div>
                    </div>
                </div>

                {/* Panels */}
                <div className="flex min-h-0 min-w-0 flex-col">
                    <TabBar
                        tabs={TABS}
                        groups={GROUPS}
                        current={tab}
                        notes={notes}
                        onSelect={(id) => {
                            tip.hide();
                            setTab(id);
                        }}
                    />

                    <div className="min-h-[75dvh] flex-1 space-y-2 overflow-y-auto p-3 [scrollbar-width:thin] sm:p-4 lg:min-h-0">
                        {tab === "minions" && <MinionsTab {...ctx} />}
                        {tab === "upgrades" && <UpgradesTab {...ctx} />}
                        {tab === "button" && <ButtonTab {...ctx} />}
                        {tab === "pets" && <PetsTab {...ctx} />}
                        {tab === "islands" && <IslandsTab {...ctx} openMenu={(id) => setMenu(id)} />}
                        {tab === "skills" && <SkillsTab {...ctx} open={(id) => setTab(id as TabId)} />}
                        {tab === "mine" && <MineTab {...ctx} />}
                        {tab === "farm" && <FarmTab {...ctx} />}
                        {tab === "enchant" && <EnchantTab {...ctx} />}
                        {tab === "stats" && <StatsTab {...ctx} />}
                        {tab === "rebirth" && <RebirthTab {...ctx} />}
                        {tab === "ascension" && <AscensionTab {...ctx} />}
                        {tab === "trophies" && <TrophiesTab {...ctx} />}
                        {tab === "level" && <LevelTab {...ctx} />}
                        {tab === "soon" && <SoonTab {...ctx} />}
                        {tab === "settings" && <SettingsTab {...ctx} replaceState={replaceState} />}
                    </div>
                </div>
            </div>

            {menu !== null && (
                <IslandsMenu
                    s={s}
                    d={d}
                    F={F}
                    startId={menu || undefined}
                    onClose={() => setMenu(null)}
                    onTravel={(id) => {
                        s.island = id;
                        const isl = ISLAND_BY_ID[id];
                        if (!s.visited.includes(id)) {
                            s.visited.push(id);
                            say(`Discovered ${isl.name}! +0.5% all shards forever`);
                        }
                        render();
                    }}
                />
            )}

            <SkillToasts ref={skillApi} />

            {toast && (
                <div
                    role="status"
                    className="pointer-events-none absolute bottom-4 left-1/2 z-20 max-w-[90%] -translate-x-1/2 rounded-xl border px-4 py-2 text-center font-rubik text-xs backdrop-blur-md"
                    style={{ borderColor: tint("var(--mc-yellow)", 55), backgroundColor: "color-mix(in oklch, var(--background) 85%, transparent)", color: "var(--mc-yellow)" }}
                >
                    {toast}
                </div>
            )}
            </TipProvider>
        </div>
    );
}
