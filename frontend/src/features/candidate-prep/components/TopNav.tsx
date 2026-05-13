import { Link } from "@tanstack/react-router";
import type { ReactElement } from "react";

import { strings } from "../strings";

interface Props {
	applicationId: string;
}

export function TopNav({ applicationId }: Props): ReactElement {
	return (
		<header className="flex items-center justify-between border-b border-[#f0f1f3] px-7 py-3.5">
			<div className="flex items-center gap-7">
				<Link
					to="/prep/$applicationId"
					params={{ applicationId }}
					className="text-[18px] font-bold text-[#1f3a68] hover:underline"
				>
					{strings.brand.wordmark}
				</Link>
				<Link
					to="/prep/$applicationId"
					params={{ applicationId }}
					className="text-[13px] text-[#65676b] hover:text-[#1877f2]"
				>
					{strings.brand.navApplications}
				</Link>
				<span className="text-[13px] text-[#65676b] cursor-default">
					{strings.brand.navResources}
				</span>
			</div>
			<div className="flex items-center justify-center w-[30px] h-[30px] rounded-full bg-[#1f3a68] text-[12px] font-semibold text-white">
				A
			</div>
		</header>
	);
}
