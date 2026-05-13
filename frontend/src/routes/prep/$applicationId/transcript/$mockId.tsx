import { createFileRoute } from "@tanstack/react-router";
import type { ReactElement } from "react";

import { TranscriptPage } from "@/features/candidate-prep/pages/TranscriptPage";

export const Route = createFileRoute("/prep/$applicationId/transcript/$mockId")({
	component: RouteComponent,
});

function RouteComponent(): ReactElement {
	const { applicationId, mockId } = Route.useParams();
	return <TranscriptPage applicationId={applicationId} mockId={mockId} />;
}
