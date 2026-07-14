const JSON_CONTENT_TYPE = /^application\/(?:[a-z0-9.+-]+\+)?json(?:\s*;|$)/i;

export class RequestError extends Error {
	readonly status: number;
	readonly code: string;

	constructor(status: number, code: string, message: string) {
		super(message);
		this.name = "RequestError";
		this.status = status;
		this.code = code;
	}
}

export function assertJsonRequest(request: Request): void {
	const contentType = request.headers.get("Content-Type") ?? "";
	if (!JSON_CONTENT_TYPE.test(contentType)) {
		throw new RequestError(
			415,
			"UNSUPPORTED_MEDIA_TYPE",
			"Content-Type must be application/json",
		);
	}
}

export async function readBoundedJson(
	request: Request,
	maxBytes: number,
): Promise<unknown> {
	const contentLength = request.headers.get("Content-Length");
	if (contentLength) {
		const declaredLength = Number(contentLength);
		if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
			throw new RequestError(
				413,
				"PAYLOAD_TOO_LARGE",
				"Request body is too large",
			);
		}
	}

	if (!request.body) {
		throw new RequestError(400, "INVALID_REQUEST", "Request body is required");
	}

	const reader = request.body.getReader();
	const decoder = new TextDecoder();
	let totalBytes = 0;
	let text = "";
	let completed = false;
	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) {
				completed = true;
				break;
			}
			totalBytes += value.byteLength;
			if (totalBytes > maxBytes) {
				await reader
					.cancel("Request body exceeded limit")
					.catch(() => undefined);
				throw new RequestError(
					413,
					"PAYLOAD_TOO_LARGE",
					"Request body is too large",
				);
			}
			text += decoder.decode(value, { stream: true });
		}
		text += decoder.decode();
	} finally {
		if (!completed) await reader.cancel().catch(() => undefined);
		reader.releaseLock();
	}

	try {
		return JSON.parse(text);
	} catch {
		throw new RequestError(
			400,
			"INVALID_JSON",
			"Request body is not valid JSON",
		);
	}
}

export async function readResponseSnippet(
	response: Response,
	maxBytes = 2048,
): Promise<string> {
	if (!response.body) return "";
	const reader = response.body.getReader();
	const decoder = new TextDecoder();
	let totalBytes = 0;
	let text = "";
	let completed = false;
	try {
		while (totalBytes < maxBytes) {
			const { done, value } = await reader.read();
			if (done) {
				completed = true;
				break;
			}
			const remaining = maxBytes - totalBytes;
			const chunk =
				value.byteLength > remaining ? value.subarray(0, remaining) : value;
			totalBytes += chunk.byteLength;
			text += decoder.decode(chunk, { stream: true });
			if (chunk.byteLength < value.byteLength) break;
		}
		text += decoder.decode();
	} finally {
		if (!completed) await reader.cancel().catch(() => undefined);
		reader.releaseLock();
	}
	return text;
}
