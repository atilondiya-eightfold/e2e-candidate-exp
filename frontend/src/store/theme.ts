import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface ThemeField {
	key: string;
	label: string;
	cssVar: string;
	defaultValue: string;
}

export interface ThemeSection {
	title: string;
	fields: Array<ThemeField>;
}

export const NAVBAR_THEME_FIELDS: ReadonlyArray<ThemeField> = [
	{
		key: "navbar-fg",
		label: "Text Color",
		cssVar: "--navbar-fg",
		defaultValue: "var(--color-grey-70)",
	},
	{
		key: "navbar-fg-hover",
		label: "Text Hover Color",
		cssVar: "--navbar-fg-hover",
		defaultValue: "var(--color-grey-60)",
	},
	{
		key: "navbar-bg",
		label: "Background",
		cssVar: "--navbar-bg",
		defaultValue: "#ffffffeb",
	},
	{
		key: "navbar-bg-hover",
		label: "Text Hover Background",
		cssVar: "--navbar-bg-hover",
		defaultValue: "var(--color-grey-10)",
	},
];

export const GLOBAL_THEME_FIELDS: ReadonlyArray<ThemeField> = [
	{
		key: "primary",
		label: "Primary Color",
		cssVar: "--primary",
		defaultValue: "#146da6",
	},
	{
		key: "accent",
		label: "Accent Color",
		cssVar: "--accent",
		defaultValue: "#e1f0fa",
	},
	{
		key: "destructive",
		label: "Disruptive Color",
		cssVar: "--destructive",
		defaultValue: "#c43030",
	},
	{
		key: "foreground",
		label: "Text Color",
		cssVar: "--foreground",
		defaultValue: "#232630",
	},
	{
		key: "muted-foreground",
		label: "Text Color Secondary",
		cssVar: "--muted-foreground",
		defaultValue: "#5a616e",
	},
	{
		key: "primary-foreground",
		label: "Text Color Inverse",
		cssVar: "--primary-foreground",
		defaultValue: "#ffffff",
	},
	{
		key: "background",
		label: "Background Color",
		cssVar: "--background",
		defaultValue: "#ffffff",
	},
	{
		key: "success",
		label: "Success Color",
		cssVar: "--success",
		defaultValue: "#2e7d32",
	},
	{
		key: "warning",
		label: "Warning Color",
		cssVar: "--warning",
		defaultValue: "#d87a00",
	},
];

export const ALL_THEME_FIELDS: ReadonlyArray<ThemeField> = [
	...NAVBAR_THEME_FIELDS,
	...GLOBAL_THEME_FIELDS,
];

function applyOverrideToRoot(cssVariable: string, value: string | null): void {
	const root = document.documentElement;
	if (value === null || value === "") {
		root.style.removeProperty(cssVariable);
	} else {
		root.style.setProperty(cssVariable, value);
	}
}

interface ThemeState {
	overrides: Record<string, string>;
	isPanelOpen: boolean;
	setOverride: (cssVariable: string, value: string) => void;
	clearOverride: (cssVariable: string) => void;
	resetAll: () => void;
	applyAll: () => void;
	togglePanel: () => void;
	setPanelOpen: (open: boolean) => void;
}

export const useThemeStore = create<ThemeState>()(
	persist(
		(set, get) => ({
			overrides: {},
			isPanelOpen: false,

			setOverride: (cssVariable, value): void => {
				applyOverrideToRoot(cssVariable, value);
				set((s) => ({
					overrides: { ...s.overrides, [cssVariable]: value },
				}));
			},

			clearOverride: (cssVariable): void => {
				applyOverrideToRoot(cssVariable, null);
				set((s) => {
					const next = { ...s.overrides };
					delete next[cssVariable];
					return { overrides: next };
				});
			},

			resetAll: (): void => {
				const { overrides } = get();
				for (const cssVariable of Object.keys(overrides)) {
					applyOverrideToRoot(cssVariable, null);
				}
				set({ overrides: {} });
			},

			applyAll: (): void => {
				const { overrides } = get();
				for (const [cssVariable, value] of Object.entries(overrides)) {
					applyOverrideToRoot(cssVariable, value);
				}
			},

			togglePanel: (): void => {
				set((s) => ({ isPanelOpen: !s.isPanelOpen }));
			},

			setPanelOpen: (open): void => {
				set({ isPanelOpen: open });
			},
		}),
		{
			name: "theme-overrides",
			partialize: (state): Partial<ThemeState> => ({
				overrides: state.overrides,
			}),
		},
	),
);
