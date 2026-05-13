import type { ReactElement } from "react";

import { ApplicationCard } from "../components/ApplicationCard";
import { PrepSuggestionCard } from "../components/PrepSuggestionCard";
import { mockApplication } from "../mocks/empty-state";
import { emptyStateStrings as s } from "../strings";

interface Props {
	applicationId: string;
}

export function EmptyStatePage({ applicationId }: Props): ReactElement {
	const onView = () => {
		console.log("[candidate-prep] view application", applicationId);
	};
	const onPick = (which: "gap-report" | "mock" | "study") => () => {
		console.log("[candidate-prep] pick", which, applicationId);
	};

	return (
		<div className="bg-white px-4 py-6 sm:px-14 sm:py-9">
			<h1 className="mb-5 text-[28px] font-semibold tracking-[-0.5px] text-[#080809]">
				{s.pageTitle}
			</h1>

			<ApplicationCard application={mockApplication} onView={onView} />

			<hr className="my-8 border-0 border-t border-[#e4e6eb]" />

			<div className="mb-2">
				<h2 className="text-[18px] font-semibold text-[#080809]">
					{s.prepHeading}
				</h2>
				<p className="mt-1.5 max-w-[680px] text-[13.5px] leading-[1.55] text-[#65676b]">
					{s.prepFraming}
				</p>
			</div>

			<div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
				<PrepSuggestionCard
					{...s.cards.gapReport}
					onSelect={onPick("gap-report")}
				/>
				<PrepSuggestionCard {...s.cards.mock} onSelect={onPick("mock")} />
				<PrepSuggestionCard {...s.cards.study} onSelect={onPick("study")} />
			</div>

			<aside className="mt-9 flex items-start gap-3 rounded-[10px] bg-[#f7f8fa] px-5 py-4">
				<span className="text-sm text-[#1877f2]" aria-hidden>
					{s.privacy.icon}
				</span>
				<p className="text-[12.5px] leading-[1.55] text-[#65676b]">
					<strong className="text-[#080809]">{s.privacy.leadIn}</strong>{" "}
					{s.privacy.body}
				</p>
			</aside>
		</div>
	);
}
