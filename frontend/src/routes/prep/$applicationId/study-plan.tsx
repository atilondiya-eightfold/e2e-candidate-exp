import { createFileRoute } from "@tanstack/react-router";
import type { ReactElement } from "react";

import { StudyPlanPage } from "@/features/candidate-prep/pages/StudyPlanPage";

export const Route = createFileRoute("/prep/$applicationId/study-plan")({
	component: RouteComponent,
});

function RouteComponent(): ReactElement {
	const { applicationId } = Route.useParams();
	return <StudyPlanPage applicationId={applicationId} />;
}
