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

		// 其他请求返回静态资源
		return env.ASSETS.fetch(request);
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
