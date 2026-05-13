import type { ReactElement } from "react";

import { strings } from "../strings";

interface Props {
	variant?: "empty" | "hub";
}

export function PrepFooter({ variant = "hub" }: Props): ReactElement {
	const isEmpty = variant === "empty";
	const body = isEmpty ? strings.privacy.emptyBody : strings.privacy.hubBody;
	return (
		<aside
			className={`mt-9 flex items-start gap-3 rounded-[10px] bg-[#f7f8fa] ${isEmpty ? "px-5 py-4" : "px-4 py-3.5"}`}
		>
			<span className="text-sm text-[#1877f2]" aria-hidden>
				{strings.privacy.icon}
			</span>
			<p className="text-[12.5px] leading-[1.55] text-[#65676b]">
				{isEmpty && (
					<strong className="text-[#080809]">{strings.privacy.leadIn}</strong>
				)}
				{isEmpty ? " " : ""}
				{body}
			</p>
		</aside>
	);
}
