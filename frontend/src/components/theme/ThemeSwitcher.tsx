import { Palette, RotateCcw, X } from "lucide-react";
import { useEffect, useMemo, useState, type ReactElement } from "react";

import { cssVarToHex } from "@/lib/cssVarToHex";
import {
	GLOBAL_THEME_FIELDS,
	NAVBAR_THEME_FIELDS,
	useThemeStore,
	type ThemeField,
} from "@/store/theme";

import "./ThemeSwitcher.css";

function ThemeRow({ field }: { field: ThemeField }): ReactElement {
	const overrides = useThemeStore((s) => s.overrides);
	const setOverride = useThemeStore((s) => s.setOverride);
	const clearOverride = useThemeStore((s) => s.clearOverride);

	const current = overrides[field.cssVar];
	const [text, setText] = useState(current ?? "");

	useEffect(() => {
		setText(current ?? "");
	}, [current]);

	// The native color picker doubles as the visible swatch. Its `value`
	// must be `#rrggbb`, so when the user has typed a hex we echo it back;
	// otherwise we resolve the currently-active CSS variable through the
	// shared util (handles oklch/hsl/named/var() chains). `overrides` is in
	// deps because changes to OTHER vars can cascade through var() chains
	// and change this field's effective resolved color.
	const pickerHex = useMemo(() => {
		void overrides;
		return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(text)
			? text
			: cssVarToHex(field.cssVar);
	}, [text, overrides, field.cssVar]);

	function commit(value: string): void {
		if (value === "") {
			clearOverride(field.cssVar);
		} else {
			setOverride(field.cssVar, value);
		}
	}

	return (
		<div className="flex items-center gap-2 py-1.5">
			<label className="flex-1 text-sm text-foreground">
				{field.label}
			</label>
			<input
				aria-label={`${field.label} color picker`}
				className="h-7 w-9 shrink-0 cursor-pointer rounded border border-border bg-background p-0.5"
				type="color"
				value={pickerHex}
				onChange={(e) => {
					setText(e.target.value);
					commit(e.target.value);
				}}
			/>
			<input
				aria-label={`${field.label} value`}
				className="h-7 w-36 rounded border border-border bg-background px-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-ring"
				placeholder={field.defaultValue}
				type="text"
				value={text}
				onBlur={() => {
					commit(text);
				}}
				onChange={(e) => {
					setText(e.target.value);
				}}
				onKeyDown={(e) => {
					if (e.key === "Enter") {
						commit(text);
						e.currentTarget.blur();
					}
				}}
			/>
			{current !== undefined && (
				<button
					aria-label={`Clear ${field.label}`}
					className="shrink-0 text-xs text-muted-foreground hover:text-foreground"
					type="button"
					onClick={() => {
						clearOverride(field.cssVar);
					}}
				>
					<X className="h-3.5 w-3.5" />
				</button>
			)}
		</div>
	);
}

function Section({
	title,
	fields,
}: {
	title: string;
	fields: ReadonlyArray<ThemeField>;
}): ReactElement {
	return (
		<div className="border-b border-border px-4 py-3">
			<h3 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
				{title}
			</h3>
			<div className="flex flex-col">
				{fields.map((field) => (
					<ThemeRow key={field.key} field={field} />
				))}
			</div>
		</div>
	);
}

/**
 * Conventional floating-action-button placement: bottom-right of the viewport.
 * Position is independent of VITE_APP_MODE — the top dev bars don't overlap
 * this corner in either mode, and this keeps the top-right clear for TopNav
 * content (avatar, utility buttons).
 */
const FAB_POSITION_CLASS = "bottom-6 right-6";
const PANEL_POSITION_CLASS = "bottom-20 right-6";

/**
 * Self-contained theme switcher:
 *  - Floating palette FAB anchored bottom-right (below dev bars in prototype mode)
 *  - Right-docked panel that opens on click; own panel state (not in
 *    DevToolbarProvider) so it works without dev-only infrastructure
 *  - Respects VITE_ENABLE_THEME_PANEL=false as a build-time kill switch
 *    for customer deployments where retheming shouldn't be exposed.
 */
export function ThemeSwitcher(): ReactElement | null {
	const isPanelOpen = useThemeStore((s) => s.isPanelOpen);
	const togglePanel = useThemeStore((s) => s.togglePanel);
	const applyAll = useThemeStore((s) => s.applyAll);
	const resetAll = useThemeStore((s) => s.resetAll);
	const overrideCount = useThemeStore(
		(s) => Object.keys(s.overrides).length,
	);

	// Re-apply persisted overrides once on mount.
	useEffect(() => {
		applyAll();
	}, [applyAll]);

	if (import.meta.env["VITE_ENABLE_THEME_PANEL"] === "false") return null;

	return (
		<>
			<button
				aria-label="Open theme settings"
				aria-pressed={isPanelOpen}
				className={`theme-switcher-fab fixed ${FAB_POSITION_CLASS} z-[9997] inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-foreground shadow-lg hover:bg-muted`}
				type="button"
				onClick={togglePanel}
			>
				<Palette className="h-4 w-4" />
			</button>

			{isPanelOpen && (
				<aside
					aria-label="Theme settings"
					className={`theme-switcher-panel fixed ${PANEL_POSITION_CLASS} z-[9998] flex max-h-[calc(100vh-8rem)] w-80 flex-col rounded-lg border border-border bg-background shadow-2xl`}
				>
					<header className="flex items-center justify-between border-b border-border px-4 py-3">
						<div className="flex items-center gap-2">
							<Palette className="h-4 w-4 text-foreground" />
							<h2 className="text-sm font-semibold text-foreground">
								Theme Settings
							</h2>
						</div>
						<button
							aria-label="Close theme panel"
							className="text-muted-foreground hover:text-foreground"
							type="button"
							onClick={togglePanel}
						>
							<X className="h-4 w-4" />
						</button>
					</header>

					<div className="flex-1 overflow-y-auto">
						<Section
							fields={NAVBAR_THEME_FIELDS}
							title="Navbar Theme"
						/>
						<Section fields={GLOBAL_THEME_FIELDS} title="Global" />
						<p className="px-4 py-3 text-xs text-muted-foreground">
							Accepts any CSS color: hex (<code>#ef4444</code>),
							rgb, hsl, or token references like{" "}
							<code>var(--color-blue-60)</code>. Leave blank to
							revert.
						</p>
					</div>

					<footer className="flex items-center justify-between border-t border-border px-4 py-3">
						<span className="text-xs text-muted-foreground">
							{overrideCount === 0
								? "No overrides"
								: `${String(overrideCount)} override${overrideCount === 1 ? "" : "s"}`}
						</span>
						<button
							className="inline-flex items-center gap-1.5 rounded border border-border bg-background px-2.5 py-1 text-xs text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
							disabled={overrideCount === 0}
							type="button"
							onClick={resetAll}
						>
							<RotateCcw className="h-3.5 w-3.5" />
							Reset to Defaults
						</button>
					</footer>
				</aside>
			)}
		</>
	);
}
