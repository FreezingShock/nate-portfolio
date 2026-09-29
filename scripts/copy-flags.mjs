// Copies one flag SVG per country in lib/data/outlines.json from the
// `flag-icons` package (MIT, github.com/lipis/flag-icons) into public/flags/,
// so the games serve every flag themselves instead of hotlinking a flag API.
//
// Run:  node scripts/copy-flags.mjs

import fs from "node:fs";

const countries = JSON.parse(fs.readFileSync("lib/data/outlines.json", "utf8"));
fs.mkdirSync("public/flags", { recursive: true });
let n = 0;
for (const { c } of countries) {
    const code = c.toLowerCase();
    fs.copyFileSync(
        `node_modules/flag-icons/flags/4x3/${code}.svg`,
        `public/flags/${code}.svg`
    );
    n++;
}
console.log(`Copied ${n} flags to public/flags/`);
