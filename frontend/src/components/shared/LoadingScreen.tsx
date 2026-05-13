import type { ReactElement } from "react";

import { Skeleton } from "@/components/shared/LoadingSkeleton";
import { SectionCard } from "@/components/shared/SectionCard";

export function LoadingScreen(): ReactElement {
	return (
		<div className="flex flex-col gap-6">
			<SectionCard>
				<div className="flex items-center gap-4">
					<Skeleton height="4rem" rounded="full" width="4rem" />
					<div className="flex flex-1 flex-col gap-2">
						<Skeleton height="1.25rem" width="50%" />
						<Skeleton height="0.875rem" width="30%" />
					</div>
				</div>
			</SectionCard>
		</div>
	);
}
