const SIDEBAR_SCROLL_CONTAINER_SELECTOR =
	'[data-dashboard-sidebar-scroll-container="true"]';

function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}

export function scrollDashboardSidebarItemIntoView(item: HTMLElement): void {
	const container = item.closest<HTMLElement>(
		SIDEBAR_SCROLL_CONTAINER_SELECTOR,
	);
	if (!container?.contains(item)) {
		item.scrollIntoView({ block: "nearest", inline: "nearest" });
		return;
	}

	const containerRect = container.getBoundingClientRect();
	const itemRect = item.getBoundingClientRect();
	let nextScrollTop = container.scrollTop;
	let nextScrollLeft = container.scrollLeft;

	if (itemRect.top < containerRect.top) {
		nextScrollTop -= containerRect.top - itemRect.top;
	} else if (itemRect.bottom > containerRect.bottom) {
		nextScrollTop += itemRect.bottom - containerRect.bottom;
	}

	if (itemRect.left < containerRect.left) {
		nextScrollLeft -= containerRect.left - itemRect.left;
	} else if (itemRect.right > containerRect.right) {
		nextScrollLeft += itemRect.right - containerRect.right;
	}

	container.scrollTop = clamp(
		nextScrollTop,
		0,
		Math.max(0, container.scrollHeight - container.clientHeight),
	);
	container.scrollLeft = clamp(
		nextScrollLeft,
		0,
		Math.max(0, container.scrollWidth - container.clientWidth),
	);
}
