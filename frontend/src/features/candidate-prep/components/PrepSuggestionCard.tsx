import type { ReactElement } from "react";

interface Props {
	icon: string;
	title: string;
	body: string;
	cta: string;
	helpfulWhen: string;
	onSelect: () => void;
}

export function PrepSuggestionCard({
	icon,
	title,
	body,
	cta,
	helpfulWhen,
	onSelect,
}: Props): ReactElement {
	return (
		<button
			type="button"
			onClick={onSelect}
			className="group flex h-full flex-col rounded-xl border border-[#e4e6eb] bg-white p-5 text-left transition hover:border-[#1877f2] hover:shadow-sm focus-visible:border-[#1877f2] focus-visible:ring-2 focus-visible:ring-[#1877f2] focus-visible:ring-offset-2 focus-visible:outline-none active:bg-[#f7f8fa]"
		>
			<span
				className="mb-[14px] flex h-8 w-8 items-center justify-center rounded-lg bg-[#e7f3ff] text-base text-[#1877f2]"
				aria-hidden
			>
				{icon}
			</span>
			<h3 className="mb-1.5 text-[15px] font-semibold text-[#080809]">
				{title}
			</h3>
			<p className="mb-[14px] text-[12.5px] leading-[1.55] text-[#65676b]">
				{body}
			</p>
			<span className="text-[12px] font-semibold text-[#1877f2] group-hover:underline">
				{cta}
			</span>
			<span className="mt-2.5 border-t border-dashed border-[#e4e6eb] pt-2.5 text-[11px] text-[#8a8d91]">
				{helpfulWhen}
			</span>
		</button>
	);
}
