import { createFileRoute } from "@tanstack/react-router";
import type { ReactElement } from "react";

import { EmptyStatePage } from "@/features/candidate-prep/pages/EmptyStatePage";

export const Route = createFileRoute("/prep/$applicationId/")({
	component: PrepRoute,
});

function PrepRoute(): ReactElement {
	const { applicationId } = Route.useParams();
	return <EmptyStatePage applicationId={applicationId} />;
}
