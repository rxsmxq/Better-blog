export default {
	async fetch(request, env) {
		const url = new URL(request.url);

		// 计数 API
		if (url.pathname === "/api/count") {
			return handleCount(request, env);
		}

		// 留言板 API
		if (url.pathname.startsWith("/api/guestbook")) {
			return handleGuestbook(request, env, url);
		}

		// AI 搜索 API
		if (url.pathname === "/api/ai-chat") {
			return handleAIChat(request, env);
		}

		// 其他请求返回静态资源
		if (env.ASSETS) {
			return env.ASSETS.fetch(request);
		}
		return new Response("Not Found", { status: 404 });
	},
};

async function handleCount(request, env) {
	const headers = {
		"Access-Control-Allow-Origin": "*",
		"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type",
		"Content-Type": "application/json",
	};

	if (request.method === "OPTIONS") {
		return new Response(null, { headers });
	}

	if (request.method === "GET") {
		const pv = (await env.VISITOR_KV.get("pv")) || "0";
		const uv = (await env.VISITOR_KV.get("uv")) || "0";
		return Response.json({ pv: Number(pv), uv: Number(uv) }, { headers });
	}

	if (request.method === "POST") {
		const body = await request.json().catch(() => ({}));
		const _path = body.path || "/";

		const cookie = request.headers.get("Cookie") || "";
		let visitorId = getCookie(cookie, "vid");

		if (!visitorId) {
			visitorId = crypto.randomUUID();
		}

		const pv = Number((await env.VISITOR_KV.get("pv")) || "0") + 1;
		await env.VISITOR_KV.put("pv", String(pv));

		const uvKey = `vid:${visitorId}`;
		const exists = await env.VISITOR_KV.get(uvKey);
		let uv = Number((await env.VISITOR_KV.get("uv")) || "0");

		if (!exists) {
			uv += 1;
			await env.VISITOR_KV.put(uvKey, "1", { expirationTtl: 86400 * 365 });
			await env.VISITOR_KV.put("uv", String(uv));
		}

		return Response.json(
			{ pv, uv },
			{
				headers: {
					...headers,
					"Set-Cookie": `vid=${visitorId}; Path=/; Max-Age=${86400 * 365}; SameSite=Lax`,
				},
			},
		);
	}

	return new Response("Method Not Allowed", { status: 405 });
}

function getCookie(cookieString, name) {
	const match = cookieString.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
	return match ? decodeURIComponent(match[1]) : null;
}

// ── 留言板 API ──────────────────────────────────────────

const GB_HEADERS = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type",
	"Content-Type": "application/json",
};

async function handleGuestbook(request, env, url) {
	if (request.method === "OPTIONS") {
		return new Response(null, { headers: GB_HEADERS });
	}

	const pathParts = url.pathname.split("/").filter(Boolean);
	// /api/guestbook            -> []
	// /api/guestbook/{id}       -> [id]
	// /api/guestbook/{id}/vote  -> [id, "vote"]
	const segments = pathParts.slice(2); // remove "api", "guestbook"

	try {
		// POST /api/guestbook/{id}/vote
		if (
			segments.length === 2 &&
			segments[1] === "vote" &&
			request.method === "POST"
		) {
			return await handleVote(env, segments[0], request);
		}

		// GET /api/guestbook/{id}
		if (segments.length === 1 && request.method === "GET") {
			return await handleGetMessage(env, segments[0]);
		}

		// POST /api/guestbook  (create)
		if (segments.length === 0 && request.method === "POST") {
			return await handleCreateMessage(env, request);
		}

		// GET /api/guestbook?offset=0&limit=5  (list)
		if (segments.length === 0 && request.method === "GET") {
			return await handleListMessages(env, url);
		}

		return new Response("Not Found", { status: 404, headers: GB_HEADERS });
	} catch (err) {
		return Response.json(
			{ error: err.message },
			{ status: 500, headers: GB_HEADERS },
		);
	}
}

async function handleListMessages(env, url) {
	const offset = Math.max(0, Number(url.searchParams.get("offset")) || 0);
	const limit = Math.min(
		20,
		Math.max(1, Number(url.searchParams.get("limit")) || 5),
	);

	const listJson = await env.VISITOR_KV.get("guestbook:list");
	const ids = listJson ? JSON.parse(listJson) : [];
	const pageIds = ids.slice(offset, offset + limit);

	const messages = await Promise.all(
		pageIds.map(async (id) => {
			const raw = await env.VISITOR_KV.get(`guestbook:msg:${id}`);
			return raw ? JSON.parse(raw) : null;
		}),
	);

	return Response.json(
		{ messages: messages.filter(Boolean), total: ids.length },
		{ headers: GB_HEADERS },
	);
}

async function handleGetMessage(env, id) {
	const raw = await env.VISITOR_KV.get(`guestbook:msg:${id}`);
	if (!raw) {
		return Response.json(
			{ error: "Not found" },
			{ status: 404, headers: GB_HEADERS },
		);
	}
	return Response.json(JSON.parse(raw), { headers: GB_HEADERS });
}

