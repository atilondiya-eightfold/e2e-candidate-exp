import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, type ReactElement } from "react";

import { useApplications } from "@/features/candidate-prep/hooks";
import { HubPage } from "@/features/candidate-prep/pages/HubPage";

export const Route = createFileRoute("/prep/$applicationId/")({
	component: PrepRoute,
});

// Real candidate-prep application ids are either a positive integer
// (BFF spec, ApplicationRow.application_id) or the candidate-side
// `vs-<id>-<id>-<id>` form returned by the careerhub applications API.
// Anything else (e.g. the `app_mock_01` placeholder) triggers a redirect
// to the candidate's first real application.
function isValidApplicationId(id: string): boolean {
	return /^\d+$/.test(id) || /^vs-\d+-\d+-\d+$/.test(id);
}

function PrepRoute(): ReactElement {
	const { applicationId } = Route.useParams();
	if (isValidApplicationId(applicationId)) {
		return <HubPage applicationId={applicationId} />;
	}
	return <ApplicationResolver />;
}

function ApplicationResolver(): ReactElement {
	const navigate = useNavigate();
	const apps = useApplications(10);
	const first = apps.data?.[0]?.application_id;

	useEffect(() => {
		if (first !== undefined) {
			navigate({
				to: "/prep/$applicationId",
				params: { applicationId: String(first) },
				replace: true,
			});
		}
	}, [first, navigate]);

	if (apps.isLoading) {
		return (
			<div className="mx-auto max-w-4xl px-4 py-16 text-center text-[13px] text-[#65676b]">
				Loading your applications…
			</div>
		);
	}
	if (apps.isError) {
		return (
			<div className="mx-auto max-w-4xl px-4 py-16 text-center text-[13px] text-[#65676b]">
				Couldn't load your applications. Try refreshing.
			</div>
		);
	}
	if (!apps.data || apps.data.length === 0) {
		return (
			<div className="mx-auto max-w-4xl px-4 py-16 text-center text-[13px] text-[#65676b]">
				No applications found for this candidate.
			</div>
		);
	}
	return (
		<div className="mx-auto max-w-4xl px-4 py-16 text-center text-[13px] text-[#65676b]">
			Redirecting…
		</div>
	);
}
