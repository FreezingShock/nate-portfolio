#!/usr/bin/env node
// Regenerates lib/changelog.json from real `git log` — run by hand
// (`npm run changelog`) whenever the History page should reflect the
// latest commits. Not wired into the Vercel build: Vercel's default clone
// depth can't be trusted to have full history, so baking the data in at
// commit time (from a machine that DOES have full history) is the
// reliable version of "automated" here, not a build-time git read.
import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = join(__dirname, "..", "lib", "changelog.json");

const raw = execSync('git log --pretty=format:"%H|%ad|%s" --date=format:"%Y-%m-%d"', {
    encoding: "utf-8",
    cwd: join(__dirname, ".."),
});

const commits = raw
    .split("\n")
    .filter(Boolean)
    .map((line) => {
        const [hash, date, ...rest] = line.split("|");
        return { hash: hash.slice(0, 7), date, subject: rest.join("|") };
    });

const totalCommits = commits.length;

writeFileSync(outPath, JSON.stringify({ generatedAt: new Date().toISOString(), totalCommits, commits }, null, 2) + "\n");

console.log(`Wrote ${totalCommits} commits to lib/changelog.json`);
