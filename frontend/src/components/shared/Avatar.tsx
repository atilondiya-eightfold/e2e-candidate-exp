import type { CSSProperties, ReactElement } from "react";

import { avatarHueFromName, initials } from "@/lib/format";
import { cn } from "@/lib/utils";

interface AvatarProps {
	firstName: string;
	lastName: string;
	size?: "sm" | "md" | "lg";
	className?: string;
}

const SIZE_CLASS: Record<NonNullable<AvatarProps["size"]>, string> = {
	sm: "h-8 w-8 text-xs",
	md: "h-10 w-10 text-sm",
	lg: "h-16 w-16 text-lg",
};

/**
 * Avatar with deterministic background color derived from the name.
 * Always renders initials — no profile photo path (TF-01).
 * Uses a CSS custom property (--avatar-hue) so the color is data-driven, not
 * a true inline style rule. Required because CSS can't compute dynamic values
 * from a string at render time; this is the recommended pattern for dynamic
 * theming in the design system.
 */
export function Avatar({
	firstName,
	lastName,
	size = "md",
	className,
}: AvatarProps): ReactElement {
	const fullName = `${firstName} ${lastName}`.trim();
	const hue = avatarHueFromName(fullName);

	const hueVariable = { "--avatar-hue": `${hue}` } as CSSProperties;

	return (
		<span
			aria-label={fullName}
			style={hueVariable}
			title={fullName}
			className={cn(
				"inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-primary-foreground",
				"bg-[hsl(var(--avatar-hue)_60%_40%)]",
				SIZE_CLASS[size],
				className,
			)}
		>
			{initials(firstName, lastName)}
		</span>
	);
}
