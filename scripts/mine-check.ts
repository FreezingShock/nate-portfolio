// Sanity run for the Mine engine: tools, the drill and its parts, per-tool enchants, the forge, milestones and old-save migration.
import { newState, parseSave, serialize, derive } from "../lib/fractured-idle/engine";
import * as MN from "../lib/fractured-idle/mine";
import { ASC_UPS, REBIRTH_UPS, UPGRADES } from "../lib/fractured-idle/data";

let fails = 0;
const ok = (c: boolean, m: string) => {
    if (!c) {
        fails++;
        console.log("FAIL", m);
    } else console.log("ok  ", m);
};

const s = newState();
s.mining = 1e9; // level 60
s.total = 1e40;
const ctx = MN.mineCtx(derive(s));

ok(s.mine.held === "wood" && s.mine.picks.length === 1, "starts with a wooden pickaxe in hand");
ok(!MN.hasDrill(s) && MN.drillSwings(s) === 0, "no drill at first");
const sw = MN.swing(s, ctx, { combo: 1, crit: false });
ok(sw.units > 0 && s.mine.nodes === 1, "a swing mines ore");

// Forge a pickaxe
s.mine.ingots.copperIngot = 50;
s.mine.ore.coal = 5000;
ok(MN.canCraft(s, MN.RECIPE_BY_ID.pk_copper, 1).ok, "can craft the copper pickaxe");
ok(MN.startCraft(s, "pk_copper", 1, 1000), "start crafting a pickaxe");
ok(MN.collectJob(s, 0, 1e12) !== null && s.mine.picks.includes("copper"), "pickaxe collected into the toolbox");
ok(!MN.canCraft(s, MN.RECIPE_BY_ID.pk_copper, 1).ok, "a pickaxe can only be made once");
ok(MN.holdTool(s, "copper") && MN.heldTool(s).id === "copper", "wield another pickaxe");
ok(MN.yieldMult(s) > 1.07, "the copper pickaxe's trait adds ore");

// The drill: an engine and a head
ok(MN.startCraft(s, "eng1", 1, 1000), "start an engine");
MN.collectJob(s, 0, 1e12);
ok(!MN.hasDrill(s), "an engine alone is not a drill");
ok(MN.startCraft(s, "hd1", 1, 1000), "start a head");
MN.collectJob(s, 0, 1e12);
ok(MN.hasDrill(s) && s.mine.held === "drill", "engine + head makes the drill and takes it in hand");
ok(MN.drillMk(s) === 1 && MN.drillSwings(s) > 0, "Mk 1 drill swings by itself");
const idle0 = MN.idleSwings(s, 0);
const before = s.mining;
MN.tickMine(s, 10, ctx);
ok(s.mining > before, "the drill mines while idle");
MN.holdTool(s, "wood");
ok(MN.drillSwings(s) === 0 && MN.idleSwings(s, 0) < idle0, "the drill only works while in hand");
MN.holdTool(s, "drill");

// Parts: better ones install automatically, cores are optional
s.mine.ingots.steel = 40;
s.mine.ingots.goldIngot = 40;
s.mine.ingots.ironIngot = 40;
for (const id of ["eng2", "hd2", "eng3", "hd3"]) {
    MN.startCraft(s, id, 1, 1000);
    MN.collectJob(s, 0, 1e12);
}
ok(s.mine.rig.engine === "eng3" && s.mine.rig.head === "hd3", "better parts install themselves");
ok(MN.drillMk(s) >= 3, `drill is Mk ${MN.drillMk(s)}`);
ok(MN.installPart(s, "eng1") && s.mine.rig.engine === "eng1", "you can swap an older part back in");
MN.autoRig(s);
ok(s.mine.rig.engine === "eng3", "autoRig installs the best parts");
MN.startCraft(s, "core1", 1, 1000);
MN.collectJob(s, 0, 1e12);
ok(MN.coreFx(s).yield === 0.25 || s.mine.rig.core === "", "a core can be installed");

