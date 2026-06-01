import { cn } from "@superset/ui/utils";

interface SupersetIconProps {
	className?: string;
}

export function SupersetIcon({ className }: SupersetIconProps) {
	return (
		<svg
			viewBox="0 0 64 64"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={cn("text-[#eae8e6]", className)}
			aria-label="Clankee"
		>
			<title>Clankee</title>
			<rect
				x="6"
				y="6"
				width="52"
				height="52"
				rx="15"
				fill="currentColor"
				opacity="0.14"
			/>
			<path
				d="M45.2 20.1C41.8 17.1 37.5 15.6 32.8 15.6C22.9 15.6 15.2 23.1 15.2 32C15.2 40.9 22.9 48.4 32.8 48.4C37.8 48.4 42.2 46.8 45.6 43.6L40.9 38.3C38.8 40.1 36.2 41.1 33.2 41.1C27.3 41.1 22.8 37.2 22.8 32C22.8 26.8 27.3 22.9 33.2 22.9C36 22.9 38.5 23.8 40.6 25.6L45.2 20.1Z"
				fill="currentColor"
			/>
		</svg>
	);
}
