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