async function handleCreateMessage(env, request) {
	const body = await request.json().catch(() => ({}));
	const author = (body.author || "").trim().slice(0, 30);
	const content = (body.content || "").trim().slice(0, 500);

	if (!author || !content) {
		return Response.json(
			{ error: "author and content are required" },
			{ status: 400, headers: GB_HEADERS },
		);
	}

	// 自增 ID
	const counterRaw = await env.VISITOR_KV.get("guestbook:counter");
	const counter = counterRaw ? Number(counterRaw) + 1 : 1;
	await env.VISITOR_KV.put("guestbook:counter", String(counter));

	const id = `msg_${String(counter).padStart(3, "0")}`;
	const now = Date.now();
	const message = {
		id,
		author,
		content,
		time: "刚刚",
		createdAt: now,
		votes: { agree: 0, disagree: 0, neutral: 0 },
	};

	await env.VISITOR_KV.put(`guestbook:msg:${id}`, JSON.stringify(message));

	// 更新列表（新消息插到最前面）
	const listRaw = await env.VISITOR_KV.get("guestbook:list");
	const ids = listRaw ? JSON.parse(listRaw) : [];
	ids.unshift(id);
	await env.VISITOR_KV.put("guestbook:list", JSON.stringify(ids));

	return Response.json(message, { status: 201, headers: GB_HEADERS });
}

async function handleVote(env, id, request) {
	const body = await request.json().catch(() => ({}));
	const type = body.type; // "agree" | "disagree" | "neutral"

	if (!["agree", "disagree", "neutral"].includes(type)) {
		return Response.json(
			{ error: "Invalid vote type" },
			{ status: 400, headers: GB_HEADERS },
		);
	}

	const raw = await env.VISITOR_KV.get(`guestbook:msg:${id}`);
	if (!raw) {
		return Response.json(
			{ error: "Not found" },
			{ status: 404, headers: GB_HEADERS },
		);
	}

	const message = JSON.parse(raw);
	message.votes[type] = (message.votes[type] || 0) + 1;
	await env.VISITOR_KV.put(`guestbook:msg:${id}`, JSON.stringify(message));

	return Response.json(message, { headers: GB_HEADERS });
}

// ── AI 搜索 API ──────────────────────────────────────

const AI_HEADERS = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "POST, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type",
};

// 判断是否使用第三方 API（四个变量齐备才启用）
function useThirdParty(env) {
	return !!(
		env.AI_API_URL &&
		env.AI_API_KEY &&
		env.AI_EMBEDDING_MODEL &&
		env.AI_API_MODEL
	);
}

// 拼接 base URL + path，自动去掉末尾的 /v1、/chat/completions 等
function buildApiUrl(base, suffix) {
	return (
		base
			.replace(/\/+$/, "")
			.replace(/\/v1\/?$/, "")
			.replace(/\/chat\/completions\/?$/, "") + suffix
	);
}

