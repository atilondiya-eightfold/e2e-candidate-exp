import type { ReactElement } from "react";

import { usePrepDemoStore, type DemoState } from "../store";

const OPTIONS: { value: DemoState; label: string }[] = [
	{ value: "empty", label: "Empty" },
	{ value: "populated", label: "Populated" },
	{ value: "loading", label: "Loading" },
	{ value: "error", label: "Error" },
];

/**
 * Dev-only toolbar — flips the prep state used by all candidate-prep
 * routes. Gated on import.meta.env.DEV; ui-builder removes in Phase 0.
 */
export function DemoToolbar(): ReactElement | null {
	const state = usePrepDemoStore((s) => s.state);
	if (!import.meta.env["DEV"]) return null;
	return (
		<div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-[#e4e6eb] bg-white px-3 py-2 shadow-lg">
			<span className="text-[10.5px] font-bold uppercase tracking-wider text-[#65676b]">
				Demo state
			</span>
			{OPTIONS.map((opt) => {
				const active = state === opt.value;
				return (
					<button
						key={opt.value}
						type="button"
						onClick={() => usePrepDemoStore.getState().setState(opt.value)}
						className={`rounded-full px-3 py-1 text-[11px] font-semibold transition ${
							active
								? "bg-[#1877f2] text-white"
								: "bg-[#f0f1f3] text-[#65676b] hover:bg-[#e4e6eb]"
						}`}
					>
						{opt.label}
					</button>
				);
			})}
		</div>
	);
}
