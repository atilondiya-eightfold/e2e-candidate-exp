import type { ButtonHTMLAttributes, ReactElement, ReactNode } from "react";

type Variant = "primary" | "secondary";
type Size = "sm" | "md" | "lg";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: Variant;
	size?: Size;
	children: ReactNode;
}

const SIZES: Record<Size, string> = {
	sm: "px-4 py-1.5 text-[12px]",
	md: "px-[18px] py-2 text-[13px]",
	lg: "px-[22px] py-2.5 text-[13.5px]",
};

export function PillButton({
	variant = "primary",
	size = "md",
	children,
	className = "",
	type = "button",
	...rest
}: Props): ReactElement {
	const base =
		"inline-flex items-center gap-1.5 rounded-full font-semibold whitespace-nowrap transition focus-visible:ring-2 focus-visible:ring-[#1877f2] focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-50 disabled:cursor-not-allowed";
	const variantClass =
		variant === "primary"
			? "bg-[#1877f2] text-white hover:bg-[#166fe5] active:bg-[#125fc7]"
			: "bg-white text-[#1877f2] border border-[#1877f2] hover:bg-[#f0f6ff] active:bg-[#e7f0fc]";
	return (
		<button
			type={type}
			className={`${base} ${SIZES[size]} ${variantClass} ${className}`}
			{...rest}
		>
			{children}
		</button>
	);
}