// 调用 embedding API，返回向量数组
async function getEmbedding(env, text) {
	if (useThirdParty(env)) {
		const res = await fetch(buildApiUrl(env.AI_API_URL, "/v1/embeddings"), {
			method: "POST",
			headers: {
				Authorization: `Bearer ${env.AI_API_KEY}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				model: env.AI_EMBEDDING_MODEL,
				input: text,
				dimensions: Number(env.VECTORIZE_DIM) || 1024,
				encoding_format: "float",
			}),
		});
		if (!res.ok)
			throw new Error(`Embedding API ${res.status}: ${await res.text()}`);
		const data = await res.json();
		return data.data?.[0]?.embedding;
	}
	const result = await env.AI.run("@cf/baai/bge-base-en-v1.5", { text });
	return result.data[0];
}

// 调用文本生成 API，返回 ReadableStream 或 Workers AI 响应
async function generateAnswer(env, messages) {
	if (useThirdParty(env)) {
		const res = await fetch(
			buildApiUrl(env.AI_API_URL, "/v1/chat/completions"),
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${env.AI_API_KEY}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					model: env.AI_API_MODEL,
					messages,
					stream: true,
				}),
			},
		);
		if (!res.ok) throw new Error(`Chat API ${res.status}: ${await res.text()}`);
		return { stream: res.body, isThirdParty: true };
	}
	const result = await env.AI.run("@cf/meta/llama-3-8b-instruct", {
		messages,
		stream: true,
	});
	return { stream: result, isThirdParty: false };
}

// 从 SSE 流中读取文本（第三方 API OpenAI 格式）
async function* readThirdPartyStream(stream) {
	const reader = stream.getReader();
	const decoder = new TextDecoder();
	let buffer = "";
	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		buffer += decoder.decode(value, { stream: true });
		const lines = buffer.split("\n");
		buffer = lines.pop();
		for (const line of lines) {
			const trimmed = line.trim();
			if (!trimmed?.startsWith("data: ")) continue;
			if (trimmed === "data: [DONE]") continue;
			try {
				const content = JSON.parse(trimmed.slice(6))?.choices?.[0]?.delta
					?.content;
				if (content) yield content;
			} catch {}
		}
	}
}

// 从 Workers AI 流中读取文本
async function* readWorkersAIStream(stream) {
	const reader = stream.getReader();
	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		if (value)
			yield typeof value === "string" ? value : new TextDecoder().decode(value);
	}
}

async function handleAIChat(request, env) {
	if (request.method === "OPTIONS") {
		return new Response(null, { headers: AI_HEADERS });
	}
	if (request.method !== "POST") {
		return new Response("Method Not Allowed", {
			status: 405,
			headers: AI_HEADERS,
		});
	}

	try {
		const body = await request.json().catch(() => ({}));
		const question = (body.question || "").trim();
		const history = body.history || [];

		if (!question) {
			return Response.json(
				{ error: "question is required" },
				{ status: 400, headers: AI_HEADERS },
			);
		}

		// 1. Embedding → Vectorize 检索
		let context = "";
		const articles = [];
		try {
			const queryVector = await getEmbedding(env, question);
			if (queryVector && env.VECTORIZE) {
				const results = await env.VECTORIZE.query(queryVector, {
					topK: 10,
					returnMetadata: true,
				});
				if (results.matches?.length > 0) {
					console.log(
						"Vectorize matches:",
						results.matches.map((m) => ({
							score: m.score,
							title: m.metadata?.articleTitle,
						})),
					);
					const seenPaths = new Set();
					const contextParts = [];
					for (const match of results.matches) {
						// 过滤低相似度结果
						if (match.score < 0.2) continue;
						const meta = match.metadata;
						contextParts.push(
							`【${meta.articleTitle} - ${meta.heading}】\n${meta.excerpt}`,
						);
						if (!seenPaths.has(meta.articlePath)) {
							seenPaths.add(meta.articlePath);
							articles.push({
								title: meta.articleTitle,
								path: meta.articlePath,
								excerpt: meta.excerpt,
								score: match.score,
							});
						}
					}
					context = contextParts.join("\n\n---\n\n");
				}
			}
		} catch (err) {
			console.warn("Embedding/retrieval skipped:", err.message);
		}

		// 2. 构建 prompt
		const systemPrompt = `你是一个博客 AI 助手。根据以下博客内容回答用户问题。

规则：
- 如果内容中有相关信息，基于内容回答，并在最后附上参考文章
- 如果内容中没有相关信息，直接回答你知道的，并说明"以下回答不是来自博客内容"
- 回答使用 Markdown 格式
- 保持回答简洁明了，适合技术博客读者
- 使用中文回答

博客内容：
${context || "（未检索到相关内容）"}`;

		const messages = [
			{ role: "system", content: systemPrompt },
			...history.slice(-6),
			{ role: "user", content: question },
		];

		// 3. 文本生成
		let aiResult;
		try {
			aiResult = await generateAnswer(env, messages);
		} catch (err) {
			console.error("AI generation error:", err);
			return Response.json(
				{ error: `AI generation failed: ${err.message}` },
				{ status: 500, headers: AI_HEADERS },
			);
		}

		// 4. SSE 流式响应
		const { readable, writable } = new TransformStream();
		const writer = writable.getWriter();
		const encoder = new TextEncoder();

		(async () => {
			try {
				if (articles.length > 0) {
					await writer.write(
						encoder.encode(
							`data: ${JSON.stringify({ type: "refs", articles })}\n\n`,
						),
					);
				}

				const streamGen = aiResult.isThirdParty
					? readThirdPartyStream(aiResult.stream)
					: readWorkersAIStream(aiResult.stream);

				for await (const text of streamGen) {
					await writer.write(
						encoder.encode(
							`data: ${JSON.stringify({ type: "chunk", text })}\n\n`,
						),
					);
				}

				// Workers AI 非流式回退
				if (!aiResult.isThirdParty && aiResult.stream?.response) {
					const text =
						typeof aiResult.stream.response === "string"
							? aiResult.stream.response
							: JSON.stringify(aiResult.stream.response);
					await writer.write(
						encoder.encode(
							`data: ${JSON.stringify({ type: "chunk", text })}\n\n`,
						),
					);
				}

				await writer.write(
					encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`),
				);
			} catch (err) {
				console.error("Stream error:", err);
				try {
					await writer.write(
						encoder.encode(
							`data: ${JSON.stringify({ type: "error", error: err.message })}\n\n`,
						),
					);
				} catch {}
			} finally {
				try {
					await writer.close();
				} catch {}
			}
		})();

		return new Response(readable, {
			headers: {
				...AI_HEADERS,
				"Content-Type": "text/event-stream",
				"Cache-Control": "no-cache",
				Connection: "keep-alive",
			},
		});
	} catch (err) {
		console.error("AI Chat error:", err);
		return Response.json(
			{ error: err.message || "Internal server error" },
			{ status: 500, headers: AI_HEADERS },
		);
	}
}
