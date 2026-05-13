import { useLocation, useMatches } from "@tanstack/react-router";
import { Fragment, type ReactElement } from "react";

import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ef-design-system";
import { Link } from "@/components/shared/KeepSearchLink";

import { BREADCRUMBS, resolveBreadcrumb } from "./breadcrumbs-config";

interface Crumb {
	pathname: string;
	label: string;
}

function buildPrefixes(pathname: string): Array<string> {
	const segments = pathname.split("/").filter(Boolean);
	const prefixes: Array<string> = [];
	for (let index = 0; index < segments.length; index++) {
		prefixes.push("/" + segments.slice(0, index + 1).join("/"));
	}
	return prefixes;
}

export function Breadcrumbs(): ReactElement | null {
	const matches = useMatches();
	const location = useLocation();

	const crumbs: Array<Crumb> = [];

	if (location.pathname !== "/dashboard") {
		crumbs.push({ pathname: "/dashboard", label: "Dashboard" });
	}

	for (const prefix of buildPrefixes(location.pathname)) {
		const match = matches.find((m) => m.pathname === prefix);
		let label: string | null = null;
		if (match) {
			label = resolveBreadcrumb(match.routeId, {
				params: match.params as Record<string, string>,
				pathname: match.pathname,
			});
		}
		if (label === null) {
			const entry = BREADCRUMBS[prefix];
			if (typeof entry === "string") {
				label = entry;
			} else if (typeof entry === "function") {
				label = entry({ params: {}, pathname: prefix });
			}
		}
		if (label !== null) {
			crumbs.push({ pathname: prefix, label });
		}
	}

	if (crumbs.length <= 1) return null;

	return (
		<div className="[&_a]:text-[var(--color-primary-blue-green)] [&_a]:text-sm [&_a]:font-medium [&_[aria-current=page]]:text-foreground [&_[aria-current=page]]:font-semibold">
			<Breadcrumb>
				<BreadcrumbList>
					{crumbs.map((crumb, index) => {
						const isLast = index === crumbs.length - 1;
						return (
							<Fragment key={crumb.pathname}>
								<BreadcrumbItem>
									{isLast ? (
										<BreadcrumbPage>{crumb.label}</BreadcrumbPage>
									) : (
										<BreadcrumbLink asChild>
											<Link
												activeOptions={{ exact: true }}
												to={crumb.pathname as never}
												search={(previous: Record<string, unknown>) =>
													previous
												}
											>
												{crumb.label}
											</Link>
										</BreadcrumbLink>
									)}
								</BreadcrumbItem>
								{!isLast && <BreadcrumbSeparator />}
							</Fragment>
						);
					})}
				</BreadcrumbList>
			</Breadcrumb>
		</div>
	);
}
