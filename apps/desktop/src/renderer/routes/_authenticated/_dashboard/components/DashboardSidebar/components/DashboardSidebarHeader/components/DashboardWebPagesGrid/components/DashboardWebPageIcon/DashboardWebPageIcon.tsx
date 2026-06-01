import { cn } from "@superset/ui/utils";
import { useState } from "react";

interface DashboardWebPageIconProps {
	src: string | null;
	fallbackLabel: string;
	className?: string;
}

export function DashboardWebPageIcon({
	src,
	fallbackLabel,
	className,
}: DashboardWebPageIconProps) {
	const [failedSrc, setFailedSrc] = useState<string | null>(null);
	const shouldRenderImage = src && failedSrc !== src;
	const fallbackText = fallbackLabel.trim().slice(0, 1).toUpperCase();

	if (shouldRenderImage) {
		return (
			<img
				src={src}
				alt=""
				className={cn("shrink-0 rounded-[3px] object-contain", className)}
				onError={() => setFailedSrc(src)}
			/>
		);
	}

	return (
		<span
			className={cn(
				"flex shrink-0 items-center justify-center rounded-[3px] bg-muted-foreground/15 font-semibold text-[10px] text-muted-foreground",
				className,
			)}
		>
			{fallbackText}
		</span>
	);
}
