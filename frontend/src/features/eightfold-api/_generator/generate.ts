#!/usr/bin/env tsx
/* eslint-disable no-console, @typescript-eslint/no-explicit-any */
// eightfold-api generator. Maintainer-only. Not deployed.
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

interface Args { mode: "catalog" | "files"; source: string }

function parseArgs(argv: string[]): Args {
	const mode = argv.includes("--catalog") ? "catalog" : "files";
	const sIdx = argv.indexOf("--source");
	const def = path.join(os.homedir(), "Downloads/eightfold/vscode/www/api_generator/configs/api_server_v2.json");
	return { mode, source: sIdx >= 0 ? argv[sIdx + 1] : def };
}

const HERE = path.dirname(new URL(import.meta.url).pathname);
const ROOT = path.resolve(HERE, "..");
const CATALOG_PATH = path.join(ROOT, "api-catalog.json");
const TYPES_DIR = path.join(ROOT, "types");
const SERVICES_DIR = path.join(ROOT, "services");
const HOOKS_DIR = path.join(ROOT, "hooks");
const DOCS_DIR = path.join(ROOT, "docs");

interface CatalogField {
	type?: "string" | "number" | "boolean" | "object" | "array" | "unknown";
	format?: string;
	items?: CatalogField;
	properties?: Record<string, CatalogField>;
	description?: string;
	$ref?: string;
}
interface CatalogParam { name: string; in: "path" | "query" | "header"; required?: boolean; description?: string; schema?: CatalogField }
interface CatalogOp {
	callerId: string;
	method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
	path: string;
	scope: "READ" | "WRITE";
	summary: string;
	description?: string;
	parameters?: CatalogParam[];
	request?: CatalogField | null;
	response?: CatalogField | null;
	excludeFromResponse?: string[];
}
interface CatalogEntity {
	namespace: string;
	description: string;
	ops: Record<string, CatalogOp>;
	gotchas: string[];
	batchLimit: number;
	writesAsync: boolean;
}
interface Catalog {
	version: string;
	baseUrl: string;
	generatedAt: string;
	sourceConfig: string;
	entities: Record<string, CatalogEntity>;
}

interface ParsedSchemaField { name: string; type: CatalogField; description?: string; requestOnly: boolean; dumpOnly: boolean }
interface MarshmallowParser {
	repoRoot: string;
	externalObjectsDir: string;
	schemaTypes: Record<string, string>;
	classCache: Map<string, ParsedSchemaField[] | null>;
	fileCache: Map<string, string>;
	resolving: Set<string>;
}

function buildMarshmallowParser(sourcePath: string): MarshmallowParser {
	const repoRoot = path.resolve(path.dirname(sourcePath), "..", "..");
	const externalObjectsDir = path.join(repoRoot, "external_objects");
	if (!fs.existsSync(externalObjectsDir)) {
		throw new Error(`external_objects/ not found at ${externalObjectsDir}`);
	}
	return {
		repoRoot,
		externalObjectsDir,
		schemaTypes: parseSchemaTypesEnum(externalObjectsDir),
		classCache: new Map(),
		fileCache: new Map(),
		resolving: new Set(),
	};
}

