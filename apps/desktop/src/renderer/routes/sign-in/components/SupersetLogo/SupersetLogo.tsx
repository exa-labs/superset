import { cn } from "@superset/ui/utils";
import { useId } from "react";

interface SupersetLogoProps {
	className?: string;
	gradient?: boolean;
}

export function SupersetLogo({
	className,
	gradient = false,
}: SupersetLogoProps) {
	const reactId = useId();
	const gradientId = `clankee-logo-gradient-${reactId}`;
	const fill = gradient ? `url(#${gradientId})` : "currentColor";

	return (
		<svg
			width="226"
			height="46"
			viewBox="0 0 226 46"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={cn("text-foreground", className)}
			aria-label="Clankee"
		>
			<title>Clankee</title>
			{gradient && (
				<defs>
					<linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
						<stop offset="0%" stopColor="#21d4c2" stopOpacity="0.35" />
						<stop offset="42%" stopColor="#8b5cf6" stopOpacity="0.7" />
						<stop offset="55%" stopColor="#ff7a59" stopOpacity="1" />
						<stop offset="100%" stopColor="#ffd166" stopOpacity="0.45" />
						<animate
							attributeName="x1"
							values="-100%;100%;100%"
							keyTimes="0;0.55;1"
							dur="1.6s"
							repeatCount="indefinite"
						/>
						<animate
							attributeName="x2"
							values="0%;200%;200%"
							keyTimes="0;0.55;1"
							dur="1.6s"
							repeatCount="indefinite"
						/>
					</linearGradient>
				</defs>
			)}
			<rect
				x="2"
				y="5"
				width="36"
				height="36"
				rx="10"
				fill="currentColor"
				opacity="0.12"
			/>
			<path
				d="M29.7 14.8C27.5 12.9 24.8 12 21.8 12C15.6 12 10.9 16.8 10.9 23C10.9 29.2 15.6 34 21.8 34C24.9 34 27.7 33 29.9 31L27.1 27.8C25.7 29 24 29.6 22 29.6C18.2 29.6 15.4 26.8 15.4 23C15.4 19.2 18.2 16.4 22 16.4C23.9 16.4 25.6 17 26.9 18.2L29.7 14.8Z"
				fill={fill}
			/>
			<text
				x="50"
				y="32"
				fill={fill}
				fontFamily="Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
				fontSize="29"
				fontWeight="750"
				letterSpacing="0"
			>
				Clankee
			</text>
		</svg>
	);
}
