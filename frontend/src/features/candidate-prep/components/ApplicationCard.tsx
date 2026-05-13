import type { ReactElement } from "react";

import { emptyStateStrings } from "../strings";
import type { ApplicationSummary } from "../mocks/empty-state";
import { ApplicationTimeline } from "./ApplicationTimeline";

interface Props {
	application: ApplicationSummary;
	onView: () => void;
}

export function ApplicationCard({ application, onView }: Props): ReactElement {
	const { application: copy } = emptyStateStrings;
	return (
		<section className="mb-9 rounded-xl border border-[#e4e6eb] px-7 py-6">
			<div className="mb-6 flex items-start justify-between gap-4">
				<div>
					<h2 className="text-[17px] font-semibold text-[#080809]">
						{application.roleTitle}
					</h2>
					<p className="mt-1 text-[13px] text-[#65676b]">
						{copy.appliedPrefix} {application.appliedOn} · {application.location}
					</p>
				</div>
				<button
					type="button"
					onClick={onView}
					className="rounded-full bg-[#1877f2] px-[22px] py-2 text-[13.5px] font-semibold text-white transition hover:bg-[#166fe5] focus-visible:ring-2 focus-visible:ring-[#1877f2] focus-visible:ring-offset-2 focus-visible:outline-none active:bg-[#125fc7] disabled:opacity-50"
				>
					{copy.viewLabel}
				</button>
			</div>
			<ApplicationTimeline stages={application.timeline} />
		</section>
	);
}
