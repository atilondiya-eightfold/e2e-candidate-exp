import { createFileRoute } from "@tanstack/react-router";
import type { ReactElement } from "react";

import { MockFeedbackPage } from "@/features/candidate-prep/pages/MockFeedbackPage";

export const Route = createFileRoute("/prep/$applicationId/mock/$mockId/feedback")({
	component: RouteComponent,
});

function RouteComponent(): ReactElement {
	const { applicationId, mockId } = Route.useParams();
	return <MockFeedbackPage applicationId={applicationId} mockId={mockId} />;
}
