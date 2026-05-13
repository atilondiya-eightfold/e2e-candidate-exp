import { createFileRoute } from "@tanstack/react-router";
import type { ReactElement } from "react";

import { MockActivePage } from "@/features/candidate-prep/pages/MockActivePage";

export const Route = createFileRoute("/prep/$applicationId/mock/$mockId/active")({
	component: RouteComponent,
});

function RouteComponent(): ReactElement {
	const { applicationId, mockId } = Route.useParams();
	return <MockActivePage applicationId={applicationId} mockId={mockId} />;
}
