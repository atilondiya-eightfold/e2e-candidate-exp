import { createFileRoute } from "@tanstack/react-router";
import type { ReactElement } from "react";

import { GapReportPage } from "@/features/candidate-prep/pages/GapReportPage";

export const Route = createFileRoute("/prep/$applicationId/gap-report")({
	component: RouteComponent,
});

function RouteComponent(): ReactElement {
	const { applicationId } = Route.useParams();
	return <GapReportPage applicationId={applicationId} />;
}