function parseSchemaTypesEnum(dir: string): Record<string, string> {
	const content = fs.readFileSync(path.join(dir, "base_constants.py"), "utf8");
	const map: Record<string, string> = {};
	let inSchemaTypes = false;
	for (const line of content.split("\n")) {
		if (/^class\s+SchemaTypes\s*\(/.test(line)) { inSchemaTypes = true; continue; }
		if (inSchemaTypes && /^class\s+\w+\s*\(/.test(line)) break;
		if (!inSchemaTypes) continue;
		const m = /^\s+(\w+)\s*=\s*['"]([^'"]+)['"]/.exec(line);
		if (m) map[m[1]] = m[2];
	}
	return map;
}

function readPyFile(p: MarshmallowParser, fileBase: string): string | null {
	if (p.fileCache.has(fileBase)) return p.fileCache.get(fileBase) ?? null;
	const candidates = [
		path.join(p.externalObjectsDir, `${fileBase}.py`),
		path.join(p.externalObjectsDir, "value_object_schemas", `${fileBase}.py`),
	];
	for (const c of candidates) {
		if (fs.existsSync(c)) {
			const content = fs.readFileSync(c, "utf8");
			p.fileCache.set(fileBase, content);
			return content;
		}
	}
	p.fileCache.set(fileBase, "");
	return null;
}

function findClassBody(content: string, className: string): { body: string; baseClass: string | null } | null {
	const lines = content.split("\n");
	let start = -1;
	let baseClass: string | null = null;
	for (let i = 0; i < lines.length; i++) {
		const m = new RegExp(`^class\\s+${className}\\s*\\(([^)]*)\\)`).exec(lines[i]);
		if (m) {
			start = i;
			const base = m[1].trim();
			if (base && base !== "BaseSchema" && !base.includes("object")) baseClass = base;
			break;
		}
	}
	if (start < 0) return null;
	let end = lines.length;
	for (let i = start + 1; i < lines.length; i++) {
		const line = lines[i];
		// Only match top-level (column-0) class declarations to avoid stopping at inner
		// classes like `class Meta:` that may appear between fields.
		if (line.startsWith("class ") && /^class\s+\w+\s*\(/.test(line)) { end = i; break; }
	}
	return { body: lines.slice(start, end).join("\n"), baseClass };
}

function parseGetFieldCalls(body: string): ParsedSchemaField[] {
	const fields: ParsedSchemaField[] = [];
	const re = /^(\s+)(\w+)\s*=\s*get_field\(([\s\S]*?)\)\s*$/gm;
	let m: RegExpExecArray | null;
	while ((m = re.exec(body)) !== null) {
		const parsed = parseGetFieldArgs(m[3]);
		fields.push({ name: m[2], type: parsed.type, description: parsed.description, requestOnly: parsed.requestOnly, dumpOnly: parsed.dumpOnly });
	}
	return fields;
}

function parseGetFieldArgs(s: string): { type: CatalogField; description?: string; requestOnly: boolean; dumpOnly: boolean } {
	const requestOnly = /\brequest_only\s*=\s*True\b/.test(s);
	const dumpOnly = /\bdump_only\s*=\s*True\b/.test(s);
	const dm = /\bdescription\s*=\s*(['"])([\s\S]*?)\1/.exec(s);
	const description = dm ? dm[2].replaceAll(/\\(['"\\])/g, "$1") : undefined;
	const ftm = /\bfield_type\s*=\s*(\[[\s\S]*?\]|[\w.]+)/.exec(s);
	const ftRaw = ftm ? ftm[1].trim() : "";
	return { type: parseFieldTypeRef(ftRaw), description, requestOnly, dumpOnly };
}

function parseFieldTypeRef(raw: string): CatalogField {
	if (!raw) return { type: "unknown" };
	const isArr = raw.startsWith("[") && raw.endsWith("]");
	const inner = isArr ? raw.slice(1, -1).trim() : raw;
	const ref = parseSingleRef(inner);
	return isArr ? { type: "array", items: ref } : ref;
}

function parseSingleRef(raw: string): CatalogField {
	const ftMatch = /^FieldTypes\.(\w+)/.exec(raw);
	if (ftMatch) return mapFieldType(ftMatch[1]);
	const stMatch = /^SchemaTypes\.(\w+)/.exec(raw);
	if (stMatch) return { $ref: `SchemaTypes.${stMatch[1]}` };
	return { type: "unknown" };
}

function mapFieldType(name: string): CatalogField {
	switch (name) {
		case "string": return { type: "string" };
		case "email": return { type: "string", format: "email" };
		case "int": return { type: "number" };
		case "float": return { type: "number" };
		case "boolean": return { type: "boolean" };
		case "datetime": return { type: "string", format: "date-time" };
		case "date": return { type: "string", format: "date" };
		case "dict": return { type: "object" };
		case "typed_dict": return { type: "object" };
		case "raw": return { type: "object" };
		default: return { type: "unknown" };
	}
}

function resolveSchema(p: MarshmallowParser, fqn: string, mode: "request" | "response"): CatalogField {
	if (p.resolving.has(fqn)) return { type: "object", description: `(circular: ${fqn})` };
	if (p.classCache.has(fqn)) {
		const fields = p.classCache.get(fqn);
		if (!fields) return { type: "unknown", description: `(unresolved: ${fqn})` };
		return fieldsToObject(p, fields, mode);
	}
	p.resolving.add(fqn);
	try {
		const parts = fqn.split(".");
		if (parts.length < 3 || parts[0] !== "external_objects") {
			p.classCache.set(fqn, null);
			return { type: "unknown", description: `(unresolved: ${fqn})` };
		}
		const className = parts[parts.length - 1];
		const fileBase = parts.slice(1, -1).join("/");
		const content = readPyFile(p, fileBase);
		if (!content) {
			p.classCache.set(fqn, null);
			return { type: "unknown", description: `(file missing: ${fileBase}.py)` };
		}
		const result = findClassBody(content, className);
		if (!result) {
			p.classCache.set(fqn, null);
			return { type: "unknown", description: `(class missing: ${className})` };
		}
		let fields = parseGetFieldCalls(result.body);
		// Inherit fields from base class (one level only, same file).
		if (result.baseClass) {
			const sameFile = findClassBody(content, result.baseClass);
			if (sameFile) {
				const parentFields = parseGetFieldCalls(sameFile.body);
				const existingNames = new Set(fields.map(f => f.name));
				fields = [...parentFields.filter(f => !existingNames.has(f.name)), ...fields];
			} else {
				console.warn(`[gen:eightfold] ${className} extends ${result.baseClass} but parent not in same file; fields may be missing`);
			}
		}
		p.classCache.set(fqn, fields);
		return fieldsToObject(p, fields, mode);
	} finally {
		p.resolving.delete(fqn);
	}
}

function fieldsToObject(p: MarshmallowParser, fields: ParsedSchemaField[], mode: "request" | "response"): CatalogField {
	const properties: Record<string, CatalogField> = {};
	for (const f of fields) {
		if (mode === "request" && f.dumpOnly) continue;
		if (mode === "response" && f.requestOnly) continue;
		const expanded = expandRefs(p, f.type, mode);
		properties[f.name] = f.description ? { ...expanded, description: f.description } : expanded;
	}
	return { type: "object", properties };
}

function expandRefs(p: MarshmallowParser, t: CatalogField, mode: "request" | "response"): CatalogField {
	if (t.$ref) {
		const key = t.$ref.startsWith("SchemaTypes.") ? t.$ref.slice("SchemaTypes.".length) : "";
		if (key && p.schemaTypes[key]) return resolveSchema(p, p.schemaTypes[key], mode);
		return { type: "unknown", description: `(unresolved $ref: ${t.$ref})` };
	}
	if (t.type === "array" && t.items) return { type: "array", items: expandRefs(p, t.items, mode) };
	return t;
}

function resolveSchemaRef(p: MarshmallowParser, ref: unknown, mode: "request" | "response"): CatalogField | null {
	if (!ref) return null;
	if (typeof ref === "string") return resolveSchema(p, ref, mode);
	if (typeof ref === "object" && ref !== null) return ref as CatalogField;
	return null;
}

interface UpstreamConfig { entities: Record<string, UpstreamEntity> }
interface UpstreamEntity { namespace?: string; description?: string; paths?: Record<string, Record<string, UpstreamOp>> }
interface UpstreamOp {
	caller_id?: string;
	description?: string;
	summary?: string;
	logical_entity?: string;
	scope?: "READ" | "WRITE";
	parameters?: CatalogParam[];
	requestBody?: { content?: { "application/json"?: { schema?: unknown } } };
	responses?: Record<string, { content?: { "application/json"?: { schema?: unknown } } }>;
	exclude_fields_from_response?: string[];
}

const METHOD_MAP: Record<string, "GET" | "POST" | "PUT" | "PATCH" | "DELETE"> = {
	get: "GET", get_by_id: "GET", list: "GET", search: "GET",
	create: "POST", post: "POST", batch_fetch: "POST", batch_create: "POST",
	put: "PUT", update: "PUT", patch: "PATCH", delete: "DELETE",
};

function inferHttpMethod(mk: string): "GET" | "POST" | "PUT" | "PATCH" | "DELETE" {
	const direct = METHOD_MAP[mk];
	if (direct) return direct;
	const lc = mk.toLowerCase();
	if (lc.startsWith("get") || lc.includes("list") || lc.includes("search")) return "GET";
	if (lc.startsWith("delete") || lc.startsWith("remove")) return "DELETE";
	if (lc.startsWith("patch")) return "PATCH";
	if (lc.startsWith("put") || lc.startsWith("update") || lc.startsWith("replace")) return "PUT";
	return "POST";
}

function transformPath(p: string): string { return p.replaceAll(/<([^>]+)>/g, "{$1}"); }

function camel(snake: string): string { return snake.replaceAll(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase()); }

interface RawOpKey {
	stdCategory: string | null;
	subPart: string;
	fallback: string;
}

function classifyOp(callerId: string, mk: string, entityKebab: string): RawOpKey {
	const standardOps: Array<{ suffix: string; key: string }> = [
		{ suffix: "-get-by-id", key: "getById" },
		{ suffix: "-list", key: "list" },
		{ suffix: "-batch-fetch", key: "batchFetch" },
		{ suffix: "-create", key: "create" },
		{ suffix: "-update", key: "update" },
		{ suffix: "-patch", key: "patch" },
		{ suffix: "-delete", key: "delete" },
	];
	for (const { suffix, key } of standardOps) {
		if (callerId === `${entityKebab}${suffix}`) return { stdCategory: key, subPart: "", fallback: key };
		if (callerId === `${entityKebab}s${suffix}`) return { stdCategory: key, subPart: "", fallback: key };
		if (callerId === `${entityKebab.replace(/y$/, "ies")}${suffix}`) return { stdCategory: key, subPart: "", fallback: key };
	}
	for (const { suffix, key } of standardOps) {
		if (callerId.endsWith(suffix)) {
			let middle = callerId.slice(0, -suffix.length);
			if (middle.startsWith(`${entityKebab}-`)) middle = middle.slice(entityKebab.length + 1);
			if (!middle) return { stdCategory: key, subPart: "", fallback: key };
			const subPart = camel(middle.replaceAll("-", "_"));
			const cap = `${subPart.charAt(0).toUpperCase()}${subPart.slice(1)}`;
			return { stdCategory: key, subPart: cap, fallback: `${key}${cap}` };
		}
	}
	if (mk === "get_by_id") return { stdCategory: "getById", subPart: "", fallback: "getById" };
	if (mk === "batch_fetch") return { stdCategory: "batchFetch", subPart: "", fallback: "batchFetch" };
	const mkCat = mk === "list" ? "list"
		: mk === "create" ? "create"
		: mk === "update" || mk === "put" ? "update"
		: mk === "patch" ? "patch"
		: mk === "delete" ? "delete"
		: null;
	if (mkCat) return { stdCategory: mkCat, subPart: "", fallback: mkCat };
	if (mk in METHOD_MAP) return { stdCategory: null, subPart: "", fallback: camel(mk) };
	const last = callerId.split("-").pop() ?? mk;
	return { stdCategory: null, subPart: "", fallback: camel(`${mk}_${last}`) };
}

function pathParamCount(p: string): number {
	const m = p.match(/\{[^}]+\}/g);
	return m ? m.length : 0;
}

function isCanonicalForCategory(p: string, category: string | null): boolean {
	const n = pathParamCount(p);
	if (category === "list" || category === "create" || category === "batchFetch") return n === 0;
	if (category === "getById" || category === "update" || category === "patch" || category === "delete") return n === 1;
	return true;
}

async function buildCatalog(sourcePath: string): Promise<void> {
	console.log(`[gen:eightfold] reading ${sourcePath}`);
	const upstream = JSON.parse(fs.readFileSync(sourcePath, "utf8")) as UpstreamConfig;
	const parser = buildMarshmallowParser(sourcePath);
	console.log(`[gen:eightfold] loaded ${String(Object.keys(parser.schemaTypes).length)} SchemaTypes refs`);
	let existing: Catalog | undefined;
	try { existing = JSON.parse(fs.readFileSync(CATALOG_PATH, "utf8")) as Catalog; } catch { /* none */ }

	interface Candidate {
		entityKey: string;
		raw: RawOpKey;
		op: CatalogOp;
	}
	const candidatesByEntity = new Map<string, Candidate[]>();
	const entityMeta = new Map<string, { namespace: string; description: string }>();
	let opsCount = 0; let unresolved = 0;

	for (const [topKey, ent] of Object.entries(upstream.entities)) {
		for (const [rawPath, methodBlock] of Object.entries(ent.paths ?? {})) {
			for (const [mk, op] of Object.entries(methodBlock)) {
				if (!op.caller_id) continue;
				const subKey = (op as any).logical_subentity as string | undefined;
				let baseKey = op.logical_entity ?? topKey;
				if (baseKey === "upskilling_plan_assignment") baseKey = "upskill_plan_assignment";
				if (baseKey === "workforce_exchange") baseKey = "hiring_company";
				const logicalKey = subKey ? `${baseKey}_${subKey}` : baseKey;
				if (!entityMeta.has(logicalKey)) {
					entityMeta.set(logicalKey, { namespace: ent.namespace ?? "core", description: ent.description ?? "" });
				}

				const httpMethod = inferHttpMethod(mk);
				const transformedPath = transformPath(rawPath);
				const raw = classifyOp(op.caller_id, mk, entityToKebab(logicalKey));
				const reqRef = op.requestBody?.content?.["application/json"]?.schema;
				const resRef = op.responses?.["200"]?.content?.["application/json"]?.schema;
				const requestField = resolveSchemaRef(parser, reqRef, "request");
				const responseField = resolveSchemaRef(parser, resRef, "response");
				if (resRef && responseField?.type === "unknown") unresolved++;
				const catOp: CatalogOp = {
					callerId: op.caller_id,
					method: httpMethod,
					path: transformedPath,
					scope: op.scope ?? (httpMethod === "GET" ? "READ" : "WRITE"),
					summary: op.summary ?? "",
					description: op.description,
					parameters: op.parameters,
					request: requestField,
					response: responseField,
					excludeFromResponse: op.exclude_fields_from_response,
				};
				const arr = candidatesByEntity.get(logicalKey) ?? [];
				arr.push({ entityKey: logicalKey, raw, op: catOp });
				candidatesByEntity.set(logicalKey, arr);
				opsCount++;
			}
		}
	}

	// Second pass: assign keys with canonical-path priority for std categories.
	const entities: Record<string, CatalogEntity> = {};
	for (const [logicalKey, candidates] of candidatesByEntity.entries()) {
		const meta = entityMeta.get(logicalKey);
		const ops: Record<string, CatalogOp> = {};
		const stdCategories = ["getById", "list", "batchFetch", "create", "update", "patch", "delete"];
		const winnerByCategory = new Map<string, Candidate>();

		// Pick best canonical match per std category. Priority:
		//   1. canonical path-param count match
		//   2. callerId starts with the entity's kebab name (correct entity affinity)
		//   3. shortest callerId (least suffix noise)
		//   4. alphabetical callerId
		const entityKebab = entityToKebab(logicalKey);
		const startsWithEntity = (c: Candidate): number => {
			if (c.op.callerId.startsWith(`${entityKebab}-`)) return 0;
			if (c.op.callerId.startsWith(`${entityKebab}s-`)) return 0;
			if (c.op.callerId.startsWith(`${entityKebab.replace(/y$/, "ies")}-`)) return 0;
			return 1;
		};
		for (const cat of stdCategories) {
			const matches = candidates.filter(c => c.raw.stdCategory === cat);
			if (matches.length === 0) continue;
			const canonical = matches.filter(c => isCanonicalForCategory(c.op.path, cat));
			const pool = canonical.length > 0 ? canonical : matches;
			pool.sort((a, b) =>
				startsWithEntity(a) - startsWithEntity(b)
				|| a.op.callerId.length - b.op.callerId.length
				|| a.op.callerId.localeCompare(b.op.callerId)
			);
			winnerByCategory.set(cat, pool[0]);
		}

		// Assign: winners get bare std key; non-winners with same stdCategory get fallback (subPart-suffixed).
		for (const c of candidates) {
			let chosenKey: string;
			const winner = c.raw.stdCategory ? winnerByCategory.get(c.raw.stdCategory) : undefined;
			if (winner === c) {
				chosenKey = c.raw.stdCategory ?? c.raw.fallback;
			} else if (c.raw.subPart) {
				chosenKey = `${c.raw.stdCategory ?? ""}${c.raw.subPart}`;
			} else if (c.raw.stdCategory) {
				const tail = c.op.callerId.split("-").pop() ?? "";
				const subFromTail = camel(tail);
				chosenKey = `${c.raw.stdCategory}${subFromTail.charAt(0).toUpperCase()}${subFromTail.slice(1)}` || c.raw.fallback;
			} else {
				chosenKey = c.raw.fallback;
			}
			let fk = chosenKey; let n = 1;
			while (ops[fk]) { n++; fk = `${chosenKey}${String(n)}`; }
			ops[fk] = c.op;
		}

		entities[logicalKey] = {
			namespace: meta?.namespace ?? "core",
			description: meta?.description ?? "",
			ops,
			gotchas: existing?.entities[logicalKey]?.gotchas ?? [],
			batchLimit: existing?.entities[logicalKey]?.batchLimit ?? 100,
			writesAsync: existing?.entities[logicalKey]?.writesAsync ?? false,
		};
	}
	const catalog: Catalog = {
		version: "v2",
		baseUrl: "/api/v2",
		generatedAt: new Date().toISOString(),
		sourceConfig: path.basename(sourcePath),
		entities,
	};
	fs.writeFileSync(CATALOG_PATH, `${JSON.stringify(catalog, null, 2)}\n`);
	console.log(`[gen:eightfold] catalog: ${String(Object.keys(entities).length)} entities, ${String(opsCount)} ops, ${String(unresolved)} unresolved`);
	console.log(`[gen:eightfold] -> ${CATALOG_PATH}`);
}

const SKIP_MARKER = "@generator:skip";

function shouldSkipFile(filePath: string): boolean {
	if (!fs.existsSync(filePath)) return false;
	const head = fs.readFileSync(filePath, "utf8").slice(0, 256);
	return head.includes(SKIP_MARKER);
}

function entityToPascal(k: string): string {
	return k.split(/[_\s]+/).map(s => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()).join("");
}
function entityToKebab(k: string): string { return k.toLowerCase().replaceAll("_", "-"); }
function getListImport(e: CatalogEntity): string {
	const hasFilters = !!(e.ops.list?.parameters && e.ops.list.parameters.some(pp => pp.in === "query"));
	const imports = ["ListEnvelope", "BatchResponse"];
	if (hasFilters) imports.push("BaseListFilters");
	return `import type { ${imports.join(", ")} } from "./shared";`;
}
function pluralize(n: string): string {
	if (n.endsWith("s") || n.endsWith("x") || n.endsWith("ch") || n.endsWith("sh")) return `${n}es`;
	if (n.endsWith("y") && !/[aeiou]y$/.test(n)) return `${n.slice(0, -1)}ies`;
	return `${n}s`;
}
function quoteKey(k: string): string { return /^[a-zA-Z_$][\w$]*$/.test(k) ? k : JSON.stringify(k); }

function tsType(f: CatalogField | null | undefined): string {
	if (!f) return "unknown";
	if (f.type === "string") return "string";
	if (f.type === "number") return "number";
	if (f.type === "boolean") return "boolean";
	if (f.type === "array") return `${tsType(f.items)}[]`;
	if (f.type === "object") {
		if (!f.properties || Object.keys(f.properties).length === 0) return "Record<string, unknown>";
		const lines = ["{"];
		for (const [k, v] of Object.entries(f.properties)) lines.push(`\t\t${quoteKey(k)}?: ${tsType(v)};`);
		lines.push("\t}");
		return lines.join("\n");
	}
	return "unknown";
}

function emitInterface(name: string, f: CatalogField | null | undefined): string {
	if (!f || f.type !== "object" || !f.properties) return `export interface ${name} {\n\t[key: string]: unknown;\n}\n`;
	const out = [`export interface ${name} {`];
	for (const [k, v] of Object.entries(f.properties)) {
		const desc = v.description ? `\t/** ${v.description.replaceAll(/\*\//g, "*\\/")} */\n` : "";
		out.push(`${desc}\t${quoteKey(k)}?: ${tsType(v)};`);
	}
	out.push("}\n");
	return out.join("\n");
}

function emitParams(name: string, params: CatalogParam[] | undefined): string {
	if (!params) return "";
	const q = params.filter(p => p.in === "query");
	if (q.length === 0) return "";
	const out = [`export interface ${name} extends BaseListFilters {`];
	for (const p of q) {
		const desc = p.description ? `\t/** ${p.description.replaceAll(/\*\//g, "*\\/")} */\n` : "";
		out.push(`${desc}\t${quoteKey(p.name)}${p.required ? "" : "?"}: ${tsType(p.schema)};`);
	}
	out.push("}\n");
	return out.join("\n");
}

function emitTypes(k: string, e: CatalogEntity): void {
	const Pascal = entityToPascal(k);
	const kebab = entityToKebab(k);
	if (shouldSkipFile(path.join(TYPES_DIR, `${kebab}.ts`))) return;
	const lines = [`// Generated by _generator/generate.ts. Do not hand-edit.`, `// Entity: ${k} (${e.namespace})`, ``, getListImport(e), ``];
	const primary = e.ops.getById ?? e.ops.list ?? Object.values(e.ops)[0];
	let main: CatalogField | null | undefined = primary?.response;
	if (main?.type === "array" && main.items) main = main.items;
	if (main?.type === "object" && main.properties && Object.keys(main.properties).length === 1) {
		const onlyKey = Object.keys(main.properties)[0];
		const ov = main.properties[onlyKey];
		if (ov?.type === "array" && ov.items) main = ov.items;
		else if (ov?.type === "object") main = ov;
	}
	lines.push(emitInterface(Pascal, main));
	if (e.ops.list?.parameters) lines.push(emitParams(`${Pascal}ListFilters`, e.ops.list.parameters));
	if (e.ops.create?.request) lines.push(emitInterface(`${Pascal}CreateInput`, e.ops.create.request));
	if (e.ops.update?.request) lines.push(emitInterface(`${Pascal}UpdateInput`, e.ops.update.request));
	lines.push(`export type ${Pascal}List = ListEnvelope<${Pascal}>;`);
	lines.push(`export type ${Pascal}Batch = BatchResponse<${Pascal}>;`, ``);
	fs.mkdirSync(TYPES_DIR, { recursive: true });
	fs.writeFileSync(path.join(TYPES_DIR, `${kebab}.ts`), lines.join("\n"));
}

function exportNames(Pascal: string, e: CatalogEntity): Record<string, string> {
	const out: Record<string, string> = {};
	const plural = pluralize(Pascal);
	if (e.ops.getById) out.getById = `get${Pascal}`;
	if (e.ops.list) out.list = `list${plural}`;
	if (e.ops.batchFetch) out.batchFetch = `batchFetch${plural}`;
	if (e.ops.create) out.create = `create${Pascal}`;
	if (e.ops.update) out.update = `update${Pascal}`;
	if (e.ops.patch) out.patch = `patch${Pascal}`;
	if (e.ops.delete) out.delete = `delete${Pascal}`;
	return out;
}

function emitService(k: string, e: CatalogEntity): void {
	const Pascal = entityToPascal(k);
	const kebab = entityToKebab(k);
	if (shouldSkipFile(path.join(SERVICES_DIR, `${kebab}.service.ts`))) return;
	const hasFilters = !!(e.ops.list?.parameters && e.ops.list.parameters.some(p => p.in === "query"));
	const hasStandardSvc = !!(e.ops.getById || e.ops.list || e.ops.batchFetch || e.ops.create || e.ops.update || e.ops.patch || e.ops.delete);
	const stdNames = exportNames(Pascal, e);
	const stdOpKeys = new Set(Object.keys(stdNames));
	const nonStdOps = Object.entries(e.ops).filter(([opKey]) => !stdOpKeys.has(opKey));
	if (Object.keys(e.ops).length === 0) {
		fs.writeFileSync(path.join(SERVICES_DIR, `${kebab}.service.ts`), `// Generated by _generator/generate.ts. Do not hand-edit.\n// No ops registered.\nexport {};\n`);
		return;
	}
	const lines = [`// Generated by _generator/generate.ts. Do not hand-edit.`];
	const tImports = [Pascal];
	if (hasFilters) tImports.push(`${Pascal}ListFilters`);
	if (e.ops.create?.request) tImports.push(`${Pascal}CreateInput`);
	if (e.ops.update?.request) tImports.push(`${Pascal}UpdateInput`);
	const factoryImports = ["createEntityService"];
	if (nonStdOps.length > 0) factoryImports.push("type OpInvokeArgs");
	lines.push(`import { ${factoryImports.join(", ")} } from "../service-factory";`);
	lines.push(`import type { ${tImports.join(", ")} } from "../types/${kebab}";`);
	lines.push(``);
	const fA = hasFilters ? `${Pascal}ListFilters` : "Record<string, unknown>";
	const ciA = e.ops.create?.request ? `${Pascal}CreateInput` : `Partial<${Pascal}>`;
	const uiA = e.ops.update?.request ? `${Pascal}UpdateInput` : `Partial<${Pascal}>`;
	lines.push(`export const _svc${Pascal} = createEntityService<${Pascal}, ${fA}, ${ciA}, ${uiA}>({`);
	lines.push(`\tentity: ${JSON.stringify(kebab)},`, `\tnamespace: ${JSON.stringify(e.namespace)},`, `\tops: {`);
	for (const [opKey, op] of Object.entries(e.ops)) {
		lines.push(`\t\t${opKey}: { callerId: ${JSON.stringify(op.callerId)}, method: ${JSON.stringify(op.method)}, path: ${JSON.stringify(op.path)} },`);
	}
	lines.push(`\t},`, `});`, ``);
	if (hasStandardSvc) {
		for (const [opKey, name] of Object.entries(stdNames)) {
			lines.push(`export const ${name} = _svc${Pascal}.${opKey};`);
		}
	}
	for (const [opKey, op] of nonStdOps) {
		const fnName = nonStdServiceName(opKey, Pascal, op);
		lines.push(`/** ${op.summary || op.callerId} — ${op.method} ${op.path} */`);
		lines.push(`export const ${fnName} = (args?: OpInvokeArgs) => _svc${Pascal}.call("${opKey}", args);`);
	}
	lines.push(``);
	fs.mkdirSync(SERVICES_DIR, { recursive: true });
	fs.writeFileSync(path.join(SERVICES_DIR, `${kebab}.service.ts`), lines.join("\n"));
}

function nonStdServiceName(opKey: string, Pascal: string, _op: CatalogOp): string {
	// opKey is camelCase descriptive (e.g. "getByIdAttachment", "listSearch", "createRole").
	// Append entity Pascal where it doesn't already encode it.
	const lc = opKey.toLowerCase();
	if (lc.includes(Pascal.toLowerCase())) return opKey;
	return `${opKey}${Pascal}`;
}

function nonStdHookName(opKey: string, Pascal: string): string {
	const opPascal = opKey.charAt(0).toUpperCase() + opKey.slice(1);
	const lc = opKey.toLowerCase();
	if (lc.includes(Pascal.toLowerCase())) return `use${opPascal}`;
	return `use${opPascal}${Pascal}`;
}

function emitHooks(k: string, e: CatalogEntity): void {
	const Pascal = entityToPascal(k);
	const kebab = entityToKebab(k);
	if (shouldSkipFile(path.join(HOOKS_DIR, `use-${kebab}.ts`))) return;
	const plural = pluralize(Pascal);
	const hasFilters = !!(e.ops.list?.parameters && e.ops.list.parameters.some(p => p.in === "query"));
	const stdNames = exportNames(Pascal, e);
	const stdOpKeys = new Set(Object.keys(stdNames));
	const nonStdOps = Object.entries(e.ops).filter(([opKey]) => !stdOpKeys.has(opKey));
	if (Object.keys(e.ops).length === 0) {
		fs.writeFileSync(path.join(HOOKS_DIR, `use-${kebab}.ts`), `// Generated. No ops.\nexport {};\n`);
		return;
	}
	const lines = [`// Generated by _generator/generate.ts. Do not hand-edit.`];
	const tImports = [Pascal];
	if (hasFilters) tImports.push(`${Pascal}ListFilters`);
	lines.push(`import { createEntityHooks } from "../hooks-factory";`);
	lines.push(`import { _svc${Pascal} as _svc } from "../services/${kebab}.service";`);
	lines.push(`import type { ${tImports.join(", ")} } from "../types/${kebab}";`);
	lines.push(``);
	const fA = hasFilters ? `${Pascal}ListFilters` : "Record<string, unknown>";
	lines.push(`const _h = createEntityHooks<${Pascal}, ${fA}>(${JSON.stringify(kebab)}, _svc);`, ``);
	if (e.ops.getById) lines.push(`export const use${Pascal} = _h.useDetail;`);
	if (e.ops.list) lines.push(`export const use${plural} = _h.useList;`);
	if (e.ops.batchFetch) lines.push(`export const useBatchFetch${plural} = _h.useBatchFetch;`);
	if (e.ops.create) lines.push(`export const useCreate${Pascal} = _h.useCreate;`);
	if (e.ops.update) lines.push(`export const useUpdate${Pascal} = _h.useUpdate;`);
	if (e.ops.patch) lines.push(`export const usePatch${Pascal} = _h.usePatch;`);
	if (e.ops.delete) lines.push(`export const useDelete${Pascal} = _h.useDelete;`);
	for (const [opKey, op] of nonStdOps) {
		const hookName = nonStdHookName(opKey, Pascal);
		const factoryFn = op.method === "GET" ? "makeOpQuery" : "makeOpMutation";
		lines.push(`/** ${op.summary || op.callerId} \u2014 ${op.method} ${op.path} */`);
		lines.push(`export const ${hookName} = _h.${factoryFn}(${JSON.stringify(opKey)});`);
	}
	lines.push(``);
	fs.mkdirSync(HOOKS_DIR, { recursive: true });
	fs.writeFileSync(path.join(HOOKS_DIR, `use-${kebab}.ts`), lines.join("\n"));
}

function emitDocs(k: string, e: CatalogEntity): void {
	const Pascal = entityToPascal(k);
	const kebab = entityToKebab(k);
	if (shouldSkipFile(path.join(DOCS_DIR, `${kebab}.md`))) return;
	const plural = pluralize(Pascal);
	const stdNames = exportNames(Pascal, e);
	const stdOpKeys = new Set(Object.keys(stdNames));
	const nonStdOps = Object.entries(e.ops).filter(([opKey]) => !stdOpKeys.has(opKey));

	const lines = [`# ${Pascal}`, ``, `Eightfold ${e.namespace} entity. ${e.description || `Auto-generated docs for \`${k}\`.`}`, ``, `## Operations`, ``, `| Op | Method | Path | Caller ID |`, `|----|--------|------|-----------|`];
	for (const [opKey, op] of Object.entries(e.ops)) {
		lines.push(`| ${opKey} | ${op.method} | \`${op.path}\` | \`${op.callerId}\` |`);
	}
	lines.push(``, `## Hooks`, ``);
	if (e.ops.getById) lines.push(`- \`use${Pascal}(id)\` — fetch single (op: \`getById\`)`);
	if (e.ops.list) lines.push(`- \`use${plural}(filters?)\` — paginated list (op: \`list\`)`);
	if (e.ops.batchFetch) lines.push(`- \`useBatchFetch${plural}(ids)\` — batch read max ${String(e.batchLimit)} (op: \`batchFetch\`)`);
	if (e.ops.create) lines.push(`- \`useCreate${Pascal}()\` — mutation (op: \`create\`)`);
	if (e.ops.update) lines.push(`- \`useUpdate${Pascal}()\` — mutation (op: \`update\`)`);
	if (e.ops.patch) lines.push(`- \`usePatch${Pascal}()\` — mutation (op: \`patch\`)`);
	if (e.ops.delete) lines.push(`- \`useDelete${Pascal}()\` — mutation (op: \`delete\`)`);
	for (const [opKey, op] of nonStdOps) {
		const hookName = nonStdHookName(opKey, Pascal);
		const sigHint = op.method === "GET" ? "(args?: { path?, query? }, options?)" : "(options?)";
		lines.push(`- \`${hookName}${sigHint}\` — ${op.method} \`${op.path}\` (op: \`${opKey}\`)`);
	}
	lines.push(``, `## Services (non-React contexts)`, ``);
	for (const [opKey, fnName] of Object.entries(stdNames)) {
		lines.push(`- \`${fnName}\` — op: \`${opKey}\``);
	}
	for (const [opKey, op] of nonStdOps) {
		const fnName = nonStdServiceName(opKey, Pascal, op);
		lines.push(`- \`${fnName}(args?: { path?, query?, body? })\` — op: \`${opKey}\` (${op.method} \`${op.path}\`)`);
	}
	lines.push(``);
	if (e.gotchas.length > 0) { lines.push(`## Gotchas`, ``); for (const g of e.gotchas) lines.push(`- ${g}`); lines.push(``); }
	lines.push(`## Example`, ``, "```ts");
	if (e.ops.list) {
		lines.push(`import { use${plural} } from "@/features/eightfold-api";`);
		lines.push(``);
		lines.push(`const { data, isLoading } = use${plural}();`);
	} else if (e.ops.getById) {
		lines.push(`import { use${Pascal} } from "@/features/eightfold-api";`);
		lines.push(``);
		lines.push(`const { data, isLoading } = use${Pascal}(id);`);
	} else if (nonStdOps.length > 0) {
		const [opKey, op] = nonStdOps[0];
		const hookName = nonStdHookName(opKey, Pascal);
		lines.push(`import { ${hookName} } from "@/features/eightfold-api";`);
		lines.push(``);
		const tokens = (op.path.match(/\{(\w+)\}/g) ?? []).map(s => s.slice(1, -1));
		const pathArg = tokens.length > 0 ? `{ path: { ${tokens.map(t => `${t}: "..."`).join(", ")} } }` : "";
		lines.push(op.method === "GET" ? `const { data, isLoading } = ${hookName}(${pathArg});` : `const { mutate } = ${hookName}();`);
	} else {
		lines.push(`// No standard ops on this entity.`);
	}
	lines.push("```", ``);
	fs.mkdirSync(DOCS_DIR, { recursive: true });
	fs.writeFileSync(path.join(DOCS_DIR, `${kebab}.md`), lines.join("\n"));
}

function emitBarrels(c: Catalog): void {
	const keys = Object.keys(c.entities).sort();
	const tb = [`// Generated.`, `export * from "./shared";`];
	for (const k of keys) tb.push(`export * from "./${entityToKebab(k)}";`);
	fs.writeFileSync(path.join(TYPES_DIR, "index.ts"), `${tb.join("\n")}\n`);
	const sb = [`// Generated.`];
	for (const k of keys) sb.push(`export * from "./${entityToKebab(k)}.service";`);
	fs.writeFileSync(path.join(SERVICES_DIR, "index.ts"), `${sb.join("\n")}\n`);
	const hb = [`// Generated.`];
	for (const k of keys) hb.push(`export * from "./use-${entityToKebab(k)}";`);
	fs.writeFileSync(path.join(HOOKS_DIR, "index.ts"), `${hb.join("\n")}\n`);
	const tt = [
		`// Generated by _generator/generate.ts. Do not hand-edit.`,
		`export { fetchApiGet, fetchApiPost, fetchApiPut, fetchApiPatch, fetchApiDelete, fetchApiBlob } from "./client";`,
		`export { ApiError } from "./errors";`,
		`export { eightfoldKeys } from "./query-keys";`,
		`export type { EightfoldDomain, ApiConfig } from "./config";`,
		`export type { ListMeta, ListEnvelope, BatchResponse, ApiResponse } from "./types/shared";`,
		`export * from "./hooks";`,
		`export * from "./services";`,
		`export * from "./types";`,
	];
	fs.writeFileSync(path.join(ROOT, "index.ts"), `${tt.join("\n")}\n`);
}

async function emitFiles(): Promise<void> {
	if (!fs.existsSync(CATALOG_PATH)) throw new Error(`api-catalog.json missing. Run --catalog first.`);
	const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, "utf8")) as Catalog;
	for (const [k, e] of Object.entries(catalog.entities)) {
		emitTypes(k, e); emitService(k, e); emitHooks(k, e); emitDocs(k, e);
	}
	emitBarrels(catalog);
	console.log(`[gen:eightfold] emitted ${String(Object.keys(catalog.entities).length)} entities`);
}

async function main(): Promise<void> {
	const args = parseArgs(process.argv.slice(2));
	console.log(`[gen:eightfold] mode=${args.mode}`);
	if (args.mode === "catalog") { console.log(`[gen:eightfold] source=${args.source}`); await buildCatalog(args.source); }
	else { await emitFiles(); }
}

main().catch((err: unknown) => { console.error("[gen:eightfold] failed:", err); process.exit(1); });
