/**
 * ef-design-system — Barrel re-export of shadcn UI primitives for the
 * headless boilerplate. Existing imports of
 * `import { Button } from "@/components/ef-design-system"` continue to work.
 *
 * Add domain components under src/components/<Name>/ and re-export them
 * here as the project grows.
 */
import type { ComponentProps } from "react";

import type { Button as ShadcnButton } from "./ui/button";

export { Button, buttonVariants } from "./ui/button";
export type ButtonProps = ComponentProps<typeof ShadcnButton>;

export { Badge, badgeVariants } from "./ui/badge";

export { Input } from "./ui/input";

export {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuPortal,
} from "./ui/dropdown-menu";

export { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";

export {
	NavigationMenu,
	NavigationMenuList,
	NavigationMenuItem,
	NavigationMenuTrigger,
	NavigationMenuContent,
	NavigationMenuLink,
	NavigationMenuViewport,
} from "./ui/navigation-menu";

export {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
	BreadcrumbEllipsis,
} from "./ui/breadcrumb";
