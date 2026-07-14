export async function* readThirdPartyStream(
	stream: ReadableStream<Uint8Array>,
): AsyncGenerator<string> {
	const reader = stream.getReader();
	const decoder = new TextDecoder();
	let buffer = "";
	let completed = false;
	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) {
				completed = true;
				break;
			}
			buffer += decoder.decode(value, { stream: true });
			const lines = buffer.split("\n");
			buffer = lines.pop() ?? "";
			for (const line of lines) {
				const content = parseThirdPartyLine(line);
				if (content) yield content;
			}
		}
	} finally {
		if (!completed) await reader.cancel().catch(() => undefined);
		reader.releaseLock();
	}
}

function parseThirdPartyLine(line: string): string | null {
	const trimmed = line.trim();
	if (!trimmed.startsWith("data: ") || trimmed === "data: [DONE]") return null;
	try {
		const parsed: unknown = JSON.parse(trimmed.slice(6));
		if (!parsed || typeof parsed !== "object") return null;
		const choices = Reflect.get(parsed, "choices");
		if (
			!Array.isArray(choices) ||
			!choices[0] ||
			typeof choices[0] !== "object"
		) {
			return null;
		}
		const delta = Reflect.get(choices[0], "delta");
		if (!delta || typeof delta !== "object") return null;
		const content = Reflect.get(delta, "content");
		return typeof content === "string" ? content : null;
	} catch {
		return null;
	}
}

export async function* readWorkersAIStream(
	stream: ReadableStream<Uint8Array | string>,
): AsyncGenerator<string> {
	const reader = stream.getReader();
	const decoder = new TextDecoder();
	let completed = false;
	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) {
				completed = true;
				break;
			}
			if (value)
				yield typeof value === "string" ? value : decoder.decode(value);
		}
	} finally {
		if (!completed) await reader.cancel().catch(() => undefined);
		reader.releaseLock();
	}
}
