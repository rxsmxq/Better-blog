// Umami API 配置（与 siteConfig.ts 保持一致）
const UMAMI_API_URL = "https://stats.mmzhiku.xyz";
const UMAMI_WEBSITE_ID = "5907656e-d254-4c9e-ad73-5ce40bf184bb";

// KV 缓存
const CACHE_KEY = "umami:site-stats";
const CACHE_TTL = 300; // 5 分钟（秒）

const corsHeaders = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type",
	"Content-Type": "application/json",
};

/**
 * 获取 Umami 全站统计
 * @param {string} token - Umami Bearer token
 * @returns {Promise<{pv: number, uv: number}>}
 */
async function fetchSiteStats(token) {
	const now = Date.now();
	const params = new URLSearchParams({
		startAt: "0",
		endAt: String(now),
	});

	const url = `${UMAMI_API_URL}/api/websites/${UMAMI_WEBSITE_ID}/stats?${params}`;

	const resp = await fetch(url, {
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

	const token = env.UMAMI_TOKEN;
	if (!token) {
		return Response.json(
			{ error: "UMAMI_TOKEN not configured" },
			{ status: 500, headers: corsHeaders },
		);
	}

	// GET 和 POST 都返回全站统计
	if (request.method === "GET" || request.method === "POST") {
		try {
			// 尝试读缓存
			const cached = await env.VISITOR_KV.get(CACHE_KEY, { type: "json" });
			if (cached) {
				return Response.json(cached, { headers: corsHeaders });
			}

			const result = await fetchSiteStats(token);

			// 写缓存
			await env.VISITOR_KV.put(CACHE_KEY, JSON.stringify(result), {
				expirationTtl: CACHE_TTL,
			});

			return Response.json(result, { headers: corsHeaders });
		} catch (e) {
			return Response.json(
				{ error: e.message },
				{ status: 502, headers: corsHeaders },
			);
		}
	}

	return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
}
