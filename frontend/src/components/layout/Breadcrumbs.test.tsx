import { render, screen } from "@testing-library/react";
import {
	createMemoryHistory,
	createRootRoute,
	createRoute,
	createRouter,
	RouterProvider,
} from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { Breadcrumbs } from "./Breadcrumbs";

function buildRouter(pathname: string) {
	const rootRoute = createRootRoute({ component: () => <Breadcrumbs /> });
	const myDev = createRoute({
		getParentRoute: () => rootRoute,
		path: "/my-development",
		component: () => null,
	});
	const goals = createRoute({
		getParentRoute: () => myDev,
		path: "goals",
		component: () => null,
	});
	const goal = createRoute({
		getParentRoute: () => goals,
		path: "$goalId",
		component: () => null,
	});
	return createRouter({
		routeTree: rootRoute.addChildren([
			myDev.addChildren([goals.addChildren([goal])]),
		]),
		history: createMemoryHistory({ initialEntries: [pathname] }),
	});
}

describe("Breadcrumbs", () => {
	it("renders nothing on the root match", async () => {
		const router = buildRouter("/");
		const { container } = render(<RouterProvider router={router} />);
		// Wait a tick for router init.
		await new Promise((r) => setTimeout(r, 50));
		expect(container.querySelector("nav[aria-label='breadcrumb']")).toBeNull();
	});

	it("renders the trail with the last segment as a BreadcrumbPage (plain text, aria-current)", async () => {
		const router = buildRouter("/my-development/goals/123");
		render(<RouterProvider router={router} />);
		// EF Breadcrumb renders <nav aria-label="breadcrumb"> via the primitive.
		expect(
			await screen.findByRole("navigation", { name: /breadcrumb/i }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: /my development/i }),
		).toBeInTheDocument();
		expect(screen.getByRole("link", { name: /goals/i })).toBeInTheDocument();
		const current = screen.getByText(/goal 123/i);
		expect(current).toHaveAttribute("aria-current", "page");
		expect(current.tagName).not.toBe("A");
	});

	it("renders full ancestral path with synthesized intermediates", async () => {
		const rootRoute = createRootRoute({ component: () => <Breadcrumbs /> });
		const feedbackRoute = createRoute({
			getParentRoute: () => rootRoute,
			path: "/feedback",
			component: () => null,
		});
		const giveParentRoute = createRoute({
			getParentRoute: () => feedbackRoute,
			path: "give",
			component: () => null,
		});
		const giveRoute = createRoute({
			getParentRoute: () => giveParentRoute,
			path: "$requestId",
			component: () => null,
		});
		const router = createRouter({
			routeTree: rootRoute.addChildren([
				feedbackRoute.addChildren([giveParentRoute.addChildren([giveRoute])]),
			]),
			history: createMemoryHistory({ initialEntries: ["/feedback/give/123"] }),
		});
		render(<RouterProvider router={router} />);

		expect(
			await screen.findByRole("navigation", { name: /breadcrumb/i }),
		).toBeInTheDocument();

		expect(screen.getByRole("link", { name: /dashboard/i })).toBeInTheDocument();
		expect(screen.getByRole("link", { name: /^feedback$/i })).toBeInTheDocument();
		expect(screen.getByRole("link", { name: /^give$/i })).toBeInTheDocument();

		const current = screen.getByText(/request 123/i);
		expect(current).toHaveAttribute("aria-current", "page");
		expect(current.tagName).not.toBe("A");
	});
});
