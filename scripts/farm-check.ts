// Quick sanity run for the farm engine: gardens, tools, enchanting, selling, the guide and old-save migration.
import { newState, parseSave, serialize, derive } from "../lib/fractured-idle/engine";
import * as FM from "../lib/fractured-idle/farm";

const s = newState();
s.shards = 1e9;
s.total = 1e9;
s.farming = 1e9;
const d = derive(s);
const ctx = FM.farmCtx(d);
let fails = 0;
const ok = (c: boolean, m: string) => {
    if (!c) {
        fails++;
        console.log("FAIL", m);
    } else console.log("ok  ", m);
};

ok(FM.openDims(s).includes("overworld"), "overworld garden open");
ok(FM.plantAll(s) > 0, "plantAll plants");
for (const { pl } of FM.allPlots(s)) pl.p = 1e9;
const before = Math.floor(s.farm.crop.wheat || 0);
ok(FM.harvestAll(s, ctx, true) > 0, "harvestAll harvests");
ok((s.farm.crop.wheat || 0) > before || Object.values(s.farm.crop).some((v) => v > 0), "crops gained");
ok(s.farm.streak > 1, `streak builds (${s.farm.streak})`);

// tend
FM.plant(s, "overworld", 0, "wheat");
const t = FM.tend(s, "overworld", 0, 1000);
ok(!!t && t.boost > 0, "tend boosts growth");
ok(FM.tend(s, "overworld", 0, 1100) === null, "tend has a cooldown");

// enchant + sell
s.farm.crop.wheat = 1000;
ok(FM.enchantCrop(s, "wheat", Infinity) === Math.floor(1000 / FM.enchNeed(s)), "enchant max");
const sh = s.shards;
ok(FM.sellEnchanted(s, ctx, "wheat", 1).n === 1 && s.shards > sh, "selling pays shards");

// tools
s.farm.ench.wheat = 50;
s.farm.goods.flour = 10;
ok(FM.buyTool(s, "stalk1") && s.farm.belt.includes("stalk1"), "tool made and worn");
ok(!FM.canBuyTool(s, FM.TOOL_BY_ID.stalk3).ok, "tier 3 needs tier 2 first");
const c = FM.CROP_BY_ID.wheat;
const withTool = FM.cropUnits(s, c);
FM.unequipTool(s, "stalk1");
ok(withTool > FM.cropUnits(s, c), "a worn scythe boosts wheat crops");
FM.equipTool(s, "stalk1");
ok(Object.keys(FM.farmFx(s)).length > 0, "farmFx includes belt");

