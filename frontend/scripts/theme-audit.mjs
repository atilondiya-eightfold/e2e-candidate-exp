#!/usr/bin/env node
/**
 * Theme coverage audit — fails on raw Tailwind color utilities outside the
 * dev tooling directory. Every visible surface must consume semantic tokens
 * (bg-primary, text-foreground, bg-navbar-bg, etc.). Run via `pnpm run theme:audit`.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const SRC = join(ROOT, "src");
const ALLOWLIST = [join("src", "components", "dev")];
const EXTS = /\.(?:tsx?|jsx?|css)$/;

// Color-utility prefixes and scales that must not appear in product code.
const PREFIX = "text|bg|border|ring|from|via|to|divide|outline|decoration|placeholder|caret|fill|stroke|shadow|accent";
const SCALE = "slate|gray|zinc|neutral|stone|indigo|violet|purple|fuchsia|pink|rose|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue";
const FORBIDDEN = new RegExp(
	`\\b(?:${PREFIX})-(?:${SCALE})-\\d{2,3}(?:\\/\\d+)?\\b` +
	`|\\b(?:text|bg|border|ring|fill|stroke)-(?:white|black)\\b` +
	`|\\b(?:${PREFIX})-\\[#[0-9a-fA-F]{3,8}(?:\\/\\d+)?\\]`,
);

function* walk(dir) {
	for (const entry of readdirSync(dir)) {
		if (entry === "node_modules" || entry.startsWith(".")) continue;
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) yield* walk(full);
		else if (EXTS.test(entry)) yield full;
	}
}

const hits = [];
for (const file of walk(SRC)) {
	const rel = relative(ROOT, file);
	if (ALLOWLIST.some((dir) => rel.startsWith(dir + sep))) continue;
	const lines = readFileSync(file, "utf8").split("\n");
	for (let i = 0; i < lines.length; i += 1) {
		const match = FORBIDDEN.exec(lines[i]);
		if (match) hits.push(`  ${rel}:${i + 1}  ${match[0]}`);
	}
}

if (hits.length === 0) {
	process.stdout.write("theme:audit OK\n");
	process.exit(0);
}

process.stderr.write(`theme:audit FAILED — ${hits.length} violation(s):\n${hits.join("\n")}\n\n`);
process.stderr.write(
	"Use semantic tokens: bg-primary, text-foreground, bg-success, bg-warning, bg-destructive, bg-info, bg-card, bg-muted, bg-background, bg-navbar-bg, text-navbar-fg, border-border, ring-ring.\n",
);
process.exit(1);
