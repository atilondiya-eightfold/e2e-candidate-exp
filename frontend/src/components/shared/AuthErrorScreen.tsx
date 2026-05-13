import type { ReactElement } from "react";

import { ErrorBanner } from "@/components/shared/ErrorBanner";

export function AuthErrorScreen(): ReactElement {
	// TODO(i18n): wire this string through the project i18n helper once available.
	return (
		<div className="flex flex-col gap-6">
			<ErrorBanner message="Session not found. Refresh parent page." />
		</div>
	);
}