// Enchants belong to a tool
s.mine.ore.coal = 1e7;
s.mine.ore.copper = 1e7;
const t = MN.heldTool(s);
const lvl = (id: string) => MN.toolEnch(s, "drill")[id] || 0;
ok(MN.buyEnch(s, "drill", "eff") && lvl("eff") === 1, "enchant the drill");
const pw1 = MN.pickPower(s);
MN.holdTool(s, "wood");
ok((MN.toolEnch(s, "wood").eff || 0) === 0, "the wooden pickaxe is not enchanted");
ok(MN.pickPower(s) < pw1, "power depends on the tool in hand");
ok(!MN.buyEnch(s, "wood", "motor"), "drill-only enchants cannot go on a pickaxe");
MN.holdTool(s, "drill");
ok(MN.buyEnch(s, "drill", "motor"), "drill-only enchants work on the drill");
const cap = MN.enchCap(t.tier, MN.ENCH_BY_ID.eff);
for (let i = 0; i < 40; i++) MN.buyEnch(s, "drill", "eff");
ok(lvl("eff") <= cap, `enchant level is held at the tool's cap (${lvl("eff")} / ${cap})`);

// Milestones
s.mine.mined.coal = 60;
s.mine.nodes = 150;
const ready = MN.featsReady(s);
ok(ready.length > 0, `milestones ready (${ready.length})`);
const tok = s.tokens;
const got = MN.claimAllFeats(s);
ok(got.length === ready.length && MN.featsReady(s).length === 0, "claim all pays and clears");
ok(MN.claimFeat(s, got[0].id) === null, "a milestone cannot be claimed twice");
ok(MN.ORE_LADDERS.length === MN.ORES.length && MN.INGOT_LADDERS.length === MN.INGOTS.length, "an item ladder for every ore and ingot");
ok(MN.COL_AT.length === 10, "ten collection tiers");
ok(s.tokens >= tok, "grants were paid");

// New-system upgrades feed the Mine through upStat
const y0 = MN.yieldMult(s);
s.ups.detect = 10;
s.rups.veins = 2;
s.aups.coretap = 1;
ok(Math.abs(MN.yieldMult(s) / y0 - 1.6) < 1e-9, "Ore Detector, Deep Veins and Core Tap raise ore");
const f0 = MN.forgeSpeed(s);
s.aups.bellows2 = 2;
ok(MN.forgeSpeed(s) > f0, "Eternal Bellows speeds the forge");
ok(UPGRADES.filter((u) => u.kind === "fx").every((u) => u.stat && u.cost > 0 && u.max > 1), "every fx upgrade names a stat");
ok(REBIRTH_UPS.concat(ASC_UPS as never[]).every((u) => !u.needs || [...REBIRTH_UPS, ...ASC_UPS].some((x) => x.id === u.needs)), "every prerequisite exists");

// Save round trip
const back = parseSave(serialize(s));
ok(!!back && back.mine.parts.length === s.mine.parts.length && back.mine.held === s.mine.held && (back.mine.ench.drill?.eff ?? 0) === lvl("eff"), "tools, parts and enchants survive a save");

// An old save: a pick index, upgrades and ore drills
const old = JSON.parse(serialize(s));
old.mine = { ore: { coal: 100 }, mined: { coal: 80 }, ingots: {}, items: {}, relics: [], equipped: [], claimed: ["swings:0"], broken: 3, pick: 4, ups: { eff: 6, fort: 3, bit: 2, furnace: 1 }, drills: { coal: 12, copper: 6 }, nodes: 200 };
const mig = parseSave(JSON.stringify(old));
ok(!!mig && mig.mine.picks.length === 5 && mig.mine.picks.includes("steel"), "old pickaxe tier becomes a pickaxe collection");
ok(!!mig && MN.hasDrill(mig) && mig.mine.held === "drill", "old drills become an installed drill in hand");
ok(!!mig && (mig.mine.ench.drill?.eff ?? 0) === 6 && (mig.mine.ench.drill?.bit ?? 0) === 2, "old hand and rig upgrades become enchants");
ok(!!mig && (mig.mine.ups.furnace ?? 0) === 1 && !("eff" in mig.mine.ups), "forge upgrades stay, tool upgrades move");
ok(!!mig && mig.mine.claimed.includes("swings:0"), "claimed milestones are kept");
const brandNew = parseSave(JSON.stringify({ ...old, mine: undefined }));
ok(!!brandNew && brandNew.mine.held === "wood", "a save without a mine loads");

console.log(fails ? `${fails} FAILED` : "all good");
process.exit(fails ? 1 : 0);
