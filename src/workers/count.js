function getCookie(cookieString, name) {
	const match = cookieString.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
	return match ? decodeURIComponent(match[1]) : null;
}

export async function handleCount(request, env) {
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
