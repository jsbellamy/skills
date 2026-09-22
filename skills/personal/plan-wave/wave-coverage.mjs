#!/usr/bin/env node
// Coverage check for a refactor wave: every file referencing a symbol the wave
// renames or retires must be claimed by some slice's `## Touches` manifest.
// Anchor resolvers prove presence (every listed path exists); this proves the
// converse (every referencing file is listed).
//
//   node wave-coverage.mjs --issues 1550,1551 --symbols fooById,barById
//   node wave-coverage.mjs --issues 1550,1551 --symbols fooById --contract 1554
//   node wave-coverage.mjs --issues ... --symbols ... --ref main~5 --path src/
//
// Run from inside the repo (gh infers it). Exit 1 on any finding.

import { execFileSync } from "node:child_process";

function arg(name, fallback = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 || i + 1 >= process.argv.length ? fallback : process.argv[i + 1];
}
const list = (v) => (v ? v.split(",").map((s) => s.trim()).filter(Boolean) : []);

const issues = list(arg("issues"));
const symbols = list(arg("symbols"));
const contract = arg("contract");
const ref = arg("ref");
const paths = list(arg("path"));

if (!issues.length || !symbols.length) {
  console.error("usage: --issues <n,n,...> --symbols <s,s,...> [--contract <n>] [--ref <git-ref>] [--path <p,p,...>]");
  process.exit(2);
}

const run = (cmd, args) => execFileSync(cmd, args, { encoding: "utf8", maxBuffer: 64 << 20 });

// --- manifests: issue -> [{ kind, path }] ---------------------------------
const BULLET = /^-\s*(modify|create|read):\s*(?:\[[^\]]+\]\s*)?`([^`]+)`/;

function manifest(issue) {
  let body;
  try {
    body = JSON.parse(run("gh", ["issue", "view", issue, "--json", "body"])).body ?? "";
  } catch {
    console.error(`! could not read issue #${issue} (is gh authed, and is cwd the repo?)`);
    process.exit(2);
  }
  const section = body.split(/^## Touches\s*$/m)[1];
  if (section === undefined) return null; // no manifest at all
  const entries = [];
  for (const line of section.split(/^## /m)[0].split("\n")) {
    const m = BULLET.exec(line.trim());
    if (m) entries.push({ kind: m[1], path: m[2] });
  }
  return entries;
}

const claims = new Map(); // path -> [{ issue, kind }]
const noManifest = [];
for (const issue of issues) {
  const entries = manifest(issue);
  if (entries === null) {
    noManifest.push(issue);
    continue;
  }
  for (const { kind, path } of entries) {
    if (!claims.has(path)) claims.set(path, []);
    claims.get(path).push({ issue, kind });
  }
}

// --- references: symbol -> [file] ----------------------------------------
function referencingFiles(symbol) {
  const args = ["grep", "-l", "-w", "-F", symbol];
  if (ref) args.push(ref);
  if (paths.length) args.push("--", ...paths);
  let out;
  try {
    out = run("git", args);
  } catch (e) {
    if (e.status === 1) return []; // git grep: no matches
    throw e;
  }
  const prefix = ref ? `${ref}:` : "";
  return out
    .split("\n")
    .filter(Boolean)
    .map((l) => (prefix && l.startsWith(prefix) ? l.slice(prefix.length) : l));
}

// --- report ---------------------------------------------------------------
const unassigned = new Map(); // path -> Set<symbol>
const contractOnly = new Map();
let referenced = 0;

console.log(`wave ${issues.map((i) => `#${i}`).join(" ")}${ref ? `  @ ${ref}` : ""}\n`);

for (const symbol of symbols) {
  const files = referencingFiles(symbol);
  referenced += files.length;
  console.log(`${symbol}  (${files.length} file${files.length === 1 ? "" : "s"})`);
  for (const file of files) {
    const owners = claims.get(file) ?? [];
    if (!owners.length) {
      console.log(`  UNASSIGNED  ${file}`);
      if (!unassigned.has(file)) unassigned.set(file, new Set());
      unassigned.get(file).add(symbol);
      continue;
    }
    const label = owners.map((o) => `#${o.issue} ${o.kind}`).join(", ");
    const onlyContract = contract && owners.every((o) => o.issue === contract);
    if (onlyContract) {
      console.log(`  CONTRACT-ONLY  ${file}  (${label})`);
      if (!contractOnly.has(file)) contractOnly.set(file, new Set());
      contractOnly.get(file).add(symbol);
    } else {
      console.log(`  ok          ${file}  (${label})`);
    }
  }
  console.log("");
}

let bad = false;
if (noManifest.length) {
  console.log(`! no '## Touches' section: ${noManifest.map((i) => `#${i}`).join(", ")}`);
  bad = true;
}
if (unassigned.size) {
  console.log(`! ${unassigned.size} referencing file(s) claimed by no slice — send the wave back to Design:`);
  for (const [file, syms] of unassigned) console.log(`    ${file}  <- ${[...syms].join(", ")}`);
  bad = true;
}
if (contractOnly.size) {
  console.log(`! ${contractOnly.size} referencing file(s) held back to contract slice #${contract} — assign each to the migrate batch that converts it:`);
  for (const [file, syms] of contractOnly) console.log(`    ${file}  <- ${[...syms].join(", ")}`);
  bad = true;
}
if (!bad) console.log(`clean: ${referenced} reference(s) across ${symbols.length} symbol(s), every file claimed.`);
process.exit(bad ? 1 : 0);
