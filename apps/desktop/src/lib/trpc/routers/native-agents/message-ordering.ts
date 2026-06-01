export interface TimestampedMessage {
	createdAt?: string | number | null;
}

function timestampMs(value: string | number | null | undefined): number | null {
	if (value == null) return null;
	const date =
		typeof value === "number"
			? new Date(value > 10_000_000_000 ? value : value * 1000)
			: new Date(value);
	const time = date.getTime();
	return Number.isNaN(time) ? null : time;
}

export function orderMessagesOldestFirst<T extends TimestampedMessage>(
	messages: T[],
): T[] {
	return messages
		.map((message, index) => ({
			index,
			message,
			time: timestampMs(message.createdAt),
		}))
		.sort((left, right) => {
			if (left.time == null && right.time == null) {
				return left.index - right.index;
			}
			if (left.time == null) return 1;
			if (right.time == null) return -1;
			return left.time - right.time || left.index - right.index;
		})
		.map(({ message }) => message);
}
