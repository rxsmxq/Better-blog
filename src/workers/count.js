const corsHeaders = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type",
	"Content-Type": "application/json",
};

/**
 * 获取 Umami 全站统计
 * @param {object} env - Worker 环境变量
 * @returns {Promise<{pv: number, uv: number}>}
 */
async function fetchSiteStats(env) {
	const apiUrl = env.UMAMI_API_URL;
	const websiteId = env.UMAMI_WEBSITE_ID;
	const token = env.UMAMI_TOKEN;

	const now = Date.now();
	const params = new URLSearchParams({
		startAt: "0",
		endAt: String(now),
	});

	const url = `${apiUrl}/api/websites/${websiteId}/stats?${params}`;

	const resp = await fetch(url, {
		redirect: "follow",
		headers: {
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json",
		},
	});

	if (!resp.ok) {
		const text = await resp.text();
		throw new Error(`Umami API error ${resp.status}: ${text}`);
	}

	const data = await resp.json();
	return { pv: data.pageviews, uv: data.visitors };
}

export async function handleCount(request, env) {
	if (request.method === "OPTIONS") {
		return new Response(null, { headers: corsHeaders });
	}

	if (!env.UMAMI_TOKEN) {
		return Response.json(
			{ error: "UMAMI_TOKEN not configured" },
			{ status: 500, headers: corsHeaders },
		);
	}

	if (request.method === "GET" || request.method === "POST") {
		try {
			const result = await fetchSiteStats(env);
			return Response.json(result, { headers: corsHeaders });
		} catch (e) {
			return Response.json(
				{ error: e.message },
				{ status: 502, headers: corsHeaders },
			);
		}
	}

	return new Response("Method Not Allowed", {
		status: 405,
		headers: corsHeaders,
	});
}
