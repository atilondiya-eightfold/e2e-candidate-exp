import { createFileRoute } from "@tanstack/react-router";
import type { ReactElement } from "react";

import { HubPage } from "@/features/candidate-prep/pages/HubPage";

export const Route = createFileRoute("/prep/$applicationId/")({
	component: PrepRoute,
});

function PrepRoute(): ReactElement {
	const { applicationId } = Route.useParams();
	// HubPage internally decides empty/loading/error/ready based on the
	// composed prep data (real API + demo-store override).
	return <HubPage applicationId={applicationId} />;
}
