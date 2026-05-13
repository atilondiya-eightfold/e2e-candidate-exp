import { createFileRoute } from "@tanstack/react-router";
import type { ReactElement } from "react";

import { EmptyStatePage } from "@/features/candidate-prep/pages/EmptyStatePage";
import { HubPage } from "@/features/candidate-prep/pages/HubPage";
import { usePrepDemoStore } from "@/features/candidate-prep/store";

export const Route = createFileRoute("/prep/$applicationId/")({
	component: PrepRoute,
});

function PrepRoute(): ReactElement {
	const { applicationId } = Route.useParams();
	const demoState = usePrepDemoStore((s) => s.state);

	// Per NFR-4: empty-state if no prep data yet, hub otherwise.
	if (demoState === "empty") {
		return <EmptyStatePage applicationId={applicationId} />;
	}
	return <HubPage applicationId={applicationId} />;
}
