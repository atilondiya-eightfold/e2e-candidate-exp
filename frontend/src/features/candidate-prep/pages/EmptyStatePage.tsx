import type { ReactElement } from "react";
import { useNavigate } from "@tanstack/react-router";

import { ApplicationCard } from "../components/ApplicationCard";
import { PrepSuggestionCard } from "../components/PrepSuggestionCard";
import { PrepFooter } from "../components/PrepFooter";
import { TopNav } from "../components/TopNav";
import { populatedState } from "../mocks/data";
import { strings } from "../strings";

interface Props {
	applicationId: string;
}

export function EmptyStatePage({ applicationId }: Props): ReactElement {
	const navigate = useNavigate();
	const { application } = populatedState;
	const s = strings.empty;
	const onView = () => navigate({ to: "/prep/$applicationId", params: { applicationId } });
	const goGapReport = () =>
		navigate({ to: "/prep/$applicationId/gap-report", params: { applicationId } });
	const goMock = () =>
		navigate({ to: "/prep/$applicationId/mock/launch", params: { applicationId } });
	const goStudy = () =>
		navigate({ to: "/prep/$applicationId/study-plan", params: { applicationId } });

	return (
		<div className="bg-white">
			<TopNav applicationId={applicationId} />
			<div className="px-4 py-6 sm:px-14 sm:py-9">
				<h1 className="mb-5 text-[28px] font-semibold tracking-[-0.5px] text-[#080809]">
					{s.pageTitle}
				</h1>

				<ApplicationCard application={application} onView={onView} />

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
					<PrepSuggestionCard {...s.cards.gapReport} onSelect={goGapReport} />
					<PrepSuggestionCard {...s.cards.mock} onSelect={goMock} />
					<PrepSuggestionCard {...s.cards.study} onSelect={goStudy} />
				</div>

				<PrepFooter variant="empty" />
			</div>
		</div>
	);
}