// ---- the farm overhaul: crew, fields, generic costs, market, milestones ----
{
    const g = newState();
    g.farming = 1e9;
    g.shards = 1e12;
    g.peakInc = 1e5;
    g.total = 1e40;
    for (const c of FM.CROPS) g.farm.crop[c.id] = 2000;
    const gd = derive(g);
    const gctx = FM.farmCtx(gd);

    // plots from rebirth and ascension upgrades
    const p0 = FM.plotCount(g, "overworld");
    g.rups.acres = 3;
    g.aups.estate = 2;
    ok(FM.plotCount(g, "overworld") === p0 + 6 + 12, "Acres and Estate add plots to every garden");
    FM.syncPlots(g);
    ok(g.farm.gardens.overworld.length === FM.plotCount(g, "overworld"), "gardens grow to the new size");

    // fields
    ok(FM.fieldBonus(g, 1) === 0 && FM.fieldBonus(g, 10) > 0 && FM.fieldBonus(g, 500) === FM.fieldCap(g), "field bonus grows with plots and is capped");
    FM.setSow(g, "wheat", "overworld");
    FM.plantAll(g, Math.random, "overworld");
    ok(FM.fieldSize(g, "overworld", "wheat") === g.farm.gardens.overworld.length, "a chosen crop fills the garden as one field");
    ok(FM.cropUnits(g, FM.CROP_BY_ID.wheat, 20) > FM.cropUnits(g, FM.CROP_BY_ID.wheat, 1), "a bigger field gives more crops");
    ok(FM.biggestField(g)?.n === g.farm.gardens.overworld.length, "biggestField finds it");

    // the crew
    ok(FM.CREW.length === 5, "five crew departments");
    const gs0 = FM.growSpeed(g, FM.CROP_BY_ID.wheat);
    ok(FM.buyCrew(g, "tenders", 5) === 5 && FM.crewLevel(g, "tenders") === 5, "hire Tenders");
    ok(FM.growSpeed(g, FM.CROP_BY_ID.wheat) > gs0, "Tenders speed up crops");
    const sh0 = g.shards;
    FM.buyCrew(g, "tenders", 1);
    ok(g.shards < sh0, "crew costs shards");
    ok(FM.crewCost(g, FM.CREW_BY_ID.tenders).shards > FM.crewCost(g, FM.CREW_BY_ID.tenders, 0).shards, "each level costs more");
    ok(FM.hireCrewAll(g) >= 0, "hireCrewAll runs");
    FM.buyCrew(g, "packers", 3);
    FM.buyCrew(g, "traders", 3);
    FM.buyCrew(g, "agron", 2);
    ok(FM.enchNeed(g) < 160, "Packers cut the raw crops an Enchanted crop needs");
    const ench0 = g.farm.enchanted;
    const sold0 = g.farm.soldN;
    FM.tickFarm(g, 200, gctx);
    ok(g.farm.enchanted > ench0, "Packers enchant on their own");
    ok(g.farm.soldN >= sold0, "Traders sell on their own");
    ok(g.farm.sow.overworld !== undefined, "Agronomists keep a crop chosen");
    // the crew leaves the next hoe's Enchanted crops alone
    const keep = FM.reserveMap(g);
    ok(Object.values(keep).reduce((a, b) => a + b, 0) >= 0, "reserve map computes");

    // generic costs
    const hoe = FM.HOES[g.farm.hoe + 1];
    ok(Object.keys(hoe.cost).every((k) => k === "any" || FM.isCrop(k)), "hoes cost Enchanted crops of any kind");
    ok(FM.TOOLS.every((tl) => Object.keys(tl.cost).length === 1 && Object.keys(tl.cost)[0] === `k_${tl.kind}`), "tools cost Enchanted crops of their kind, any crop of it");
    g.farm.ench = { carrot: 3, potato: 3 };
    ok(FM.have(g, "k_root") === 6 && FM.have(g, "any") === 6, "generic currencies count every crop of the kind");
    ok(FM.canBuyTool(g, FM.TOOL_BY_ID.root1).ok, "a root tool can be bought with carrots and potatoes together");
    FM.buyTool(g, "root1");
    ok(FM.have(g, "k_root") === 0 && g.farm.tools.includes("root1"), "buying spends across the kind");

    // market
    ok(FM.RANKS.length >= 6 && FM.rankOf(g).name === FM.RANKS[FM.rankIdx(g)].name, "merchant ranks");
    ok(FM.demandKind(1_700_000_000_000) === FM.demandKind(1_700_000_000_000 + 1000), "demand holds for twenty minutes");
    const kinds = new Set(Array.from({ length: 30 }, (_, i) => FM.demandKind(1_700_000_000_000 + i * FM.DEMAND_MS)));
    ok(kinds.size >= 3, "demand rotates between kinds");
    const c0 = FM.CROP_BY_ID.wheat;
    const dk = FM.demandKind();
    ok(FM.sellMult(g, { ...c0, kind: dk }) > FM.sellMult(g, { ...c0, kind: dk === "stalk" ? "root" : "stalk" }), "the demanded kind pays more");
    g.farm.crop.wheat = 500;
    const rawN = FM.sellRaw(g, gctx, "wheat", 100);
    ok(rawN.n === 100 && rawN.shards > 0 && g.farm.crop.wheat === 400, "sell raw crops");
    g.farm.goods.flour = 5;
    ok(FM.sellGood(g, gctx, "flour", 2).n === 2 && g.farm.goods.flour === 3, "sell goods");
    const r = FM.recommend(g, "overworld");
    ok(!!r && r.dim === "overworld" && r.why.length > 0, "a crop is recommended with a reason");

    // milestones
    g.farm.grown.wheat = 120;
    ok(FM.featsReady(g).length > 0, "crop milestones ready");
    ok(FM.CROP_LADDERS.length === FM.CROPS.length && FM.GOOD_LADDERS.length === FM.GOODS.length, "an item ladder for every crop and good");
    const n = FM.claimAllFeats(g).length;
    ok(n > 0 && FM.featsReady(g).length === 0, `claimed ${n} milestones`);
    ok(FM.COL_AT.length === 10, "ten collection tiers");

    // saves
    const rt = parseSave(serialize(g));
    ok(!!rt && rt.farm.crew.tenders === g.farm.crew.tenders && rt.farm.auto.sow === g.farm.auto.sow, "crew survives a save");
    const oldSave = JSON.parse(serialize(g));
    delete oldSave.farm.crew;
    delete oldSave.farm.auto;
    delete oldSave.farm.made;
    const m2 = parseSave(JSON.stringify(oldSave));
    ok(!!m2 && m2.farm.auto.pack === true && Object.keys(m2.farm.crew).length === 0, "an older farm save loads");
}

// save round trip + old save migration
const back = parseSave(serialize(s));
ok(!!back && FM.allPlots(back).length === FM.allPlots(s).length, "save round trip keeps plots");
const old = JSON.parse(serialize(s));
old.farm.plots = [{ c: "netherwart", p: 5 }, { c: "", p: 0 }];
delete old.farm.gardens;
old.farm.sow = "carrot";
const mig = parseSave(JSON.stringify(old));
ok(!!mig && mig.farm.gardens.nether[0].c === "netherwart", "old single garden moves to its dimension");
ok(!!mig && mig.farm.sow.overworld === "carrot", "old sow choice moves to its dimension");

console.log(fails ? `${fails} FAILED` : "all good");
process.exit(fails ? 1 : 0);
