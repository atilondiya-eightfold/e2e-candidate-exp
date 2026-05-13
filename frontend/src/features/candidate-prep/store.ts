import { create } from "zustand";

/**
 * Demo state store. Lets the dev toolbar flip between "empty" (no gap
 * report, no mocks) and "populated" (steady-state hub) so the same
 * /prep/:applicationId route can show both views per spec NFR-4.
 *
 * Replace with TanStack Query in ui-builder; this whole store goes away.
 */
export type DemoState = "empty" | "populated" | "loading" | "error";

interface PrepDemoStore {
	state: DemoState;
	setState: (s: DemoState) => void;
}

const STORAGE_KEY = "candidate-prep:v1:demo-state";
const initial: DemoState =
	(typeof window !== "undefined" &&
		(localStorage.getItem(STORAGE_KEY) as DemoState | null)) ||
	"populated";

export const usePrepDemoStore = create<PrepDemoStore>((set) => ({
	state: initial,
	setState: (s) => {
		if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, s);
		set({ state: s });
	},
}));
