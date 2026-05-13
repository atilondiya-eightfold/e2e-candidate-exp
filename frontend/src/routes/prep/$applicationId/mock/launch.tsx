import { createFileRoute } from "@tanstack/react-router";
import type { ReactElement } from "react";

import { MockLaunchPage } from "@/features/candidate-prep/pages/MockLaunchPage";

export const Route = createFileRoute("/prep/$applicationId/mock/launch")({
	component: RouteComponent,
});

function RouteComponent(): ReactElement {
	const { applicationId } = Route.useParams();
	return <MockLaunchPage applicationId={applicationId} />;
}
